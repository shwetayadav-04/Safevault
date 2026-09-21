import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { User } from './models/User.js';
import { FileItem } from './models/FileItem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (.env.local or .env)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'safevault_jwt_secret_key_2026';

app.use(cors());
app.use(express.json());

// ==========================================
// 1. AWS S3 Client Setup
// ==========================================
const s3Region = process.env.AWS_REGION || 'ap-south-1';
const s3Bucket = process.env.AWS_S3_BUCKET || '';
const s3AccessKey = process.env.AWS_ACCESS_KEY_ID || '';
const s3SecretKey = process.env.AWS_SECRET_ACCESS_KEY || '';

let s3Client = null;
if (s3Bucket && s3AccessKey && s3SecretKey) {
  try {
    s3Client = new S3Client({
      region: s3Region,
      credentials: {
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey,
      },
    });
    console.log(`[SafeVault S3] Configured for bucket: ${s3Bucket} (${s3Region})`);
  } catch (err) {
    console.warn('[SafeVault S3] Initialization warning:', err.message);
  }
} else {
  console.log('[SafeVault S3] Running in Simulated/Mock Mode (Add AWS keys to .env.local to activate real S3)');
}

// ==========================================
// 2. MongoDB Atlas Connection
// ==========================================
const mongoUri = process.env.MONGODB_URI || '';

if (mongoUri) {
  mongoose
    .connect(mongoUri)
    .then(() => console.log(' Connected to MongoDB Atlas Database'))
    .catch((err) => console.error('❌ MongoDB Atlas connection error:', err.message));
} else {
  console.warn('⚠️ MONGODB_URI not found in .env.local. Please add your connection string.');
}

// ==========================================
// 3. Authentication Middleware
// ==========================================
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ==========================================
// 4. Auth API Routes
// ==========================================

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        avatarUrl: newUser.avatarUrl,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH /api/auth/profile
app.patch('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { name, avatarUrl } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ==========================================
// 5. S3 Presigned URL Routes
// ==========================================

// POST /api/s3/upload-url (Get Presigned S3 PUT URL for direct client upload)
app.post('/api/s3/upload-url', authMiddleware, async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `users/${req.user.id}/${Date.now()}-${sanitizedFileName}`;

    if (s3Client && s3Bucket) {
      const command = new PutObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
        ContentType: fileType || 'application/octet-stream',
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      res.json({ uploadUrl, s3Key, isS3: true });
    } else {
      // Local / Mock fallback upload URL
      res.json({ uploadUrl: null, s3Key, isS3: false });
    }
  } catch (err) {
    console.error('S3 Upload URL Error:', err);
    res.status(500).json({ error: 'Failed to generate S3 upload URL' });
  }
});

// GET /api/s3/download-url/:id (Get Presigned S3 GET URL)
app.get('/api/s3/download-url/:id', authMiddleware, async (req, res) => {
  try {
    const file = await FileItem.findOne({ _id: req.params.id, userId: req.user.id });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (s3Client && s3Bucket && file.s3Key) {
      const command = new GetObjectCommand({
        Bucket: s3Bucket,
        Key: file.s3Key,
        ResponseContentDisposition: `attachment; filename="${file.name}"`,
      });

      const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
      return res.json({ downloadUrl, isS3: true });
    }

    res.json({ downloadUrl: null, isS3: false });
  } catch (err) {
    console.error('S3 Download URL Error:', err);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// ==========================================
// 6. File Metadata Management Routes
// ==========================================

// GET /api/files (Fetch all files for authenticated user)
app.get('/api/files', authMiddleware, async (req, res) => {
  try {
    const files = await FileItem.find({ userId: req.user.id }).sort({ uploadDate: -1 });
    res.json({
      files: files.map((f) => ({
        id: f._id.toString(),
        name: f.name,
        size: f.size,
        type: f.type,
        s3Key: f.s3Key,
        uploadDate: f.uploadDate,
        isDeleted: f.isDeleted,
        isRecent: f.isRecent,
        starred: f.starred,
        contentSnippet: f.contentSnippet,
      })),
    });
  } catch (err) {
    console.error('Get files error:', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// POST /api/files (Create new file record after S3 upload)
app.post('/api/files', authMiddleware, async (req, res) => {
  try {
    const { name, size, type, s3Key, contentSnippet } = req.body;

    const newFile = new FileItem({
      userId: req.user.id,
      userEmail: req.user.email,
      name,
      size,
      type: type || 'document',
      s3Key: s3Key || null,
      contentSnippet: contentSnippet || '',
      isDeleted: false,
      isRecent: true,
      starred: false,
      uploadDate: new Date(),
    });

    await newFile.save();

    res.status(201).json({
      file: {
        id: newFile._id.toString(),
        name: newFile.name,
        size: newFile.size,
        type: newFile.type,
        s3Key: newFile.s3Key,
        uploadDate: newFile.uploadDate,
        isDeleted: newFile.isDeleted,
        isRecent: newFile.isRecent,
        starred: newFile.starred,
        contentSnippet: newFile.contentSnippet,
      },
    });
  } catch (err) {
    console.error('Create file record error:', err);
    res.status(500).json({ error: 'Failed to save file metadata' });
  }
});

// PATCH /api/files/:id (Update star, notes, delete/restore status)
app.patch('/api/files/:id', authMiddleware, async (req, res) => {
  try {
    const { starred, isDeleted, contentSnippet, name } = req.body;
    const file = await FileItem.findOne({ _id: req.params.id, userId: req.user.id });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (starred !== undefined) file.starred = starred;
    if (isDeleted !== undefined) file.isDeleted = isDeleted;
    if (contentSnippet !== undefined) file.contentSnippet = contentSnippet;
    if (name !== undefined) file.name = name;

    await file.save();

    res.json({
      file: {
        id: file._id.toString(),
        name: file.name,
        size: file.size,
        type: file.type,
        s3Key: file.s3Key,
        uploadDate: file.uploadDate,
        isDeleted: file.isDeleted,
        isRecent: file.isRecent,
        starred: file.starred,
        contentSnippet: file.contentSnippet,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// DELETE /api/files/:id (Permanently delete single file from DB and S3)
app.delete('/api/files/:id', authMiddleware, async (req, res) => {
  try {
    const file = await FileItem.findOne({ _id: req.params.id, userId: req.user.id });
    if (!file) return res.status(404).json({ error: 'File not found' });

    // Delete from S3 if client is configured
    if (s3Client && s3Bucket && file.s3Key) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: s3Bucket,
            Key: file.s3Key,
          })
        );
      } catch (s3Err) {
        console.warn('S3 object deletion notice:', s3Err.message);
      }
    }

    await FileItem.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'File permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// POST /api/files/empty-bin (Permanently purge all recycle bin files for user)
app.post('/api/files/empty-bin', authMiddleware, async (req, res) => {
  try {
    const deletedFiles = await FileItem.find({ userId: req.user.id, isDeleted: true });

    // Clean up from S3
    if (s3Client && s3Bucket) {
      for (const file of deletedFiles) {
        if (file.s3Key) {
          try {
            await s3Client.send(
              new DeleteObjectCommand({
                Bucket: s3Bucket,
                Key: file.s3Key,
              })
            );
          } catch (e) {}
        }
      }
    }

    await FileItem.deleteMany({ userId: req.user.id, isDeleted: true });
    res.json({ success: true, count: deletedFiles.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to empty recycle bin' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting/offline',
    s3: s3Client ? 'active' : 'simulated_fallback',
    time: new Date().toISOString(),
  });
});

// ==========================================
// 7. Serve Frontend Production Build (on EC2)
// ==========================================
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(` SafeVault Server running on http://localhost:${PORT}`);
});

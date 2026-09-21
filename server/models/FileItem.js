import mongoose from 'mongoose';

const fileItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['image', 'pdf', 'video', 'audio', 'archive', 'document', 'other'],
    default: 'document',
  },
  s3Key: {
    type: String,
    default: null,
  },
  contentSnippet: {
    type: String,
    default: '',
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isRecent: {
    type: Boolean,
    default: true,
  },
  starred: {
    type: Boolean,
    default: false,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
});

export const FileItem = mongoose.model('FileItem', fileItemSchema);

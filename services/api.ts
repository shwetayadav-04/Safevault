import { FileItem } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'safevault_jwt_token';

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

const getHeaders = (includeAuth = true) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

// ==========================================
// 1. Authentication Endpoints
// ==========================================

export const apiSignup = async (name: string, email: string, password: string) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: getHeaders(false),
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Signup failed');
  if (data.token) setAuthToken(data.token);
  return data;
};

export const apiLogin = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: getHeaders(false),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  if (data.token) setAuthToken(data.token);
  return data;
};

export const apiUpdateProfile = async (updates: { name?: string; avatarUrl?: string }) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update profile');
  return data.user;
};

// ==========================================
// 2. File Operations
// ==========================================

export const apiGetFiles = async (): Promise<FileItem[]> => {
  const res = await fetch(`${API_BASE_URL}/api/files`, {
    method: 'GET',
    headers: getHeaders(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch files');
  return (data.files || []).map((f: any) => ({
    ...f,
    uploadDate: new Date(f.uploadDate),
  }));
};

// Request S3 Presigned PUT URL
export const apiGetUploadUrl = async (fileName: string, fileType: string) => {
  const res = await fetch(`${API_BASE_URL}/api/s3/upload-url`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ fileName, fileType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get upload URL');
  return data; // { uploadUrl, s3Key, isS3 }
};

// Direct binary PUT upload to AWS S3 with live progress
export const apiUploadDirectToS3 = (
  uploadUrl: string,
  file: File,
  onProgress?: (percentage: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 Upload failed with status: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during S3 upload'));
    xhr.send(file);
  });
};

// Save uploaded file record in MongoDB
export const apiSaveFileRecord = async (fileData: {
  name: string;
  size: number;
  type: string;
  s3Key?: string | null;
  contentSnippet?: string;
}): Promise<FileItem> => {
  const res = await fetch(`${API_BASE_URL}/api/files`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(fileData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save file metadata');
  return {
    ...data.file,
    uploadDate: new Date(data.file.uploadDate),
  };
};

// Request S3 Presigned GET Download URL
export const apiGetDownloadUrl = async (fileId: string): Promise<string | null> => {
  const res = await fetch(`${API_BASE_URL}/api/s3/download-url/${fileId}`, {
    method: 'GET',
    headers: getHeaders(true),
  });
  const data = await res.json();
  if (!res.ok) return null;
  return data.downloadUrl || null;
};

// Update file (star, contentSnippet notes, etc.)
export const apiUpdateFile = async (
  fileId: string,
  updates: Partial<FileItem>
): Promise<FileItem> => {
  const res = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update file');
  return {
    ...data.file,
    uploadDate: new Date(data.file.uploadDate),
  };
};

// Delete file (move to recycle or permanent delete)
export const apiDeleteFile = async (fileId: string, permanent = false): Promise<void> => {
  if (permanent) {
    const res = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete file');
    }
  } else {
    await apiUpdateFile(fileId, { isDeleted: true });
  }
};

// Restore file from recycle bin
export const apiRestoreFile = async (fileId: string): Promise<FileItem> => {
  return apiUpdateFile(fileId, { isDeleted: false });
};

// Empty all recycle bin files permanently
export const apiEmptyRecycleBin = async (): Promise<number> => {
  const res = await fetch(`${API_BASE_URL}/api/files/empty-bin`, {
    method: 'POST',
    headers: getHeaders(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to empty recycle bin');
  return data.count || 0;
};

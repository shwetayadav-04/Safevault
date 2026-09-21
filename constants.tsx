
import React from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  FolderLock, 
  Clock, 
  Trash2, 
  Settings,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  FileQuestion
} from 'lucide-react';
import { FileType } from './types';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'upload', label: 'Upload', icon: <UploadCloud size={20} /> },
  { id: 'vault', label: 'My Vault', icon: <FolderLock size={20} /> },
  { id: 'recent', label: 'Recent', icon: <Clock size={20} /> },
  { id: 'recycle', label: 'Recycle Bin', icon: <Trash2 size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

export const getFileIcon = (type: FileType) => {
  switch (type) {
    case 'image': return <ImageIcon className="text-blue-500" />;
    case 'pdf': return <FileText className="text-red-500" />;
    case 'video': return <Film className="text-purple-500" />;
    case 'audio': return <Music className="text-green-500" />;
    case 'archive': return <Archive className="text-amber-500" />;
    default: return <FileQuestion className="text-gray-500" />;
  }
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

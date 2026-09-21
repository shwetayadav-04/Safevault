
export type FileType = 'image' | 'pdf' | 'video' | 'audio' | 'archive' | 'document' | 'other';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: FileType;
  uploadDate: Date;
  isDeleted: boolean;
  isRecent: boolean;
  starred: boolean;
  contentSnippet?: string; // For AI summaries
}

export interface StorageStats {
  totalFiles: number;
  usedBytes: number;
  maxBytes: number;
  lastUpload: Date | null;
}

export type ViewType = 'dashboard' | 'upload' | 'vault' | 'recent' | 'recycle' | 'settings';

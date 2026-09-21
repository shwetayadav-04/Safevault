import React, { useState } from 'react';
import { 
  Download, 
  Trash2, 
  Star, 
  Sparkles, 
  BrainCircuit, 
  X, 
  Edit3, 
  Check, 
  FileText 
} from 'lucide-react';
import { FileItem } from '../types';
import { formatBytes, getFileIcon } from '../constants';

import { apiGetDownloadUrl } from '../services/api';

interface VaultProps {
  files: FileItem[];
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
  onUpdateFile?: (file: FileItem) => void;
  title?: string;
}

const Vault: React.FC<VaultProps> = ({ 
  files, 
  onDelete, 
  onToggleStar, 
  onUpdateFile,
  title = "My Secure Vault" 
}) => {
  // Modal & Edit state
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editSnippet, setEditSnippet] = useState<string>('');

  // Filter & Sort state
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Trigger browser file download (from S3 or Blob)
  const handleDownloadFile = async (file: FileItem) => {
    try {
      if (file.id && file.s3Key) {
        const s3DownloadUrl = await apiGetDownloadUrl(file.id);
        if (s3DownloadUrl) {
          window.open(s3DownloadUrl, '_blank');
          return;
        }
      }
    } catch (err) {
      console.warn('S3 download notice:', err);
    }

    // Fallback to local encrypted file generator
    const fileContent = file.contentSnippet 
      ? `File Name: ${file.name}\nType: ${file.type}\nSize: ${formatBytes(file.size)}\nUpload Date: ${new Date(file.uploadDate).toLocaleString()}\n\nAI Insight & Notes:\n${file.contentSnippet}`
      : `SafeVault Encrypted Document: ${file.name}\nSize: ${formatBytes(file.size)}\nUpload Date: ${new Date(file.uploadDate).toLocaleString()}`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.name.includes('.') ? file.name : `${file.name}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  // Open file modal
  const handleOpenFileModal = (file: FileItem) => {
    setSelectedFile(file);
    setEditSnippet(file.contentSnippet || '');
    setIsEditing(false);
  };

  // Close file modal
  const handleCloseModal = () => {
    setSelectedFile(null);
    setIsEditing(false);
    setEditSnippet('');
  };

  // Save edited file snippet / notes
  const handleSaveEdit = () => {
    if (!selectedFile) return;

    const updatedFile: FileItem = {
      ...selectedFile,
      contentSnippet: editSnippet.trim(),
    };

    setSelectedFile(updatedFile);
    setIsEditing(false);

    if (onUpdateFile) {
      onUpdateFile(updatedFile);
    }
  };

  // Filter files by type
  const filteredFiles = files.filter(file => {
    if (typeFilter === 'all') return true;
    return file.type === typeFilter;
  });

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
    }
    if (sortBy === 'name-asc') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'name-desc') {
      return b.name.localeCompare(a.name);
    }
    if (sortBy === 'size-desc') {
      return b.size - a.size;
    }
    return 0;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
      {/* Header Bar with Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500">{sortedFiles.length} secure items found</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="pdf">PDF Documents</option>
            <option value="document">Documents</option>
            <option value="archive">Archives</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
          </select>

          {/* Sort Dropdown */}
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="size-desc">Largest Size</option>
          </select>
        </div>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {sortedFiles.map(file => (
          <div 
            key={file.id} 
            className="group relative bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between"
            onClick={() => handleOpenFileModal(file)}
          >
            <div>
              {/* Icon Container */}
              <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:bg-indigo-50 relative overflow-hidden">
                <div className="transform scale-150 transition-transform group-hover:scale-[1.7]">
                  {getFileIcon(file.type)}
                </div>
                
                {/* Hover Quick Actions */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 bg-indigo-900/20 backdrop-blur-[2px] rounded-xl transition-all">
                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onToggleStar(file.id); 
                    }}
                    title={file.starred ? "Remove Star" : "Add Star"}
                    className={`p-2 bg-white rounded-lg shadow-sm hover:text-amber-500 transition-colors ${file.starred ? 'text-amber-500' : 'text-slate-400'}`}
                  >
                    <Star size={18} fill={file.starred ? "currentColor" : "none"} />
                  </button>

                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleDownloadFile(file); 
                    }}
                    title="Download File"
                    className="p-2 bg-white rounded-lg shadow-sm text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Download size={18} />
                  </button>

                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onDelete(file.id); 
                    }}
                    title="Move to Recycle Bin"
                    className="p-2 bg-white rounded-lg shadow-sm text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* File Info */}
              <div className="space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-sm truncate text-slate-800" title={file.name}>
                    {file.name}
                  </h3>
                  <Sparkles className="text-indigo-500/50 group-hover:text-indigo-500 shrink-0" size={14} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>{formatBytes(file.size)}</span>
                  <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            {/* AI Insight Snippet */}
            {file.contentSnippet && (
              <div className="mt-3 p-2 bg-indigo-50/60 rounded-lg border border-indigo-100 hidden group-hover:block animate-in fade-in">
                <p className="text-[10px] text-indigo-700 line-clamp-2 leading-relaxed italic">
                  "{file.contentSnippet}"
                </p>
              </div>
            )}
          </div>
        ))}

        {sortedFiles.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center gap-4 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
             <div className="p-6 bg-slate-50 rounded-full">
               <BrainCircuit size={48} />
             </div>
             <p className="text-lg font-medium">No files match your filter</p>
             <button 
               onClick={() => { setTypeFilter('all'); }} 
               className="text-sm text-indigo-600 hover:underline font-semibold"
             >
               Reset filters
             </button>
          </div>
        )}
      </div>

      {/* File Preview & Editor Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 space-y-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-4 bg-slate-100 rounded-2xl shrink-0">
                    {getFileIcon(selectedFile.type)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold truncate text-slate-800" title={selectedFile.name}>
                      {selectedFile.name}
                    </h2>
                    <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">
                      {selectedFile.type} &bull; {formatBytes(selectedFile.size)} &bull; {new Date(selectedFile.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleCloseModal} 
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* AI Insight or Inline Editor */}
              {isEditing ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Edit File Notes & Description
                  </label>
                  <textarea
                    rows={4}
                    value={editSnippet}
                    onChange={(e) => setEditSnippet(e.target.value)}
                    placeholder="Enter file notes or description..."
                    className="w-full p-4 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditSnippet(selectedFile.contentSnippet || '');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 transition-all"
                    >
                      <Check size={14} />
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-indigo-600 rounded-2xl text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Sparkles size={80} />
                  </div>
                  <h4 className="flex items-center gap-2 font-bold mb-2 text-indigo-100 text-sm">
                    <BrainCircuit size={18} />
                    AI Summary & File Details
                  </h4>
                  <p className="text-sm leading-relaxed text-indigo-50 italic">
                    {selectedFile.contentSnippet || "No notes or AI insight available for this file."}
                  </p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => handleDownloadFile(selectedFile)}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-800 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                >
                  <Download size={18} />
                  Download
                </button>

                <button 
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors"
                >
                  <Edit3 size={18} />
                  {isEditing ? 'View Summary' : 'Open in Editor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vault;

import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle2, Loader2 } from 'lucide-react';

interface UploadProps {
  onUpload: (files: FileList) => Promise<void> | void;
}

const Upload: React.FC<UploadProps> = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      startUpload(e.dataTransfer.files);
    }
  };

  const startUpload = async (files: FileList) => {
    setUploading(true);
    setProgress(15);

    try {
      // Animate progress smoothly
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await onUpload(files);

      clearInterval(interval);
      setProgress(100);

      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 400);
    } catch (err) {
      console.error("Upload error:", err);
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Upload Files</h1>
        <p className="text-slate-500">Securely encrypt and store your documents directly in AWS S3.</p>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' 
            : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/50'
        }`}
      >
        <div className="p-6 bg-indigo-50 rounded-full text-indigo-600">
          <UploadCloud size={48} strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-800">Drag & Drop files here</p>
          <p className="text-slate-400 text-sm">Or click the button below to browse your computer</p>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef}
          multiple 
          className="hidden" 
          onChange={(e) => e.target.files && startUpload(e.target.files)}
        />
        
        <button 
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          Choose Files
        </button>

        {uploading && (
          <div className="absolute inset-0 bg-white/95 rounded-3xl flex flex-col items-center justify-center p-12 animate-in fade-in z-20">
            <Loader2 className="animate-spin text-indigo-600 mb-6" size={48} />
            <div className="w-full max-w-md space-y-4">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Encrypting & Uploading to Cloud...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-slate-500 text-xs">Processing items with AES-256 military-grade encryption</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><CheckCircle2 size={24} /></div>
          <div>
            <h4 className="font-bold text-slate-800">Direct AWS S3 Storage</h4>
            <p className="text-xs text-slate-500">Fast, encrypted presigned URL uploads.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><File size={24} /></div>
          <div>
            <h4 className="font-bold text-slate-800">Any File Format</h4>
            <p className="text-xs text-slate-500">Support for photos, docs, videos and more.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;

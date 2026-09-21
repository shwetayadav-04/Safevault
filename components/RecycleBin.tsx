
import React from 'react';
import { RotateCcw, Trash2, ShieldAlert } from 'lucide-react';
import { FileItem } from '../types';
import { formatBytes, getFileIcon } from '../constants';

interface RecycleBinProps {
  files: FileItem[];
  onRestore: (id: string) => void;
  onDelete: (id: string, permanent: boolean) => void;
  onEmptyBin: () => void;
}

const RecycleBin: React.FC<RecycleBinProps> = ({ files, onRestore, onDelete, onEmptyBin }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Recycle Bin</h1>
          <p className="text-slate-500">Files here will be automatically purged after 30 days.</p>
        </div>
        <button 
          onClick={onEmptyBin}
          disabled={files.length === 0}
          className="text-red-600 font-semibold hover:text-red-700 transition-colors px-4 py-2 hover:bg-red-50 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          Empty Bin
        </button>
      </div>

      {files.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-24 flex flex-col items-center justify-center gap-4 text-slate-400">
          <div className="p-6 bg-slate-50 rounded-full"><Trash2 size={48} /></div>
          <p className="text-lg">Your recycle bin is clean!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map(file => (
            <div key={file.id} className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-4 group opacity-70 grayscale-[0.3] hover:opacity-100 hover:grayscale-0 transition-all shadow-sm hover:shadow-lg">
              <div className="p-4 bg-slate-50 rounded-2xl">{getFileIcon(file.type)}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{file.name}</h3>
                <p className="text-xs text-slate-400">{formatBytes(file.size)} &bull; Deleted Today</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onRestore(file.id)}
                  title="Restore"
                  className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                >
                  <RotateCcw size={18} />
                </button>
                <button 
                  onClick={() => onDelete(file.id, true)}
                  title="Delete Forever"
                  className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-center gap-4">
        <div className="p-3 bg-white text-amber-500 rounded-xl shadow-sm"><ShieldAlert size={24} /></div>
        <p className="text-sm text-amber-800 font-medium">
          Deleted items are stored for 30 days. Permanent deletion removes files from our encrypted clusters globally.
        </p>
      </div>
    </div>
  );
};

export default RecycleBin;

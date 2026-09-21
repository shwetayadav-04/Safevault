import React from 'react';
import { HardDrive, Files, History, ArrowUpRight, MoreVertical, Download, ExternalLink } from 'lucide-react';
import { FileItem } from '../types';
import { formatBytes, getFileIcon } from '../constants';

interface DashboardProps {
  files: FileItem[];
  userName?: string;
  onViewVault: () => void;
}

const TOTAL_CAPACITY_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

const Dashboard: React.FC<DashboardProps> = ({ files, userName = 'User', onViewVault }) => {
  const activeFiles = files.filter(f => !f.isDeleted);
  const totalSize = activeFiles.reduce((acc, f) => acc + f.size, 0);
  const recentFiles = [...activeFiles]
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .slice(0, 5);

  const usedPercentage = ((totalSize / TOTAL_CAPACITY_BYTES) * 100).toFixed(1);

  // File download helper
  const handleDownloadFile = (file: FileItem) => {
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

  const stats = [
    { 
      label: 'Total Files', 
      value: activeFiles.length, 
      icon: <Files className="text-indigo-600" />, 
      trend: `${activeFiles.length} active in vault` 
    },
    { 
      label: 'Storage Used', 
      value: formatBytes(totalSize), 
      icon: <HardDrive className="text-emerald-600" />, 
      trend: `${usedPercentage}% of 10 GB capacity` 
    },
    { 
      label: 'Last Upload', 
      value: activeFiles[0]?.uploadDate ? new Date(activeFiles[0].uploadDate).toLocaleDateString() : 'N/A', 
      icon: <History className="text-amber-600" />, 
      trend: activeFiles.length > 0 ? 'Synchronized' : 'No uploads yet' 
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Welcome & Quick Jump */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome back, {userName}!</h1>
          <p className="text-slate-500">Here's what's happening in your vault today.</p>
        </div>
        <button 
          type="button"
          onClick={onViewVault}
          className="flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
        >
          View All Files <ArrowUpRight size={18} />
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                {stat.icon}
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold mb-1 text-slate-800">{stat.value}</p>
            <p className="text-xs text-slate-400">{stat.trend}</p>
          </div>
        ))}
      </div>

      {/* Recent Files Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-lg text-slate-800">Recent Files</h2>
          <button 
            type="button"
            onClick={onViewVault}
            title="View all files in vault"
            className="text-xs text-indigo-600 hover:underline font-semibold"
          >
            See all
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Size</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentFiles.map(file => (
                <tr key={file.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-white transition-colors">
                        {getFileIcon(file.type)}
                      </div>
                      <span className="font-medium text-slate-700">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 capitalize">{file.type}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatBytes(file.size)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(file.uploadDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        type="button"
                        onClick={() => handleDownloadFile(file)}
                        title="Download File"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        type="button"
                        onClick={onViewVault}
                        title="Open in Vault"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {recentFiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No files found. Start by uploading some!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

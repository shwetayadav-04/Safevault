import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, Star, LogOut } from 'lucide-react';
import { FileItem, ViewType, FileType } from './types';
import { NAV_ITEMS, formatBytes } from './constants';
import { getFileInsight } from './services/geminiService';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Vault from './components/Vault';
import RecycleBin from './components/RecycleBin';
import Settings from './components/Settings';
import Auth from './components/Auth';

const STORAGE_KEY = 'safevault_stored_files';
const PROFILE_STORAGE_KEY = 'safevault_user_profile';
const AUTH_STORAGE_KEY = 'safevault_auth_state';
const TOTAL_STORAGE_CAPACITY = 10 * 1024 * 1024 * 1024; // 10 GB

const DEFAULT_PROFILE = {
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  avatarUrl: 'https://picsum.photos/seed/alex/120/120',
};

const DEFAULT_FILES: FileItem[] = [
  { id: '1', name: 'resume_2024.pdf', size: 245000, type: 'pdf', uploadDate: new Date(), isDeleted: false, isRecent: true, starred: true, contentSnippet: 'Professional resume with updated experience in web engineering.' },
  { id: '2', name: 'vacation_photo.jpg', size: 3500000, type: 'image', uploadDate: new Date(Date.now() - 86400000), isDeleted: false, isRecent: true, starred: false, contentSnippet: 'High-resolution landscape photo from summer trip.' },
  { id: '3', name: 'project_backup.zip', size: 120000000, type: 'archive', uploadDate: new Date(Date.now() - 172800000), isDeleted: false, isRecent: false, starred: false, contentSnippet: 'Compressed source code archive and database snapshot.' },
  { id: '4', name: 'notes.txt', size: 5000, type: 'document', uploadDate: new Date(), isDeleted: false, isRecent: true, starred: false, contentSnippet: 'Meeting minutes and action items from product sync.' },
  { id: '5', name: 'deleted_draft.docx', size: 15000, type: 'document', uploadDate: new Date(), isDeleted: true, isRecent: false, starred: false, contentSnippet: 'Draft document slated for deletion.' },
];

const loadInitialFiles = (): FileItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((file: any) => ({
          ...file,
          uploadDate: new Date(file.uploadDate),
        }));
      }
    }
  } catch (err) {
    console.warn("Failed to load files from localStorage:", err);
  }
  return DEFAULT_FILES;
};

const loadInitialProfile = () => {
  try {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.warn("Failed to load profile from localStorage:", err);
  }
  return DEFAULT_PROFILE;
};

const loadInitialAuth = (): boolean => {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved !== null ? JSON.parse(saved) : true;
  } catch {
    return true;
  }
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(loadInitialAuth);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [files, setFiles] = useState<FileItem[]>(loadInitialFiles);
  const [userProfile, setUserProfile] = useState(loadInitialProfile);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sync auth state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(isAuthenticated));
    } catch (err) {
      console.warn("Failed to save auth state to localStorage:", err);
    }
  }, [isAuthenticated]);

  // Sync files to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch (err) {
      console.warn("Failed to save files to localStorage:", err);
    }
  }, [files]);

  // Sync user profile to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
    } catch (err) {
      console.warn("Failed to save user profile to localStorage:", err);
    }
  }, [userProfile]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Login handler
  const handleLogin = (user: { name: string; email: string; avatarUrl: string }) => {
    setUserProfile(user);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
    showNotification(`Welcome back, ${user.name}!`, 'success');
  };

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setShowStarredOnly(false);
    showNotification('Logged out successfully', 'success');
  };

  // Upload handler
  const handleUpload = async (newFiles: FileList) => {
    const addedFiles: FileItem[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];
      const typeStr = f.type.split('/')[0] as FileType;
      const fileType: FileType = ['image', 'video', 'audio'].includes(typeStr)
        ? typeStr
        : (f.name.endsWith('.pdf') ? 'pdf' : 'document');

      const insight = await getFileInsight(f.name, fileType);

      addedFiles.push({
        id: Math.random().toString(36).substring(2, 11),
        name: f.name,
        size: f.size,
        type: fileType,
        uploadDate: new Date(),
        isDeleted: false,
        isRecent: true,
        starred: false,
        contentSnippet: insight,
      });
    }

    setFiles(prev => [...addedFiles, ...prev]);
    showNotification(`Successfully uploaded ${newFiles.length} file(s)`);
    setCurrentView('vault');
  };

  // Delete file handler
  const deleteFile = (id: string, permanent: boolean = false) => {
    if (permanent) {
      setFiles(prev => prev.filter(f => f.id !== id));
      showNotification("File permanently deleted", "success");
    } else {
      setFiles(prev => prev.map(f => (f.id === id ? { ...f, isDeleted: true } : f)));
      showNotification("Moved to Recycle Bin", "success");
    }
  };

  // Restore file handler
  const restoreFile = (id: string) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, isDeleted: false } : f)));
    showNotification("File restored", "success");
  };

  // Empty bin handler
  const emptyRecycleBin = () => {
    const deletedCount = files.filter(f => f.isDeleted).length;
    if (deletedCount === 0) return;
    setFiles(prev => prev.filter(f => !f.isDeleted));
    showNotification(`Permanently deleted ${deletedCount} item(s) from Recycle Bin`, "success");
  };

  // Star toggle handler
  const toggleStar = (id: string) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, starred: !f.starred } : f)));
  };

  // Edit file handler
  const handleUpdateFile = (updatedFile: FileItem) => {
    setFiles(prev => prev.map(f => (f.id === updatedFile.id ? updatedFile : f)));
    showNotification("File updated successfully", "success");
  };

  // Update profile handler
  const handleUpdateProfile = (newProfile: { name: string; email: string; avatarUrl: string }) => {
    setUserProfile(newProfile);
  };

  // Toggle starred filter from header
  const handleToggleStarredView = () => {
    if (!showStarredOnly) {
      setShowStarredOnly(true);
      setCurrentView('vault');
      showNotification("Showing starred files");
    } else {
      setShowStarredOnly(false);
      showNotification("Showing all vault files");
    }
  };

  // If user is not logged in, render the Auth (Login/Signup) Page
  if (!isAuthenticated) {
    return (
      <>
        <Auth onLogin={handleLogin} />
        {notification && (
          <div
            className={`fixed bottom-8 right-8 px-6 py-3 rounded-xl shadow-2xl z-50 transform animate-bounce flex items-center gap-3 ${
              notification.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            <span>{notification.message}</span>
          </div>
        )}
      </>
    );
  }

  // Calculate dynamic storage usage
  const activeFiles = files.filter(f => !f.isDeleted);
  const totalUsedBytes = activeFiles.reduce((acc, f) => acc + f.size, 0);
  const storagePercentage = Math.min(100, (totalUsedBytes / TOTAL_STORAGE_CAPACITY) * 100);
  const storagePercentageDisplay = storagePercentage > 0 && storagePercentage < 1 
    ? storagePercentage.toFixed(1) 
    : Math.round(storagePercentage);

  // Filtered files for current view
  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStar = showStarredOnly ? f.starred : true;
    const matchesDeleted = currentView === 'recycle' ? f.isDeleted : !f.isDeleted;
    return matchesSearch && matchesStar && matchesDeleted;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">SafeVault</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setShowStarredOnly(false);
                setCurrentView(item.id as ViewType);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === item.id && !showStarredOnly
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Dynamic Storage Meter & Quick Logout */}
        <div className="p-6 border-t border-slate-800 space-y-4">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex justify-between text-xs mb-2">
              <span>Storage Used</span>
              <span className="text-white font-semibold">{storagePercentageDisplay}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500 rounded-full" 
                style={{ width: `${Math.max(2, storagePercentage)}%` }} 
              />
            </div>
            <p className="text-[10px] mt-2 text-slate-400">
              {formatBytes(totalUsedBytes)} of 10 GB used
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/50 hover:border-red-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="relative w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search in vault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl outline-none text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleToggleStarredView}
              title={showStarredOnly ? "View all files" : "View starred files"}
              className={`p-2 rounded-lg transition-colors ${
                showStarredOnly 
                  ? 'bg-amber-50 text-amber-500 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-100 hover:text-amber-500'
              }`}
            >
              <Star size={20} fill={showStarredOnly ? "currentColor" : "none"} />
            </button>

            <div className="h-8 w-px bg-slate-200 mx-2" />

            {/* Profile Pill in Top Header */}
            <div 
              onClick={() => {
                setShowStarredOnly(false);
                setCurrentView('settings');
              }}
              title="Open Settings"
              className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">{userProfile.name}</p>
                <p className="text-xs text-slate-500">Pro Plan</p>
              </div>
              <img 
                src={userProfile.avatarUrl} 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" 
                alt="Profile" 
              />
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {currentView === 'dashboard' && (
            <Dashboard 
              files={files} 
              onViewVault={() => {
                setShowStarredOnly(false);
                setCurrentView('vault');
              }} 
            />
          )}

          {currentView === 'upload' && (
            <Upload onUpload={handleUpload} />
          )}

          {currentView === 'vault' && (
            <Vault
              files={filteredFiles}
              onDelete={deleteFile}
              onToggleStar={toggleStar}
              onUpdateFile={handleUpdateFile}
              title={showStarredOnly ? "Starred Files" : "My Secure Vault"}
            />
          )}

          {currentView === 'recent' && (
            <Vault
              files={files.filter(f => f.isRecent && !f.isDeleted)}
              onDelete={deleteFile}
              onToggleStar={toggleStar}
              onUpdateFile={handleUpdateFile}
              title="Recently Uploaded"
            />
          )}

          {currentView === 'recycle' && (
            <RecycleBin
              files={files.filter(f => f.isDeleted)}
              onRestore={restoreFile}
              onDelete={deleteFile}
              onEmptyBin={emptyRecycleBin}
            />
          )}

          {currentView === 'settings' && (
            <Settings 
              userProfile={userProfile}
              onUpdateProfile={handleUpdateProfile}
              onLogout={handleLogout}
              onNotification={showNotification} 
            />
          )}
        </div>
      </main>

      {/* Notifications Toast */}
      {notification && (
        <div
          className={`fixed bottom-8 right-8 px-6 py-3 rounded-xl shadow-2xl z-50 transform animate-bounce flex items-center gap-3 ${
            notification.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default App;

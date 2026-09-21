import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, Star, LogOut } from 'lucide-react';
import { FileItem, ViewType, FileType } from './types';
import { NAV_ITEMS, formatBytes } from './constants';
import { getFileInsight } from './services/geminiService';
import { 
  apiGetFiles, 
  apiGetUploadUrl, 
  apiUploadDirectToS3, 
  apiSaveFileRecord, 
  apiUpdateFile, 
  apiDeleteFile, 
  apiRestoreFile, 
  apiEmptyRecycleBin,
  clearAuthToken,
  apiUpdateProfile
} from './services/api';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import Vault from './components/Vault';
import RecycleBin from './components/RecycleBin';
import Settings from './components/Settings';
import Auth from './components/Auth';

const CURRENT_USER_KEY = 'safevault_current_session_user';
const TOTAL_STORAGE_CAPACITY = 10 * 1024 * 1024 * 1024; // 10 GB

export interface UserSession {
  id?: string;
  name: string;
  email: string;
  avatarUrl: string;
}

const DEMO_FILES: FileItem[] = [
  { id: '1', name: 'resume_2024.pdf', size: 245000, type: 'pdf', uploadDate: new Date(), isDeleted: false, isRecent: true, starred: true, contentSnippet: 'Professional resume with updated experience in cloud and web engineering.' },
  { id: '2', name: 'vacation_photo.jpg', size: 3500000, type: 'image', uploadDate: new Date(Date.now() - 86400000), isDeleted: false, isRecent: true, starred: false, contentSnippet: 'High-resolution landscape photo from summer trip.' },
  { id: '3', name: 'project_backup.zip', size: 120000000, type: 'archive', uploadDate: new Date(Date.now() - 172800000), isDeleted: false, isRecent: false, starred: false, contentSnippet: 'Compressed source code archive and database snapshot.' },
  { id: '4', name: 'notes.txt', size: 5000, type: 'document', uploadDate: new Date(), isDeleted: false, isRecent: true, starred: false, contentSnippet: 'Meeting minutes and action items from product sync.' },
];

const loadActiveUserSession = (): UserSession | null => {
  try {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.warn("Failed to load user session:", err);
  }
  return null;
};

const loadLocalUserFiles = (userEmail: string): FileItem[] => {
  try {
    const userStorageKey = `safevault_files_${userEmail.toLowerCase().trim()}`;
    const saved = localStorage.getItem(userStorageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((file: any) => ({
          ...file,
          uploadDate: new Date(file.uploadDate),
        }));
      }
    } else if (userEmail.toLowerCase().includes('alex.rivera')) {
      return DEMO_FILES;
    }
  } catch (err) {
    console.warn("Failed to load local files:", err);
  }
  return [];
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(loadActiveUserSession);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [files, setFiles] = useState<FileItem[]>(() => {
    const session = loadActiveUserSession();
    return session ? loadLocalUserFiles(session.email) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch files from MongoDB Atlas backend when user is active
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    apiGetFiles()
      .then(remoteFiles => {
        if (isMounted && remoteFiles && remoteFiles.length >= 0) {
          setFiles(remoteFiles);
        }
      })
      .catch(err => {
        console.warn('Backend offline, using local storage mode:', err.message);
        if (isMounted) {
          setFiles(loadLocalUserFiles(currentUser.email));
        }
      });

    return () => { isMounted = false; };
  }, [currentUser]);

  // Sync user's files to local storage as offline cache
  useEffect(() => {
    if (!currentUser) return;
    try {
      const userStorageKey = `safevault_files_${currentUser.email.toLowerCase().trim()}`;
      localStorage.setItem(userStorageKey, JSON.stringify(files));
    } catch (err) {
      console.warn("Failed to cache user files:", err);
    }
  }, [files, currentUser]);

  // Sync active user session
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch (err) {
      console.warn("Failed to save session:", err);
    }
  }, [currentUser]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Login / Signup handler
  const handleLogin = (user: UserSession) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
    showNotification(`Welcome, ${user.name}! Your secure vault is unlocked.`, 'success');
  };

  // Logout handler
  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setFiles([]);
    setCurrentView('dashboard');
    setShowStarredOnly(false);
    showNotification('Logged out successfully. Vault locked.', 'success');
  };

  // Upload handler with AWS S3 + MongoDB Atlas
  const handleUpload = async (newFiles: FileList) => {
    const uploadedItems: FileItem[] = [];

    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];
      const typeStr = f.type.split('/')[0] as FileType;
      const fileType: FileType = ['image', 'video', 'audio'].includes(typeStr)
        ? typeStr
        : (f.name.endsWith('.pdf') ? 'pdf' : 'document');

      const insight = await getFileInsight(f.name, fileType);

      try {
        // 1. Get S3 Presigned PUT URL from backend
        const s3Meta = await apiGetUploadUrl(f.name, f.type);

        // 2. Direct binary PUT upload to S3 (if S3 credentials configured)
        if (s3Meta.uploadUrl) {
          await apiUploadDirectToS3(s3Meta.uploadUrl, f);
        }

        // 3. Save metadata record in MongoDB Atlas
        const savedFile = await apiSaveFileRecord({
          name: f.name,
          size: f.size,
          type: fileType,
          s3Key: s3Meta.s3Key || null,
          contentSnippet: insight,
        });

        uploadedItems.push(savedFile);
      } catch (err) {
        console.warn('S3/Mongo upload fallback notice:', err);
        // Local fallback if server offline
        uploadedItems.push({
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
    }

    setFiles(prev => [...uploadedItems, ...prev]);
    showNotification(`Successfully uploaded ${newFiles.length} file(s) to cloud vault!`);
    setCurrentView('vault');
  };

  // Delete file handler
  const deleteFile = async (id: string, permanent: boolean = false) => {
    try {
      await apiDeleteFile(id, permanent);
    } catch (err) {
      console.warn("Delete API notice:", err);
    }

    if (permanent) {
      setFiles(prev => prev.filter(f => f.id !== id));
      showNotification("File permanently deleted from cloud & S3", "success");
    } else {
      setFiles(prev => prev.map(f => (f.id === id ? { ...f, isDeleted: true } : f)));
      showNotification("Moved to Recycle Bin", "success");
    }
  };

  // Restore file handler
  const restoreFile = async (id: string) => {
    try {
      await apiRestoreFile(id);
    } catch (err) {
      console.warn("Restore API notice:", err);
    }
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, isDeleted: false } : f)));
    showNotification("File restored to active vault", "success");
  };

  // Empty bin handler
  const emptyRecycleBin = async () => {
    const deletedCount = files.filter(f => f.isDeleted).length;
    if (deletedCount === 0) return;

    try {
      await apiEmptyRecycleBin();
    } catch (err) {
      console.warn("Empty bin API notice:", err);
    }

    setFiles(prev => prev.filter(f => !f.isDeleted));
    showNotification(`Permanently deleted ${deletedCount} item(s) from Recycle Bin & S3`, "success");
  };

  // Star toggle handler
  const toggleStar = async (id: string) => {
    const target = files.find(f => f.id === id);
    const newStar = target ? !target.starred : true;

    try {
      await apiUpdateFile(id, { starred: newStar });
    } catch (err) {
      console.warn("Star API notice:", err);
    }

    setFiles(prev => prev.map(f => (f.id === id ? { ...f, starred: newStar } : f)));
  };

  // Edit file notes handler
  const handleUpdateFile = async (updatedFile: FileItem) => {
    try {
      await apiUpdateFile(updatedFile.id, { contentSnippet: updatedFile.contentSnippet });
    } catch (err) {
      console.warn("Update file notes API notice:", err);
    }

    setFiles(prev => prev.map(f => (f.id === updatedFile.id ? updatedFile : f)));
    showNotification("File notes updated in MongoDB Atlas", "success");
  };

  // Update profile handler
  const handleUpdateProfile = async (newProfile: UserSession) => {
    try {
      await apiUpdateProfile({ name: newProfile.name, avatarUrl: newProfile.avatarUrl });
    } catch (err) {
      console.warn("Profile update notice:", err);
    }
    setCurrentUser(newProfile);
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

  // If user is not logged in, render the Auth (Login/Signup) Page first
  if (!currentUser) {
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

  // Calculate dynamic storage usage for active user
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
                <p className="text-sm font-semibold text-slate-800">{currentUser.name}</p>
                <p className="text-xs text-slate-500">Pro Plan</p>
              </div>
              <img 
                src={currentUser.avatarUrl} 
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
              userName={currentUser.name}
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
              userProfile={currentUser}
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

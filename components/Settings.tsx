import React, { useState, useRef } from 'react';
import { Mail, Bell, Key, LogOut, Camera, Check, ShieldCheck, X, Upload } from 'lucide-react';

interface SettingsProps {
  userProfile?: {
    name: string;
    email: string;
    avatarUrl: string;
  };
  onUpdateProfile?: (profile: { name: string; email: string; avatarUrl: string }) => void;
  onLogout?: () => void;
  onNotification?: (message: string, type?: 'success' | 'error') => void;
}

const Settings: React.FC<SettingsProps> = ({
  userProfile = {
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    avatarUrl: 'https://picsum.photos/seed/alex/120/120',
  },
  onUpdateProfile,
  onLogout,
  onNotification,
}) => {
  // User Profile State
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState(userProfile.name);
  const [tempEmail, setTempEmail] = useState(userProfile.email);

  // Hidden File Input Ref for custom avatar uploads
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Notification Toggles State
  const [notifications, setNotifications] = useState({
    uploadCompletion: true,
    securityAlerts: true,
    storageWarnings: false,
  });

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    if (onNotification) {
      onNotification(msg, type);
    }
  };

  // Toggle notification preference
  const handleToggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      notify(`Notification preferences updated`);
      return updated;
    });
  };

  // Save profile changes
  const handleSaveProfile = () => {
    setName(tempName);
    setEmail(tempEmail);
    setIsEditingProfile(false);
    if (onUpdateProfile) {
      onUpdateProfile({ name: tempName, email: tempEmail, avatarUrl });
    }
    notify('Profile details updated successfully');
  };

  // Cancel profile changes
  const handleCancelProfile = () => {
    setTempName(name);
    setTempEmail(email);
    setIsEditingProfile(false);
  };

  // Handle local image upload from user device
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image format
    if (!file.type.startsWith('image/')) {
      notify('Please choose a valid image file (PNG, JPG, WebP)', 'error');
      return;
    }

    // Validate size (under 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      notify('Image size must be less than 5 MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setAvatarUrl(result);
        if (onUpdateProfile) {
          onUpdateProfile({ name, email, avatarUrl: result });
        }
        notify('Custom profile photo uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  // Toggle 2FA
  const handleToggle2FA = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    notify(
      !twoFactorEnabled ? 'Two-Factor Authentication activated' : 'Two-Factor Authentication disabled',
      !twoFactorEnabled ? 'success' : 'error'
    );
  };

  // Submit Password Change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      notify('Please enter both current and new password', 'error');
      return;
    }
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    notify('Password changed successfully');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-20">
      <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png, image/jpeg, image/webp, image/gif"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      {/* Profile Section */}
      <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <img 
              src={avatarUrl} 
              className="w-32 h-32 rounded-3xl object-cover ring-4 ring-slate-50 shadow-xl border border-slate-100" 
              alt="Profile" 
            />
            {/* Click to open file chooser from computer */}
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload photo from computer"
              className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            >
              <Camera size={18} />
            </button>
          </div>

          <div className="flex-1 text-center md:text-left space-y-2 w-full">
            {isEditingProfile ? (
              <div className="space-y-3 max-w-sm">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Display Name</label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Email Address</label>
                  <input
                    type="email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelProfile}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-800">{name}</h2>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-500 text-sm">
                  <span className="flex items-center gap-1">
                    <Mail size={16} /> {email}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs">
                    <ShieldCheck size={14} /> Verified Account
                  </span>
                </div>
                <p className="text-xs text-slate-400 pt-1">
                  Click the camera icon on your photo to upload an image from your device.
                </p>
              </>
            )}
          </div>

          {!isEditingProfile && (
            <div className="flex flex-col gap-2 shrink-0">
              <button 
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="bg-slate-100 text-slate-800 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-semibold py-1.5"
              >
                <Upload size={14} /> Upload Avatar
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Security Box */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-bold flex items-center gap-2 mb-6 text-slate-800">
              <Key size={20} className="text-indigo-600" /> Security
            </h3>
            <div className="space-y-4">
              <button 
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="w-full text-left p-4 hover:bg-slate-50 rounded-2xl transition-colors flex justify-between items-center group"
              >
                <div>
                  <p className="font-semibold text-slate-800">Change Password</p>
                  <p className="text-xs text-slate-500">Last changed 3 months ago</p>
                </div>
                <div className="h-8 w-8 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  →
                </div>
              </button>

              <button 
                type="button"
                onClick={handleToggle2FA}
                className="w-full text-left p-4 hover:bg-slate-50 rounded-2xl transition-colors flex justify-between items-center group"
              >
                <div>
                  <p className="font-semibold text-slate-800">Two-Factor Authentication</p>
                  <p className={`text-xs font-medium ${twoFactorEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {twoFactorEnabled ? 'Active (SMS/Email)' : 'Disabled'}
                  </p>
                </div>
                <div className="h-8 w-8 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  {twoFactorEnabled ? '✓' : '✕'}
                </div>
              </button>
            </div>
          </div>

          {/* Notifications Box */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-bold flex items-center gap-2 mb-6 text-slate-800">
              <Bell size={20} className="text-indigo-600" /> Notifications
            </h3>
            <div className="space-y-4">
              {[
                { id: 'uploadCompletion' as const, label: 'Upload completion' },
                { id: 'securityAlerts' as const, label: 'Security alerts' },
                { id: 'storageWarnings' as const, label: 'Storage warnings' }
              ].map((item) => {
                const active = notifications[item.id];
                return (
                  <div key={item.id} className="flex justify-between items-center p-2">
                    <span className="text-slate-700 font-medium text-sm">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleNotification(item.id)}
                      className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none ${
                        active ? 'bg-indigo-600' : 'bg-slate-200'
                      }`}
                    >
                      <div 
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
                          active ? 'right-1' : 'left-1'
                        }`} 
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Upgrade Plan */}
          <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -translate-y-12 translate-x-12" />
            <h3 className="font-bold text-xl mb-2">Upgrade to Enterprise</h3>
            <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
              Get unlimited storage, advanced team collaboration, and priority 24/7 support.
            </p>
            <button 
              type="button"
              onClick={() => notify('Enterprise upgrade inquiry submitted. A representative will contact you.', 'success')}
              className="w-full bg-white text-indigo-900 py-3 rounded-2xl font-bold shadow-xl hover:bg-indigo-50 active:scale-98 transition-all"
            >
              Upgrade Now
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50/50 rounded-3xl p-6 border border-red-100">
            <h3 className="text-red-600 font-bold mb-4">Danger Zone</h3>
            <button 
              type="button"
              onClick={() => {
                notify('Logged out of all active sessions', 'success');
                if (onLogout) {
                  setTimeout(() => onLogout(), 300);
                }
              }}
              className="w-full flex items-center justify-center gap-2 text-red-600 bg-white border border-red-100 py-3 rounded-2xl font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm cursor-pointer"
            >
              <LogOut size={20} /> Logout from all devices
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Change Password</h3>
              <button 
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Password</label>
                <input 
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                <input 
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-md transition-all"
                >
                  <Check size={14} /> Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

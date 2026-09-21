import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, ArrowRight, Sparkles, CheckCircle2, KeyRound } from 'lucide-react';

interface AuthProps {
  onLogin: (user: { name: string; email: string; avatarUrl: string }) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (isSignUp && !name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    const displayName = isSignUp ? name.trim() : (email.split('@')[0] || 'Alex Rivera');
    const avatarUrl = `https://picsum.photos/seed/${displayName.toLowerCase().replace(/\s+/g, '')}/120/120`;

    onLogin({
      name: displayName,
      email: email.trim(),
      avatarUrl,
    });
  };

  // Quick Demo Login for instant access
  const handleDemoLogin = () => {
    onLogin({
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      avatarUrl: 'https://picsum.photos/seed/alex/120/120',
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side: Brand & Feature Highlights */}
        <div className="p-8 sm:p-12 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-700/50">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/30">
                <ShieldCheck className="text-white" size={28} />
              </div>
              <span className="text-2xl font-bold tracking-tight">SafeVault</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold mb-4 leading-tight">
              Military-Grade Secure Cloud Storage.
            </h2>
            <p className="text-indigo-200 text-sm leading-relaxed mb-8">
              Store, encrypt, and analyze your private files with AI-powered insights and total privacy.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 size={18} className="text-indigo-400 shrink-0" />
                <span>Zero-Knowledge AES-256 Encryption</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Sparkles size={18} className="text-indigo-400 shrink-0" />
                <span>AI File Summary & Semantic Insights</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <KeyRound size={18} className="text-indigo-400 shrink-0" />
                <span>Encrypted 30-Day Version Recovery</span>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-slate-800 text-xs text-slate-400">
            &copy; 2026 SafeVault Cloud Security. All rights reserved.
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center bg-slate-900/60">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white mb-2">
              {isSignUp ? 'Create your Vault' : 'Welcome Back'}
            </h3>
            <p className="text-slate-400 text-sm">
              {isSignUp 
                ? 'Sign up to start securing your digital assets' 
                : 'Enter your credentials to unlock your vault'}
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.rivera@example.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <span>{isSignUp ? 'Create SafeVault Account' : 'Unlock Vault'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Demo Login Helper */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 font-medium py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles size={14} /> Quick Demo Access as Alex Rivera
            </button>
          </div>

          {/* Switch Mode Toggle */}
          <div className="mt-6 text-center text-xs text-slate-400">
            {isSignUp ? 'Already have a vault?' : "Don't have a vault yet?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage('');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 ml-1"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

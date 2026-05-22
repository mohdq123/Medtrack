
import React, { useState } from 'react';
import { User } from '../types';
import { X, Key, ShieldAlert } from 'lucide-react';
import { BackendService } from '../services/BackendService';

interface ChangePasswordModalProps {
  user: User;
  onClose: () => void;
  onPasswordChanged: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ user, onClose, onPasswordChanged }) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const users = BackendService.getUsers();
    const dbUser = users.find(u => u.email === user.email);

    if (dbUser?.password !== currentPass) {
      setError("Current password is incorrect.");
      return;
    }

    if (newPass.length < 4) {
      setError("New password must be at least 4 characters.");
      return;
    }

    if (newPass !== confirmPass) {
      setError("Passwords do not match.");
      return;
    }

    BackendService.updateUserPassword(user.email, newPass);
    onPasswordChanged();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Key size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Security Settings</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition dark:text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Current Password</label>
            <input 
              required 
              type="password" 
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">New Password</label>
            <input 
              required 
              type="password" 
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm New Password</label>
            <input 
              required 
              type="password" 
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-2xl">
              <ShieldAlert className="shrink-0" size={18} />
              <p className="text-xs font-bold leading-relaxed">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 transition active:scale-[0.98]"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;

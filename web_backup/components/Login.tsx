
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Stethoscope, LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { BackendService } from '../services/BackendService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simulate network delay
    setTimeout(() => {
      const users = BackendService.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

      if (user) {
        onLogin(user);
      } else {
        setError("Invalid email or password. Please use approved credentials.");
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md z-10">
        <div className="mb-10 text-center text-white">
          <div className="p-5 bg-indigo-600 rounded-[2rem] w-fit mx-auto mb-6 shadow-2xl shadow-indigo-600/50">
            <Stethoscope size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">MedTrack</h1>
          <p className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px]">Medical Command & Control</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Approved Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  required 
                  type="email" 
                  placeholder="name@medtrack.com"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  required 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-rose-50 text-rose-600 rounded-2xl animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="shrink-0" size={18} />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 transition active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={20} />
                  Authorize Access
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
             <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Demo Credentials</p>
                <p className="text-[11px] text-slate-600 font-medium">Resident: <span className="font-bold text-slate-800">resident@medtrack.com</span> / res</p>
                <p className="text-[11px] text-slate-600 font-medium">Admin: <span className="font-bold text-slate-800">admin@medtrack.com</span> / admin</p>
             </div>
          </div>
        </div>
        
        <p className="mt-10 text-center text-indigo-400/60 font-black text-[10px] uppercase tracking-[0.2em]">Authorized Hospital Personnel Only</p>
      </div>
    </div>
  );
};

export default Login;

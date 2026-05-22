
import React from 'react';
import { LayoutDashboard, Scissors, Stethoscope, Calendar, Archive, Settings, User } from 'lucide-react';

interface MobileNavProps {
  view: string;
  setView: (view: any) => void;
  role: 'admin' | 'resident';
}

const MobileNav: React.FC<MobileNavProps> = ({ view, setView, role }) => {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md tab-bar-blur border-t border-slate-200 dark:border-slate-800 px-4 py-2 pb-safe-bottom z-50 flex items-center justify-around">
      {role === 'resident' ? (
        <>
          <NavItem active={view === 'dashboard'} icon={<LayoutDashboard size={22} />} label="Today" onClick={() => setView('dashboard')} />
          <NavItem active={view === 'surgical'} icon={<Scissors size={22} />} label="Surgery" onClick={() => setView('surgical')} />
          <NavItem active={view === 'eswl'} icon={<Stethoscope size={22} />} label="ESWL" onClick={() => setView('eswl')} />
          <NavItem active={view === 'calendar'} icon={<Calendar size={22} />} label="Theater" onClick={() => setView('calendar')} />
          <NavItem active={view === 'archive'} icon={<Archive size={22} />} label="History" onClick={() => setView('archive')} />
        </>
      ) : (
        <>
          <NavItem active={view === 'admin'} icon={<LayoutDashboard size={22} />} label="Dashboard" onClick={() => setView('admin')} />
          <NavItem active={view === 'settings'} icon={<Settings size={22} />} label="Settings" onClick={() => setView('settings')} />
        </>
      )}
      
      {role === 'resident' && <NavItem active={view === 'settings'} icon={<User size={22} />} label="Me" onClick={() => setView('settings')} />}
    </nav>
  );
};

const NavItem = ({ active, icon, label, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center pt-2 pb-1 gap-1 transition-all flex-1 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-500'}`}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110 -translate-y-1' : 'scale-100'}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-black uppercase tracking-tighter transition-opacity ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);

export default MobileNav;

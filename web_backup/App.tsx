
import React, { useState, useEffect, useMemo } from 'react';
import { Patient, UserRole, AdminMessage, User } from './types';
import Calendar from './components/Calendar';
import PatientForm from './components/PatientForm';
import PatientList from './components/PatientList';
import TodayOperations from './components/TodayOperations';
import DayDetailModal from './components/DayDetailModal';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import MobileNav from './components/MobileNav';
import ChangePasswordModal from './components/ChangePasswordModal';
import { BackendService } from './services/BackendService';
import { NotificationService } from './services/NotificationService';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon,
  Search,
  Stethoscope,
  Scissors,
  Moon,
  Sun,
  LogOut,
  Bell,
  MessageSquare,
  Menu,
  Plus,
  Archive,
  CalendarCheck,
  Key,
  User as UserIcon,
  Settings
} from 'lucide-react';
import { isSameDay, isBefore, format, addDays, isSunday, nextSunday, startOfDay } from 'date-fns';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(BackendService.getActiveUser());
  const [patients, setPatients] = useState<Patient[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [view, setView] = useState<'dashboard' | 'calendar' | 'surgical' | 'eswl' | 'admin' | 'archive' | 'settings'>('dashboard');
  const [eswlSubView, setEswlSubView] = useState<'list' | 'next'>('list');
  const [archiveSubView, setArchiveSubView] = useState<'Surgical' | 'ESWL'>('Surgical');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  // FIX: BackendService.getTheme() is now synchronous, fixing comparison error
  const [isDarkMode, setIsDarkMode] = useState(BackendService.getTheme() === 'dark');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const savedPatients = await BackendService.getPatients();
      const savedMessages = await BackendService.getMessages();
      setPatients(savedPatients);
      setMessages(savedMessages);
      setIsLoading(false);
      NotificationService.requestPermission();
    };
    init();
  }, []);

  useEffect(() => {
    if (isLoading || patients.length === 0) return;
    const runCheck = () => {
      NotificationService.checkAndTriggerReminders(patients, (newMsg) => {
        setMessages(prev => [newMsg, ...prev]);
      });
    };
    runCheck();
    const interval = setInterval(runCheck, 60000);
    return () => clearInterval(interval);
  }, [patients, isLoading]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    BackendService.saveTheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => { if (!isLoading) BackendService.savePatients(patients); }, [patients, isLoading]);
  useEffect(() => { if (!isLoading) BackendService.saveMessages(messages); }, [messages, isLoading]);

  const filteredPatients = useMemo(() => {
    const today = startOfDay(new Date());
    
    return patients
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             p.phoneNumber.includes(searchQuery);
        if (!matchesSearch) return false;

        if (view === 'archive') return p.isCompleted && p.category === archiveSubView;
        if (p.isCompleted) return false;

        if (view === 'eswl') {
          if (p.category !== 'ESWL' || p.isCancelled) return false;
          if (eswlSubView === 'list') return !p.appointmentDate;
          if (eswlSubView === 'next') {
            if (!p.appointmentDate) return false;
            const targetSunday = isSunday(today) ? today : nextSunday(today);
            return isSameDay(startOfDay(new Date(p.appointmentDate)), targetSunday);
          }
        }

        if (view === 'surgical') return p.category === 'Surgical' && !p.isCancelled;

        return true;
      })
      .sort((a, b) => {
        const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : Infinity;
        const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : Infinity;
        return dateA - dateB;
      });
  }, [patients, view, eswlSubView, archiveSubView, searchQuery]);

  const groupedArchivePatients = useMemo(() => {
    const groups: Record<string, Patient[]> = {};
    filteredPatients.forEach(p => {
      const dateKey = p.appointmentDate ? format(new Date(p.appointmentDate), 'yyyy-MM-dd') : 'No Date';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(p);
    });
    return Object.fromEntries(Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])));
  }, [filteredPatients]);

  const toggleComplete = (id: string) => setPatients(prev => prev.map(p => p.id === id ? { ...p, isCompleted: !p.isCompleted } : p));

  // FIX: Implemented missing handleAddOrUpdatePatient function
  const handleAddOrUpdatePatient = (patient: Patient) => {
    setPatients(prev => {
      const exists = prev.some(p => p.id === patient.id);
      if (exists) {
        return prev.map(p => p.id === patient.id ? patient : p);
      }
      return [patient, ...prev];
    });
    setIsFormOpen(false);
    setEditingPatient(undefined);
  };

  const handleCancelEswl = (id: string) => setPatients(prev => prev.map(p => p.id === id ? { ...p, isCancelled: true } : p));
  const handleScheduleEswl = (id: string) => {
    const today = startOfDay(new Date());
    const targetSunday = isSunday(today) ? today : nextSunday(today);
    const scheduledDate = new Date(targetSunday);
    scheduledDate.setHours(8, 0, 0, 0);
    setPatients(prev => prev.map(p => p.id === id ? { ...p, appointmentDate: scheduledDate } : p));
    setEswlSubView('next');
  };
  const handleReaddToWaitlist = (id: string) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, appointmentDate: undefined, isCancelled: false } : p));
    setEswlSubView('list');
  };

  if (!currentUser) return <Login onLogin={(user) => { BackendService.setActiveUser(user); setCurrentUser(user); setView(user.role === 'admin' ? 'admin' : 'dashboard'); }} />;
  if (isLoading) return <div className="h-screen w-full flex flex-col items-center justify-center bg-indigo-950 text-white"><Stethoscope size={64} className="animate-pulse mb-4" /><span className="font-black text-xl tracking-widest">MEDTRACK</span></div>;

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto bg-slate-50 dark:bg-slate-950 shadow-2xl relative overflow-hidden">
      
      {/* Native App Header */}
      <header className="glass-header pt-safe-top pb-4 px-6 border-b dark:border-slate-800 z-40 sticky top-0">
        <div className="flex items-center justify-between mb-2">
           <div>
             <h1 className="text-2xl font-black dark:text-white leading-tight capitalize">{view}</h1>
             <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{currentUser.name}</p>
           </div>
           <div className="flex gap-2">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             {currentUser.role === 'resident' && view !== 'archive' && view !== 'settings' && (
                <button onClick={() => { setEditingPatient(undefined); setIsFormOpen(true); }} className="p-2.5 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                  <Plus size={20} />
                </button>
             )}
           </div>
        </div>
        
        {/* Native Search Bar */}
        {(view === 'surgical' || view === 'eswl' || view === 'archive') && (
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search patients..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-sm outline-none border border-transparent focus:border-indigo-500/30 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 native-scroll pb-24">
        <div className="p-5 space-y-6">
          {view === 'dashboard' && <TodayOperations patients={patients} onPatientClick={(p) => { setEditingPatient(p); setIsFormOpen(true); }} onToggleComplete={toggleComplete} />}
          
          {view === 'eswl' && (
            <div className="space-y-4">
              <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl">
                <button onClick={() => setEswlSubView('list')} className={`flex-1 py-2 text-xs font-black rounded-xl transition ${eswlSubView === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>POOL</button>
                <button onClick={() => setEswlSubView('next')} className={`flex-1 py-2 text-xs font-black rounded-xl transition ${eswlSubView === 'next' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>SCHEDULED</button>
              </div>
              <PatientList patients={filteredPatients} onEdit={setEditingPatient} onDelete={(id) => setPatients(prev => prev.filter(p => p.id !== id))} onPostpone={() => {}} onToggleComplete={toggleComplete} onCancelEswl={handleCancelEswl} onScheduleEswl={handleScheduleEswl} onReaddToWaitlist={handleReaddToWaitlist} />
            </div>
          )}

          {view === 'archive' && (
            <div className="space-y-6">
              <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl">
                <button onClick={() => setArchiveSubView('Surgical')} className={`flex-1 py-2 text-xs font-black rounded-xl transition ${archiveSubView === 'Surgical' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>SURGICAL</button>
                <button onClick={() => setArchiveSubView('ESWL')} className={`flex-1 py-2 text-xs font-black rounded-xl transition ${archiveSubView === 'ESWL' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>ESWL</button>
              </div>
              
              <div className="space-y-8">
                {Object.keys(groupedArchivePatients).length > 0 ? (
                  Object.entries(groupedArchivePatients).map(([dateKey, group]) => (
                    <div key={dateKey} className="space-y-3">
                      <div className="px-1 sticky top-[140px] z-10 py-1 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                          {dateKey === 'No Date' ? 'NOT DATED' : format(new Date(dateKey), 'EEEE, MMM do')}
                        </p>
                      </div>
                      <PatientList patients={group} onEdit={setEditingPatient} onDelete={(id) => setPatients(prev => prev.filter(p => p.id !== id))} onPostpone={() => {}} onToggleComplete={toggleComplete} onReaddToWaitlist={handleReaddToWaitlist} />
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center opacity-40 italic text-sm">Empty archive</div>
                )}
              </div>
            </div>
          )}

          {view === 'surgical' && <PatientList patients={filteredPatients} onEdit={setEditingPatient} onDelete={(id) => setPatients(prev => prev.filter(p => p.id !== id))} onPostpone={() => {}} onToggleComplete={toggleComplete} />}

          {view === 'calendar' && <Calendar patients={patients.filter(p => p.category === 'Surgical' && p.appointmentDate)} onDateSelect={setSelectedDate} />}

          {view === 'settings' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 native-card border dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-4 border-b dark:border-slate-800 pb-4">
                  <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-black">{currentUser.name.charAt(0)}</div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white">{currentUser.name}</h3>
                    <p className="text-xs text-slate-400">{currentUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setIsPasswordModalOpen(true)} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl group active:scale-[0.98] transition">
                  <div className="flex items-center gap-3">
                    <Key size={18} className="text-indigo-500" />
                    <span className="text-sm font-bold">Change Password</span>
                  </div>
                  <Settings size={16} className="text-slate-300" />
                </button>
                <button onClick={() => { BackendService.setActiveUser(null); setCurrentUser(null); }} className="w-full flex items-center gap-3 p-4 text-rose-500 font-bold justify-center active:opacity-60 transition">
                  <LogOut size={18} /> Logout Account
                </button>
              </div>
              <div className="p-6 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">MedTrack Native v2.4.0</div>
            </div>
          )}

          {view === 'admin' && <AdminDashboard patients={patients} onSendMessage={(msg) => setMessages(prev => [{ ...msg, id: Math.random().toString(36).substr(2, 9), timestamp: new Date(), sender: 'Admin' }, ...prev])} />}
        </div>
      </main>

      {/* Native Tab Bar */}
      <MobileNav view={view} setView={setView} role={currentUser.role} />

      {/* Sheet Modals */}
      {isFormOpen && <PatientForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingPatient(undefined); }} onSubmit={handleAddOrUpdatePatient} initialData={editingPatient} />}
      {isPasswordModalOpen && <ChangePasswordModal user={currentUser} onClose={() => setIsPasswordModalOpen(false)} onPasswordChanged={() => { setIsPasswordModalOpen(false); }} />}
      {selectedDate && <DayDetailModal date={selectedDate} patients={patients.filter(p => p.category === 'Surgical' && p.appointmentDate && isSameDay(new Date(p.appointmentDate), selectedDate))} onClose={() => setSelectedDate(null)} onAdd={(date) => { setEditingPatient({ appointmentDate: date } as Patient); setIsFormOpen(true); setSelectedDate(null); }} onPatientClick={(p) => { setEditingPatient(p); setIsFormOpen(true); setSelectedDate(null); }} />}
    </div>
  );
};

export default App;

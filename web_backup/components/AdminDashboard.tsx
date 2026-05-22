
import React, { useState } from 'react';
import { Patient, AdminMessage } from '../types';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Send, Mic, MessageSquare, Calendar, ChevronRight, Activity, Scissors, Stethoscope } from 'lucide-react';

interface AdminDashboardProps {
  patients: Patient[];
  onSendMessage: (msg: Omit<AdminMessage, 'id' | 'timestamp' | 'sender'>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ patients, onSendMessage }) => {
  const [activeTab, setActiveTab] = useState<'review' | 'broadcast'>('review');
  const [textInput, setTextInput] = useState('');
  
  const today = new Date();
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(today),
    end: endOfMonth(today)
  });

  const handleSendText = () => {
    if (!textInput.trim()) return;
    onSendMessage({ type: 'text', content: textInput });
    setTextInput('');
    alert('Broadcast message sent to all residents.');
  };

  const handleSendVoice = () => {
    onSendMessage({ type: 'voice', content: 'Voice broadcast: Theater priorities for today' });
    alert('Voice broadcast simulation sent.');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 w-fit rounded-2xl shadow-inner">
        <button
          onClick={() => setActiveTab('review')}
          className={`px-8 py-3 rounded-xl text-sm font-black transition flex items-center gap-2 ${activeTab === 'review' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          <Calendar size={18} /> Monthly Operations Review
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-8 py-3 rounded-xl text-sm font-black transition flex items-center gap-2 ${activeTab === 'broadcast' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          <MessageSquare size={18} /> Resident Broadcast
        </button>
      </div>

      {activeTab === 'review' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {daysInMonth.map(day => {
              const dayPatients = patients.filter(p => isSameDay(new Date(p.appointmentDate), day));
              if (dayPatients.length === 0) return null;

              return (
                <div key={day.toString()} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl transition-all border-l-4 border-l-indigo-500">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-slate-800 dark:text-white">{format(day, 'EEEE, MMM do')}</h4>
                      <p className="text-xs font-bold text-slate-400">{dayPatients.length} Operations scheduled</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {dayPatients.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                        <div className={`p-2 rounded-lg ${p.category === 'ESWL' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {p.category === 'ESWL' ? <Stethoscope size={14} /> : <Scissors size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate dark:text-slate-200">{p.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">{p.operationName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-xl border dark:border-slate-800 space-y-8">
          <div className="flex items-center gap-4 text-indigo-600">
            <Activity size={32} />
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">Broadcast Center</h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold">Communicate priority updates to the resident team</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <textarea 
                rows={6} 
                className="w-full p-8 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none text-lg dark:text-white" 
                placeholder="Type your broadcast message here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <button 
                onClick={handleSendText}
                className="absolute bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl transition active:scale-95"
              >
                <Send size={24} />
              </button>
            </div>

            <div className="flex items-center gap-6 p-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] border-2 border-dashed border-indigo-200 dark:border-indigo-800/50">
              <button 
                onClick={handleSendVoice}
                className="p-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl transition active:scale-90 animate-pulse hover:animate-none"
              >
                <Mic size={40} />
              </button>
              <div>
                <h4 className="text-xl font-black text-slate-800 dark:text-white">Push to Talk</h4>
                <p className="text-slate-500 dark:text-slate-400 font-bold">Record a voice memo to send as an urgent priority alert</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

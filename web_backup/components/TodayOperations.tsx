
import React from 'react';
import { Patient } from '../types';
import { isSameDay, format } from 'date-fns';
import { Clipboard, Activity, Clock, CheckCircle2 } from 'lucide-react';

interface TodayOperationsProps {
  patients: Patient[];
  onPatientClick: (patient: Patient) => void;
  onToggleComplete: (id: string) => void;
}

const TodayOperations: React.FC<TodayOperationsProps> = ({ patients, onPatientClick, onToggleComplete }) => {
  const today = new Date();
  const todayOps = patients.filter(p => !p.isCompleted && !p.isCancelled && p.appointmentDate && isSameDay(new Date(p.appointmentDate), today));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Active Theatre</h3>
        <span className="text-[10px] font-bold text-indigo-500 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">{todayOps.length} Ops</span>
      </div>

      {todayOps.length > 0 ? (
        <div className="space-y-3">
          {todayOps.map(p => (
            <div 
              key={p.id}
              className="p-5 rounded-[2rem] bg-white dark:bg-slate-900 native-card border dark:border-slate-800 active:scale-[0.98] transition-all cursor-pointer"
              onClick={() => onPatientClick(p)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-2xl ${p.category === 'ESWL' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  <Clock size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{format(new Date(p.appointmentDate!), 'HH:mm')}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleComplete(p.id); }}
                    className="p-2 text-slate-300 hover:text-indigo-500 transition active:scale-125"
                  >
                    <CheckCircle2 size={24} />
                  </button>
                </div>
              </div>
              <div>
                <h4 className="font-black text-slate-800 dark:text-white text-lg leading-tight">{p.name}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${p.category === 'ESWL' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{p.category}</span>
                  <p className="text-xs text-slate-500 font-bold truncate">{p.operationName}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 font-black uppercase tracking-[0.2em]">{p.side}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed dark:border-slate-800">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Quiet Day - No Ops</p>
        </div>
      )}
    </div>
  );
};

export default TodayOperations;

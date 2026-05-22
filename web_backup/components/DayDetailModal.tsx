
import React from 'react';
import { Patient } from '../types';
import { X, Plus, Clock, Scissors, Stethoscope, Phone } from 'lucide-react';
import { format } from 'date-fns';

interface DayDetailModalProps {
  date: Date;
  patients: Patient[];
  onClose: () => void;
  onAdd: (date: Date) => void;
  onPatientClick: (p: Patient) => void;
  readOnly?: boolean;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({ date, patients, onClose, onAdd, onPatientClick, readOnly }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/20">
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              {format(date, 'EEEE')}
            </h3>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {format(date, 'MMMM do, yyyy')}
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition shadow-sm dark:text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
          {patients.length > 0 ? (
            patients.map((p) => (
              <div 
                key={p.id}
                onClick={() => onPatientClick(p)}
                className="group flex items-center justify-between p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-indigo-500 transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${p.category === 'ESWL' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {p.category === 'ESWL' ? <Stethoscope size={20} /> : <Scissors size={20} />}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 dark:text-white">{p.name}</p>
                    <p className="text-xs text-slate-500 font-bold flex items-center gap-1 mt-1">
                      <Clock size={12} /> {format(new Date(p.appointmentDate), 'h:mm a')} — {p.operationName}
                    </p>
                  </div>
                </div>
                {!readOnly && (
                   <a href={`tel:${p.phoneNumber}`} className="p-3 bg-emerald-500 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-emerald-500/20" onClick={(e) => e.stopPropagation()}>
                    <Phone size={16} />
                   </a>
                )}
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="text-slate-400 font-bold italic">No procedures scheduled for this day.</p>
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="p-8 pt-0">
            <button 
              onClick={() => onAdd(date)}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 transition active:scale-95"
            >
              <Plus size={20} /> Add Patient for {format(date, 'MMM do')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayDetailModal;


import React, { useState } from 'react';
import { Patient, AnalysisResult } from '../types';
import { 
  Phone, Edit, Trash2, Calendar, BrainCircuit, Loader2, 
  ChevronDown, ChevronUp, AlertCircle, Scissors, ImageIcon, 
  FlaskConical, ClipboardList, CheckCircle2, Ban, Clock,
  ArrowUpCircle, ArrowLeftRight
} from 'lucide-react';
import { format } from 'date-fns';
import { analyzePatientHistory } from '../services/geminiService';

interface PatientListProps {
  patients: Patient[];
  onEdit: (patient: Patient) => void;
  onDelete: (id: string) => void;
  onPostpone: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onCancelEswl?: (id: string) => void;
  onScheduleEswl?: (id: string) => void;
  onReaddToWaitlist?: (id: string) => void;
  compact?: boolean;
}

const PatientList: React.FC<PatientListProps> = ({ 
  patients, onEdit, onDelete, onPostpone, onToggleComplete, onCancelEswl, onScheduleEswl, onReaddToWaitlist, compact = false 
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({});

  const handleAnalyze = async (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation();
    setAnalyzingId(patient.id);
    const result = await analyzePatientHistory(patient);
    setAnalyses(prev => ({ ...prev, [patient.id]: result }));
    setAnalyzingId(null);
    setExpandedId(patient.id);
  };

  if (patients.length === 0) {
    return <div className="p-10 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">Empty</div>;
  }

  return (
    <div className="space-y-3">
      {patients.map((p) => (
        <div key={p.id} className="bg-white dark:bg-slate-900 rounded-3xl native-card border dark:border-slate-800 transition active:scale-[0.99]">
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${p.isCompleted ? 'bg-indigo-100 text-indigo-600' : p.category === 'ESWL' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {p.isCompleted ? <CheckCircle2 size={18} /> : p.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-slate-800 dark:text-white truncate text-sm">{p.name}</h4>
                  {p.isCancelled && <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[7px] font-black rounded uppercase">Cancelled</span>}
                </div>
                <p className="text-[10px] text-slate-400 font-bold truncate">
                  {p.operationName} {p.appointmentDate ? `• ${format(new Date(p.appointmentDate), 'HH:mm')}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {p.phoneNumber && (
                <a 
                  href={`tel:${p.phoneNumber}`} 
                  onClick={(e) => e.stopPropagation()}
                  className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl active:bg-emerald-100 transition"
                >
                  <Phone size={16} />
                </a>
              )}

              {p.appointmentDate && !p.isCompleted && !p.isCancelled && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleComplete(p.id); }}
                  className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl active:bg-indigo-100 transition"
                  title="Done"
                >
                  <CheckCircle2 size={18} />
                </button>
              )}

              {p.category === 'ESWL' && (p.appointmentDate || p.isCancelled || p.isCompleted) && onReaddToWaitlist && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onReaddToWaitlist(p.id); }}
                  className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl active:bg-amber-100 transition"
                  title="Move back to pool"
                >
                  <ArrowLeftRight size={16} />
                </button>
              )}

              {p.category === 'ESWL' && !p.appointmentDate && !p.isCompleted && onScheduleEswl && !p.isCancelled && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onScheduleEswl(p.id); }}
                  className="p-2.5 bg-indigo-600 text-white rounded-2xl active:opacity-80 shadow-lg shadow-indigo-600/20"
                >
                  <Clock size={16} />
                </button>
              )}

              <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="p-2 text-slate-300">
                {expandedId === p.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          </div>
          
          {expandedId === p.id && (
            <div className="px-5 pb-5 border-t dark:border-slate-800 pt-4 animate-in slide-in-from-top-2">
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Present History</p>
                     <p className="text-xs dark:text-slate-300 leading-relaxed">{p.presentHistory || '-'}</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Past History</p>
                     <p className="text-xs dark:text-slate-300 leading-relaxed">{p.pastHistory || '-'}</p>
                   </div>
                 </div>
                 
                 <div>
                   <p className="text-[9px] font-black uppercase text-indigo-400 mb-1">Labs & Findings</p>
                   <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{p.labInvestigations || '-'}</p>
                 </div>

                 <div className="flex items-center justify-between gap-2 pt-2">
                    <button onClick={(e) => handleAnalyze(e, p)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-[10px] uppercase tracking-wider">
                      {analyzingId === p.id ? <Loader2 className="animate-spin" size={14} /> : <BrainCircuit size={14} />} AI Analysis
                    </button>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); onEdit(p); }} className="p-2 text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <Edit size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete?')) onDelete(p.id); }} className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                        <Trash2 size={16} />
                      </button>
                    </div>
                 </div>
               </div>
               
               {analyses[p.id] && (
                 <div className="mt-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{analyses[p.id].summary}</p>
                 </div>
               )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PatientList;

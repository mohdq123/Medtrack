
import React, { useState, useEffect } from 'react';
import { Patient, PatientCategory, Investigation, InvestigationType, SideType } from '../types';
import { X, Calendar, User, Phone, ClipboardList, Info, Stethoscope, Scissors, Camera, Image as ImageIcon, Trash2, Plus, FlaskConical, AlertTriangle } from 'lucide-react';
import CameraCapture from './CameraCapture';
import { format, getDay, parseISO } from 'date-fns';

interface PatientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (patient: Patient) => void;
  initialData?: Patient;
}

const PatientForm: React.FC<PatientFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<Partial<Patient>>({
    name: '',
    age: undefined,
    phoneNumber: '',
    category: 'ESWL',
    presentHistory: '',
    pastHistory: '',
    operationName: '',
    side: 'No Side',
    labInvestigations: '',
    imaging: [],
    appointmentDate: undefined
  });

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [newInvestType, setNewInvestType] = useState<InvestigationType>('X-ray');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        appointmentDate: initialData.appointmentDate ? new Date(initialData.appointmentDate) : undefined,
        imaging: initialData.imaging || []
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.category === 'ESWL' && formData.appointmentDate && getDay(new Date(formData.appointmentDate)) !== 0) {
      if (!confirm("ESWL operations are usually on Sundays. Do you want to continue with this date?")) return;
    }
    const patient: Patient = {
      ...formData as Patient,
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      createdAt: initialData?.createdAt || new Date(),
      imaging: formData.imaging || [],
      labInvestigations: formData.labInvestigations || '',
      age: formData.age || 0
    };
    onSubmit(patient);
  };

  const handleCapture = (base64: string) => {
    const newInvest: Investigation = {
      id: Math.random().toString(36).substr(2, 9),
      type: newInvestType,
      imageData: base64,
      date: new Date()
    };
    setFormData(prev => ({ ...prev, imaging: [...(prev.imaging || []), newInvest].slice(0, 3) }));
    setIsCameraOpen(false);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({ ...prev, imaging: (prev.imaging || []).filter((_, i) => i !== index) }));
  };

  if (!isOpen) return null;

  const isNotSunday = formData.category === 'ESWL' && formData.appointmentDate && getDay(new Date(formData.appointmentDate)) !== 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60">
        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between p-6 border-b dark:border-slate-800">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              {initialData ? 'Edit Patient Record' : 'New Patient Registration'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition dark:text-slate-400"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Patient Name <span className="text-rose-500">*</span></label>
                <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Age <span className="text-rose-500">*</span></label>
                <input required type="number" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={formData.age === undefined ? '' : formData.age} onChange={e => setFormData({ ...formData, age: e.target.value === '' ? undefined : parseInt(e.target.value) })} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone <span className="text-rose-500">*</span></label>
                <input required type="tel" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={formData.phoneNumber} onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} />
              </div>

              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Category <span className="text-rose-500">*</span></label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as PatientCategory })}>
                  <option value="ESWL">ESWL Patient</option>
                  <option value="Surgical">Surgical Patient</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Appointment Date {formData.category === 'Surgical' && <span className="text-rose-500">*</span>}
                </label>
                <input 
                  type="datetime-local" 
                  className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white ${isNotSunday ? 'border-amber-400' : 'dark:border-slate-700'}`} 
                  value={formData.appointmentDate ? formatForInput(formData.appointmentDate) : ''} 
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({ ...formData, appointmentDate: val ? parseISO(val) : undefined });
                  }} 
                  required={formData.category === 'Surgical'} 
                />
                {isNotSunday && <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1"><AlertTriangle size={10} /> ESWL is typically on Sundays</p>}
                {formData.category === 'ESWL' && !formData.appointmentDate && <p className="text-[10px] text-slate-400 font-medium">Leave empty to add to the Patients List (Waitlist)</p>}
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Operation Name <span className="text-rose-500">*</span></label>
                <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={formData.operationName} onChange={e => setFormData({ ...formData, operationName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Side <span className="text-rose-500">*</span></label>
                <select className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={formData.side} onChange={e => setFormData({ ...formData, side: e.target.value as SideType })}>
                  <option value="No Side">No Side</option><option value="Left">Left</option><option value="Right">Right</option>
                </select>
              </div>
            
            </div>

            <div className="space-y-4 pt-4 border-t dark:border-slate-800">
               <div className="flex items-center justify-between">
                 <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2"><ImageIcon size={16} className="text-indigo-500"/> Imaging Investigations</h4>
                 <div className="flex gap-2">
                    <button type="button" onClick={() => { setNewInvestType('X-ray'); setIsCameraOpen(true); }} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-indigo-50 transition">Add X-ray</button>
                    <button type="button" onClick={() => { setNewInvestType('CT'); setIsCameraOpen(true); }} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-indigo-50 transition">Add CT</button>
                 </div>
               </div>
               
               <div className="grid grid-cols-3 gap-4">
                 {(formData.imaging || []).map((img, idx) => (
                   <div key={img.id} className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl relative overflow-hidden group shadow-sm">
                      <img src={img.imageData} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] text-white font-black">{img.type}</span>
                        <button type="button" onClick={() => removeImage(idx)} className="p-1.5 bg-rose-500 text-white rounded-lg"><Trash2 size={12}/></button>
                      </div>
                   </div>
                 ))}
                 {Array.from({ length: 3 - (formData.imaging?.length || 0) }).map((_, i) => (
                   <div key={i} className="aspect-square bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center">
                     <Camera className="text-slate-300" size={24} />
                   </div>
                 ))}
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><FlaskConical size={16} className="text-indigo-500"/> Lab Investigations</label>
              <textarea className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" rows={2} placeholder="Hb: 12, Cr: 0.9, INR: 1.1..." value={formData.labInvestigations} onChange={e => setFormData({ ...formData, labInvestigations: e.target.value })} />
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button type="button" onClick={onClose} className="flex-1 py-3 px-6 rounded-xl border dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold transition">Cancel</button>
              <button type="submit" className="flex-[2] py-3 px-6 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-xl transition active:scale-[0.98]">Save Patient</button>
            </div>
          </form>
        </div>
      </div>
      {isCameraOpen && <CameraCapture onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
    </>
  );
};

const formatForInput = (date: Date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default PatientForm;

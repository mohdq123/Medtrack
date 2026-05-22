
import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Scissors } from 'lucide-react';
import { Patient } from '../types';

interface CalendarProps {
  patients: Patient[];
  onDateSelect?: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ patients, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayPatients = (day: Date) => {
    return patients.filter(p => isSameDay(new Date(p.appointmentDate), day));
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Theater utilization roadmap</p>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition text-slate-600 dark:text-slate-300">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition text-slate-600 dark:text-slate-300">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-inner">
        {days.map((day) => {
          const dayPatients = getDayPatients(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div 
              key={day.toString()} 
              onClick={() => onDateSelect?.(day)}
              className={`min-h-[120px] bg-white dark:bg-slate-900 p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex flex-col ${!isCurrentMonth ? 'opacity-30' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                  {format(day, 'd')}
                </span>
                {dayPatients.length > 0 && (
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black">
                    {dayPatients.length}
                  </span>
                )}
              </div>
              
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[70px] custom-scrollbar">
                {dayPatients.map(p => (
                  <div 
                    key={p.id}
                    className={`text-[9px] p-1.5 px-2 rounded-lg border-l-2 truncate font-bold flex items-center gap-1 ${p.category === 'ESWL' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-800 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-500 text-rose-800 dark:text-rose-400'}`}
                  >
                    <Scissors size={8} /> {p.name}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;

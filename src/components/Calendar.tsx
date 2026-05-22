import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from './PoppinsText';
import { ChevronLeft, ChevronRight, Scissors } from 'lucide-react-native';
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
import { Patient } from '../types';

interface CalendarProps {
  patients: Patient[];
  onDateSelect?: (date: Date) => void;
}

export default function Calendar({ patients, onDateSelect }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayPatients = (day: Date) => {
    return patients.filter(p => {
      if (!p.appointmentDate) return false;
      const date = new Date(p.appointmentDate);
      return !isNaN(date.getTime()) && isSameDay(date, day);
    });
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <View style={styles.container}>
      {/* Month Selector */}
      <View style={styles.header}>
        <View>
          <Text style={styles.monthName}>{format(currentMonth, 'MMMM yyyy')}</Text>
          <Text style={styles.subtitle}>Theater utilization roadmap</Text>
        </View>
        <View style={styles.navButtons}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <ChevronLeft size={20} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekdays}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text key={day} style={styles.weekdayText}>{day}</Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {days.map((day, idx) => {
          const dayPatients = getDayPatients(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          
          return (
            <TouchableOpacity 
              key={day.toString()} 
              onPress={() => onDateSelect?.(day)}
              style={[
                styles.dayCell,
                !isCurrentMonth && styles.outOfMonthCell
              ]}
            >
              <View style={styles.cellHeader}>
                <Text style={[
                  styles.dayNum,
                  isToday && styles.todayNum,
                  !isCurrentMonth && styles.outOfMonthText
                ]}>
                  {format(day, 'd')}
                </Text>
                {dayPatients.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{dayPatients.length}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.patientDots}>
                {dayPatients.slice(0, 3).map(p => (
                  <View 
                    key={p.id}
                    style={[
                      styles.dot, 
                      p.category === 'ESWL' ? styles.dotEswl : styles.dotSurgical
                    ]} 
                  />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.dotSurgical, { marginRight: 6 }]} />
          <Text style={styles.legendText}>Surgical</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, styles.dotEswl, { marginRight: 6 }]} />
          <Text style={styles.legendText}>ESWL</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 30,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  monthName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    padding: 10,
    backgroundColor: '#1f2937',
    borderRadius: 12,
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 20,
    overflow: 'hidden',
  },
  dayCell: {
    width: '14.28%', // 100 / 7
    aspectRatio: 0.9,
    backgroundColor: '#0f172a',
    borderWidth: 0.5,
    borderColor: '#1f2937',
    padding: 6,
    justifyContent: 'space-between',
  },
  outOfMonthCell: {
    backgroundColor: '#030712',
    opacity: 0.4,
  },
  cellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  todayNum: {
    backgroundColor: '#4f46e5',
    color: '#fff',
    borderRadius: 6,
    fontWeight: '900',
    overflow: 'hidden',
  },
  outOfMonthText: {
    color: '#475569',
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#818cf8',
  },
  patientDots: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    marginBottom: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  dotSurgical: {
    backgroundColor: '#ef4444',
  },
  dotEswl: {
    backgroundColor: '#10b981',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
});

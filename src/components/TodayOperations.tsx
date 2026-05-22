import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './PoppinsText';
import { Clock, CheckCircle2 } from 'lucide-react-native';
import { isSameDay, format } from 'date-fns';
import { Patient } from '../types';

interface TodayOperationsProps {
  patients: Patient[];
  onPatientClick: (patient: Patient) => void;
  onToggleComplete: (id: string) => void;
}

export default function TodayOperations({ patients, onPatientClick, onToggleComplete }: TodayOperationsProps) {
  const today = new Date();
  
  const todayOps = patients.filter(p => {
    if (p.isCompleted || p.isCancelled || !p.appointmentDate) return false;
    const date = new Date(p.appointmentDate);
    return !isNaN(date.getTime()) && isSameDay(date, today);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Theatre</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{todayOps.length} Ops</Text>
        </View>
      </View>

      {todayOps.length > 0 ? (
        <View style={styles.list}>
          {todayOps.map(p => (
            <TouchableOpacity 
              key={p.id}
              onPress={() => onPatientClick(p)}
              style={styles.card}
              activeOpacity={0.9}
            >
              {/* Header: Patient Name & Checkbox */}
              <View style={styles.cardHeader}>
                <Text style={styles.patientName}>{p.name}</Text>
                <TouchableOpacity 
                  onPress={() => onToggleComplete(p.id)}
                  style={styles.checkBtn}
                >
                  <CheckCircle2 size={24} color="#818cf8" />
                </TouchableOpacity>
              </View>
              
              {/* Body: Operation & Metadata Badges */}
              <View style={styles.cardBody}>
                <Text style={styles.opName} numberOfLines={1}>{p.operationName}</Text>
                
                <View style={styles.metaRow}>
                  {/* Category Tag */}
                  <View style={[
                    styles.tag,
                    p.category === 'ESWL' ? styles.tagEswl : styles.tagSurg
                  ]}>
                    <Text style={[
                      styles.tagText,
                      { color: p.category === 'ESWL' ? '#34d399' : '#f87171' }
                    ]}>
                      {p.category}
                    </Text>
                  </View>
                  
                  {/* Side Tag */}
                  <View style={styles.sideTag}>
                    <Text style={styles.sideTagText}>{p.side}</Text>
                  </View>

                  {/* Time Tag */}
                  {p.appointmentDate && (
                    <View style={styles.timeTag}>
                      <Clock size={12} color="#818cf8" style={{ marginRight: 4 }} />
                      <Text style={styles.timeTagText}>
                        {format(new Date(p.appointmentDate), 'hh:mm a')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Quiet Day - No Operations</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#818cf8',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
    marginRight: 12,
  },
  checkBtn: {
    padding: 2,
  },
  cardBody: {
    gap: 8,
  },
  opName: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagEswl: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  tagSurg: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sideTag: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sideTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  timeTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#818cf8',
  },
  emptyBox: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#334155',
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});

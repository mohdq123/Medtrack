import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Text } from './PoppinsText';
import { X, Archive, Scissors, Stethoscope } from 'lucide-react-native';
import { format } from 'date-fns';
import { Patient } from '../types';
import PatientList from './PatientList';
import PatientDetailModal from './PatientDetailModal';

interface ArchiveModalProps {
  visible: boolean;
  onClose: () => void;
  initialCategory: 'Surgical' | 'ESWL';
  patients: Patient[];
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onReaddToWaitlist?: (id: string) => void;
  currentUserRole?: string;
}

export default function ArchiveModal({
  visible,
  onClose,
  initialCategory,
  patients,
  onDelete,
  onToggleComplete,
  onReaddToWaitlist,
  currentUserRole,
}: ArchiveModalProps) {
  const [subView, setSubView] = useState<'Surgical' | 'ESWL'>(initialCategory);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Sync subView when initialCategory changes (e.g. opened from ESWL vs Surgery)
  React.useEffect(() => {
    if (visible) setSubView(initialCategory);
  }, [visible, initialCategory]);

  const groupedPatients = useMemo(() => {
    const archived = patients.filter(
      p => p.isCompleted && p.category === subView
    );
    const groups: Record<string, Patient[]> = {};
    archived.forEach(p => {
      const key = p.appointmentDate
        ? format(new Date(p.appointmentDate), 'yyyy-MM-dd')
        : 'No Date';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.fromEntries(
      Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
    );
  }, [patients, subView]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBox}>
              <Archive size={20} color="#818cf8" />
            </View>
            <View>
              <Text style={styles.title}>History</Text>
              <Text style={styles.subtitle}>Completed procedures</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Sub-tabs */}
        <View style={styles.subTabsRow}>
          <TouchableOpacity
            style={[styles.subTab, subView === 'Surgical' && styles.subTabActive]}
            onPress={() => setSubView('Surgical')}
          >
            <Scissors size={13} color={subView === 'Surgical' ? '#818cf8' : '#64748b'} />
            <Text style={[styles.subTabText, subView === 'Surgical' && styles.subTabTextActive]}>
              Surgical
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTab, subView === 'ESWL' && styles.subTabActive]}
            onPress={() => setSubView('ESWL')}
          >
            <Stethoscope size={13} color={subView === 'ESWL' ? '#10b981' : '#64748b'} />
            <Text style={[styles.subTabText, subView === 'ESWL' && styles.subTabTextActive, subView === 'ESWL' && { color: '#10b981' }]}>
              ESWL
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {Object.keys(groupedPatients).length > 0 ? (
            Object.entries(groupedPatients).map(([dateKey, group]) => (
              <View key={dateKey} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <View style={styles.dateDot} />
                  <Text style={styles.dateLabel}>
                    {dateKey === 'No Date'
                      ? 'NOT DATED'
                      : format(new Date(dateKey), 'EEEE, MMM do, yyyy')}
                  </Text>
                  <Text style={styles.dateCount}>{group.length}</Text>
                </View>
                <PatientList
                  patients={group}
                  onEdit={(p) => setSelectedPatient(p)}
                  onDelete={onDelete}
                  onToggleComplete={onToggleComplete}
                  onReaddToWaitlist={onReaddToWaitlist}
                  currentUserRole={currentUserRole}
                />
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <Archive size={48} color="#1f2937" />
              <Text style={styles.emptyTitle}>No Records</Text>
              <Text style={styles.emptyText}>
                No completed {subView === 'ESWL' ? 'ESWL' : 'surgical'} procedures yet
              </Text>
            </View>
          )}
        </ScrollView>

        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 99,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subTabsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  subTabActive: {
    backgroundColor: '#1f2937',
    borderWidth: 0.5,
    borderColor: '#374151',
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  subTabTextActive: {
    color: '#818cf8',
    fontWeight: '900',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  dateGroup: {
    gap: 12,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  dateCount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    backgroundColor: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#334155',
  },
  emptyText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    textAlign: 'center',
  },
});

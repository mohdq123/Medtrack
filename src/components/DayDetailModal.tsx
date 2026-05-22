import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Linking, SafeAreaView } from 'react-native';
import { Text } from './PoppinsText';
import { X, Plus, Clock, Scissors, Stethoscope, Phone } from 'lucide-react-native';
import { format } from 'date-fns';
import { Patient } from '../types';

interface DayDetailModalProps {
  date: Date;
  patients: Patient[];
  onClose: () => void;
  onAdd: (date: Date) => void;
  onPatientClick: (p: Patient) => void;
  readOnly?: boolean;
}

export default function DayDetailModal({ date, patients, onClose, onAdd, onPatientClick, readOnly }: DayDetailModalProps) {
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  return (
    <Modal visible animationType="slide" transparent>
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.dayOfWeek}>{format(date, 'EEEE')}</Text>
              <Text style={styles.dateStr}>{format(date, 'MMMM do, yyyy')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Patient list */}
          <ScrollView contentContainerStyle={styles.list}>
            {patients.length > 0 ? (
              patients.map((p) => (
                <TouchableOpacity 
                  key={p.id}
                  style={styles.patientCard}
                  onPress={() => onPatientClick(p)}
                  activeOpacity={0.8}
                >
                  <View style={styles.patientInfo}>
                    <View style={[
                      styles.categoryIcon,
                      p.category === 'ESWL' ? styles.iconEswl : styles.iconSurg
                    ]}>
                      {p.category === 'ESWL' ? (
                        <Stethoscope size={18} color="#10b981" />
                      ) : (
                        <Scissors size={18} color="#ef4444" />
                      )}
                    </View>
                    <View style={styles.meta}>
                      <Text style={styles.patientName}>{p.name}</Text>
                      <View style={styles.metaRow}>
                        <Clock size={10} color="#64748b" style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>
                          {p.appointmentDate ? format(new Date(p.appointmentDate), 'h:mm a') : ''} — {p.operationName}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {!readOnly && p.phoneNumber ? (
                    <TouchableOpacity 
                      onPress={() => handleCall(p.phoneNumber)}
                      style={styles.callBtn}
                    >
                      <Phone size={14} color="#fff" />
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No procedures scheduled for this day.</Text>
              </View>
            )}
          </ScrollView>

          {/* Add surgery btn */}
          {!readOnly && (
            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.addBtn}
                onPress={() => onAdd(date)}
              >
                <Plus size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.addBtnText}>Add Patient for {format(date, 'MMM do')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    height: '65%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  dayOfWeek: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  dateStr: {
    fontSize: 13,
    color: '#818cf8',
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 99,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconEswl: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  iconSurg: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  meta: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  callBtn: {
    backgroundColor: '#10b981',
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingBottom: 24,
  },
  addBtn: {
    flexDirection: 'row',
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from './PoppinsText';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Send, Mic, MessageSquare, Calendar, Stethoscope, Scissors } from 'lucide-react-native';
import { Patient, AdminMessage } from '../types';

interface AdminDashboardProps {
  patients: Patient[];
  onSendMessage: (msg: Omit<AdminMessage, 'id' | 'timestamp' | 'sender'>) => void;
  onApprovePatient?: (id: string) => void;
  onRejectPatient?: (id: string) => void;
}

export default function AdminDashboard({ patients, onSendMessage, onApprovePatient, onRejectPatient }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'review' | 'broadcast'>('review');
  const [textInput, setTextInput] = useState('');
  
  const today = new Date();
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(today),
    end: endOfMonth(today)
  });

  const handleSendText = () => {
    if (!textInput.trim()) return;
    onSendMessage({ type: 'text', content: textInput.trim() });
    setTextInput('');
    Alert.alert('Success', 'Broadcast message sent to all residents.');
  };

  const handleSendVoice = () => {
    onSendMessage({ type: 'voice', content: 'Voice broadcast: Urgent theatre schedule updates' });
    Alert.alert('Success', 'Voice broadcast simulation sent.');
  };

  // Filter days that actually have patients scheduled
  const activeDays = daysInMonth.filter(day => 
    patients.some(p => {
      if (!p.appointmentDate) return false;
      const date = new Date(p.appointmentDate);
      return !isNaN(date.getTime()) && isSameDay(date, day);
    })
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'review' && styles.activeTab]}
          onPress={() => setActiveTab('review')}
        >
          <Calendar size={16} color={activeTab === 'review' ? '#6366f1' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'review' && styles.activeTabText]}>Review</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'broadcast' && styles.activeTab]}
          onPress={() => setActiveTab('broadcast')}
        >
          <MessageSquare size={16} color={activeTab === 'broadcast' ? '#6366f1' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'broadcast' && styles.activeTabText]}>Broadcast</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'review' ? (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Pending Approvals */}
          {patients.filter(p => p.requiresApproval && !p.isApproved).length > 0 && (
            <View style={styles.approvalSection}>
              <Text style={[styles.sectionTitle, { fontSize: 16, color: '#f59e0b' }]}>Pending Schedule Approvals</Text>
              <Text style={styles.sectionSubtitle}>Patients scheduled within the 8-day residency limit</Text>
              
              {patients.filter(p => p.requiresApproval && !p.isApproved).map(p => (
                <View key={p.id} style={styles.approvalCard}>
                  <View style={styles.approvalInfo}>
                    <Text style={styles.approvalPatientName}>{p.name}</Text>
                    <Text style={styles.approvalPatientDetails}>
                      Op: {p.operationName} | Date: {p.appointmentDate ? format(new Date(p.appointmentDate), 'eee, MMM d @ h:mm a') : 'N/A'}
                    </Text>
                    <Text style={styles.approvalNationalId}>National ID: {p.nationalId || 'N/A'}</Text>
                  </View>
                  <View style={styles.approvalActions}>
                    <TouchableOpacity 
                      onPress={() => onApprovePatient && onApprovePatient(p.id)}
                      style={styles.approveBtn}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => onRejectPatient && onRejectPatient(p.id)}
                      style={styles.rejectBtn}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
          {activeDays.length > 0 ? (
            activeDays.map(day => {
              const dayPatients = patients.filter(p => {
                if (!p.appointmentDate) return false;
                const date = new Date(p.appointmentDate);
                return !isNaN(date.getTime()) && isSameDay(date, day);
              });

              return (
                <View key={day.toString()} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayTitle}>{format(day, 'EEEE, MMM do')}</Text>
                    <Text style={styles.daySub}>{dayPatients.length} Operations</Text>
                  </View>

                  <View style={styles.dayPatientsList}>
                    {dayPatients.map(p => (
                      <View key={p.id} style={styles.patientRow}>
                        <View style={[
                          styles.patientIconBox,
                          p.category === 'ESWL' ? styles.iconBoxEswl : styles.iconBoxSurg
                        ]}>
                          {p.category === 'ESWL' ? (
                            <Stethoscope size={14} color="#10b981" />
                          ) : (
                            <Scissors size={14} color="#ef4444" />
                          )}
                        </View>
                        <View style={styles.patientInfo}>
                          <Text style={styles.patientName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.patientOp} numberOfLines={1}>{p.operationName}</Text>
                        </View>
                        {p.appointmentDate && (
                          <Text style={styles.patientTime}>
                            {format(new Date(p.appointmentDate), 'HH:mm')}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No operations scheduled this month</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.broadcastCard}>
            <Text style={styles.sectionTitle}>Send Broadcast Alert</Text>
            <Text style={styles.sectionSubtitle}>Broadcast priority messages to the resident team</Text>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={6}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="Type your alert message here..."
                placeholderTextColor="#475569"
              />
              <TouchableOpacity onPress={handleSendText} style={styles.sendBtn}>
                <Send size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.voiceWrapper}>
              <TouchableOpacity onPress={handleSendVoice} style={styles.voiceBtn}>
                <Mic size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.voiceInfo}>
                <Text style={styles.voiceTitle}>Push to Talk</Text>
                <Text style={styles.voiceSub}>Simulate recording a voice update memo</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  approvalSection: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    padding: 16,
    marginBottom: 20,
  },
  approvalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#1e293b',
  },
  approvalInfo: {
    flex: 1,
    marginRight: 10,
  },
  approvalPatientName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
  },
  approvalPatientDetails: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 2,
  },
  approvalNationalId: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2,
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 16,
    width: '100%',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#1f2937',
    borderWidth: 0.5,
    borderColor: '#374151',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '900',
  },
  tabContent: {
    flex: 1,
  },
  dayCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    padding: 16,
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
  },
  daySub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  dayPatientsList: {
    gap: 10,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#1e293b',
  },
  patientIconBox: {
    padding: 6,
    borderRadius: 8,
    marginRight: 10,
  },
  iconBoxEswl: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  iconBoxSurg: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  patientOp: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  patientTime: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    marginLeft: 10,
  },
  emptyBox: {
    backgroundColor: '#111827',
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#1f2937',
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textAlign: 'center',
  },
  broadcastCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 20,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#1f2937',
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    paddingRight: 60,
  },
  sendBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 14,
  },
  voiceWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 20,
    padding: 16,
  },
  voiceBtn: {
    backgroundColor: '#4f46e5',
    width: 48,
    height: 48,
    borderRadius: 99,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  voiceSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
});

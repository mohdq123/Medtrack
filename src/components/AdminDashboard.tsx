import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Text } from './PoppinsText';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { Send, Mic, MicOff, MessageSquare, Calendar, Stethoscope, Scissors, Check, X, Clock, AlertTriangle, Square, PlayCircle, Play, Pause, Volume2 } from 'lucide-react-native';
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Patient, AdminMessage } from '../types';
import { R2Service } from '../services/R2Service';
import PatientDetailModal from './PatientDetailModal';

const formatAudioDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

interface AdminVoiceMessageItemProps {
  message: AdminMessage;
  isDarkMode: boolean;
  onDelete?: (id: string) => void;
}

function AdminVoiceMessageItem({ message, isDarkMode, onDelete }: AdminVoiceMessageItemProps) {
  const player = useAudioPlayer({ uri: message.audioUrl });
  const status = useAudioPlayerStatus(player);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);

  useEffect(() => {
    const current = status.currentTime || 0;
    const duration = message.duration || status.duration || 0;
    if (!status.playing && duration > 0 && current >= duration - 0.2) {
      player.seekTo(0);
    }
  }, [status.playing, status.currentTime, status.duration, message.duration]);

  const handlePlayPause = async () => {
    if (status.playing) {
      player.pause();
    } else {
      const currentPos = status.currentTime || 0;
      const totalDur = message.duration || status.duration || 0;
      if (totalDur > 0 && currentPos >= totalDur - 0.3) {
        await player.seekTo(0);
      }
      player.play();
    }
  };

  const handleToggleSpeed = () => {
    let nextSpeed: 1 | 1.5 | 2 = 1;
    if (speed === 1) nextSpeed = 1.5;
    else if (speed === 1.5) nextSpeed = 2;
    setSpeed(nextSpeed);
    player.setPlaybackRate(nextSpeed);
  };

  return (
    <View style={styles.broadcastHistoryItem}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Volume2 size={16} color={status.playing ? "#818cf8" : "#64748b"} style={{ marginRight: 6 }} />
          <Text style={styles.broadcastHistorySender}>{message.sender}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={styles.broadcastHistoryTime}>
            {format(new Date(message.timestamp), 'MMM d, h:mm a')}
          </Text>
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(message.id)} style={{ padding: 4 }}>
              <X size={14} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.broadcastHistoryContent}>{message.content}</Text>
      
      <View style={voicePlayerStyles.container}>
        <TouchableOpacity onPress={handlePlayPause} style={voicePlayerStyles.miniPlayBtn}>
          {status.playing ? <Pause size={10} color="#fff" /> : <Play size={10} color="#fff" />}
        </TouchableOpacity>
        
        <View style={voicePlayerStyles.progressContainer}>
          <View style={[voicePlayerStyles.progressBarBg, isDarkMode ? voicePlayerStyles.progressBgDark : voicePlayerStyles.progressBgLight]}>
            <View 
              style={[
                voicePlayerStyles.progressBarFill, 
                { 
                  width: `${Math.min(100, ((status.currentTime || 0) / (message.duration || status.duration || 1)) * 100)}%` 
                }
              ]} 
            />
          </View>
          <Text style={[voicePlayerStyles.durationText, isDarkMode ? voicePlayerStyles.textDimDark : voicePlayerStyles.textDimLight]}>
            {formatAudioDuration(status.currentTime || 0)} / {formatAudioDuration(message.duration || status.duration || 0)}
          </Text>
        </View>

        <TouchableOpacity onPress={handleToggleSpeed} style={voicePlayerStyles.speedBtn}>
          <Text style={voicePlayerStyles.speedBtnText}>{speed}x</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const voicePlayerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    gap: 10,
  },
  miniPlayBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    gap: 4,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  progressBgDark: {
    backgroundColor: '#374151',
  },
  progressBgLight: {
    backgroundColor: '#e2e8f0',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#818cf8',
  },
  durationText: {
    fontSize: 9,
    fontWeight: '700',
  },
  textDimDark: {
    color: '#94a3b8',
  },
  textDimLight: {
    color: '#64748b',
  },
  speedBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  speedBtnText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});

const WAV_RECORDING_OPTIONS = {
  extension: '.wav',
  sampleRate: 44100,
  numberOfChannels: 2,
  bitRate: 128000,
  android: {
    extension: '.wav',
    outputFormat: 'default',
    audioEncoder: 'default',
  },
  ios: {
    extension: '.wav',
    outputFormat: 'lpcm',
    audioQuality: 0x7f,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/wav',
    bitsPerSecond: 128000,
  },
} as const;

interface AdminDashboardProps {
  patients: Patient[];
  messages: AdminMessage[];
  isDarkMode: boolean;
  onSendMessage: (msg: Omit<AdminMessage, 'id' | 'timestamp' | 'sender'>) => void;
  onApprovePatient?: (id: string) => void;
  onRejectPatient?: (id: string) => void;
  onDeleteMessage?: (id: string) => void;
}

export default function AdminDashboard({ patients, messages, isDarkMode, onSendMessage, onApprovePatient, onRejectPatient, onDeleteMessage }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'review' | 'broadcast'>('review');
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const audioRecorder = useAudioRecorder(WAV_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(audioRecorder);

  // Request mic permissions on mount
  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync();
  }, []);

  // Pulsing animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const today = new Date();

  const handleSendText = () => {
    if (!textInput.trim()) return;
    onSendMessage({ type: 'text', content: textInput.trim() });
    setTextInput('');
    Alert.alert('✅ Sent', 'Broadcast message delivered to all residents.');
  };

  const handleStartRecording = async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone access is needed to record voice broadcasts.');
        return;
      }
      // Required on iOS: enable recording mode before calling record()
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch (e) {
      console.error('Recording error:', e);
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const handleStopAndUpload = async () => {
    if (!isRecording) return;
    try {
      clearInterval(timerRef.current!);
      setIsRecording(false);
      setIsUploading(true);

      await audioRecorder.stop();
      // Restore audio mode to normal playback after recording
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = audioRecorder.uri;
      if (!uri) throw new Error('No recording URI');

      // Read recording as base64 using legacy FileSystem
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const url = await R2Service.uploadAudio(base64, 'wav');

      if (url) {
        onSendMessage({
          type: 'voice',
          content: `🎙️ Voice broadcast (${formatDuration(recordingDuration)})`,
          audioUrl: url,
          duration: recordingDuration,
        } as Omit<AdminMessage, 'id' | 'timestamp' | 'sender'>);
        Alert.alert('✅ Uploaded', `Voice broadcast saved (${formatDuration(recordingDuration)}) and broadcast to the team.`);
      }
    } catch (e: any) {
      console.error('Upload error:', e);
      Alert.alert('Upload Failed', e?.message || 'Could not upload recording.');
    } finally {
      setIsUploading(false);
      setRecordingDuration(0);
    }
  };

  // Filter days with patients in the current week only
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const activeDays = daysInWeek.filter(day =>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <AlertTriangle size={18} color="#fbbf24" style={{ marginRight: 8 }} />
                <Text style={[styles.sectionTitle, { fontSize: 16, color: '#fbbf24', fontWeight: '900' }]}>
                  Schedule Approvals Required
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                The following cases were scheduled within the restricted 8-day period and require authorization:
              </Text>
              
              {patients.filter(p => p.requiresApproval && !p.isApproved).map(p => (
                <View key={p.id} style={styles.approvalCard}>
                  <View style={styles.approvalInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.approvalPatientName}>{p.name}</Text>
                      <View style={{
                        backgroundColor: p.category === 'ESWL' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                        marginLeft: 8
                      }}>
                        <Text style={{
                          color: p.category === 'ESWL' ? '#10b981' : '#ef4444',
                          fontSize: 9,
                          fontWeight: '800'
                        }}>
                          {p.category}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.approvalPatientDetails}>
                      Procedure: <Text style={{ color: '#fff', fontWeight: '700' }}>{p.operationName}</Text>
                    </Text>
                    <Text style={[styles.approvalPatientDetails, { marginTop: 1 }]}>
                      Date: <Text style={{ color: '#fbbf24', fontWeight: '700' }}>{p.appointmentDate ? format(new Date(p.appointmentDate), 'eee, MMM d @ h:mm a') : 'N/A'}</Text>
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Text style={[styles.approvalNationalId, { marginRight: 10 }]}>NID: {p.nationalId || 'N/A'}</Text>
                      <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '600' }}>By: {p.surgeonName || 'Dr. Resident'}</Text>
                    </View>
                  </View>
                  <View style={styles.approvalActions}>
                    <TouchableOpacity 
                      onPress={() => onApprovePatient && onApprovePatient(p.id)}
                      style={styles.approveBtn}
                      activeOpacity={0.8}
                    >
                      <Check size={12} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => onRejectPatient && onRejectPatient(p.id)}
                      style={styles.rejectBtn}
                      activeOpacity={0.8}
                    >
                      <X size={12} color="#fff" style={{ marginRight: 4 }} />
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
                      <TouchableOpacity
                        key={p.id}
                        style={styles.patientRow}
                        onPress={() => setSelectedPatient(p)}
                        activeOpacity={0.75}
                      >
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
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No operations scheduled this week</Text>
            </View>
          )}
          <PatientDetailModal patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Text Broadcast Card */}
          <View style={styles.broadcastCard}>
            <Text style={styles.sectionTitle}>📣 Send Broadcast Alert</Text>
            <Text style={styles.sectionSubtitle}>Push a priority text message to the entire resident team</Text>

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
              <TouchableOpacity onPress={handleSendText} style={styles.sendBtn} activeOpacity={0.8}>
                <Send size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Voice Recording Card */}
          <View style={[styles.broadcastCard, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>🎙️ Voice Broadcast</Text>
            <Text style={styles.sectionSubtitle}>Record a voice memo and broadcast it to residents — stored securely in Cloudflare R2</Text>

            {/* Recording Area */}
            <View style={styles.voiceWrapper}>
              {/* Pulsing mic button */}
              <Animated.View style={[styles.voiceBtnWrapper, { transform: [{ scale: pulseAnim }] }]}>
                <TouchableOpacity
                  onPress={isRecording ? handleStopAndUpload : handleStartRecording}
                  style={[styles.voiceBtn, isRecording && styles.voiceBtnActive]}
                  activeOpacity={0.8}
                  disabled={isUploading}
                >
                  {isRecording ? (
                    <Square size={24} color="#fff" />
                  ) : (
                    <Mic size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.voiceInfo}>
                {isUploading ? (
                  <>
                    <Text style={styles.voiceTitle}>Uploading to R2…</Text>
                    <Text style={styles.voiceSub}>Please wait while your recording is being stored</Text>
                  </>
                ) : isRecording ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.recDot} />
                      <Text style={[styles.voiceTitle, { color: '#ef4444' }]}>Recording</Text>
                    </View>
                    <Text style={[styles.voiceSub, { color: '#fbbf24', fontWeight: '800', fontSize: 20, marginTop: 4 }]}>
                      {formatDuration(recordingDuration)}
                    </Text>
                    <Text style={[styles.voiceSub, { marginTop: 2 }]}>Tap ■ to stop & upload</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.voiceTitle}>Push to Record</Text>
                    <Text style={styles.voiceSub}>Tap 🎙 to start — audio uploads to R2 on stop</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Sent Broadcasts (Announcements) History */}
          <View style={[styles.broadcastCard, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Recent Broadcasts</Text>
            <Text style={styles.sectionSubtitle}>View and replay past department alerts</Text>
            
            {messages.length > 0 ? (
              messages.map(m => {
                if (m.type === 'voice' && m.audioUrl) {
                  return (
                    <AdminVoiceMessageItem 
                      key={m.id} 
                      message={m} 
                      isDarkMode={isDarkMode} 
                      onDelete={onDeleteMessage}
                    />
                  );
                }
                return (
                  <View key={m.id} style={styles.broadcastHistoryItem}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Send size={16} color="#6366f1" style={{ marginRight: 6 }} />
                        <Text style={styles.broadcastHistorySender}>{m.sender}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={styles.broadcastHistoryTime}>
                          {format(new Date(m.timestamp), 'MMM d, h:mm a')}
                        </Text>
                        {onDeleteMessage && (
                          <TouchableOpacity onPress={() => onDeleteMessage(m.id)} style={{ padding: 4 }}>
                            <X size={14} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <Text style={styles.broadcastHistoryContent}>{m.content}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noBroadcastsText}>No broadcasts sent yet.</Text>
            )}
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
    backgroundColor: 'rgba(251, 191, 36, 0.04)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.15)',
    padding: 18,
    marginBottom: 20,
  },
  approvalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  approvalInfo: {
    flex: 1,
    marginRight: 12,
  },
  approvalPatientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  approvalPatientDetails: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 3,
  },
  approvalNationalId: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '700',
  },
  approvalActions: {
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 85,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  rejectBtn: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 85,
  },
  rejectBtnText: {
    color: '#fff',
    fontSize: 11,
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
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 20,
    padding: 18,
    marginTop: 16,
  },
  voiceBtnWrapper: {
    marginRight: 16,
  },
  voiceBtn: {
    backgroundColor: '#4f46e5',
    width: 56,
    height: 56,
    borderRadius: 99,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceBtnActive: {
    backgroundColor: '#dc2626',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  voiceInfo: {
    flex: 1,
  },
  voiceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  voiceSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  broadcastHistoryItem: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1f2937',
  },
  broadcastHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  broadcastHistorySender: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '800',
  },
  broadcastHistoryTime: {
    color: '#64748b',
    fontSize: 10,
    marginLeft: 'auto',
  },
  broadcastHistoryContent: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
  noBroadcastsText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
});

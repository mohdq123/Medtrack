import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator, Image, Modal, SafeAreaView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Text } from './PoppinsText';
import { 
  Phone, Edit, Trash2, BrainCircuit, 
  ChevronDown, ChevronUp, AlertCircle, Scissors, 
  CheckCircle2, Clock, ArrowLeftRight, X,
  ChevronLeft, ChevronRight, FileText
} from 'lucide-react-native';
import { format } from 'date-fns';
import { Patient, AnalysisResult } from '../types';
import { analyzePatientHistory } from '../services/geminiService';

interface PatientListProps {
  patients: Patient[];
  onEdit: (patient: Patient) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onScheduleEswl?: (id: string) => void;
  onReaddToWaitlist?: (id: string) => void;
  currentUserRole?: string;
}

export default function PatientList({ 
  patients, onEdit, onDelete, onToggleComplete, onScheduleEswl, onReaddToWaitlist, currentUserRole 
}: PatientListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({});
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState<number | null>(null);
  const [fullscreenImagesList, setFullscreenImagesList] = useState<any[]>([]);

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate call. Verify phone settings.');
    });
  };

  const handleAnalyze = async (patient: Patient) => {
    setAnalyzingId(patient.id);
    const result = await analyzePatientHistory(patient);
    setAnalyses(prev => ({ ...prev, [patient.id]: result }));
    setAnalyzingId(null);
    setExpandedId(patient.id);
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to permanently delete this patient record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(id) }
      ]
    );
  };

  if (patients.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No patient records found</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {patients.map((p) => {
        const isExpanded = expandedId === p.id;
        const isAnalyzing = analyzingId === p.id;
        const analysis = analyses[p.id];
        
        return (
          <View key={p.id} style={styles.card}>
            {/* Header row */}
            <TouchableOpacity 
              onPress={() => setExpandedId(isExpanded ? null : p.id)}
              style={styles.cardHeader}
              activeOpacity={0.8}
            >
              <View style={[
                styles.avatar,
                p.isCompleted ? styles.avatarCompleted : (p.category === 'ESWL' ? styles.avatarEswl : styles.avatarSurg)
              ]}>
                {p.isCompleted ? (
                  <CheckCircle2 size={18} color="#6366f1" />
                ) : (
                  <Text style={[
                    styles.avatarText,
                    p.category === 'ESWL' ? styles.avatarTextEswl : styles.avatarTextSurg
                  ]}>
                    {p.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText} numberOfLines={1}>{p.name}</Text>
                  {p.isCancelled && (
                    <View style={styles.cancelledBadge}>
                      <Text style={styles.cancelledBadgeText}>Cancelled</Text>
                    </View>
                  )}
                  {p.requiresApproval && !p.isApproved && (
                    <View style={{ 
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(245, 158, 11, 0.08)', 
                      borderWidth: 1, 
                      borderColor: 'rgba(245, 158, 11, 0.25)', 
                      paddingHorizontal: 8, 
                      paddingVertical: 3, 
                      borderRadius: 20, 
                      marginLeft: 8,
                      shadowColor: '#f59e0b',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 1
                    }}>
                      <Clock size={10} color="#f59e0b" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#f59e0b', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        Pending Approval
                      </Text>
                    </View>
                  )}
                </View>
                {p.phoneNumber ? (
                  <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '600', marginTop: 1 }}>
                    {p.phoneNumber}
                  </Text>
                ) : null}
                <Text style={styles.detailsText} numberOfLines={1}>
                  {p.operationName} {p.appointmentDate ? `• ${format(new Date(p.appointmentDate), 'HH:mm')}` : ''}
                </Text>
              </View>

              {/* Action shortcuts */}
              <View style={styles.shortcuts} onStartShouldSetResponder={() => true}>
                {p.phoneNumber ? (
                  <TouchableOpacity 
                    onPress={() => handleCall(p.phoneNumber)} 
                    style={[styles.shortcutBtn, styles.callShortcut]}
                  >
                    <Phone size={14} color="#10b981" />
                  </TouchableOpacity>
                ) : null}

                {currentUserRole === 'admin' && p.appointmentDate && !p.isCompleted && !p.isCancelled && (
                  <TouchableOpacity 
                    onPress={() => onToggleComplete(p.id)} 
                    style={[styles.shortcutBtn, styles.checkShortcut]}
                  >
                    <CheckCircle2 size={14} color="#6366f1" />
                  </TouchableOpacity>
                )}

                {p.category === 'ESWL' && (p.appointmentDate || p.isCancelled || p.isCompleted) && onReaddToWaitlist && (
                  <TouchableOpacity 
                    onPress={() => onReaddToWaitlist(p.id)} 
                    style={[styles.shortcutBtn, styles.poolShortcut]}
                  >
                    <ArrowLeftRight size={14} color="#f59e0b" />
                  </TouchableOpacity>
                )}

                {p.category === 'ESWL' && !p.appointmentDate && !p.isCompleted && !p.isCancelled && onScheduleEswl && (
                  <TouchableOpacity 
                    onPress={() => onScheduleEswl(p.id)} 
                    style={[styles.shortcutBtn, styles.scheduleShortcut]}
                  >
                    <Clock size={14} color="#fff" />
                  </TouchableOpacity>
                )}

                <View style={styles.chevron}>
                  {isExpanded ? <ChevronUp size={16} color="#475569" /> : <ChevronDown size={16} color="#475569" />}
                </View>
              </View>
            </TouchableOpacity>

            {/* Expanded section */}
            {isExpanded && (
              <View style={styles.expandedContent}>
                <View style={styles.grid}>
                  <View style={styles.gridCol}>
                    <Text style={styles.metaLabel}>Present History</Text>
                    <Text style={styles.metaValue}>{p.presentHistory || '-'}</Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.metaLabel}>Past History</Text>
                    <Text style={styles.metaValue}>{p.pastHistory || '-'}</Text>
                  </View>
                </View>

                <View style={styles.fullRow}>
                  <Text style={styles.metaLabel}>Side</Text>
                  <Text style={styles.metaValue}>{p.side}</Text>
                </View>

                <View style={styles.fullRow}>
                  <Text style={styles.metaLabel}>Labs & Findings</Text>
                  <Text style={[styles.metaValue, styles.labValue]}>{p.labInvestigations || '-'}</Text>
                </View>

                {p.labPdfUrl && (
                  <View style={[styles.fullRow, { marginTop: 6, marginBottom: 6 }]}>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        borderWidth: 1,
                        borderColor: '#6366f1',
                        borderRadius: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        alignSelf: 'flex-start'
                      }}
                      onPress={async () => {
                        try {
                          await WebBrowser.openBrowserAsync(p.labPdfUrl!);
                        } catch (err) {
                          Alert.alert('Error', 'Could not open PDF file inside the app.');
                        }
                      }}
                    >
                      <FileText size={15} color="#818cf8" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#818cf8', fontSize: 13, fontWeight: '700' }}>View Lab PDF Report</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Render Images if any */}
                {p.imaging && p.imaging.length > 0 && (
                  <View style={styles.fullRow}>
                    <Text style={styles.metaLabel}>Imaging ({p.imaging.length})</Text>
                    <View style={styles.imageRow}>
                      {p.imaging.map((img, idx) => {
                        const isPdf = img.type === 'PDF' || img.imageData.toLowerCase().includes('.pdf');
                        return (
                          <TouchableOpacity 
                            key={img.id} 
                            style={styles.imageThumbnailContainer}
                            onPress={async () => {
                              if (isPdf) {
                                try {
                                  await WebBrowser.openBrowserAsync(img.imageData);
                                } catch (err) {
                                  Alert.alert('Error', 'Could not open PDF file inside the app.');
                                }
                              } else {
                                setFullscreenImagesList(p.imaging || []);
                                setFullscreenImageIndex(idx);
                              }
                            }}
                            activeOpacity={0.9}
                          >
                            {isPdf ? (
                              <View style={[styles.imageThumbnail, { backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' }]}>
                                <FileText size={20} color="#f43f5e" />
                                <Text style={{ fontSize: 8, color: '#94a3b8', marginTop: 2, fontWeight: '600' }}>PDF</Text>
                              </View>
                            ) : (
                              <Image source={{ uri: img.imageData }} style={styles.imageThumbnail} />
                            )}
                            <Text style={styles.imageTypeTag}>{img.type}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                <View style={styles.divider} />

                {/* Actions Row */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity 
                    onPress={() => handleAnalyze(p)} 
                    style={styles.aiButton}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <ActivityIndicator size="small" color="#818cf8" style={{ marginRight: 6 }} />
                    ) : (
                      <BrainCircuit size={14} color="#818cf8" style={{ marginRight: 6 }} />
                    )}
                    <Text style={styles.aiButtonText}>AI CLINICAL ANALYSIS</Text>
                  </TouchableOpacity>

                  <View style={styles.editDeleteRow}>
                    <TouchableOpacity onPress={() => onEdit(p)} style={styles.actionBtn}>
                      <Edit size={16} color="#94a3b8" />
                    </TouchableOpacity>
                    {currentUserRole === 'admin' && (
                      <TouchableOpacity onPress={() => confirmDelete(p.id)} style={[styles.actionBtn, styles.deleteBtn]}>
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* AI Result Card */}
                {analysis && (
                  <View style={styles.analysisCard}>
                    <View style={styles.analysisHeader}>
                      <BrainCircuit size={16} color="#818cf8" style={{ marginRight: 6 }} />
                      <Text style={styles.analysisTitle}>Gemini AI Clinical Evaluation</Text>
                    </View>
                    <Text style={styles.analysisSummary}>{analysis.summary}</Text>
                    
                    {analysis.redFlags.length > 0 && (
                      <View style={styles.analysisSection}>
                        <Text style={styles.sectionLabel}>RED FLAGS / RISKS</Text>
                        {analysis.redFlags.map((flag, i) => (
                          <Text key={i} style={styles.flagText}>• {flag}</Text>
                        ))}
                      </View>
                    )}

                    {analysis.recommendations.length > 0 && (
                      <View style={styles.analysisSection}>
                        <Text style={styles.sectionLabel}>PRE-OP RECOMMENDATIONS</Text>
                        {analysis.recommendations.map((rec, i) => (
                          <Text key={i} style={styles.recText}>• {rec}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
      {/* Fullscreen Image Viewer Slideshow Modal */}
      <Modal
        visible={fullscreenImageIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImageIndex(null)}
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.fullscreenBackground} 
            onPress={() => setFullscreenImageIndex(null)}
          />
          <SafeAreaView style={styles.fullscreenSafeContainer}>
            <View style={styles.fullscreenHeader}>
              <Text style={styles.fullscreenCounter}>
                {fullscreenImageIndex !== null && fullscreenImagesList.length > 0
                  ? `${fullscreenImageIndex + 1} of ${fullscreenImagesList.length} — ${fullscreenImagesList[fullscreenImageIndex]?.type || ''}`
                  : ''}
              </Text>
              <TouchableOpacity 
                style={styles.fullscreenCloseBtn}
                onPress={() => setFullscreenImageIndex(null)}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.fullscreenImageContainer}>
              {fullscreenImageIndex !== null && fullscreenImagesList.length > 0 && (
                <>
                  {/* Left Arrow */}
                  {fullscreenImageIndex > 0 && (
                    <TouchableOpacity 
                      style={[styles.arrowBtn, styles.arrowLeft]}
                      onPress={() => setFullscreenImageIndex(fullscreenImageIndex - 1)}
                    >
                      <ChevronLeft size={28} color="#fff" />
                    </TouchableOpacity>
                  )}

                  {(fullscreenImagesList[fullscreenImageIndex]?.type === 'PDF' || fullscreenImagesList[fullscreenImageIndex]?.imageData.toLowerCase().includes('.pdf')) ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <FileText size={80} color="#f43f5e" />
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 }}>PDF Document</Text>
                      <TouchableOpacity 
                        style={{
                          backgroundColor: '#6366f1',
                          paddingVertical: 12,
                          paddingHorizontal: 24,
                          borderRadius: 8,
                          marginTop: 20
                        }}
                        onPress={async () => {
                          const url = fullscreenImagesList[fullscreenImageIndex]?.imageData;
                          if (url) {
                            try {
                              await WebBrowser.openBrowserAsync(url);
                            } catch (err) {
                              Alert.alert('Error', 'Could not open PDF file inside the app.');
                            }
                          }
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Open PDF Document</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Image 
                      source={{ uri: fullscreenImagesList[fullscreenImageIndex]?.imageData }} 
                      style={styles.fullscreenImage} 
                      resizeMode="contain"
                    />
                  )}

                  {/* Right Arrow */}
                  {fullscreenImageIndex < fullscreenImagesList.length - 1 && (
                    <TouchableOpacity 
                      style={[styles.arrowBtn, styles.arrowRight]}
                      onPress={() => setFullscreenImageIndex(fullscreenImageIndex + 1)}
                    >
                      <ChevronRight size={28} color="#fff" />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCompleted: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  avatarEswl: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  avatarSurg: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
  },
  avatarTextEswl: {
    color: '#10b981',
  },
  avatarTextSurg: {
    color: '#ef4444',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    maxWidth: '75%',
  },
  cancelledBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cancelledBadgeText: {
    color: '#fff',
    fontSize: 6,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  shortcuts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shortcutBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callShortcut: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  checkShortcut: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  poolShortcut: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  scheduleShortcut: {
    backgroundColor: '#4f46e5',
  },
  chevron: {
    paddingLeft: 2,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: '#1f2937',
    paddingTop: 12,
    backgroundColor: '#0f172a',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
    fontWeight: '500',
  },
  fullRow: {
    marginBottom: 12,
  },
  labValue: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
  imageRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  imageThumbnailContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  imageTypeTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 7,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#1f2937',
    marginVertical: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  aiButtonText: {
    color: '#818cf8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  editDeleteRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 10,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  analysisCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    padding: 12,
    marginTop: 12,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisTitle: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '900',
  },
  analysisSummary: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  analysisSection: {
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#6366f1',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  flagText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  recText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  fullscreenBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fullscreenSafeContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  fullscreenCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 10,
    borderRadius: 99,
  },
  fullscreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    marginBottom: 40,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenHeader: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fullscreenCounter: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '800',
  },
  arrowBtn: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLeft: {
    left: 20,
  },
  arrowRight: {
    right: 20,
  },
});

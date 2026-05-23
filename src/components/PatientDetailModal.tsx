import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView,
  Modal, SafeAreaView, Image, Alert, Linking
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Text } from './PoppinsText';
import {
  X, Scissors, Stethoscope, Clock, Phone, FileText,
  ChevronLeft, ChevronRight, Star
} from 'lucide-react-native';
import { format } from 'date-fns';
import { Patient } from '../types';

interface PatientDetailModalProps {
  patient: Patient | null;
  onClose: () => void;
}

export default function PatientDetailModal({ patient, onClose }: PatientDetailModalProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  if (!patient) return null;

  const isSurg = patient.category === 'Surgical';
  const accent = isSurg ? '#ef4444' : '#10b981';
  const accentBg = isSurg ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
  const imaging = patient.imaging || [];

  const openLabReport = async () => {
    const url = patient.labPdfUrl;
    if (!url) return;
    if (url.startsWith('data:')) {
      Alert.alert('Lab Report', 'Report stored locally — preview unavailable.');
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Linking.openURL(url).catch(() =>
        Alert.alert('Error', 'Could not open lab report.')
      );
    }
  };

  const openImageFullscreen = async (img: { imageData: string; type: string }) => {
    const isPdf = img.type === 'PDF' || img.imageData.toLowerCase().includes('.pdf');
    if (isPdf) {
      try {
        await WebBrowser.openBrowserAsync(img.imageData);
      } catch {
        Alert.alert('Error', 'Could not open PDF.');
      }
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.categoryBadge, { backgroundColor: accentBg }]}>
              {isSurg
                ? <Scissors size={14} color={accent} />
                : <Stethoscope size={14} color={accent} />
              }
              <Text style={[styles.categoryText, { color: accent }]}>{patient.category}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

            {/* Patient Identity */}
            <Text style={styles.patientName}>{patient.name}</Text>
            {patient.isSpecial && (
              <View style={styles.specialBadge}>
                <Star size={11} color="#f59e0b" style={{ marginRight: 4 }} />
                <Text style={styles.specialText}>Special Case</Text>
              </View>
            )}

            {/* Meta Row */}
            <View style={styles.metaRow}>
              {patient.phoneNumber ? (
                <View style={styles.metaChip}>
                  <Phone size={11} color="#64748b" style={{ marginRight: 4 }} />
                  <Text style={styles.metaChipText}>{patient.phoneNumber}</Text>
                </View>
              ) : null}
              {patient.nationalId ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>NID: {patient.nationalId}</Text>
                </View>
              ) : null}
              {patient.side ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>Side: {patient.side}</Text>
                </View>
              ) : null}
            </View>

            {/* Procedure & Schedule */}
            <View style={styles.card}>
              <Row label="Procedure" value={patient.operationName || '-'} />
              <Row label="Surgeon" value={patient.surgeonName || '-'} />
              {patient.appointmentDate ? (
                <Row
                  label="Scheduled"
                  value={format(new Date(patient.appointmentDate), 'EEEE, MMM do, yyyy — HH:mm')}
                  highlight
                />
              ) : null}
            </View>

            {/* Clinical */}
            <View style={styles.card}>
              <SectionLabel>Clinical History</SectionLabel>
              <Row label="Present History" value={patient.presentHistory || '-'} />
              <Row label="Past History" value={patient.pastHistory || '-'} />
            </View>

            {/* Labs */}
            <View style={styles.card}>
              <SectionLabel>Lab Investigations</SectionLabel>
              <Text style={styles.labText}>{patient.labInvestigations || '—'}</Text>

              {patient.labPdfUrl ? (
                <TouchableOpacity style={styles.labReportBtn} onPress={openLabReport}>
                  <FileText size={16} color="#818cf8" style={{ marginRight: 8 }} />
                  <View>
                    <Text style={styles.labReportTitle}>Lab Report</Text>
                    <Text style={styles.labReportSub}>
                      {patient.labPdfUrl.includes('.pdf') ? 'PDF Document' : 'Image'} • Tap to open
                    </Text>
                  </View>
                  {!patient.labPdfUrl.includes('.pdf') && (
                    <Image
                      source={{ uri: patient.labPdfUrl }}
                      style={styles.labThumb}
                      resizeMode="cover"
                    />
                  )}
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Imaging */}
            {imaging.length > 0 && (
              <View style={styles.card}>
                <SectionLabel>Imaging ({imaging.length})</SectionLabel>
                <View style={styles.imageGrid}>
                  {imaging.map((img, idx) => {
                    const isPdf = img.type === 'PDF' || img.imageData.toLowerCase().includes('.pdf');
                    return (
                      <TouchableOpacity
                        key={img.id || idx}
                        style={styles.imageTile}
                        onPress={() => {
                          if (isPdf) {
                            openImageFullscreen(img);
                          } else {
                            setFullscreenIndex(idx);
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        {isPdf ? (
                          <View style={styles.pdfTile}>
                            <FileText size={28} color="#f43f5e" />
                            <Text style={styles.pdfLabel}>PDF</Text>
                          </View>
                        ) : (
                          <Image source={{ uri: img.imageData }} style={styles.imageTileImg} resizeMode="cover" />
                        )}
                        <Text style={styles.imageTypeTag}>{img.type}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

          </ScrollView>
        </View>

        {/* Fullscreen image viewer */}
        {fullscreenIndex !== null && imaging[fullscreenIndex] && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setFullscreenIndex(null)}>
            <View style={styles.fsOverlay}>
              <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.fsHeader}>
                  <Text style={styles.fsCounter}>{fullscreenIndex + 1} / {imaging.length} — {imaging[fullscreenIndex].type}</Text>
                  <TouchableOpacity onPress={() => setFullscreenIndex(null)} style={styles.fsClose}>
                    <X size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.fsImageContainer}>
                  {fullscreenIndex > 0 && (
                    <TouchableOpacity style={[styles.fsArrow, styles.fsLeft]} onPress={() => setFullscreenIndex(fullscreenIndex - 1)}>
                      <ChevronLeft size={28} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <Image
                    source={{ uri: imaging[fullscreenIndex].imageData }}
                    style={styles.fsImage}
                    resizeMode="contain"
                  />
                  {fullscreenIndex < imaging.length - 1 && (
                    <TouchableOpacity style={[styles.fsArrow, styles.fsRight]} onPress={() => setFullscreenIndex(fullscreenIndex + 1)}>
                      <ChevronRight size={28} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              </SafeAreaView>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { color: '#818cf8', fontWeight: '800' }]}>{value}</Text>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 99,
  },
  body: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  patientName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  specialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  specialText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  metaChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  row: {
    gap: 2,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowValue: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '500',
    lineHeight: 18,
  },
  labText: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '500',
    lineHeight: 18,
  },
  labReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  labReportTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  labReportSub: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  labThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  imageTile: {
    width: 90,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    position: 'relative',
  },
  imageTileImg: {
    width: '100%',
    height: '100%',
  },
  pdfTile: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  pdfLabel: {
    color: '#f43f5e',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 4,
  },
  imageTypeTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#fff',
    fontSize: 7,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 2,
  },
  // Fullscreen
  fsOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  fsHeader: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fsCounter: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  fsClose: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 10,
    borderRadius: 99,
  },
  fsImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  fsImage: {
    width: '100%',
    height: '100%',
  },
  fsArrow: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fsLeft: { left: 16 },
  fsRight: { right: 16 },
});

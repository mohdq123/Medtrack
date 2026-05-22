import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  Alert, 
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Text } from './PoppinsText';
import { X, Calendar as CalendarIcon, User, Phone, Info, Stethoscope, Scissors, Camera, Trash2, Plus, FlaskConical, AlertTriangle, Image as ImageIcon, ChevronLeft, ChevronRight, Check, FileText } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { format, getDay, differenceInCalendarDays } from 'date-fns';
import { Patient, PatientCategory, Investigation, InvestigationType, SideType } from '../types';
import { R2Service } from '../services/R2Service';

interface PatientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (patient: Patient) => void;
  initialData?: Patient;
  currentUserRole?: string;
  existingPatients?: Patient[];
}

export default function PatientForm({ isOpen, onClose, onSubmit, initialData, currentUserRole, existingPatients = [] }: PatientFormProps) {
  const [formData, setFormData] = useState<Partial<Patient>>({
    name: '',
    age: undefined,
    phoneNumber: '',
    category: 'Surgical',
    presentHistory: '',
    pastHistory: '',
    operationName: '',
    side: 'No Side',
    labInvestigations: '',
    imaging: [],
    nationalId: '',
    appointmentDate: undefined,
    labPdfUrl: ''
  });

  const isRescheduleDisabled = !!(initialData?.appointmentDate && currentUserRole !== 'admin');

  const [newInvestType, setNewInvestType] = useState<InvestigationType>('X-ray');
  const [isUploading, setIsUploading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState<number | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(
    initialData?.phoneNumber ? initialData.phoneNumber.split(' / ') : ['']
  );

  const handlePhoneChange = (text: string, index: number) => {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let cleaned = text.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
    cleaned = cleaned.replace(/[^0-9]/g, '');
    const updated = [...phoneNumbers];
    updated[index] = cleaned;
    setPhoneNumbers(updated);
    setFormData(prev => ({ ...prev, phoneNumber: updated.filter(Boolean).join(' / ') }));
  };

  const addPhoneNumber = () => {
    if (phoneNumbers.length < 3) {
      setPhoneNumbers([...phoneNumbers, '']);
    }
  };

  const removePhoneNumber = (index: number) => {
    const updated = phoneNumbers.filter((_, idx) => idx !== index);
    setPhoneNumbers(updated);
    setFormData(prev => ({ ...prev, phoneNumber: updated.filter(Boolean).join(' / ') }));
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        age: initialData.age,
        phoneNumber: initialData.phoneNumber || '',
        category: initialData.category || 'ESWL',
        presentHistory: initialData.presentHistory || '',
        pastHistory: initialData.pastHistory || '',
        operationName: initialData.operationName || '',
        side: initialData.side || 'No Side',
        labInvestigations: initialData.labInvestigations || '',
        imaging: initialData.imaging || [],
        appointmentDate: initialData.appointmentDate ? new Date(initialData.appointmentDate) : undefined,
        nationalId: initialData.nationalId || '',
        requiresApproval: initialData.requiresApproval || false,
        isApproved: initialData.isApproved !== false,
        surgeonName: initialData.surgeonName || (currentUserRole === 'admin' ? 'Dr. Admin' : currentUserRole === 'consultant' ? 'Dr. Consultant' : 'Dr. Resident'),
        isSpecial: !!initialData.isSpecial,
        labPdfUrl: initialData.labPdfUrl || ''
      });
      setPhoneNumbers(initialData.phoneNumber ? initialData.phoneNumber.split(' / ') : ['']);
      if (initialData.appointmentDate) {
        setTempDate(new Date(initialData.appointmentDate));
      }
    } else {
      setFormData({
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
        appointmentDate: undefined,
        nationalId: '',
        requiresApproval: false,
        isApproved: true,
        surgeonName: currentUserRole === 'admin' ? 'Dr. Admin' : currentUserRole === 'consultant' ? 'Dr. Consultant' : 'Dr. Resident',
        isSpecial: false,
        labPdfUrl: ''
      });
      setPhoneNumbers(['']);
      setTempDate(new Date());
    }
  }, [initialData, isOpen, currentUserRole]);

  const handleSubmit = () => {
    if (!formData.name) {
      Alert.alert('Validation Error', 'Patient Name is required');
      return;
    }
    if (formData.age === undefined) {
      Alert.alert('Validation Error', 'Age is required');
      return;
    }
    if (!formData.surgeonName) {
      Alert.alert('Validation Error', 'Surgeon Name is required');
      return;
    }
    if (!formData.operationName) {
      Alert.alert('Validation Error', 'Operation Name is required');
      return;
    }
    if (!formData.phoneNumber) {
      Alert.alert('Validation Error', 'Phone Number is required');
      return;
    }
    if (!formData.nationalId) {
      Alert.alert('Validation Error', 'National ID Number is required');
      return;
    }
    if (formData.nationalId) {
      const cleanId = formData.nationalId.trim().replace(/[^0-9]/g, '');
      const duplicate = existingPatients.find(p => {
        const existingCleanId = (p.nationalId || '').trim().replace(/[^0-9]/g, '');
        return existingCleanId === cleanId && p.id !== initialData?.id;
      });
      if (duplicate) {
        Alert.alert('Duplicate Record', `A patient named "${duplicate.name}" is already registered with this National ID Number.`);
        return;
      }
    }
    if (formData.category === 'Surgical' && !formData.appointmentDate) {
      Alert.alert('Validation Error', 'Appointment Date is required for Surgical Patients');
      return;
    }

    // Check Resident Scheduling range < 8 days
    if (formData.appointmentDate && currentUserRole === 'resident') {
      const daysDiff = differenceInCalendarDays(new Date(formData.appointmentDate), new Date());
      if (daysDiff < 8) {
        Alert.alert(
          'Admin Approval Required',
          'Scheduling within 8 days requires Administrator approval. Would you like to request approval?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Request Approval', 
              onPress: () => {
                if (formData.category === 'ESWL' && getDay(new Date(formData.appointmentDate!)) !== 0) {
                  Alert.alert(
                    'Date Warning',
                    'ESWL operations are usually scheduled on Sundays. Do you want to continue with this date?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Continue', onPress: () => saveAndSubmit(true) }
                    ]
                  );
                } else {
                  saveAndSubmit(true);
                }
              } 
            }
          ]
        );
        return;
      }
    }

    if (formData.category === 'ESWL' && formData.appointmentDate && getDay(new Date(formData.appointmentDate)) !== 0) {
      Alert.alert(
        'Date Warning',
        'ESWL operations are usually scheduled on Sundays. Do you want to continue with this date?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => saveAndSubmit(false) }
        ]
      );
      return;
    }

    saveAndSubmit(false);
  };

  const saveAndSubmit = (reqApproval = false) => {
    const patient: Patient = {
      ...formData as Patient,
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      createdAt: initialData?.createdAt || new Date(),
      imaging: formData.imaging || [],
      labInvestigations: formData.labInvestigations || '',
      age: formData.age || 0,
      nationalId: formData.nationalId || '',
      requiresApproval: reqApproval,
      isApproved: !reqApproval,
      surgeonName: formData.surgeonName || '',
      isSpecial: !!formData.isSpecial,
      appointmentDate: formData.category === 'ESWL' ? (initialData?.appointmentDate ? formData.appointmentDate : undefined) : formData.appointmentDate
    };
    onSubmit(patient);
  };

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission Denied', `Access to ${source} is required to upload diagnostic imaging.`);
        return;
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.3, // Compressing image to stay in budget
            base64: true
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.3,
            base64: true
          });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setIsUploading(true);
        try {
          const extension = result.assets[0].uri.split('.').pop() || 'jpg';
          const base64Data = result.assets[0].base64 || '';
          const publicUrl = await R2Service.uploadImage(base64Data, extension);
          
          if (publicUrl) {
            const newInvest: Investigation = {
              id: Math.random().toString(36).substr(2, 9),
              type: newInvestType,
              imageData: publicUrl,
              date: new Date()
            };
            setFormData(prev => ({
              ...prev,
              imaging: [...(prev.imaging || []), newInvest].slice(0, 3)
            }));
          } else {
            // Fallback to base64 if service returned null
            const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;
            const newInvest: Investigation = {
              id: Math.random().toString(36).substr(2, 9),
              type: newInvestType,
              imageData: base64Data,
              date: new Date()
            };
            setFormData(prev => ({
              ...prev,
              imaging: [...(prev.imaging || []), newInvest].slice(0, 3)
            }));
          }
        } catch (uploadError) {
          console.error("R2 Upload failed, falling back to local base64:", uploadError);
          if (result.assets[0].base64) {
            const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;
            const newInvest: Investigation = {
              id: Math.random().toString(36).substr(2, 9),
              type: newInvestType,
              imageData: base64Data,
              date: new Date()
            };
            setFormData(prev => ({
              ...prev,
              imaging: [...(prev.imaging || []), newInvest].slice(0, 3)
            }));
          } else {
            Alert.alert('Upload Error', 'Failed to upload diagnostic image.');
          }
        } finally {
          setIsUploading(false);
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  const handlePickRadiologyPdf = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!doc.canceled && doc.assets && doc.assets[0].uri) {
        setIsUploading(true);
        try {
          const fileUri = doc.assets[0].uri;
          const base64Data = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          const publicUrl = await R2Service.uploadFile(base64Data, 'pdf', 'radiology', 'application/pdf');
          if (publicUrl) {
            const newInvest: Investigation = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'PDF',
              imageData: publicUrl,
              date: new Date()
            };
            setFormData(prev => ({
              ...prev,
              imaging: [...(prev.imaging || []), newInvest].slice(0, 3)
            }));
          }
        } catch (uploadError) {
          console.error("PDF upload failed:", uploadError);
          Alert.alert('Upload Error', 'Failed to upload PDF to R2.');
        } finally {
          setIsUploading(false);
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick PDF');
    }
  };

  const handlePickLabPdf = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!doc.canceled && doc.assets && doc.assets[0].uri) {
        setIsUploading(true);
        try {
          const fileUri = doc.assets[0].uri;
          const base64Data = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          const publicUrl = await R2Service.uploadFile(base64Data, 'pdf', 'lab', 'application/pdf');
          if (publicUrl) {
            setFormData(prev => ({
              ...prev,
              labPdfUrl: publicUrl
            }));
          }
        } catch (uploadError) {
          console.error("Lab PDF upload failed:", uploadError);
          Alert.alert('Upload Error', 'Failed to upload Lab PDF to R2.');
        } finally {
          setIsUploading(false);
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick PDF');
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imaging: (prev.imaging || []).filter((_, i) => i !== index)
    }));
  };

  const promptSpecialCase = () => {
    Alert.alert(
      'Special Case Flag',
      'Would you like to mark this scheduled patient as a Special Case?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes, Mark Special',
          onPress: () => {
            setFormData(prev => ({ ...prev, isSpecial: true }));
          }
        }
      ]
    );
  };

  const onAndroidDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const newD = new Date(tempDate);
      newD.setFullYear(selectedDate.getFullYear());
      newD.setMonth(selectedDate.getMonth());
      newD.setDate(selectedDate.getDate());
      setTempDate(newD);
      setFormData(prev => ({ ...prev, appointmentDate: newD }));
      setTimeout(() => {
        setShowTimePicker(true);
      }, 150);
    }
  };

  const onAndroidTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (event.type === 'set' && selectedTime) {
      const newD = new Date(tempDate);
      newD.setHours(selectedTime.getHours());
      newD.setMinutes(selectedTime.getMinutes());
      setTempDate(newD);
      setFormData(prev => ({ ...prev, appointmentDate: newD }));
      if (currentUserRole === 'admin') {
        setTimeout(() => {
          promptSpecialCase();
        }, 300);
      }
    }
  };

  const isNotSunday = formData.category === 'ESWL' && formData.appointmentDate && getDay(new Date(formData.appointmentDate)) !== 0;

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <SafeAreaView style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {initialData ? 'Edit Patient Record' : 'New Registration'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Patient Name *</Text>
              <TextInput 
                style={styles.input} 
                value={formData.name} 
                onChangeText={text => setFormData({ ...formData, name: text })} 
                placeholder="Full Name"
                placeholderTextColor="#475569"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone *</Text>
              {phoneNumbers.map((phone, index) => (
                <View key={index} style={styles.phoneInputRow}>
                  <TextInput 
                    style={[styles.input, { flex: 1 }]} 
                    keyboardType="phone-pad"
                    value={phone} 
                    onChangeText={text => handlePhoneChange(text, index)} 
                    placeholder={`Phone Number ${index + 1}`}
                    placeholderTextColor="#475569"
                  />
                  {phoneNumbers.length > 1 && (
                    <TouchableOpacity 
                      onPress={() => removePhoneNumber(index)} 
                      style={styles.removePhoneBtn}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {phoneNumbers.length < 3 && (
                <TouchableOpacity onPress={addPhoneNumber} style={styles.addPhoneBtn}>
                  <Plus size={14} color="#818cf8" style={{ marginRight: 4 }} />
                  <Text style={styles.addPhoneBtnText}>Add Phone (Up to 3)</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                National ID *
              </Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric"
                value={formData.nationalId || ''} 
                onChangeText={text => {
                  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                  let cleaned = text.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
                  cleaned = cleaned.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, nationalId: cleaned });
                }} 
                placeholder="National ID (Required)"
                placeholderTextColor="#475569"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dr. Role *</Text>
              <View style={styles.surgeonPicker}>
                {['Dr. Admin', 'Dr. Resident', 'Dr. Consultant'].map((sName) => {
                  const profileSurgeonName = currentUserRole === 'admin' ? 'Dr. Admin' : currentUserRole === 'consultant' ? 'Dr. Consultant' : 'Dr. Resident';
                  const isDisabled = sName !== profileSurgeonName;
                  return (
                    <TouchableOpacity 
                      key={sName}
                      style={[
                        styles.surgeonBtn, 
                        formData.surgeonName === sName && styles.surgeonBtnActive,
                        isDisabled && { opacity: 0.4 }
                      ]}
                      disabled={isDisabled}
                      onPress={() => setFormData({ ...formData, surgeonName: sName })}
                    >
                      <Text style={[
                        styles.surgeonText, 
                        formData.surgeonName === sName && styles.surgeonTextActive
                      ]}>
                        {sName.replace('Dr. ', '')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {currentUserRole === 'admin' && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: formData.isSpecial ? '#6366f1' : '#1f2937'
                }}
                onPress={() => setFormData({ ...formData, isSpecial: !formData.isSpecial })}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: formData.isSpecial ? '#6366f1' : '#475569',
                    backgroundColor: formData.isSpecial ? '#6366f1' : 'transparent',
                    marginRight: 10,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {formData.isSpecial && (
                    <Check size={12} color="#fff" />
                  )}
                </View>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Mark as Special Case</Text>
              </TouchableOpacity>
            )}

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>Age *</Text>
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric"
                  value={formData.age === undefined ? '' : String(formData.age)} 
                  onChangeText={text => {
                    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                    let cleaned = text.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
                    cleaned = cleaned.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, age: cleaned === '' ? undefined : parseInt(cleaned, 10) });
                  }} 
                  placeholder="e.g. 45"
                  placeholderTextColor="#475569"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1.5 }]}>
                <Text style={styles.label}>Category *</Text>
                <View style={styles.categoryPicker}>
                  <TouchableOpacity 
                    style={[styles.catBtn, formData.category === 'ESWL' && styles.catBtnActiveEswl]}
                    onPress={() => setFormData({ ...formData, category: 'ESWL' })}
                  >
                    <Text style={[styles.catText, formData.category === 'ESWL' && styles.catTextActive]}>ESWL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.catBtn, formData.category === 'Surgical' && styles.catBtnActiveSurg]}
                    onPress={() => setFormData({ ...formData, category: 'Surgical' })}
                  >
                    <Text style={[styles.catText, formData.category === 'Surgical' && styles.catTextActive]}>Surg</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Appointment Date {formData.category === 'Surgical' && '*'}
              </Text>
              <TouchableOpacity 
                style={[
                  styles.dateButton, 
                  isNotSunday && styles.dateWarningBorder,
                  isRescheduleDisabled && { opacity: 0.6, backgroundColor: 'rgba(255,255,255,0.05)' }
                ]}
                disabled={isRescheduleDisabled}
                onPress={() => {
                  const current = formData.appointmentDate ? new Date(formData.appointmentDate) : new Date();
                  setTempDate(current);
                  if (Platform.OS === 'ios') {
                    setShowIOSPicker(true);
                  } else {
                    setShowDatePicker(true);
                  }
                }}
              >
                <CalendarIcon size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                <Text style={[styles.dateButtonText, !formData.appointmentDate && { color: '#475569' }]}>
                  {formData.appointmentDate 
                    ? format(new Date(formData.appointmentDate), 'eeee, MMM d, yyyy @ h:mm a') 
                    : 'Select Date & Time'}
                </Text>
              </TouchableOpacity>
              {isRescheduleDisabled && (
                <Text style={styles.disabledDateWarning}>
                  * Rescheduling is restricted to Admins only.
                </Text>
              )}
              {isNotSunday && (
                <View style={styles.warningContainer}>
                  <AlertTriangle size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                  <Text style={styles.warningText}>ESWL is typically scheduled on Sundays</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Operation Name *</Text>
              <TextInput 
                style={styles.input} 
                value={formData.operationName} 
                onChangeText={text => setFormData({ ...formData, operationName: text })} 
                placeholder="e.g. Ureteroscopy / Pyelolithotomy"
                placeholderTextColor="#475569"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Side *</Text>
              <View style={styles.sidePicker}>
                {(['No Side', 'Left', 'Right', 'Bilateral'] as SideType[]).map(s => (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.sideBtn, formData.side === s && styles.sideBtnActive]}
                    onPress={() => setFormData({ ...formData, side: s })}
                  >
                    <Text style={[styles.sideText, formData.side === s && styles.sideTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Imaging */}
            <View style={styles.imagingSection}>
              <View style={styles.imagingHeader}>
                <Text style={styles.imagingTitle}>
                  <ImageIcon size={16} color="#6366f1" /> Imaging Investigations
                </Text>
                <View style={styles.imgControls}>
                  {(['X-ray', 'CT'] as InvestigationType[]).map(type => (
                    <TouchableOpacity 
                      key={type}
                      style={[styles.imgTypeSelector, newInvestType === type && styles.imgTypeSelectorActive]}
                      onPress={() => setNewInvestType(type)}
                    >
                      <Text style={[styles.imgTypeText, newInvestType === type && styles.imgTypeTextActive]}>
                        + {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.imgGrid}>
                {(formData.imaging || []).map((img, idx) => {
                  const isPdf = img.type === 'PDF' || img.imageData.toLowerCase().includes('.pdf');
                  return (
                    <View key={img.id} style={styles.imgContainer}>
                      {isPdf ? (
                        <TouchableOpacity 
                          activeOpacity={0.8} 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            backgroundColor: '#1e293b',
                            borderRadius: 12
                          }}
                          onPress={() => {
                            import('react-native').then(({ Linking }) => {
                              Linking.openURL(img.imageData).catch(err => {
                                Alert.alert('Error', 'Could not open PDF file.');
                              });
                            });
                          }}
                        >
                          <FileText size={32} color="#f43f5e" />
                          <Text style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, fontWeight: '600' }}>View PDF</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          activeOpacity={0.9} 
                          style={{ width: '100%', height: '100%' }}
                          onPress={() => setFullscreenImageIndex(idx)}
                        >
                          <Image source={{ uri: img.imageData }} style={styles.imageThumbnail} />
                        </TouchableOpacity>
                      )}
                      <View style={styles.imgLabel}>
                        <Text style={styles.imgLabelText}>{img.type}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.deleteImgBtn}
                        onPress={() => removeImage(idx)}
                      >
                        <Trash2 size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                 {Array.from({ length: Math.max(0, 3 - (formData.imaging?.length || 0)) }).map((_, i) => {
                  if (i === 0 && isUploading) {
                    return (
                      <View key="uploading" style={styles.emptyImgCell}>
                        <ActivityIndicator size="small" color="#6366f1" />
                        <Text style={[styles.optBtnText, { marginTop: 8, textAlign: 'center' }]}>Uploading...</Text>
                      </View>
                    );
                  }
                  return (
                    <View key={i} style={styles.emptyImgCell}>
                      <Camera size={20} color="#334155" />
                      <View style={styles.uploadOptions}>
                        <TouchableOpacity onPress={() => handlePickImage('camera')} style={styles.optBtn}>
                          <Text style={styles.optBtnText}>Cam</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handlePickImage('gallery')} style={styles.optBtn}>
                          <Text style={styles.optBtnText}>Gal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handlePickRadiologyPdf} style={styles.optBtn}>
                          <Text style={styles.optBtnText}>PDF</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Lab details */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <FlaskConical size={14} color="#6366f1" /> Lab Investigations
              </Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={formData.labInvestigations} 
                onChangeText={text => setFormData({ ...formData, labInvestigations: text })} 
                placeholder="Hb: 12, Cr: 0.9, INR: 1.1..."
                placeholderTextColor="#475569"
                multiline
                numberOfLines={3}
              />
              {formData.labPdfUrl ? (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderWidth: 1,
                  borderColor: '#1f2937',
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 10,
                  justifyContent: 'space-between'
                }}>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                    onPress={() => {
                      import('react-native').then(({ Linking }) => {
                        Linking.openURL(formData.labPdfUrl!).catch(err => {
                          Alert.alert('Error', 'Could not open PDF file.');
                        });
                      });
                    }}
                  >
                    <FileText size={20} color="#f43f5e" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Lab Report PDF</Text>
                      <Text style={{ color: '#64748b', fontSize: 11 }}>Tap to open document</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setFormData(prev => ({ ...prev, labPdfUrl: '' }))}
                    style={{ padding: 6 }}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: '#6366f1',
                    borderRadius: 12,
                    padding: 12,
                    marginTop: 10
                  }}
                  onPress={handlePickLabPdf}
                  disabled={isUploading}
                >
                  <Plus size={16} color="#818cf8" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#818cf8', fontSize: 13, fontWeight: '700' }}>
                    {isUploading ? 'Uploading Document...' : 'Upload Lab PDF Report'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* History */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Present History</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={formData.presentHistory} 
                onChangeText={text => setFormData({ ...formData, presentHistory: text })} 
                placeholder="Chief complaints, symptoms..."
                placeholderTextColor="#475569"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Past Medical History</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={formData.pastHistory} 
                onChangeText={text => setFormData({ ...formData, pastHistory: text })} 
                placeholder="Comorbidities, past surgeries, drug allergies..."
                placeholderTextColor="#475569"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Form Actions */}
            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
                <Text style={styles.submitText}>Save Patient Record</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Android DateTime pickers */}
          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="default"
              onChange={onAndroidDateChange}
            />
          )}

          {Platform.OS === 'android' && showTimePicker && (
            <DateTimePicker
              value={tempDate}
              mode="time"
              display="default"
              onChange={onAndroidTimeChange}
            />
          )}

          {/* iOS Date Picker Modal */}
          {Platform.OS === 'ios' && (
            <Modal
              visible={showIOSPicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowIOSPicker(false)}
            >
              <View style={styles.iosPickerOverlay}>
                <View style={styles.iosPickerContainer}>
                  <View style={styles.iosPickerHeader}>
                    <Text style={styles.iosPickerTitle}>Select Date & Time</Text>
                    <TouchableOpacity onPress={() => setShowIOSPicker(false)} style={styles.iosCloseBtn}>
                      <X size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                  
                  <DateTimePicker
                    value={tempDate}
                    mode="datetime"
                    display="spinner"
                    themeVariant="dark"
                    textColor="#ffffff"
                    onChange={(event, date) => {
                      if (date) setTempDate(date);
                    }}
                  />
                  
                  <TouchableOpacity 
                    style={styles.iosConfirmBtn}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, appointmentDate: tempDate }));
                      setShowIOSPicker(false);
                      if (currentUserRole === 'admin') {
                        setTimeout(() => {
                          promptSpecialCase();
                        }, 300);
                      }
                    }}
                  >
                    <Text style={styles.iosConfirmBtnText}>Confirm Date & Time</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}

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
                    {fullscreenImageIndex !== null && formData.imaging
                      ? `${fullscreenImageIndex + 1} of ${formData.imaging.length} — ${formData.imaging[fullscreenImageIndex]?.type || ''}`
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
                  {fullscreenImageIndex !== null && formData.imaging && formData.imaging.length > 0 && (
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

                      {(formData.imaging?.[fullscreenImageIndex]?.type === 'PDF' || formData.imaging?.[fullscreenImageIndex]?.imageData.toLowerCase().includes('.pdf')) ? (
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
                            onPress={() => {
                              const url = formData.imaging?.[fullscreenImageIndex]?.imageData;
                              if (url) {
                                import('react-native').then(({ Linking }) => {
                                  Linking.openURL(url).catch(err => {
                                    Alert.alert('Error', 'Could not open PDF file.');
                                  });
                                });
                              }
                            }}
                          >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Open PDF Document</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Image 
                          source={{ uri: formData.imaging?.[fullscreenImageIndex]?.imageData }} 
                          style={styles.fullscreenImage} 
                          resizeMode="contain"
                        />
                      )}

                      {/* Right Arrow */}
                      {fullscreenImageIndex < formData.imaging.length - 1 && (
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
        </KeyboardAvoidingView>
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
    height: '92%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 99,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  categoryPicker: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 4,
    height: 48,
  },
  catBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  catBtnActiveEswl: {
    backgroundColor: '#10b981',
  },
  catBtnActiveSurg: {
    backgroundColor: '#ef4444',
  },
  catText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  catTextActive: {
    color: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dateWarningBorder: {
    borderColor: '#f59e0b',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '700',
  },
  helperText: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 6,
    fontWeight: '500',
  },
  sidePicker: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 4,
    height: 48,
  },
  sideBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  sideBtnActive: {
    backgroundColor: '#4f46e5',
  },
  sideText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  sideTextActive: {
    color: '#fff',
  },
  imagingSection: {
    marginBottom: 20,
    borderTopWidth: 1,
    borderColor: '#1e293b',
    paddingTop: 16,
  },
  imagingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagingTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  imgControls: {
    flexDirection: 'row',
    gap: 8,
  },
  imgTypeSelector: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  imgTypeSelectorActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
  },
  imgTypeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  imgTypeTextActive: {
    color: '#818cf8',
  },
  imgGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  imgContainer: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    position: 'relative',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imgLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  imgLabelText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  deleteImgBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ef4444',
    padding: 6,
    borderRadius: 99,
  },
  emptyImgCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#334155',
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  uploadOptions: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 4,
  },
  optBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 0.5,
    borderColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  optBtnText: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  cancelText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '800',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  removePhoneBtn: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  addPhoneBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#818cf8',
  },
  iosPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iosPickerContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  iosCloseBtn: {
    padding: 4,
    backgroundColor: '#0f172a',
    borderRadius: 99,
  },
  iosConfirmBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  iosConfirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  disabledDateWarning: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  surgeonPicker: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginTop: 4,
  },
  surgeonBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surgeonBtnActive: {
    backgroundColor: '#312e81',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  surgeonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  surgeonTextActive: {
    color: '#fff',
    fontWeight: '900',
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

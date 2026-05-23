import 'react-native-get-random-values';

// Polyfill TextEncoder and TextDecoder for Neon serverless driver compatibility in Hermes
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(str: string): Uint8Array {
      const utf8 = [];
      for (let i = 0; i < str.length; i++) {
        let charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6), 
                    0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12), 
                    0x80 | ((charcode >> 6) & 0x3f), 
                    0x80 | (charcode & 0x3f));
        }
        else {
          i++;
          charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >> 18), 
                    0x80 | ((charcode >> 12) & 0x3f), 
                    0x80 | ((charcode >> 6) & 0x3f), 
                    0x80 | (charcode & 0x3f));
        }
      }
      return new Uint8Array(utf8);
    }
  } as any;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(bytes: Uint8Array): string {
      let str = '';
      let i = 0;
      while (i < bytes.length) {
        const byte1 = bytes[i++];
        if (byte1 < 0x80) {
          str += String.fromCharCode(byte1);
        } else if (byte1 >= 0xc0 && byte1 < 0xe0) {
          const byte2 = bytes[i++];
          str += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
        } else if (byte1 >= 0xe0 && byte1 < 0xf0) {
          const byte2 = bytes[i++];
          const byte3 = bytes[i++];
          str += String.fromCharCode(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
        } else if (byte1 >= 0xf0 && byte1 < 0xf5) {
          const byte2 = bytes[i++];
          const byte3 = bytes[i++];
          const byte4 = bytes[i++];
          const codepoint = (((byte1 & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f)) - 0x10000;
          str += String.fromCharCode((codepoint >> 10) + 0xd800, (codepoint & 0x3ff) + 0xdc00);
        }
      }
      return str;
    }
  } as any;
}

import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  SafeAreaView, 
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from './src/components/PoppinsText';
import { 
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { 
  Sun, 
  Moon, 
  Plus, 
  Search, 
  Stethoscope, 
  Key, 
  LogOut, 
  Settings as SettingsIcon, 
  Database,
  Volume2,
  Bell,
  Camera,
  X,
  Play,
  Pause
} from 'lucide-react-native';
import { isSameDay, format, isSunday, nextSunday, startOfDay } from 'date-fns';

import { Patient, User, AdminMessage } from './src/types';
import { BackendService } from './src/services/BackendService';
import { NotificationService } from './src/services/NotificationService';
import { getDbUrl, testConnectionAndInit } from './src/services/database';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import * as Notifications from 'expo-notifications';

// Import Components
import Calendar from './src/components/Calendar';
import PatientForm from './src/components/PatientForm';
import PatientList from './src/components/PatientList';
import TodayOperations from './src/components/TodayOperations';
import DayDetailModal from './src/components/DayDetailModal';
import AdminDashboard from './src/components/AdminDashboard';
import Login from './src/components/Login';
import MobileNav from './src/components/MobileNav';
import ChangePasswordModal from './src/components/ChangePasswordModal';
import DatabaseConfig from './src/components/DatabaseConfig';

const formatAudioDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

interface VoiceMessageComponentProps {
  message: AdminMessage;
  isDarkMode: boolean;
  autoPlayMessageId?: string | null;
  onClearAutoPlay?: () => void;
  onDelete?: (id: string) => void;
}

function VoiceMessageRow({ message, isDarkMode, autoPlayMessageId, onClearAutoPlay, onDelete }: VoiceMessageComponentProps) {
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

  useEffect(() => {
    if (autoPlayMessageId === message.id) {
      player.play();
      if (onClearAutoPlay) {
        onClearAutoPlay();
      }
    }
  }, [autoPlayMessageId, message.id]);

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
    <View style={styles.messageRow}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <View style={{ flexDirection: 'row', flex: 1, marginRight: 8 }}>
          <Volume2 size={16} color={status.playing ? "#818cf8" : "#64748b"} style={{ marginRight: 8, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.messageContent}>{message.content}</Text>
            
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
            
            <Text style={styles.messageTime}>{message.sender} • {format(new Date(message.timestamp), 'MMM d, h:mm a')}</Text>
          </View>
        </View>

        {onDelete && (
          <TouchableOpacity onPress={() => onDelete(message.id)} style={{ padding: 4 }}>
            <X size={14} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function VoiceMessageCard({ message, isDarkMode, autoPlayMessageId, onClearAutoPlay, onDelete }: VoiceMessageComponentProps) {
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

  useEffect(() => {
    if (autoPlayMessageId === message.id) {
      player.play();
      if (onClearAutoPlay) {
        onClearAutoPlay();
      }
    }
  }, [autoPlayMessageId, message.id]);

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
    <View 
      style={[styles.messageCard, isDarkMode ? styles.messageCardDark : styles.messageCardLight]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Volume2 size={16} color={status.playing ? "#818cf8" : "#64748b"} style={{ marginRight: 8 }} />
          <Text style={styles.messageSender}>{message.sender}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={styles.messageTimeText}>
            {format(new Date(message.timestamp), 'MMM d, h:mm a')}
          </Text>
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(message.id)} style={{ padding: 4 }}>
              <X size={14} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={[styles.messageContentText, isDarkMode ? styles.textWhite : styles.textDark]}>
        {message.content}
      </Text>
      
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

const getGreeting = () => {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good Morning';
  if (hr < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export default function App() {
  const [fontsLoaded] = useFonts({
    'DMSans-Regular':  DMSans_400Regular,
    'DMSans-Medium':   DMSans_500Medium,
    'DMSans-SemiBold': DMSans_600SemiBold,
    'DMSans-Bold':     DMSans_700Bold,
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [view, setView] = useState<'dashboard' | 'calendar' | 'surgical' | 'eswl' | 'admin' | 'archive' | 'settings'>('dashboard');
  const [eswlSubView, setEswlSubView] = useState<'list' | 'next'>('list');
  const [archiveSubView, setArchiveSubView] = useState<'Surgical' | 'ESWL'>('Surgical');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDbConfigOpen, setIsDbConfigOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAnnouncementsModalOpen, setIsAnnouncementsModalOpen] = useState(false);
  const [autoPlayMessageId, setAutoPlayMessageId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editProfilePic, setEditProfilePic] = useState('');

  const initData = async () => {
    try {
      const dbUrl = await getDbUrl();
      if (dbUrl) {
        await testConnectionAndInit(dbUrl);
      }

      const activeUser = await BackendService.getActiveUser();
      setCurrentUser(activeUser);
      if (activeUser) {
        setView('dashboard');
      }

      const activeTheme = await BackendService.getTheme();
      setIsDarkMode(activeTheme === 'dark');

      const savedPatients = await BackendService.getPatients();
      const savedMessages = await BackendService.getMessages();
      setPatients(savedPatients);
      setMessages(savedMessages);
    } catch (e) {
      console.error("Init Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initData();
    NotificationService.requestPermission();
    setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch((err: any) => {
      console.error("Failed to initialize audio mode:", err);
    });

    // Listen to notification clicks/taps
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && typeof data.id === 'string') {
        setAutoPlayMessageId(data.id);
        setIsAnnouncementsModalOpen(true);
      }
    });

    // Check if app was opened via a notification click
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        const data = response.notification.request.content.data;
        if (data && typeof data.id === 'string') {
          setAutoPlayMessageId(data.id);
          setIsAnnouncementsModalOpen(true);
        }
      }
    });

    return () => {
      responseListener.remove();
    };
  }, []);

  // Poll for surgery/ESWL alerts
  useEffect(() => {
    if (isLoading || patients.length === 0) return;
    
    const runCheck = () => {
      NotificationService.checkAndTriggerReminders(patients, (newMsg) => {
        setMessages(prev => [newMsg, ...prev]);
      });
    };

    runCheck();
    const interval = setInterval(runCheck, 60000);
    return () => clearInterval(interval);
  }, [patients, isLoading]);

  // Poll database for real-time patient syncing
  useEffect(() => {
    if (isLoading) return;
    const pollInterval = setInterval(async () => {
      try {
        const freshPatients = await BackendService.getPatients();
        if (JSON.stringify(freshPatients) !== JSON.stringify(patients)) {
          setPatients(freshPatients);
        }
      } catch (e) {
        console.error("Realtime poll error:", e);
      }
    }, 8000);
    return () => clearInterval(pollInterval);
  }, [isLoading, patients]);

  // Poll database for real-time message syncing and notifications
  useEffect(() => {
    if (isLoading) return;
    const pollInterval = setInterval(async () => {
      try {
        const freshMessages = await BackendService.getMessages();
        setMessages(prev => {
          const localIds = new Set(prev.map(m => m.id));
          const newMessages = freshMessages.filter(m => !localIds.has(m.id));
          
          if (newMessages.length > 0) {
            newMessages.forEach(msg => {
              NotificationService.triggerLocalNotification(msg);
            });
            return freshMessages;
          }
          if (JSON.stringify(freshMessages) !== JSON.stringify(prev)) {
            return freshMessages;
          }
          return prev;
        });
      } catch (e) {
        console.error("Realtime messages poll error:", e);
      }
    }, 8000);
    return () => clearInterval(pollInterval);
  }, [isLoading]);

  // Sync state changes back to database/AsyncStorage
  useEffect(() => {
    if (!isLoading) {
      BackendService.savePatients(patients);
    }
  }, [patients, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      BackendService.saveMessages(messages);
    }
  }, [messages, isLoading]);

  useEffect(() => {
    BackendService.saveTheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleLogin = (user: User) => {
    BackendService.setActiveUser(user);
    setCurrentUser(user);
    setView('dashboard');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          BackendService.setActiveUser(null);
          setCurrentUser(null);
          setView('dashboard');
        }
      }
    ]);
  };

  const filteredPatients = useMemo(() => {
    const today = startOfDay(new Date());
    
    return patients
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             p.phoneNumber.includes(searchQuery);
        if (!matchesSearch) return false;

        if (view === 'archive') return p.isCompleted && p.category === archiveSubView;
        if (p.isCompleted) return false;

        if (view === 'eswl') {
          if (p.category !== 'ESWL' || p.isCancelled) return false;
          if (eswlSubView === 'list') return !p.appointmentDate;
          if (eswlSubView === 'next') {
            if (!p.appointmentDate) return false;
            const targetSunday = isSunday(today) ? today : nextSunday(today);
            return isSameDay(startOfDay(new Date(p.appointmentDate)), targetSunday);
          }
        }

        if (view === 'surgical') return p.category === 'Surgical' && !p.isCancelled;

        return true;
      })
      .sort((a, b) => {
        if (view === 'eswl' && eswlSubView === 'list') {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateA - dateB;
        }
        const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : Infinity;
        const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : Infinity;
        return dateA - dateB;
      });
  }, [patients, view, eswlSubView, archiveSubView, searchQuery]);

  const groupedArchivePatients = useMemo(() => {
    const groups: Record<string, Patient[]> = {};
    filteredPatients.forEach(p => {
      const dateKey = p.appointmentDate ? format(new Date(p.appointmentDate), 'yyyy-MM-dd') : 'No Date';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(p);
    });
    return Object.fromEntries(Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])));
  }, [filteredPatients]);

  const groupedSurgicalPatients = useMemo(() => {
    const groups: Record<string, Patient[]> = {};
    filteredPatients.forEach(p => {
      const dateKey = p.appointmentDate ? format(new Date(p.appointmentDate), 'yyyy-MM-dd') : 'No Date';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(p);
    });
    return Object.fromEntries(
      Object.entries(groups).sort((a, b) => {
        if (a[0] === 'No Date') return 1;
        if (b[0] === 'No Date') return -1;
        return a[0].localeCompare(b[0]);
      })
    );
  }, [filteredPatients]);

  const toggleComplete = (id: string) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, isCompleted: !p.isCompleted } : p));
  };

  const openEditProfile = () => {
    if (!currentUser) return;
    setEditName(currentUser.name || '');
    setEditPhone(currentUser.phoneNumber || '');
    setEditProfilePic(currentUser.profilePicture || '');
    setIsEditProfileOpen(true);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Media library access is required to update profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true
    });
    if (!result.canceled && result.assets && result.assets[0].base64) {
      const base64Url = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setEditProfilePic(base64Url);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    if (!editName.trim()) {
      Alert.alert('Error', 'Full Name is required.');
      return;
    }
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let cleanedPhone = editPhone.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
    cleanedPhone = cleanedPhone.replace(/[^0-9]/g, '');

    try {
      await BackendService.updateUserProfile(currentUser.email, editName, cleanedPhone, editProfilePic);
      
      const updatedUser = { 
        ...currentUser, 
        name: editName, 
        phoneNumber: cleanedPhone, 
        profilePicture: editProfilePic 
      };
      
      setCurrentUser(updatedUser);
      await AsyncStorage.setItem('medtrack_user', JSON.stringify(updatedUser));
      
      setIsEditProfileOpen(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  const handleApprovePatient = (id: string) => {
    setPatients(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, requiresApproval: false, isApproved: true };
      }
      return p;
    }));
    Alert.alert('Approved', 'Patient scheduling request approved successfully.');
  };

  const handleRejectPatient = (id: string) => {
    setPatients(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, appointmentDate: undefined, requiresApproval: false, isApproved: false };
      }
      return p;
    }));
    Alert.alert('Rejected', 'Patient scheduling request rejected.');
  };

  const getSurgeonStats = () => {
    let surgeons = ['Dr. Admin', 'Dr. Resident', 'Dr. Consultant'];
    return surgeons.map(s => {
      const sPatients = patients.filter(p => {
        if (s === 'Dr. Admin') {
          return p.surgeonName === 'Dr. Admin' || p.surgeonName === 'Dr. Administrator';
        }
        return p.surgeonName === s;
      });
      const scheduled = sPatients.filter(p => p.appointmentDate && !p.isCompleted && !p.isCancelled).length;
      const done = sPatients.filter(p => p.isCompleted).length;
      return { name: s, scheduled, done };
    });
  };

  const getMonthlyStats = () => {
    const completed = patients.filter(p => p.isCompleted && p.appointmentDate);
    const monthCounts: Record<string, number> = {};
    completed.forEach(p => {
      if (p.appointmentDate) {
        const date = new Date(p.appointmentDate);
        if (!isNaN(date.getTime())) {
          const monthName = format(date, 'MMMM yyyy');
          monthCounts[monthName] = (monthCounts[monthName] || 0) + 1;
        }
      }
    });
    return Object.entries(monthCounts).map(([month, count]) => ({ month, count }));
  };

  const specialCasesCount = patients.filter(p => p.isSpecial).length;

  const handleAddOrUpdatePatient = (patient: Patient) => {
    setPatients(prev => {
      const exists = prev.some(p => p.id === patient.id);
      if (exists) {
        return prev.map(p => p.id === patient.id ? patient : p);
      }
      return [patient, ...prev];
    });

    if (patient.requiresApproval) {
      const newMsg: AdminMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        sender: 'System',
        content: `Approval requested by resident for patient ${patient.name}${
          patient.appointmentDate && !isNaN(new Date(patient.appointmentDate).getTime())
            ? ` on ${format(new Date(patient.appointmentDate), 'yyyy-MM-dd')}`
            : ''
        }`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [newMsg, ...prev]);
    }

    setIsFormOpen(false);
    setEditingPatient(undefined);
  };

  const handleCancelEswl = (id: string) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, isCancelled: true } : p));
  };

  const handleScheduleEswl = (id: string) => {
    const today = startOfDay(new Date());
    const targetSunday = isSunday(today) ? today : nextSunday(today);
    const scheduledDate = new Date(targetSunday);
    scheduledDate.setHours(8, 0, 0, 0);
    setPatients(prev => prev.map(p => p.id === id ? { ...p, appointmentDate: scheduledDate } : p));
    setEswlSubView('next');
  };

  const handleReaddToWaitlist = (id: string) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, appointmentDate: undefined, isCancelled: false } : p));
    setEswlSubView('list');
  };

  const handleSendMessage = (msg: Omit<AdminMessage, 'id' | 'timestamp' | 'sender'>) => {
    const newMsg: AdminMessage = {
      ...msg,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      sender: 'Admin'
    };
    setMessages(prev => [newMsg, ...prev]);
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleClearAllMessages = () => {
    setMessages([]);
  };

  // Render Setup if requested
  if (isDbConfigOpen) {
    return (
      <DatabaseConfig 
        onBack={() => setIsDbConfigOpen(false)} 
        onSuccess={() => {
          setIsDbConfigOpen(false);
          setIsLoading(true);
          initData();
        }} 
      />
    );
  }

  // Auth Guard
  if (!currentUser) {
    return (
      <Login 
        onLogin={handleLogin} 
        onOpenDatabaseConfig={() => setIsDbConfigOpen(true)} 
      />
    );
  }

  // Loading Screen
  if (!fontsLoaded || isLoading) {
    return (
      <View style={[styles.loadingScreen, isDarkMode ? styles.darkBg : styles.lightBg]}>
        <Stethoscope size={64} color="#6366f1" />
        <Text style={styles.loadingText}>MEDTRACK</Text>
        <ActivityIndicator size="small" color="#6366f1" style={{ marginTop: 12 }} />
      </View>
    );
  }

  const isSearchVisible = view === 'surgical' || view === 'eswl' || view === 'archive';

  return (
    <SafeAreaView style={[styles.appContainer, isDarkMode ? styles.darkBg : styles.lightBg]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, isDarkMode ? styles.darkBorder : styles.lightBorder]}>
        {view === 'dashboard' ? (
          <View style={styles.dashboardHeaderRow}>
            <View>
              <Text style={[styles.dashboardGreeting, isDarkMode ? styles.textWhite : styles.textDark]}>
                {getGreeting()}
              </Text>
              <Text style={styles.dashboardDate}>
                {format(new Date(), 'dd/MM/yyyy')}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={() => setIsDarkMode(!isDarkMode)} 
                style={[styles.headerBtn, isDarkMode ? styles.headerBtnDark : styles.headerBtnLight]}
              >
                {isDarkMode ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#64748b" />}
              </TouchableOpacity>
              
              {/* Profile picture with notification */}
              <View style={styles.profileNotificationGroup}>
                 <View style={styles.headerAvatar}>
                  {currentUser.profilePicture ? (
                    <Image source={{ uri: currentUser.profilePicture }} style={styles.headerAvatarImg} />
                  ) : (
                    <Text style={styles.headerAvatarText}>
                      {currentUser.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <TouchableOpacity 
                  onPress={() => setIsAnnouncementsModalOpen(true)}
                  style={styles.headerNotificationBell}
                >
                  <Bell size={18} color="#6366f1" />
                  {messages.length > 0 && (
                    <View style={styles.headerNotificationBadge}>
                      <Text style={styles.headerNotificationBadgeText}>{messages.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.headerTitleRow}>
            <View>
              <Text style={[styles.headerTitle, isDarkMode ? styles.textWhite : styles.textDark]}>
                {view === 'surgical' ? 'surgery' : view}
              </Text>
              <Text style={styles.headerSubtitle}>{currentUser.name}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={() => setIsDarkMode(!isDarkMode)} 
                style={[styles.headerBtn, isDarkMode ? styles.headerBtnDark : styles.headerBtnLight]}
              >
                {isDarkMode ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#64748b" />}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Search */}
        {isSearchVisible && (
          <View style={styles.searchContainer}>
            <Search size={16} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, isDarkMode ? styles.searchDarkInput : styles.searchLightInput]}
              placeholder="Search patients..."
              placeholderTextColor="#475569"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}
      </View>

      {/* Main Viewport */}
      <ScrollView 
        style={styles.mainContent} 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {view === 'dashboard' && (
          <View style={styles.gapContainer}>
            {/* Display Broadcast/System Messages if any */}
            {messages.length > 0 && (
              <View style={styles.broadcastBox}>
                <Text style={styles.broadcastBoxHeader}>Department Announcements</Text>
                {messages.slice(0, 3).map((m) => {
                  if (m.type === 'voice' && m.audioUrl) {
                    return (
                      <VoiceMessageRow 
                        key={m.id} 
                        message={m} 
                        isDarkMode={isDarkMode} 
                        autoPlayMessageId={autoPlayMessageId}
                        onClearAutoPlay={() => setAutoPlayMessageId(null)}
                        onDelete={handleDeleteMessage}
                      />
                    );
                  }
                  return (
                    <View key={m.id} style={styles.messageRow}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <View style={{ flexDirection: 'row', flex: 1, marginRight: 8 }}>
                          <View style={styles.bulletDot} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.messageContent}>{m.content}</Text>
                            <Text style={styles.messageTime}>{m.sender} • {format(new Date(m.timestamp), 'MMM d, h:mm a')}</Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteMessage(m.id)} style={{ padding: 4 }}>
                          <X size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <TodayOperations 
              patients={patients} 
              onPatientClick={(p) => { setEditingPatient(p); setIsFormOpen(true); }} 
              onToggleComplete={toggleComplete} 
            />
          </View>
        )}

        {view === 'eswl' && (
          <View style={styles.gapContainer}>
            <View style={styles.subTabsContainer}>
              <TouchableOpacity 
                style={[styles.subTab, eswlSubView === 'list' && styles.subTabActive]}
                onPress={() => setEswlSubView('list')}
              >
                <Text style={[styles.subTabText, eswlSubView === 'list' && styles.subTabTextActive]}>POOL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.subTab, eswlSubView === 'next' && styles.subTabActive]}
                onPress={() => setEswlSubView('next')}
              >
                <Text style={[styles.subTabText, eswlSubView === 'next' && styles.subTabTextActive]}>SCHEDULED</Text>
              </TouchableOpacity>
            </View>
            
            <PatientList 
              patients={filteredPatients} 
              onEdit={setEditingPatient} 
              onDelete={(id) => setPatients(prev => prev.filter(p => p.id !== id))} 
              onToggleComplete={toggleComplete} 
              onScheduleEswl={handleScheduleEswl}
              onReaddToWaitlist={handleReaddToWaitlist}
              currentUserRole={currentUser?.role}
            />
          </View>
        )}

        {view === 'surgical' && (
          <View style={styles.gapContainer}>
            {Object.keys(groupedSurgicalPatients).length > 0 ? (
              <View style={styles.archiveGroups}>
                {Object.entries(groupedSurgicalPatients).map(([dateKey, group]) => (
                  <View key={dateKey} style={styles.archiveGroup}>
                    <Text style={styles.archiveGroupTitle}>
                      {dateKey === 'No Date' ? 'NOT DATED' : format(new Date(dateKey), 'EEEE, MMM d, yyyy')}
                    </Text>
                     <PatientList 
                      patients={group} 
                      onEdit={setEditingPatient} 
                      onDelete={(id) => setPatients(prev => prev.filter(p => p.id !== id))} 
                      onToggleComplete={toggleComplete} 
                      currentUserRole={currentUser?.role}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No surgical patients scheduled</Text>
              </View>
            )}
          </View>
        )}

        {view === 'calendar' && (
          <Calendar 
            patients={patients.filter(p => p.category === 'Surgical' && p.appointmentDate)} 
            onDateSelect={setSelectedDate} 
          />
        )}

        {view === 'archive' && (
          <View style={styles.gapContainer}>
            <View style={styles.subTabsContainer}>
              <TouchableOpacity 
                style={[styles.subTab, archiveSubView === 'Surgical' && styles.subTabActive]}
                onPress={() => setArchiveSubView('Surgical')}
              >
                <Text style={[styles.subTabText, archiveSubView === 'Surgical' && styles.subTabTextActive]}>Surgical</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.subTab, archiveSubView === 'ESWL' && styles.subTabActive]}
                onPress={() => setArchiveSubView('ESWL')}
              >
                <Text style={[styles.subTabText, archiveSubView === 'ESWL' && styles.subTabTextActive]}>ESWL</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.archiveGroups}>
              {Object.keys(groupedArchivePatients).length > 0 ? (
                Object.entries(groupedArchivePatients).map(([dateKey, group]) => (
                  <View key={dateKey} style={styles.archiveGroup}>
                    <Text style={styles.archiveGroupTitle}>
                      {dateKey === 'No Date' ? 'NOT DATED' : format(new Date(dateKey), 'EEEE, MMM do')}
                    </Text>
                     <PatientList 
                      patients={group} 
                      onEdit={setEditingPatient} 
                      onDelete={(id) => setPatients(prev => prev.filter(p => p.id !== id))} 
                      onToggleComplete={toggleComplete} 
                      onReaddToWaitlist={handleReaddToWaitlist}
                      currentUserRole={currentUser?.role}
                    />
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Archive is empty</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {view === 'settings' && (
          <View style={styles.settingsContainer}>
             <View style={styles.profileCard}>
              {currentUser.profilePicture ? (
                <Image source={{ uri: currentUser.profilePicture }} style={styles.profileAvatarImg} />
              ) : (
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{currentUser.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.profileName}>{currentUser.name}</Text>
              <Text style={styles.profileEmail}>{currentUser.email}</Text>
              {currentUser.phoneNumber ? (
                <Text style={styles.profilePhone}>{currentUser.phoneNumber}</Text>
              ) : null}
              <TouchableOpacity onPress={openEditProfile} style={styles.editProfileLink}>
                <Text style={styles.editProfileLinkText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Statistics */}
            <View style={styles.statsCard}>
              <Text style={styles.statsHeader}>Surgeon Performance Statistics</Text>
              {getSurgeonStats().map(s => (
                <View key={s.name} style={styles.surgeonStatRow}>
                  <View style={styles.surgeonStatInfo}>
                    <Text style={styles.surgeonStatName}>{s.name}</Text>
                  </View>
                  <View style={styles.surgeonStatCounts}>
                    <View style={styles.statBadgeScheduled}>
                      <Text style={styles.statBadgeText}>Scheduled: {s.scheduled}</Text>
                    </View>
                    <View style={styles.statBadgeDone}>
                      <Text style={styles.statBadgeText}>Done: {s.done}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {currentUser.role === 'admin' && (
                <View style={styles.adminStatsSection}>
                  <Text style={styles.statsSubheader}>Monthly Operations (Admin)</Text>
                  
                  {getMonthlyStats().length > 0 ? (
                    getMonthlyStats().map(m => (
                      <View key={m.month} style={styles.monthlyStatRow}>
                        <Text style={styles.monthlyStatName}>{m.month}</Text>
                        <Text style={styles.monthlyStatValue}>{m.count} Done</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noStatsText}>No completed operations yet.</Text>
                  )}

                  <View style={styles.specialCasesSummary}>
                    <Text style={styles.specialCasesLabel}>Special Cases (Flagged):</Text>
                    <Text style={styles.specialCasesValue}>{specialCasesCount}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.settingsOptions}>
              <TouchableOpacity 
                onPress={() => setIsPasswordModalOpen(true)}
                style={styles.settingsOptionBtn}
              >
                <Key size={18} color="#6366f1" style={{ marginRight: 12 }} />
                <Text style={styles.settingsOptionText}>Change Account Password</Text>
              </TouchableOpacity>


              <TouchableOpacity 
                onPress={handleLogout}
                style={[styles.settingsOptionBtn, styles.logoutBtn]}
              >
                <LogOut size={18} color="#ef4444" style={{ marginRight: 12 }} />
                <Text style={[styles.settingsOptionText, { color: '#ef4444' }]}>Logout Account</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.versionText}>MedTrack Native v3.0.0</Text>
          </View>
        )}

         {view === 'admin' && (
          <AdminDashboard 
            patients={patients} 
            messages={messages}
            isDarkMode={isDarkMode}
            onSendMessage={handleSendMessage} 
            onApprovePatient={handleApprovePatient}
            onRejectPatient={handleRejectPatient}
            onDeleteMessage={handleDeleteMessage}
          />
        )}
      </ScrollView>

      {/* Navigation bottom bar */}
      <MobileNav view={view} setView={setView} />

      {/* Modals & Bottom sheets */}
       {isFormOpen && (
        <PatientForm 
          isOpen={isFormOpen} 
          onClose={() => { setIsFormOpen(false); setEditingPatient(undefined); }} 
          onSubmit={handleAddOrUpdatePatient} 
          initialData={editingPatient} 
          currentUserRole={currentUser?.role}
          existingPatients={patients}
        />
      )}

      {isPasswordModalOpen && (
        <ChangePasswordModal 
          user={currentUser} 
          onClose={() => setIsPasswordModalOpen(false)} 
          onPasswordChanged={() => setIsPasswordModalOpen(false)} 
        />
      )}

      {isEditProfileOpen && (
        <Modal visible={isEditProfileOpen} animationType="slide" transparent>
          <SafeAreaView style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile Info</Text>
                <TouchableOpacity onPress={() => setIsEditProfileOpen(false)} style={styles.closeBtn}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.editAvatarContainer}>
                  <TouchableOpacity onPress={handlePickImage} style={styles.editAvatarBtn}>
                    {editProfilePic ? (
                      <Image source={{ uri: editProfilePic }} style={styles.editAvatarImg} />
                    ) : (
                      <View style={styles.editAvatarPlaceholder}>
                        <Camera size={24} color="#94a3b8" />
                        <Text style={styles.editAvatarPlaceholderText}>Change Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Full Name"
                    placeholderTextColor="#475569"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput 
                    style={styles.input} 
                    keyboardType="phone-pad"
                    value={editPhone}
                    onChangeText={text => {
                      const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                      let cleaned = text.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
                      cleaned = cleaned.replace(/[^0-9]/g, '');
                      setEditPhone(cleaned);
                    }}
                    placeholder="Phone Number (English numbers only)"
                    placeholderTextColor="#475569"
                  />
                </View>

                <TouchableOpacity onPress={handleSaveProfile} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Save Profile Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      )}

      {isAnnouncementsModalOpen && (
        <Modal visible={isAnnouncementsModalOpen} animationType="slide" transparent>
          <SafeAreaView style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notifications</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {messages.length > 0 && (
                    <TouchableOpacity onPress={handleClearAllMessages} style={{ padding: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>Clear All</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setIsAnnouncementsModalOpen(false)} style={styles.closeBtn}>
                    <X size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                {messages.length > 0 ? (
                  messages.map((m) => {
                    if (m.type === 'voice' && m.audioUrl) {
                      return (
                        <VoiceMessageCard 
                          key={m.id} 
                          message={m} 
                          isDarkMode={isDarkMode} 
                          autoPlayMessageId={autoPlayMessageId}
                          onClearAutoPlay={() => setAutoPlayMessageId(null)}
                          onDelete={handleDeleteMessage}
                        />
                      );
                    }
                    return (
                      <View key={m.id} style={[styles.messageCard, isDarkMode ? styles.messageCardDark : styles.messageCardLight]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Bell size={16} color="#6366f1" style={{ marginRight: 8 }} />
                            <Text style={styles.messageSender}>{m.sender}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Text style={styles.messageTimeText}>
                              {format(new Date(m.timestamp), 'MMM d, h:mm a')}
                            </Text>
                            <TouchableOpacity onPress={() => handleDeleteMessage(m.id)} style={{ padding: 4 }}>
                              <X size={14} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <Text style={[styles.messageContentText, isDarkMode ? styles.textWhite : styles.textDark]}>
                          {m.content}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No announcements yet.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {selectedDate && (
        <DayDetailModal 
          date={selectedDate} 
          patients={patients.filter(p => p.category === 'Surgical' && p.appointmentDate && isSameDay(new Date(p.appointmentDate), selectedDate))} 
          onClose={() => setSelectedDate(null)} 
          onAdd={(date) => { setEditingPatient({ appointmentDate: date } as Patient); setIsFormOpen(true); setSelectedDate(null); }} 
          onPatientClick={(p) => { setEditingPatient(p); setIsFormOpen(true); setSelectedDate(null); }} 
        />
      )}
      {/* Floating Action Button (FAB) */}
      {view === 'dashboard' && (
        <TouchableOpacity 
          onPress={() => {
            setEditingPatient({} as Patient);
            setIsFormOpen(true);
          }} 
          style={styles.fabBtn}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  darkBg: {
    backgroundColor: '#030712', // Deep Dark Blue/Gray
  },
  lightBg: {
    backgroundColor: '#f8fafc',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  darkBorder: {
    borderColor: '#111827',
  },
  lightBorder: {
    borderColor: '#e2e8f0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  textWhite: {
    color: '#fff',
  },
  textDark: {
    color: '#0f172a',
  },
  headerSubtitle: {
    color: '#6366f1',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBtn: {
    padding: 10,
    borderRadius: 99,
  },
  headerBtnDark: {
    backgroundColor: '#111827',
  },
  headerBtnLight: {
    backgroundColor: '#e2e8f0',
  },
  headerAddBtn: {
    backgroundColor: '#4f46e5',
    padding: 10,
    borderRadius: 99,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingLeft: 40,
    paddingRight: 16,
    fontSize: 13,
    fontWeight: '600',
  },
  searchDarkInput: {
    backgroundColor: '#111827',
    color: '#fff',
  },
  searchLightInput: {
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
  },
  mainContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 110, // space to avoid toolbar overlap
  },
  gapContainer: {
    gap: 20,
  },
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  subTabActive: {
    backgroundColor: '#1f2937',
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  subTabTextActive: {
    color: '#818cf8',
    fontWeight: '900',
  },
  broadcastBox: {
    backgroundColor: '#111827',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
  },
  broadcastBoxHeader: {
    color: '#6366f1',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    backgroundColor: '#6366f1',
    borderRadius: 99,
    marginRight: 10,
    marginTop: 6,
  },
  messageContent: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  messageTime: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  archiveGroups: {
    gap: 20,
  },
  archiveGroup: {
    gap: 8,
  },
  archiveGroupTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 8,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  settingsContainer: {
    gap: 24,
  },
  profileCard: {
    backgroundColor: '#111827',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 24,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 99,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  roleTagText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  settingsOptions: {
    backgroundColor: '#111827',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 8,
  },
  settingsOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
  },
  settingsOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  logoutBtn: {
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: '#1f2937',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: 20,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 10,
  },
  dashboardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardGreeting: {
    fontSize: 20,
    fontWeight: '900',
  },
  dashboardDate: {
    color: '#6366f1',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  profileNotificationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  headerNotificationBell: {
    position: 'relative',
    padding: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 99,
  },
  headerNotificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 99,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerNotificationBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 95,
    right: 20,
    backgroundColor: '#4f46e5',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
  headerAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profileAvatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  profilePhone: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 8,
  },
  editProfileLink: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  editProfileLinkText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '800',
  },
  statsCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 16,
  },
  statsHeader: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  statsSubheader: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#1f2937',
    paddingTop: 16,
  },
  surgeonStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1f2937',
  },
  surgeonStatInfo: {
    flex: 1,
  },
  surgeonStatName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  surgeonStatCounts: {
    flexDirection: 'row',
    gap: 6,
  },
  statBadgeScheduled: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statBadgeDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  adminStatsSection: {
    marginTop: 4,
  },
  monthlyStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  monthlyStatName: {
    color: '#94a3b8',
    fontSize: 12,
  },
  monthlyStatValue: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
  },
  noStatsText: {
    color: '#64748b',
    fontSize: 11,
    fontStyle: 'italic',
    marginVertical: 4,
  },
  specialCasesSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  specialCasesLabel: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
  },
  specialCasesValue: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '900',
  },
  editAvatarContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  editAvatarBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarImg: {
    width: 100,
    height: 100,
  },
  editAvatarPlaceholder: {
    alignItems: 'center',
  },
  editAvatarPlaceholderText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#090d16',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  modalScrollContent: {
    padding: 20,
  },
  saveBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  closeBtn: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 16,
    padding: 14,
    color: '#fff',
    fontSize: 14,
  },
  messageCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  messageCardDark: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
  },
  messageCardLight: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
  },
  messageSender: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '900',
    marginRight: 8,
  },
  messageTimeText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  messageContentText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 4,
  },
});

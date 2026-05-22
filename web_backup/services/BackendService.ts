
import { Patient, AdminMessage, User } from '../types';

const STORAGE_KEYS = {
  PATIENTS: 'medtrack_patients_v2',
  MESSAGES: 'medtrack_messages_v2',
  THEME: 'medtrack_theme_v2',
  SENT_NOTIFICATIONS: 'medtrack_sent_notifications_v2',
  USERS: 'medtrack_users_v2',
  CURRENT_USER: 'medtrack_active_user_v2'
};

const DEFAULT_USERS: User[] = [
  { email: 'admin@medtrack.com', password: 'admin', role: 'admin', name: 'Dr. Administrator' },
  { email: 'resident@medtrack.com', password: 'res', role: 'resident', name: 'Dr. Resident' }
];

export const BackendService = {
  // --- User Operations ---
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(data);
  },

  saveUsers: (users: User[]): void => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  updateUserPassword: (email: string, newPassword: string): void => {
    const users = BackendService.getUsers();
    const updated = users.map(u => u.email === email ? { ...u, password: newPassword } : u);
    BackendService.saveUsers(updated);
  },

  getActiveUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  setActiveUser: (user: User | null): void => {
    if (user) localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  // --- Patient Operations ---
  getPatients: async (): Promise<Patient[]> => {
    const data = localStorage.getItem(STORAGE_KEYS.PATIENTS);
    if (!data) return [];
    const patients = JSON.parse(data);
    
    // Revive dates
    return patients.map((p: any) => ({
      ...p,
      appointmentDate: p.appointmentDate ? new Date(p.appointmentDate) : undefined,
      createdAt: new Date(p.createdAt),
      imaging: (p.imaging || []).map((img: any) => ({
        ...img,
        date: new Date(img.date)
      }))
    }));
  },

  savePatients: async (patients: Patient[]): Promise<void> => {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  },

  // --- Message Operations ---
  getMessages: async (): Promise<AdminMessage[]> => {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (!data) return [];
    const messages = JSON.parse(data);
    return messages.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }));
  },

  saveMessages: async (messages: AdminMessage[]): Promise<void> => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  },

  // --- Theme Operations ---
  // FIX: Changed to synchronous to allow usage in React.useState initialization
  getTheme: (): 'light' | 'dark' => {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (theme) return theme as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  // FIX: Changed to synchronous as it only interacts with localStorage
  saveTheme: (theme: 'light' | 'dark'): void => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  // --- Notification Tracking ---
  getSentNotifications: async (): Promise<string[]> => {
    const data = localStorage.getItem(STORAGE_KEYS.SENT_NOTIFICATIONS);
    return data ? JSON.parse(data) : [];
  },

  markNotificationSent: async (patientId: string): Promise<void> => {
    const sent = await BackendService.getSentNotifications();
    if (!sent.includes(patientId)) {
      localStorage.setItem(STORAGE_KEYS.SENT_NOTIFICATIONS, JSON.stringify([...sent, patientId]));
    }
  }
};

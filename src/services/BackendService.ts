import AsyncStorage from '@react-native-async-storage/async-storage';
import { Patient, AdminMessage, User, UserRole } from '../types';
import { getSqlClient } from './database';

const STORAGE_KEYS = {
  THEME: 'medtrack_theme_v2',
  SENT_NOTIFICATIONS: 'medtrack_sent_notifications_v2',
  CURRENT_USER: 'medtrack_active_user_v2',
  PATIENTS_FALLBACK: 'medtrack_patients_fallback',
  MESSAGES_FALLBACK: 'medtrack_messages_fallback',
  USERS_FALLBACK: 'medtrack_users_fallback'
};

const DEFAULT_USERS: User[] = [
  { email: 'admin@medtrack.com', password: 'admin', role: 'admin', name: 'Dr. Administrator' },
  { email: 'resident@medtrack.com', password: 'res', role: 'resident', name: 'Dr. Resident' },
  { email: 'consultant@medtrack.com', password: 'con', role: 'consultant', name: 'Dr. Consultant' }
];

export const BackendService = {
  // --- User Operations ---
  getUsers: async (): Promise<User[]> => {
    const sql = await getSqlClient();
    if (!sql) {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USERS_FALLBACK);
      if (!data) {
        await AsyncStorage.setItem(STORAGE_KEYS.USERS_FALLBACK, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
      }
      return JSON.parse(data);
    }
    
    try {
      const rows = await sql`SELECT email, role, name, password, phone_number, profile_picture, confirmed FROM users`;
      return rows.map((r: any) => ({
        email: r.email,
        role: r.role,
        name: r.name,
        password: r.password,
        phoneNumber: r.phone_number || undefined,
        profilePicture: r.profile_picture || undefined,
        confirmed: r.confirmed !== null ? r.confirmed : true
      }));
    } catch (e) {
      console.error("Error loading users from Neon:", e);
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USERS_FALLBACK);
      return data ? JSON.parse(data) : DEFAULT_USERS;
    }
  },

  createOrGetUser: async (email: string, name: string, role: UserRole, password?: string, confirmed?: boolean): Promise<User> => {
    const isConf = confirmed !== undefined ? confirmed : true;
    const sql = await getSqlClient();
    if (!sql) {
      const users = await BackendService.getUsers();
      let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        user = { email, name, role, password: password || 'google-auth', confirmed: isConf };
        const updated = [...users, user];
        await AsyncStorage.setItem(STORAGE_KEYS.USERS_FALLBACK, JSON.stringify(updated));
      }
      return user;
    }
    
    try {
      const rows = await sql`SELECT email, role, name, password, phone_number, profile_picture, confirmed FROM users WHERE email = ${email}`;
      if (rows.length > 0) {
        return {
          email: rows[0].email,
          role: rows[0].role as UserRole,
          name: rows[0].name,
          password: rows[0].password,
          phoneNumber: rows[0].phone_number || undefined,
          profilePicture: rows[0].profile_picture || undefined,
          confirmed: rows[0].confirmed !== null ? rows[0].confirmed : true
        };
      }
      
      const pw = password || 'google-auth';
      await sql`INSERT INTO users (email, password, role, name, confirmed) VALUES (${email}, ${pw}, ${role}, ${name}, ${isConf})`;
      return { email, role, name, password: pw, confirmed: isConf };
    } catch (e) {
      console.error("Error creating/getting user in Neon:", e);
      const users = await BackendService.getUsers();
      let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        user = { email, name, role, password: password || 'google-auth', confirmed: isConf };
        const updated = [...users, user];
        await AsyncStorage.setItem(STORAGE_KEYS.USERS_FALLBACK, JSON.stringify(updated));
      }
      return user;
    }
  },

  updateUserPassword: async (email: string, newPassword: string): Promise<void> => {
    const sql = await getSqlClient();
    if (!sql) {
      const users = await BackendService.getUsers();
      const updated = users.map(u => u.email === email ? { ...u, password: newPassword } : u);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_FALLBACK, JSON.stringify(updated));
      return;
    }

    try {
      await sql`UPDATE users SET password = ${newPassword} WHERE email = ${email}`;
    } catch (e) {
      console.error("Error updating password in Neon:", e);
      const users = await BackendService.getUsers();
      const updated = users.map(u => u.email === email ? { ...u, password: newPassword } : u);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_FALLBACK, JSON.stringify(updated));
    }
  },

  updateUserProfile: async (email: string, name: string, phoneNumber?: string, profilePicture?: string): Promise<User> => {
    const sql = await getSqlClient();
    if (!sql) {
      const users = await BackendService.getUsers();
      const updated = users.map(u => u.email === email ? { ...u, name, phoneNumber, profilePicture } : u);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_FALLBACK, JSON.stringify(updated));
      const targetUser = updated.find(u => u.email === email)!;
      await BackendService.setActiveUser(targetUser);
      return targetUser;
    }

    try {
      await sql`UPDATE users SET name = ${name}, phone_number = ${phoneNumber || null}, profile_picture = ${profilePicture || null} WHERE email = ${email}`;
      const users = await BackendService.getUsers();
      const fullUser = users.find(u => u.email === email) || { email, name, role: 'admin' as UserRole, phoneNumber, profilePicture };
      await BackendService.setActiveUser(fullUser);
      return fullUser;
    } catch (e) {
      console.error("Error updating user profile in Neon:", e);
      const users = await BackendService.getUsers();
      const updated = users.map(u => u.email === email ? { ...u, name, phoneNumber, profilePicture } : u);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_FALLBACK, JSON.stringify(updated));
      const targetUser = updated.find(u => u.email === email)!;
      await BackendService.setActiveUser(targetUser);
      return targetUser;
    }
  },

  confirmUserEmail: async (email: string): Promise<void> => {
    const sql = await getSqlClient();
    if (!sql) {
      const users = await BackendService.getUsers();
      const updated = users.map(u => u.email.toLowerCase() === email.toLowerCase() ? { ...u, confirmed: true } : u);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_FALLBACK, JSON.stringify(updated));
      return;
    }
    try {
      await sql`UPDATE users SET confirmed = TRUE WHERE email = ${email}`;
    } catch (e) {
      console.error("Error confirming user in Neon:", e);
      const users = await BackendService.getUsers();
      const updated = users.map(u => u.email.toLowerCase() === email.toLowerCase() ? { ...u, confirmed: true } : u);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_FALLBACK, JSON.stringify(updated));
    }
  },

  getActiveUser: async (): Promise<User | null> => {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  setActiveUser: async (user: User | null): Promise<void> => {
    if (user) {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getPatients: async (): Promise<Patient[]> => {
    const sql = await getSqlClient();
    if (!sql) {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PATIENTS_FALLBACK);
      if (!data) return [];
      const patients = JSON.parse(data);
      return patients.map((p: any) => ({
        ...p,
        appointmentDate: p.appointmentDate ? new Date(p.appointmentDate) : undefined,
        createdAt: new Date(p.createdAt),
        imaging: (p.imaging || []).map((img: any) => ({
          ...img,
          date: new Date(img.date)
        }))
      }));
    }

    try {
      const rows = await sql`SELECT * FROM patients`;
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        age: parseInt(r.age),
        phoneNumber: r.phone_number,
        category: r.category,
        presentHistory: r.present_history || '',
        pastHistory: r.past_history || '',
        operationName: r.operation_name,
        side: r.side,
        labInvestigations: r.lab_investigations || '',
        imaging: typeof r.imaging === 'string' ? JSON.parse(r.imaging) : (r.imaging || []),
        appointmentDate: r.appointment_date ? new Date(r.appointment_date) : undefined,
        createdAt: new Date(r.created_at),
        isPostponed: !!r.is_postponed,
        isCompleted: !!r.is_completed,
        isCancelled: !!r.is_cancelled,
        nationalId: r.national_id || '',
        requiresApproval: !!r.requires_approval,
        isApproved: r.is_approved !== false,
        surgeonName: r.surgeon_name || '',
        isSpecial: !!r.is_special,
        labPdfUrl: r.lab_pdf_url || undefined
      }));
    } catch (e) {
      console.error("Error loading patients from Neon:", e);
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PATIENTS_FALLBACK);
      if (!data) return [];
      return JSON.parse(data).map((p: any) => ({
        ...p,
        appointmentDate: p.appointmentDate ? new Date(p.appointmentDate) : undefined,
        createdAt: new Date(p.createdAt)
      }));
    }
  },

  savePatients: async (patients: Patient[]): Promise<void> => {
    // Keep fallback in sync
    await AsyncStorage.setItem(STORAGE_KEYS.PATIENTS_FALLBACK, JSON.stringify(patients));

    const sql = await getSqlClient();
    if (!sql) return;

    try {
      // Sync list to database
      for (const p of patients) {
        await sql`
          INSERT INTO patients (
            id, name, age, phone_number, category, present_history, past_history, 
            operation_name, side, lab_investigations, imaging, appointment_date, 
            created_at, is_postponed, is_completed, is_cancelled, national_id,
            requires_approval, is_approved, surgeon_name, is_special, lab_pdf_url
          ) VALUES (
            ${p.id}, ${p.name}, ${p.age}, ${p.phoneNumber}, ${p.category}, 
            ${p.presentHistory || ''}, ${p.pastHistory || ''}, ${p.operationName}, 
            ${p.side}, ${p.labInvestigations || ''}, ${JSON.stringify(p.imaging || [])}, 
            ${p.appointmentDate ? new Date(p.appointmentDate).toISOString() : null}, 
            ${new Date(p.createdAt).toISOString()}, ${!!p.isPostponed}, ${!!p.isCompleted}, ${!!p.isCancelled},
            ${p.nationalId || ''}, ${!!p.requiresApproval}, ${p.isApproved !== false}, ${p.surgeonName || ''}, ${!!p.isSpecial},
            ${p.labPdfUrl || null}
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            age = EXCLUDED.age,
            phone_number = EXCLUDED.phone_number,
            category = EXCLUDED.category,
            present_history = EXCLUDED.present_history,
            past_history = EXCLUDED.past_history,
            operation_name = EXCLUDED.operation_name,
            side = EXCLUDED.side,
            lab_investigations = EXCLUDED.lab_investigations,
            imaging = EXCLUDED.imaging,
            appointment_date = EXCLUDED.appointment_date,
            is_postponed = EXCLUDED.is_postponed,
            is_completed = EXCLUDED.is_completed,
            is_cancelled = EXCLUDED.is_cancelled,
            national_id = EXCLUDED.national_id,
            requires_approval = EXCLUDED.requires_approval,
            is_approved = EXCLUDED.is_approved,
            surgeon_name = EXCLUDED.surgeon_name,
            is_special = EXCLUDED.is_special,
            lab_pdf_url = EXCLUDED.lab_pdf_url
        `;
      }
      
      const ids = patients.map(p => p.id);
      if (ids.length > 0) {
        await sql`DELETE FROM patients WHERE NOT (id = ANY(${ids}))`;
      } else {
        await sql`DELETE FROM patients`;
      }
    } catch (e) {
      console.error("Error syncing patients to Neon:", e);
    }
  },

  // --- Message Operations ---
  getMessages: async (): Promise<AdminMessage[]> => {
    const sql = await getSqlClient();
    if (!sql) {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES_FALLBACK);
      if (!data) return [];
      const messages = JSON.parse(data);
      return messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    }

    try {
      const rows = await sql`SELECT * FROM messages`;
      return rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        content: r.content,
        timestamp: new Date(r.timestamp),
        sender: r.sender,
        audioUrl: r.audio_url || undefined,
        duration: r.duration ? Number(r.duration) : undefined
      })).sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (e) {
      console.error("Error loading messages from Neon:", e);
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES_FALLBACK);
      if (!data) return [];
      return JSON.parse(data).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    }
  },

  saveMessages: async (messages: AdminMessage[]): Promise<void> => {
    // Keep fallback in sync
    await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES_FALLBACK, JSON.stringify(messages));

    const sql = await getSqlClient();
    if (!sql) return;

    try {
      for (const m of messages) {
        await sql`
          INSERT INTO messages (id, type, content, timestamp, sender, audio_url, duration)
          VALUES (${m.id}, ${m.type}, ${m.content}, ${new Date(m.timestamp).toISOString()}, ${m.sender}, ${m.audioUrl || null}, ${m.duration || null})
          ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            content = EXCLUDED.content,
            timestamp = EXCLUDED.timestamp,
            sender = EXCLUDED.sender,
            audio_url = EXCLUDED.audio_url,
            duration = EXCLUDED.duration
        `;
      }
      const ids = messages.map(m => m.id);
      if (ids.length > 0) {
        await sql`DELETE FROM messages WHERE NOT (id = ANY(${ids}))`;
      } else {
        await sql`DELETE FROM messages`;
      }
    } catch (e) {
      console.error("Error syncing messages to Neon:", e);
    }
  },

  // --- Theme Operations ---
  getTheme: async (): Promise<'light' | 'dark'> => {
    const theme = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
    if (theme) return theme as 'light' | 'dark';
    return 'dark'; // default to premium dark mode
  },

  saveTheme: async (theme: 'light' | 'dark'): Promise<void> => {
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  // --- Notification Tracking ---
  getSentNotifications: async (): Promise<string[]> => {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SENT_NOTIFICATIONS);
    return data ? JSON.parse(data) : [];
  },

  markNotificationSent: async (patientId: string): Promise<void> => {
    const sent = await BackendService.getSentNotifications();
    if (!sent.includes(patientId)) {
      await AsyncStorage.setItem(STORAGE_KEYS.SENT_NOTIFICATIONS, JSON.stringify([...sent, patientId]));
    }
  }
};

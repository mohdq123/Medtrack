import { neon } from '@neondatabase/serverless';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Patient, AdminMessage } from '../types';

const NEON_DB_URL_KEY = '@neon_database_url';

export const getDbUrl = async (): Promise<string | null> => {
  const localUrl = await AsyncStorage.getItem(NEON_DB_URL_KEY);
  if (localUrl) return localUrl;
  return process.env.EXPO_PUBLIC_NEON_DATABASE_URL || null;
};

export const saveDbUrl = async (url: string): Promise<void> => {
  await AsyncStorage.setItem(NEON_DB_URL_KEY, url.trim());
};

export const clearDbUrl = async (): Promise<void> => {
  await AsyncStorage.removeItem(NEON_DB_URL_KEY);
};

export const getSqlClient = async () => {
  const url = await getDbUrl();
  if (!url) return null;
  try {
    return neon(url);
  } catch (error) {
    console.error('Failed to create Neon client:', error);
    return null;
  }
};

export const testConnectionAndInit = async (url: string): Promise<boolean> => {
  try {
    const sql = neon(url.trim());
    
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL
      )
    `;
    
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT`;
    
    // Create patients table
    await sql`
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        phone_number TEXT NOT NULL,
        category TEXT NOT NULL,
        present_history TEXT,
        past_history TEXT,
        operation_name TEXT NOT NULL,
        side TEXT NOT NULL,
        lab_investigations TEXT,
        imaging JSONB,
        appointment_date TEXT,
        created_at TEXT NOT NULL,
        is_postponed BOOLEAN DEFAULT FALSE,
        is_completed BOOLEAN DEFAULT FALSE,
        is_cancelled BOOLEAN DEFAULT FALSE
      )
    `;

    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS national_id TEXT`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS surgeon_name TEXT`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_special BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS lab_pdf_url TEXT`;
    
    // Create messages table
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        sender TEXT NOT NULL
      )
    `;

    // Check if we need to seed the default users
    const usersCountResult = await sql`SELECT COUNT(*)::integer as count FROM users`;
    const count = usersCountResult[0]?.count || 0;
    
    if (count === 0) {
      await sql`
        INSERT INTO users (email, password, role, name) VALUES 
        ('admin@medtrack.com', 'admin', 'admin', 'Dr. Administrator'),
        ('resident@medtrack.com', 'res', 'resident', 'Dr. Resident'),
        ('consultant@medtrack.com', 'con', 'consultant', 'Dr. Consultant')
      `;
    }
    
    return true;
  } catch (error) {
    console.error('Neon Database Connection/Initialization failed:', error);
    return false;
  }
};

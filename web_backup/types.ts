
export type PatientCategory = 'ESWL' | 'Surgical';
export type InvestigationType = 'X-ray' | 'CT' | 'US' | 'Others';
export type SideType = 'Right' | 'Left' | 'No Side';
export type UserRole = 'admin' | 'resident';

export interface User {
  email: string;
  password?: string;
  role: UserRole;
  name: string;
}

export interface Investigation {
  id: string;
  type: InvestigationType;
  imageData: string; // base64
  date: Date;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  phoneNumber: string;
  category: PatientCategory;
  presentHistory: string;
  pastHistory: string;
  operationName: string;
  side: SideType;
  labInvestigations: string;
  imaging: Investigation[];
  appointmentDate?: Date; // Optional for ESWL waitlist
  createdAt: Date;
  isPostponed?: boolean;
  isCompleted?: boolean;
  isCancelled?: boolean;
}

export interface AdminMessage {
  id: string;
  type: 'text' | 'voice';
  content: string;
  timestamp: Date;
  sender: string;
}

export interface AnalysisResult {
  summary: string;
  redFlags: string[];
  recommendations: string[];
}

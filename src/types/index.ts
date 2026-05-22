export type PatientCategory = 'ESWL' | 'Surgical';
export type InvestigationType = 'X-ray' | 'CT' | 'US' | 'PDF' | 'Others';
export type SideType = 'Right' | 'Left' | 'No Side' | 'Bilateral';
export type UserRole = 'admin' | 'resident' | 'consultant';

export interface User {
  email: string;
  password?: string;
  role: UserRole;
  name: string;
  phoneNumber?: string;
  profilePicture?: string; // base64 or URL
}

export interface Investigation {
  id: string;
  type: InvestigationType;
  imageData: string; // base64;
  date: Date | string;
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
  labPdfUrl?: string;
  appointmentDate?: Date | string; // Optional for ESWL waitlist
  createdAt: Date | string;
  isPostponed?: boolean;
  isCompleted?: boolean;
  isCancelled?: boolean;
  nationalId?: string;
  requiresApproval?: boolean;
  isApproved?: boolean;
  surgeonName?: string;
  isSpecial?: boolean;
}

export interface AdminMessage {
  id: string;
  type: 'text' | 'voice';
  content: string;
  timestamp: Date | string;
  sender: string;
}

export interface AnalysisResult {
  summary: string;
  redFlags: string[];
  recommendations: string[];
}

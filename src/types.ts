export type UserRole = 'admin' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Question {
  id: string;
  question: string;
  choices: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

export interface Session {
  id: string;
  moduleId: string;
  moduleTitle: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm e.g. "15:00"
  endTime: string; // HH:mm e.g. "16:00"
  pdfFileName?: string;
  pdfTextSnippet?: string;
  quiz?: Quiz;
  isQuizReady: boolean;
  status?: 'pending' | 'ready' | 'generating' | 'error';
}

export interface Module {
  id: string;
  code: string;
  title: string;
  description: string;
  sessions: Session[];
}

export interface Submission {
  id: string;
  sessionId: string;
  sessionTitle: string;
  moduleTitle: string;
  sessionDate: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string; // ISO string
  answers: number[];
  baseScore: number; // 0..10
  adjustment: number; // e.g. +2 or -1, -2
  finalScore: number; // baseScore + adjustment
  isValidated: boolean; // finalScore >= 6
  isLate: boolean;
  lateDays: number;
}

export interface StudentProgress {
  studentId: string;
  name: string;
  email: string;
  totalQuizzes: number;
  validatedModulesCount: number;
  averageScore: number; // final score avg
  baseAverageScore: number;
  lateCount: number;
  onTimeCount: number;
  trend: 'up' | 'down' | 'stable';
  history: Submission[];
}

export interface ModuleStat {
  moduleId: string;
  code: string;
  title: string;
  totalSessions: number;
  totalSubmissions: number;
  averageScore: number;
  passRate: number; // 0..100 %
}

export interface DailyScoreTrend {
  date: string; // e.g. "12/08"
  fullDate: string; // e.g. "2026-08-12"
  avgScore: number;
  passRate: number;
  totalSubmissions: number;
}

export interface AdminAnalytics {
  totalStudents: number;
  totalSessions: number;
  totalSubmissions: number;
  globalAverageScore: number;
  globalPassRate: number;
  onTimePercentage: number;
  moduleStats: ModuleStat[];
  dailyScores: DailyScoreTrend[];
  studentProgressList: StudentProgress[];
  frequentLateSubmitters: { studentId: string; studentName: string; lateCount: number; avgAdjustment: number }[];
}

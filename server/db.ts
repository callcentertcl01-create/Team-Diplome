import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Module, Session, Quiz, Question, Submission, AdminAnalytics, StudentProgress, ModuleStat, DailyScoreTrend } from '../src/types';
import { calculateBonusMalusScore } from './scoreUtils';

// ============================================================
// Client Supabase — côté serveur (service_role = accès total)
// ============================================================

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('⚠️  VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY non définis. Le backend utilisera des données de secours.');
}

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl || 'https://placeholder.supabase.co', serviceRoleKey || 'placeholder', {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============================================================
// Helpers de conversion DB → Types App
// ============================================================

function dbQuestionToApp(q: any): Question {
  return {
    id: q.id,
    question: q.question,
    choices: Array.isArray(q.choices) ? q.choices : JSON.parse(q.choices),
    correctAnswer: q.correct_answer,
    explanation: q.explanation
  };
}

function dbSessionToApp(s: any, quiz?: Quiz): Session {
  return {
    id: s.id,
    moduleId: s.module_id,
    moduleTitle: s.module_title,
    title: s.title,
    date: typeof s.date === 'string' ? s.date.slice(0, 10) : s.date,
    startTime: s.start_time,
    endTime: s.end_time,
    pdfFileName: s.pdf_file_name,
    pdfTextSnippet: s.pdf_text_snippet,
    isQuizReady: s.is_quiz_ready,
    status: s.status,
    quiz
  };
}

function dbSubmissionToApp(s: any): Submission {
  return {
    id: s.id,
    sessionId: s.session_id,
    sessionTitle: s.session_title || '',
    moduleTitle: s.module_title || '',
    sessionDate: s.session_date || '',
    studentId: s.student_id,
    studentName: s.student_name || '',
    studentEmail: s.student_email || '',
    submittedAt: s.submitted_at,
    answers: Array.isArray(s.answers) ? s.answers : JSON.parse(s.answers),
    baseScore: Number(s.base_score),
    adjustment: Number(s.adjustment),
    finalScore: Number(s.final_score),
    isValidated: s.is_validated,
    isLate: s.is_late,
    lateDays: s.late_days || 0
  };
}

// ============================================================
// Classe Database Store (remplace le store in-memory)
// ============================================================

class DatabaseStore {

  // --- USERS ---

  async getUsers(): Promise<User[]> {
    const { data, error } = await supabaseAdmin.from('users').select('*').order('name');
    if (error) { console.error('getUsers:', error); return []; }
    return (data || []).map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as 'admin' | 'student',
      avatar: u.avatar
    }));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data } = await supabaseAdmin.from('users').select('*').ilike('email', email).single();
    if (!data) return undefined;
    return { id: data.id, email: data.email, name: data.name, role: data.role, avatar: data.avatar };
  }

  async getUserById(id: string): Promise<User | undefined> {
    const { data } = await supabaseAdmin.from('users').select('*').eq('id', id).single();
    if (!data) return undefined;
    return { id: data.id, email: data.email, name: data.name, role: data.role, avatar: data.avatar };
  }

  async registerStudent(name: string, email: string, supabaseId?: string): Promise<User> {
    // Si l'utilisateur existe déjà (via email), le retourner
    const existing = await this.getUserByEmail(email);
    if (existing) return existing;

    // Sinon, créer le profil (utilisé en fallback si le trigger n'a pas encore tourné)
    const newUser = {
      id: supabaseId || `local-${Date.now()}`,
      email,
      name,
      role: 'student' as const,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
    };

    const { data, error } = await supabaseAdmin.from('users').upsert(newUser, { onConflict: 'id' }).select().single();
    if (error) {
      console.error('registerStudent:', error);
      return newUser;
    }
    return { id: data.id, email: data.email, name: data.name, role: data.role, avatar: data.avatar };
  }

  // --- MODULES & SESSIONS ---

  async getModules(): Promise<Module[]> {
    // Récupérer modules
    const { data: modulesData, error: mErr } = await supabaseAdmin.from('modules').select('*').order('code');
    if (mErr) { console.error('getModules:', mErr); return []; }

    // Récupérer sessions
    const { data: sessionsData, error: sErr } = await supabaseAdmin.from('sessions').select('*').order('date');
    if (sErr) { console.error('getSessions:', sErr); return []; }

    // Récupérer quiz et questions
    const { data: quizzesData } = await supabaseAdmin.from('quizzes').select('*');
    const { data: questionsData } = await supabaseAdmin.from('questions').select('*').order('order_index');

    const modules: Module[] = (modulesData || []).map(m => {
      const sessions: Session[] = (sessionsData || [])
        .filter(s => s.module_id === m.id)
        .map(s => {
          const quizRow = (quizzesData || []).find(q => q.session_id === s.id);
          let quiz: Quiz | undefined;
          if (quizRow) {
            const questions: Question[] = (questionsData || [])
              .filter(q => q.quiz_id === quizRow.id)
              .map(dbQuestionToApp);
            quiz = { id: quizRow.id, title: quizRow.title, questions };
          }
          return dbSessionToApp(s, quiz);
        });

      return { id: m.id, code: m.code, title: m.title, description: m.description || '', sessions };
    });

    return modules;
  }

  async getModuleById(id: string): Promise<Module | undefined> {
    const modules = await this.getModules();
    return modules.find(m => m.id === id);
  }

  async getSessionById(sessionId: string): Promise<{ session: Session; module: Module } | undefined> {
    const modules = await this.getModules();
    for (const mod of modules) {
      const sess = mod.sessions.find(s => s.id === sessionId);
      if (sess) return { session: sess, module: mod };
    }
    return undefined;
  }

  async createModule(code: string, title: string, description: string): Promise<Module> {
    const newModule = {
      id: `mod-${Date.now()}`,
      code: code || `MOD-${Date.now()}`,
      title,
      description: description || ''
    };
    const { data, error } = await supabaseAdmin.from('modules').insert(newModule).select().single();
    if (error) throw new Error(error.message);
    return { id: data.id, code: data.code, title: data.title, description: data.description, sessions: [] };
  }

  async createSession(
    moduleId: string,
    title: string,
    date: string,
    startTime: string = '15:00',
    endTime: string = '16:00',
    pdfFileName?: string,
    pdfTextSnippet?: string
  ): Promise<Session> {
    const mod = await this.getModuleById(moduleId);
    if (!mod) throw new Error(`Module ${moduleId} non trouvé.`);

    const newSession = {
      id: `sess-${Date.now()}`,
      module_id: moduleId,
      module_title: mod.title,
      title,
      date,
      start_time: startTime,
      end_time: endTime,
      pdf_file_name: pdfFileName,
      pdf_text_snippet: pdfTextSnippet,
      is_quiz_ready: false,
      status: 'pending'
    };

    const { data, error } = await supabaseAdmin.from('sessions').insert(newSession).select().single();
    if (error) throw new Error(error.message);
    return dbSessionToApp(data);
  }

  async setSessionQuiz(sessionId: string, quiz: Quiz): Promise<void> {
    // Insérer ou remplacer le quiz
    const quizRow = { id: quiz.id, session_id: sessionId, title: quiz.title };
    await supabaseAdmin.from('quizzes').upsert(quizRow, { onConflict: 'id' });

    // Insérer les questions
    const questionsRows = quiz.questions.map((q, idx) => ({
      id: q.id,
      quiz_id: quiz.id,
      question: q.question,
      choices: JSON.stringify(q.choices),
      correct_answer: q.correctAnswer,
      explanation: q.explanation || '',
      order_index: idx + 1
    }));
    await supabaseAdmin.from('questions').upsert(questionsRows, { onConflict: 'id' });

    // Mettre à jour la session
    await supabaseAdmin.from('sessions').update({ is_quiz_ready: true, status: 'ready' }).eq('id', sessionId);
  }

  async updateSessionStatus(sessionId: string, status: 'pending' | 'generating' | 'ready' | 'error'): Promise<void> {
    await supabaseAdmin.from('sessions').update({ status }).eq('id', sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    // Les questions et quiz sont supprimés en cascade (ON DELETE CASCADE dans le schema)
    const { error } = await supabaseAdmin.from('sessions').delete().eq('id', sessionId);
    if (error) throw new Error(`Impossible de supprimer la session : ${error.message}`);
  }

  async deleteModule(moduleId: string): Promise<void> {
    // Les sessions, quiz, questions sont supprimés en cascade
    const { error } = await supabaseAdmin.from('modules').delete().eq('id', moduleId);
    if (error) throw new Error(`Impossible de supprimer le module : ${error.message}`);
  }

  // --- SOUMISSIONS ---

  async submitQuiz(sessionId: string, studentId: string, answers: number[]): Promise<Submission> {
    const student = await this.getUserById(studentId);
    if (!student) throw new Error('Étudiant non trouvé.');

    const sessObj = await this.getSessionById(sessionId);
    if (!sessObj || !sessObj.session.quiz) throw new Error('Quiz ou session invalide.');

    const session = sessObj.session;

    // Vérifier doublon
    const { data: existing } = await supabaseAdmin
      .from('submissions')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
      .single();

    if (existing) throw new Error('Vous avez déjà soumis vos réponses pour ce quiz.');

    const correctAnswers = session.quiz!.questions.map(q => q.correctAnswer);
    const now = new Date();

    const scoreRes = calculateBonusMalusScore(answers, correctAnswers, session.date, session.endTime, now);

    const newSub = {
      id: `sub-${Date.now()}`,
      session_id: sessionId,
      student_id: studentId,
      answers: JSON.stringify(answers),
      base_score: scoreRes.baseScore,
      adjustment: scoreRes.adjustment,
      final_score: scoreRes.finalScore,
      is_validated: scoreRes.isValidated,
      is_late: scoreRes.isLate,
      late_days: scoreRes.lateDays,
      submitted_at: now.toISOString()
    };

    const { data, error } = await supabaseAdmin.from('submissions').insert(newSub).select().single();
    if (error) throw new Error(error.message);

    return {
      id: data.id,
      sessionId: data.session_id,
      sessionTitle: session.title,
      moduleTitle: session.moduleTitle,
      sessionDate: session.date,
      studentId: data.student_id,
      studentName: student.name,
      studentEmail: student.email,
      submittedAt: data.submitted_at,
      answers,
      baseScore: Number(data.base_score),
      adjustment: Number(data.adjustment),
      finalScore: Number(data.final_score),
      isValidated: data.is_validated,
      isLate: data.is_late,
      lateDays: data.late_days
    };
  }

  async getSubmissionsForStudent(studentId: string): Promise<Submission[]> {
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .select('*, sessions(title, module_title, date)')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: true });

    if (error) { console.error('getSubmissionsForStudent:', error); return []; }

    const student = await this.getUserById(studentId);

    return (data || []).map(s => ({
      id: s.id,
      sessionId: s.session_id,
      sessionTitle: s.sessions?.title || '',
      moduleTitle: s.sessions?.module_title || '',
      sessionDate: s.sessions?.date?.slice(0, 10) || '',
      studentId: s.student_id,
      studentName: student?.name || '',
      studentEmail: student?.email || '',
      submittedAt: s.submitted_at,
      answers: Array.isArray(s.answers) ? s.answers : JSON.parse(s.answers),
      baseScore: Number(s.base_score),
      adjustment: Number(s.adjustment),
      finalScore: Number(s.final_score),
      isValidated: s.is_validated,
      isLate: s.is_late,
      lateDays: s.late_days || 0
    }));
  }

  async getSubmissionsForSession(sessionId: string): Promise<Submission[]> {
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .select('*, users(name, email), sessions(title, module_title, date)')
      .eq('session_id', sessionId);

    if (error) { console.error('getSubmissionsForSession:', error); return []; }

    return (data || []).map(s => ({
      id: s.id,
      sessionId: s.session_id,
      sessionTitle: s.sessions?.title || '',
      moduleTitle: s.sessions?.module_title || '',
      sessionDate: s.sessions?.date?.slice(0, 10) || '',
      studentId: s.student_id,
      studentName: s.users?.name || '',
      studentEmail: s.users?.email || '',
      submittedAt: s.submitted_at,
      answers: Array.isArray(s.answers) ? s.answers : JSON.parse(s.answers),
      baseScore: Number(s.base_score),
      adjustment: Number(s.adjustment),
      finalScore: Number(s.final_score),
      isValidated: s.is_validated,
      isLate: s.is_late,
      lateDays: s.late_days || 0
    }));
  }

  // --- ANALYTICS ADMIN ---

  async getAdminAnalytics(): Promise<AdminAnalytics> {
    const [users, modules, allSubmissionsRaw] = await Promise.all([
      this.getUsers(),
      this.getModules(),
      supabaseAdmin.from('submissions')
        .select('*, users(name, email), sessions(title, module_title, date, module_id)')
        .order('submitted_at', { ascending: true })
    ]);

    const students = users.filter(u => u.role === 'student');
    const totalStudents = students.length;

    let totalSessions = 0;
    modules.forEach(m => { totalSessions += m.sessions.length; });

    const allSubs: Submission[] = (allSubmissionsRaw.data || []).map(s => ({
      id: s.id,
      sessionId: s.session_id,
      sessionTitle: s.sessions?.title || '',
      moduleTitle: s.sessions?.module_title || '',
      sessionDate: s.sessions?.date?.slice(0, 10) || '',
      studentId: s.student_id,
      studentName: s.users?.name || '',
      studentEmail: s.users?.email || '',
      submittedAt: s.submitted_at,
      answers: Array.isArray(s.answers) ? s.answers : JSON.parse(s.answers),
      baseScore: Number(s.base_score),
      adjustment: Number(s.adjustment),
      finalScore: Number(s.final_score),
      isValidated: s.is_validated,
      isLate: s.is_late,
      lateDays: s.late_days || 0
    }));

    const totalSubmissions = allSubs.length;
    const globalAvgScore = totalSubmissions > 0
      ? Number((allSubs.reduce((acc, s) => acc + s.finalScore, 0) / totalSubmissions).toFixed(2))
      : 0;
    const validatedCount = allSubs.filter(s => s.isValidated).length;
    const globalPassRate = totalSubmissions > 0
      ? Number(((validatedCount / totalSubmissions) * 100).toFixed(1)) : 0;
    const onTimeCount = allSubs.filter(s => !s.isLate).length;
    const onTimePercentage = totalSubmissions > 0
      ? Number(((onTimeCount / totalSubmissions) * 100).toFixed(1)) : 100;

    // Module stats
    const moduleStats: ModuleStat[] = modules.map(mod => {
      const sessionIds = mod.sessions.map(s => s.id);
      const modSubs = allSubs.filter(s => sessionIds.includes(s.sessionId));
      const subCount = modSubs.length;
      const avgScore = subCount > 0
        ? Number((modSubs.reduce((acc, s) => acc + s.finalScore, 0) / subCount).toFixed(2)) : 0;
      const passRate = subCount > 0
        ? Number(((modSubs.filter(s => s.isValidated).length / subCount) * 100).toFixed(1)) : 0;
      return { moduleId: mod.id, code: mod.code, title: mod.title, totalSessions: mod.sessions.length, totalSubmissions: subCount, averageScore: avgScore, passRate };
    });

    // Daily score trends
    const dailyMap = new Map<string, { scores: number[]; validated: number }>();
    for (let day = 11; day <= 25; day++) {
      if (day === 22) continue;
      const dateStr = `2026-08-${day < 10 ? '0' + day : day}`;
      dailyMap.set(dateStr, { scores: [], validated: 0 });
    }
    allSubs.forEach(sub => {
      const dayKey = sub.sessionDate;
      if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, { scores: [], validated: 0 });
      const item = dailyMap.get(dayKey)!;
      item.scores.push(sub.finalScore);
      if (sub.isValidated) item.validated += 1;
    });
    const dailyScores: DailyScoreTrend[] = Array.from(dailyMap.entries())
      .map(([fullDate, val]) => {
        const count = val.scores.length;
        const avg = count > 0 ? Number((val.scores.reduce((a, b) => a + b, 0) / count).toFixed(2)) : 0;
        const pr = count > 0 ? Number(((val.validated / count) * 100).toFixed(1)) : 0;
        const [y, m, d] = fullDate.split('-');
        return { date: `${d}/${m}`, fullDate, avgScore: avg, passRate: pr, totalSubmissions: count };
      })
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

    // Student progress
    const studentProgressList: StudentProgress[] = students.map(student => {
      const history = allSubs.filter(s => s.studentId === student.id)
        .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
      const totalQuizzes = history.length;
      const validatedModulesCount = history.filter(h => h.isValidated).length;
      const avgScore = totalQuizzes > 0
        ? Number((history.reduce((acc, h) => acc + h.finalScore, 0) / totalQuizzes).toFixed(2)) : 0;
      const baseAvg = totalQuizzes > 0
        ? Number((history.reduce((acc, h) => acc + h.baseScore, 0) / totalQuizzes).toFixed(2)) : 0;
      const lateCount = history.filter(h => h.isLate).length;
      const onTimeCount = history.filter(h => !h.isLate).length;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (history.length >= 2) {
        const lastScore = history[history.length - 1].finalScore;
        const prevAvg = history.slice(0, -1).reduce((acc, h) => acc + h.finalScore, 0) / (history.length - 1);
        if (lastScore > prevAvg + 0.5) trend = 'up';
        else if (lastScore < prevAvg - 0.5) trend = 'down';
      }

      return { studentId: student.id, name: student.name, email: student.email, totalQuizzes, validatedModulesCount, averageScore: avgScore, baseAverageScore: baseAvg, lateCount, onTimeCount, trend, history };
    }).sort((a, b) => b.averageScore - a.averageScore);

    const frequentLateSubmitters = studentProgressList
      .filter(s => s.lateCount > 0)
      .map(s => ({
        studentId: s.studentId,
        studentName: s.name,
        lateCount: s.lateCount,
        avgAdjustment: Number((s.history.reduce((acc, h) => acc + h.adjustment, 0) / s.totalQuizzes).toFixed(2))
      }))
      .sort((a, b) => b.lateCount - a.lateCount);

    return {
      totalStudents,
      totalSessions,
      totalSubmissions,
      globalAverageScore: globalAvgScore,
      globalPassRate,
      onTimePercentage,
      moduleStats,
      dailyScores,
      studentProgressList,
      frequentLateSubmitters
    };
  }
}

// ============================================================
// Export singleton synchrone wrapper
// (pour compatibilité avec server.ts qui attend un objet synchrone)
// ============================================================

class SyncDbWrapper {
  private store = new DatabaseStore();

  getUsers() { return this.store.getUsers(); }
  getUserByEmail(email: string) { return this.store.getUserByEmail(email); }
  getUserById(id: string) { return this.store.getUserById(id); }
  registerStudent(name: string, email: string, supabaseId?: string) { return this.store.registerStudent(name, email, supabaseId); }
  getModules() { return this.store.getModules(); }
  getModuleById(id: string) { return this.store.getModuleById(id); }
  getSessionById(id: string) { return this.store.getSessionById(id); }
  createModule(code: string, title: string, desc: string) { return this.store.createModule(code, title, desc); }
  createSession(moduleId: string, title: string, date: string, startTime?: string, endTime?: string, pdfFileName?: string, pdfTextSnippet?: string) {
    return this.store.createSession(moduleId, title, date, startTime, endTime, pdfFileName, pdfTextSnippet);
  }
  setSessionQuiz(sessionId: string, quiz: Quiz) { return this.store.setSessionQuiz(sessionId, quiz); }
  updateSessionStatus(sessionId: string, status: 'pending' | 'generating' | 'ready' | 'error') { return this.store.updateSessionStatus(sessionId, status); }
  deleteSession(sessionId: string) { return this.store.deleteSession(sessionId); }
  deleteModule(moduleId: string) { return this.store.deleteModule(moduleId); }
  submitQuiz(sessionId: string, studentId: string, answers: number[]) { return this.store.submitQuiz(sessionId, studentId, answers); }
  getSubmissionsForStudent(studentId: string) { return this.store.getSubmissionsForStudent(studentId); }
  getSubmissionsForSession(sessionId: string) { return this.store.getSubmissionsForSession(sessionId); }
  getAdminAnalytics() { return this.store.getAdminAnalytics(); }
}

export const db = new SyncDbWrapper();

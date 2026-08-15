import fs from 'fs';
import path from 'path';
import { User, Module, Session, Quiz, Submission, AdminAnalytics, StudentProgress, ModuleStat, DailyScoreTrend } from '../src/types';
import { calculateBonusMalusScore } from './scoreUtils';
import { getSupabaseServer } from './supabaseServer';

const DATA_FILE_PATH = path.join(process.cwd(), 'server_data_store.json');

// Database Store with Local File Persistence & Supabase Synchronization
class DatabaseStore {
  private users: User[] = [];
  private modules: Module[] = [];
  private submissions: Submission[] = [];
  private isSyncedWithSupabase = false;
  private isSyncing = false;

  constructor() {
    this.seedInitialData();
    this.loadFromLocalFile();
    this.syncFromSupabase();
  }

  private saveToLocalFile() {
    try {
      const payload = {
        users: this.users,
        modules: this.modules,
        submissions: this.submissions
      };
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.warn("Avertissement écriture fichier local de données :", err);
    }
  }

  private loadFromLocalFile() {
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.users) && parsed.users.length > 0) {
          this.users = parsed.users;
        }
        if (Array.isArray(parsed.modules) && parsed.modules.length > 0) {
          this.modules = parsed.modules;
        }
        if (Array.isArray(parsed.submissions) && parsed.submissions.length > 0) {
          this.submissions = parsed.submissions;
        }
        console.log("💾 Données de progression chargées depuis server_data_store.json");
      }
    } catch (err) {
      console.warn("Avertissement lecture fichier local de données :", err);
    }
  }

  public async syncFromSupabase() {
    const supabase = getSupabaseServer();
    if (!supabase) return;
    
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      // 1. Fetch Users / Profiles from Supabase & Auth
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
      if (!pErr && profiles && profiles.length > 0) {
        profiles.forEach((p: any) => {
          const existingIndex = this.users.findIndex(u => u.id === p.id || u.email?.toLowerCase() === p.email?.toLowerCase());
          const mappedUser: User = {
            id: p.id,
            email: p.email,
            name: p.name || p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
            role: p.role || 'student',
            avatar: p.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.email || 'user')}`
          };
          if (existingIndex >= 0) {
            this.users[existingIndex] = mappedUser;
          } else {
            this.users.push(mappedUser);
          }
        });
      }

      // Also migrate any existing auth.users directly into profiles
      try {
        const { data: authUsersData } = await supabase.auth.admin.listUsers();
        if (authUsersData?.users && authUsersData.users.length > 0) {
          for (const au of authUsersData.users) {
            if (!au.email) continue;
            const existingInProfiles = profiles?.find((p: any) => p.id === au.id || p.email?.toLowerCase() === au.email.toLowerCase());
            const fullName = au.user_metadata?.full_name || au.user_metadata?.name || au.email.split('@')[0];
            const role = au.user_metadata?.role || (au.email.toLowerCase() === 'admin@teamdiplome.com' ? 'admin' : 'student');
            const avatar = au.user_metadata?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(au.email)}`;

            if (!existingInProfiles) {
              await supabase.from('profiles').upsert({
                id: au.id,
                email: au.email,
                name: fullName,
                role: role,
                avatar: avatar
              });
            }

            const existingIndex = this.users.findIndex(u => u.id === au.id || u.email?.toLowerCase() === au.email.toLowerCase());
            const mappedUser: User = {
              id: au.id,
              email: au.email,
              name: fullName,
              role: role,
              avatar: avatar
            };
            if (existingIndex >= 0) {
              this.users[existingIndex] = mappedUser;
            } else {
              this.users.push(mappedUser);
            }
          }
        }
      } catch (authListErr) {
        // Service role might be restricted, fallback gracefully
      }

      // 2. Fetch Modules & Sessions from Supabase
      const { data: dbModules, error: mErr } = await supabase.from('modules').select('*');
      const { data: dbSessions, error: sErr } = await supabase.from('sessions').select('*');

      if (!mErr && dbModules && dbModules.length > 0) {
        const fetchedModules = dbModules.map((m: any) => {
          const mSessions = (dbSessions || [])
            .filter((s: any) => s.module_id === m.id)
            .map((s: any) => ({
              id: s.id,
              moduleId: m.id,
              moduleTitle: m.title,
              title: s.title,
              date: s.date,
              startTime: s.start_time || '15:00',
              endTime: s.end_time || '16:00',
              pdfFileName: s.pdf_file_name,
              pdfTextSnippet: s.pdf_text_snippet,
              isQuizReady: s.is_quiz_ready || false,
              status: s.status || 'pending',
              quiz: s.quiz || undefined
            }));

          return {
            id: m.id,
            code: m.code,
            title: m.title,
            description: m.description || '',
            sessions: mSessions
          };
        });

        // Merge fetched modules with local modules so no local additions are lost
        fetchedModules.forEach(fm => {
          const idx = this.modules.findIndex(m => m.id === fm.id);
          if (idx >= 0) {
            this.modules[idx] = fm;
          } else {
            this.modules.push(fm);
          }
        });
      } else {
        // Seed initial modules to Supabase if empty
        await this.pushModulesToSupabase();
      }

      // 3. Fetch Submissions from Supabase & Merge
      const { data: dbSubmissions, error: subErr } = await supabase.from('submissions').select('*');
      if (!subErr && dbSubmissions) {
        dbSubmissions.forEach((s: any) => {
          const mappedSub: Submission = {
            id: s.id,
            sessionId: s.session_id,
            sessionTitle: s.session_title || 'Session',
            moduleTitle: s.module_title || 'Module',
            sessionDate: s.session_date || s.submitted_at?.split('T')[0] || '2026-08-12',
            studentId: s.student_id,
            studentName: s.student_name || 'Étudiant',
            studentEmail: s.student_email || '',
            submittedAt: s.submitted_at,
            answers: s.answers || [],
            baseScore: Number(s.base_score || 0),
            adjustment: Number(s.adjustment || 0),
            finalScore: Number(s.final_score || 0),
            isValidated: s.is_validated || false,
            isLate: s.is_late || false,
            lateDays: Number(s.late_days || 0)
          };

          const existingIdx = this.submissions.findIndex(sub => sub.id === s.id);
          if (existingIdx >= 0) {
            this.submissions[existingIdx] = mappedSub;
          } else {
            this.submissions.push(mappedSub);
          }
        });
      }

      this.saveToLocalFile();
      this.isSyncedWithSupabase = true;
      console.log('✅ Synchronisation BDD Supabase achevée.');
    } catch (err) {
      console.warn('⚠️ Impossible de synchroniser avec la BDD Supabase (Mode In-Memory maintenu) :', err);
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushModulesToSupabase() {
    const supabase = getSupabaseServer();
    if (!supabase) return;

    for (const mod of this.modules) {
      await supabase.from('modules').upsert({
        id: mod.id,
        code: mod.code,
        title: mod.title,
        description: mod.description
      });

      for (const sess of mod.sessions) {
        await supabase.from('sessions').upsert({
          id: sess.id,
          module_id: mod.id,
          module_title: mod.title,
          title: sess.title,
          date: sess.date,
          start_time: sess.startTime,
          end_time: sess.endTime,
          pdf_file_name: sess.pdfFileName,
          pdf_text_snippet: sess.pdfTextSnippet,
          is_quiz_ready: sess.isQuizReady,
          status: sess.status,
          quiz: sess.quiz
        });
      }
    }
  }

  private seedInitialData() {
    this.users = [
      {
        id: 'u-admin',
        email: 'admin@teamdiplome.com',
        name: 'Prof. Alexandre Vance',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
      }
    ];

    this.modules = [
      {
        id: 'mod-1',
        code: 'RI-101',
        title: 'Théories et doctrines des relations internationales',
        description: 'Analyse des grands courants théoriques des relations internationales : réalisme, libéralisme, constructivisme.',
        sessions: [
          {
            id: 'sess-1',
            moduleId: 'mod-1',
            moduleTitle: 'Théories et doctrines des relations internationales',
            title: 'Introduction aux Relations Internationales & Réalisme',
            date: '2026-08-11',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_RI101_Jour1_Realisme.pdf',
            pdfTextSnippet: 'Le réalisme politique en relations internationales insiste sur l anomie du système international, l importance de l État-nation et la recherche de la puissance...',
            isQuizReady: true,
            status: 'ready',
            quiz: {
              id: 'quiz-sess-1',
              title: 'Quiz Jour 1 - Réalisme politique',
              questions: [
                {
                  id: 'q1-1',
                  question: "Selon la théorie réaliste des relations internationales, quel est l'acteur principal du système international ?",
                  choices: [
                    "Les organisations non gouvernementales (ONG)",
                    "L'État souverain",
                    "Les firmes multinationales",
                    "Les institutions supranationales"
                  ],
                  correctAnswer: 1,
                  explanation: "Pour les réalistes, l'État souverain est l'acteur central et le principal sujet du système international."
                },
                {
                  id: 'q1-2',
                  question: "Que désigne le concept de 'dilemme de sécurité' ?",
                  choices: [
                    "L'impossibilité d'établir une armée permanente",
                    "Le fait que le renforcement de la sécurité d'un État accroît le sentiment d'insécurité des autres",
                    "L'absence totale de traité de paix entre voisins",
                    "La dépendance exclusive envers les alliances économiques"
                  ],
                  correctAnswer: 1,
                  explanation: "Le dilemme de sécurité explique comment des actions purement défensives peuvent susciter des craintes chez les voisins."
                }
              ]
            }
          },
          {
            id: 'sess-2',
            moduleId: 'mod-1',
            moduleTitle: 'Théories et doctrines des relations internationales',
            title: 'Le Libéralisme et le Constructivisme dans les RI',
            date: '2026-08-12',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_RI101_Jour2_Liberalisme_Constructivisme.pdf',
            pdfTextSnippet: 'Le libéralisme met en avant l interdépendance économique et le rôle des institutions internationales. Le constructivisme (Wendt) montre que la réalité internationale est socialement construite...',
            isQuizReady: true,
            status: 'ready',
            quiz: {
              id: 'quiz-sess-2',
              title: 'Quiz Jour 2 - Libéralisme et Constructivisme',
              questions: [
                {
                  id: 'q2-1',
                  question: "Selon la théorie libérale, quel facteur favorise principalement la paix entre les nations ?",
                  choices: [
                    "La course aux armements nucléaires",
                    "L'interdépendance économique et les institutions internationales",
                    "L'isolement diplomatique strict",
                    "L'absence totale de droit international"
                  ],
                  correctAnswer: 1,
                  explanation: "L'interdépendance économique et les organisations internationales favorisent la coopération et réduisent les risques de conflit."
                },
                {
                  id: 'q2-2',
                  question: "Quelle est la citation célèbre d'Alexander Wendt illustrant la posture constructiviste ?",
                  choices: [
                    "La guerre est la poursuite de la politique par d'autres moyens",
                    "L'anarchie est ce que les États en font",
                    "L'homme est un loup pour l'homme",
                    "La fin justifies les moyens"
                  ],
                  correctAnswer: 1,
                  explanation: "Alexander Wendt résume le constructivisme par 'Anarchy is what states make of it'."
                },
                {
                  id: 'q2-3',
                  question: "Comment le constructivisme appréhende-t-il les identités et intérêts des États ?",
                  choices: [
                    "Comme des données fixes imposées par la géographie",
                    "Comme des constructions sociales évolutives façonnées par les interactions et normes",
                    "Comme de simples produits du calcul économique individuel",
                    "Comme des éléments totalement secondaires sans impact réel"
                  ],
                  correctAnswer: 1,
                  explanation: "Les constructivistes montrent que les identités et intérêts sont façonnés par les règles et valeurs partagées."
                }
              ]
            }
          },
          {
            id: 'sess-3',
            moduleId: 'mod-1',
            moduleTitle: 'Théories et doctrines des relations internationales',
            title: 'Les Théories Critiques et l\'Analyse des Politiques Étrangères',
            date: '2026-08-13',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_RI101_Jour3_TheoriesCritiques.pdf',
            pdfTextSnippet: 'Examen des théories néo-marxistes, de la théorie de la dépendance et du féminisme dans les relations internationales...',
            isQuizReady: false,
            status: 'pending'
          }
        ]
      },
      {
        id: 'mod-2',
        code: 'RI-102',
        title: 'Droit International Public et Organisations',
        description: 'Étude des traités, de la coutume internationale, du rôle de l ONU et des juridictions internationales.',
        sessions: [
          {
            id: 'sess-4',
            moduleId: 'mod-2',
            moduleTitle: 'Droit International Public et Organisations',
            title: 'Les Sources du Droit International et la Charte des Nations Unies',
            date: '2026-08-14',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_RI102_Jour4_DroitInt.pdf',
            pdfTextSnippet: 'L article 38 du Statut de la CIJ énumère les sources du droit international : conventions, coutumes, principes généraux du droit...',
            isQuizReady: false,
            status: 'pending'
          }
        ]
      }
    ];

    this.submissions = [];
  }

  private addSeedSubmission(
    student: User,
    session: Session,
    answers: number[],
    submittedAtIso: string,
    index: number
  ) {
    if (!session.quiz) return;

    const correctAnswers = session.quiz.questions.map(q => q.correctAnswer);
    const subDate = new Date(submittedAtIso);

    const scoreRes = calculateBonusMalusScore(
      answers,
      correctAnswers,
      session.date,
      session.endTime,
      subDate
    );

    const submission: Submission = {
      id: `sub-${index}`,
      sessionId: session.id,
      sessionTitle: session.title,
      moduleTitle: session.moduleTitle,
      sessionDate: session.date,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      submittedAt: submittedAtIso,
      answers,
      baseScore: scoreRes.baseScore,
      adjustment: scoreRes.adjustment,
      finalScore: scoreRes.finalScore,
      isValidated: scoreRes.isValidated,
      isLate: scoreRes.isLate,
      lateDays: scoreRes.lateDays
    };

    this.submissions.push(submission);
  }

  // --- CRUD METHODS ---

  public getUsers(): User[] {
    return this.users;
  }

  public getUserByEmail(email: string): User | undefined {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  public registerStudent(name: string, email: string, customId?: string): User {
    const existing = this.getUserByEmail(email);
    if (existing) {
      if (customId && existing.id !== customId) {
        existing.id = customId;
      }
      this.saveToLocalFile();
      return existing;
    }
    const newUser: User = {
      id: customId || `u-stud-${Date.now()}`,
      email,
      name,
      role: 'student',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
    };
    this.users.push(newUser);
    this.saveToLocalFile();

    const supabase = getSupabaseServer();
    if (supabase) {
      supabase.from('profiles').upsert({
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.name,
        role: newUser.role,
        avatar: newUser.avatar
      }).then(({ error }) => {
        if (error) console.error('Erreur Supabase profile upsert :', error.message);
      });
    }

    return newUser;
  }

  public getModules(): Module[] {
    return this.modules;
  }

  public getModuleById(id: string): Module | undefined {
    return this.modules.find(m => m.id === id);
  }

  public getSessionById(sessionId: string): { session: Session; module: Module } | undefined {
    for (const mod of this.modules) {
      const sess = mod.sessions.find(s => s.id === sessionId);
      if (sess) {
        return { session: sess, module: mod };
      }
    }
    return undefined;
  }

  public createModule(code: string, title: string, description: string): Module {
    const newModule: Module = {
      id: `mod-${Date.now()}`,
      code: code || `MOD-${100 + this.modules.length + 1}`,
      title,
      description,
      sessions: []
    };
    this.modules.push(newModule);
    this.saveToLocalFile();

    const supabase = getSupabaseServer();
    if (supabase) {
      supabase.from('modules').insert({
        id: newModule.id,
        code: newModule.code,
        title: newModule.title,
        description: newModule.description
      }).then(({ error }) => {
        if (error) console.error('Erreur Supabase createModule :', error.message);
      });
    }

    return newModule;
  }

  public createSession(
    moduleId: string,
    title: string,
    date: string,
    startTime: string = "15:00",
    endTime: string = "16:00",
    pdfFileName?: string,
    pdfTextSnippet?: string
  ): Session {
    const mod = this.getModuleById(moduleId);
    if (!mod) {
      throw new Error(`Module ${moduleId} non trouvé.`);
    }

    const newSession: Session = {
      id: `sess-${Date.now()}`,
      moduleId,
      moduleTitle: mod.title,
      title,
      date,
      startTime,
      endTime,
      pdfFileName,
      pdfTextSnippet,
      isQuizReady: false,
      status: 'pending'
    };

    mod.sessions.push(newSession);
    this.saveToLocalFile();

    const supabase = getSupabaseServer();
    if (supabase) {
      supabase.from('sessions').insert({
        id: newSession.id,
        module_id: moduleId,
        module_title: mod.title,
        title: newSession.title,
        date: newSession.date,
        start_time: newSession.startTime,
        end_time: newSession.endTime,
        pdf_file_name: newSession.pdfFileName,
        pdf_text_snippet: newSession.pdfTextSnippet,
        is_quiz_ready: newSession.isQuizReady,
        status: newSession.status
      }).then(({ error }) => {
        if (error) console.error('Erreur Supabase createSession :', error.message);
      });
    }

    return newSession;
  }

  public setSessionQuiz(sessionId: string, quiz: Quiz) {
    const found = this.getSessionById(sessionId);
    if (!found) throw new Error("Session non trouvée.");
    found.session.quiz = quiz;
    found.session.isQuizReady = true;
    found.session.status = 'ready';
    this.saveToLocalFile();

    const supabase = getSupabaseServer();
    if (supabase) {
      supabase.from('sessions').update({
        quiz,
        is_quiz_ready: true,
        status: 'ready'
      }).eq('id', sessionId).then(({ error }) => {
        if (error) console.error('Erreur Supabase setSessionQuiz :', error.message);
      });
    }
  }

  public updateSessionStatus(sessionId: string, status: 'pending' | 'generating' | 'ready' | 'error') {
    const found = this.getSessionById(sessionId);
    if (found) {
      found.session.status = status;
      this.saveToLocalFile();
      const supabase = getSupabaseServer();
      if (supabase) {
        supabase.from('sessions').update({ status }).eq('id', sessionId).then(({ error }) => {
          if (error) console.error('Erreur Supabase updateSessionStatus :', error.message);
        });
      }
    }
  }

  public submitQuiz(
    sessionId: string,
    studentId: string,
    answers: number[]
  ): Submission {
    const student = this.getUserById(studentId);
    if (!student) throw new Error("Étudiant non trouvé.");

    const sessObj = this.getSessionById(sessionId);
    if (!sessObj || !sessObj.session.quiz) {
      throw new Error("Quiz ou session invalide.");
    }

    const session = sessObj.session;

    // Check if student already submitted for this session by ID or Email
    const existing = this.submissions.find(
      s => s.sessionId === sessionId && (s.studentId === student.id || s.studentEmail.toLowerCase() === student.email.toLowerCase())
    );
    if (existing) {
      return existing;
    }

    const correctAnswers = session.quiz.questions.map(q => {
      if (typeof q.correctAnswer === 'number') return q.correctAnswer;
      if (typeof (q as any).correctOptionIndex === 'number') return (q as any).correctOptionIndex;
      return 0;
    });
    const now = new Date();

    const scoreRes = calculateBonusMalusScore(
      answers,
      correctAnswers,
      session.date,
      session.endTime,
      now
    );

    const newSub: Submission = {
      id: `sub-${Date.now()}`,
      sessionId: session.id,
      sessionTitle: session.title,
      moduleTitle: session.moduleTitle,
      sessionDate: session.date,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      submittedAt: now.toISOString(),
      answers,
      baseScore: scoreRes.baseScore,
      adjustment: scoreRes.adjustment,
      finalScore: scoreRes.finalScore,
      isValidated: scoreRes.isValidated,
      isLate: scoreRes.isLate,
      lateDays: scoreRes.lateDays
    };

    this.submissions.push(newSub);
    this.saveToLocalFile();

    const supabase = getSupabaseServer();
    if (supabase) {
      supabase.from('submissions').insert({
        id: newSub.id,
        session_id: newSub.sessionId,
        student_id: newSub.studentId,
        student_name: newSub.studentName,
        student_email: newSub.studentEmail,
        answers: newSub.answers,
        base_score: newSub.baseScore,
        adjustment: newSub.adjustment,
        final_score: newSub.finalScore,
        is_validated: newSub.isValidated,
        is_late: newSub.isLate,
        late_days: newSub.lateDays,
        submitted_at: newSub.submittedAt
      }).then(({ error }) => {
        if (error) console.error('Erreur Supabase submitQuiz :', error.message);
      });
    }

    return newSub;
  }

  public getSubmissionsForStudent(studentId: string): Submission[] {
    const student = this.getUserById(studentId);
    if (!student) {
      return this.submissions.filter(s => s.studentId === studentId);
    }
    return this.submissions
      .filter(s => s.studentId === student.id || s.studentEmail.toLowerCase() === student.email.toLowerCase())
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  }

  public getSubmissionsForSession(sessionId: string): Submission[] {
    return this.submissions.filter(s => s.sessionId === sessionId);
  }

  // --- ADMIN ANALYTICS CALCULATOR ---

  public getAdminAnalytics(): AdminAnalytics {
    const students = this.users.filter(u => u.role === 'student');
    const totalStudents = students.length;

    let totalSessions = 0;
    this.modules.forEach(m => {
      totalSessions += m.sessions.length;
    });

    const totalSubmissions = this.submissions.length;

    const globalAvgScore = totalSubmissions > 0
      ? Number((this.submissions.reduce((acc, s) => acc + s.finalScore, 0) / totalSubmissions).toFixed(2))
      : 0;

    const validatedCount = this.submissions.filter(s => s.isValidated).length;
    const globalPassRate = totalSubmissions > 0
      ? Number(((validatedCount / totalSubmissions) * 100).toFixed(1))
      : 0;

    const onTimeCount = this.submissions.filter(s => !s.isLate).length;
    const onTimePercentage = totalSubmissions > 0
      ? Number(((onTimeCount / totalSubmissions) * 100).toFixed(1))
      : 100;

    // 1. Module Statistics
    const moduleStats: ModuleStat[] = this.modules.map(mod => {
      const sessionIds = mod.sessions.map(s => s.id);
      const modSubmissions = this.submissions.filter(s => sessionIds.includes(s.sessionId));
      const subCount = modSubmissions.length;
      const avgScore = subCount > 0
        ? Number((modSubmissions.reduce((acc, s) => acc + s.finalScore, 0) / subCount).toFixed(2))
        : 0;
      const validSubCount = modSubmissions.filter(s => s.isValidated).length;
      const passRate = subCount > 0
        ? Number(((validSubCount / subCount) * 100).toFixed(1))
        : 0;

      return {
        moduleId: mod.id,
        code: mod.code,
        title: mod.title,
        totalSessions: mod.sessions.length,
        totalSubmissions: subCount,
        averageScore: avgScore,
        passRate
      };
    });

    // 2. Daily Score Trends (Temporal Evolution graph data)
    // Group submissions by session Date or submission day
    const dailyMap = new Map<string, { scores: number[]; validated: number }>();
    
    // Ensure all program days 11 Aug to 25 Aug 2026 have entries
    for (let day = 11; day <= 25; day++) {
      if (day === 22) continue; // skip Saturday 22 Aug
      const dateStr = `2026-08-${day < 10 ? '0' + day : day}`;
      dailyMap.set(dateStr, { scores: [], validated: 0 });
    }

    this.submissions.forEach(sub => {
      const dayKey = sub.sessionDate; // group by session date
      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, { scores: [], validated: 0 });
      }
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
        return {
          date: `${d}/${m}`,
          fullDate,
          avgScore: avg,
          passRate: pr,
          totalSubmissions: count
        };
      })
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

    // 3. Individual Student Progress Roster
    const studentProgressList: StudentProgress[] = students.map(student => {
      const history = this.getSubmissionsForStudent(student.id);
      const totalQuizzes = history.length;
      const validatedModulesCount = history.filter(h => h.isValidated).length;
      const avgScore = totalQuizzes > 0
        ? Number((history.reduce((acc, h) => acc + h.finalScore, 0) / totalQuizzes).toFixed(2))
        : 0;
      const baseAvg = totalQuizzes > 0
        ? Number((history.reduce((acc, h) => acc + h.baseScore, 0) / totalQuizzes).toFixed(2))
        : 0;

      const lateCount = history.filter(h => h.isLate).length;
      const onTimeCount = history.filter(h => !h.isLate).length;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (history.length >= 2) {
        const lastScore = history[history.length - 1].finalScore;
        const prevAvg = history.slice(0, -1).reduce((acc, h) => acc + h.finalScore, 0) / (history.length - 1);
        if (lastScore > prevAvg + 0.5) trend = 'up';
        else if (lastScore < prevAvg - 0.5) trend = 'down';
      }

      return {
        studentId: student.id,
        name: student.name,
        email: student.email,
        totalQuizzes,
        validatedModulesCount,
        averageScore: avgScore,
        baseAverageScore: baseAvg,
        lateCount,
        onTimeCount,
        trend,
        history
      };
    }).sort((a, b) => b.averageScore - a.averageScore); // Leaderboard sorted by avg score desc

    // 4. Frequent Late Submitters List
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

  public deleteModule(moduleId: string) {
    const modIndex = this.modules.findIndex(m => m.id === moduleId);
    if (modIndex === -1) {
      throw new Error("Module introuvable.");
    }
    const mod = this.modules[modIndex];
    const sessionIds = mod.sessions.map(s => s.id);
    
    // Remove submissions for these sessions
    this.submissions = this.submissions.filter(sub => !sessionIds.includes(sub.sessionId));

    // Remove module
    this.modules.splice(modIndex, 1);
    this.saveToLocalFile();

    const supabase = getSupabaseServer();
    if (supabase) {
      supabase.from('sessions').delete().eq('module_id', moduleId).then(() => {
        supabase.from('modules').delete().eq('id', moduleId).then(({ error }) => {
          if (error) console.error('Erreur Supabase deleteModule :', error.message);
        });
      });
    }
  }

  public deleteSession(sessionId: string) {
    let found = false;
    for (const mod of this.modules) {
      const idx = mod.sessions.findIndex(s => s.id === sessionId);
      if (idx !== -1) {
        mod.sessions.splice(idx, 1);
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error("Session introuvable.");
    }

    // Remove submissions for this session
    this.submissions = this.submissions.filter(sub => sub.sessionId !== sessionId);
    this.saveToLocalFile();

    const supabase = getSupabaseServer();
    if (supabase) {
      supabase.from('sessions').delete().eq('id', sessionId).then(({ error }) => {
        if (error) console.error('Erreur Supabase deleteSession :', error.message);
      });
    }
  }

  public async resetAllData() {
    this.modules = [];
    this.submissions = [];
    // Keep admin user only
    this.users = [
      {
        id: 'u-admin',
        email: 'admin@teamdiplome.com',
        name: 'Prof. Alexandre Vance',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
      }
    ];
    this.saveToLocalFile();

    const supabase = getSupabaseServer();
    if (supabase) {
      try {
        await supabase.from('submissions').delete().neq('id', '0');
        await supabase.from('sessions').delete().neq('id', '0');
        await supabase.from('modules').delete().neq('id', '0');
        await supabase.from('profiles').delete().neq('role', 'admin');
      } catch (err) {
        console.warn('Erreur lors du nettoyage de Supabase :', err);
      }
    }
  }
}

export const db = new DatabaseStore();

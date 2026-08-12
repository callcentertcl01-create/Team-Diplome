import { User, Module, Session, Quiz, Submission, AdminAnalytics, StudentProgress, ModuleStat, DailyScoreTrend } from '../src/types';
import { calculateBonusMalusScore } from './scoreUtils';

// In-Memory Database Store
class DatabaseStore {
  private users: User[] = [];
  private modules: Module[] = [];
  private submissions: Submission[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Users
    this.users = [
      {
        id: 'u-admin',
        email: 'admin@teamdiplome.com',
        name: 'Prof. Alexandre Vance',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
      },
      {
        id: 'u-stud-1',
        email: 'marie.dubois@teamdiplome.com',
        name: 'Marie Dubois',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200'
      },
      {
        id: 'u-stud-2',
        email: 'jean.koffi@teamdiplome.com',
        name: 'Jean-Baptiste Koffi',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
      },
      {
        id: 'u-stud-3',
        email: 'sophie.martin@teamdiplome.com',
        name: 'Sophie Martin',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
      },
      {
        id: 'u-stud-4',
        email: 'lucas.moreau@teamdiplome.com',
        name: 'Lucas Moreau',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
      },
      {
        id: 'u-stud-5',
        email: 'amina.diallo@teamdiplome.com',
        name: 'Amina Diallo',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=200'
      },
      {
        id: 'u-stud-6',
        email: 'thomas.bernard@teamdiplome.com',
        name: 'Thomas Bernard',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'
      }
    ];

    // Helper to generate a 10 QCM sample quiz
    const createSampleQuiz = (id: string, title: string, theme: string): Quiz => ({
      id,
      title,
      questions: [
        {
          id: `${id}-q1`,
          question: `Qu'est-ce que l'élément d'extranéité dans le domaine de ${theme} ?`,
          choices: [
            "La présence d'un élément étranger reliant la situation juridique à un autre État",
            "L'interdiction absolue de traiter avec des entreprises étrangères",
            "Une clause d'exonération fiscale réservée aux diplomates",
            "Un différend territorial jugé exclusivement par le Conseil de Sécurité"
          ],
          correctAnswer: 0,
          explanation: "L'élément d'extranéité est l'élément de fait ou de droit qui met en relation une situation juridique avec un ordre juridique étranger."
        },
        {
          id: `${id}-q2`,
          question: `Quel principe régit la souveraineté absolue des États selon la Charte des Nations Unies ?`,
          choices: [
            "Le principe de suprématie monétaire",
            "L'égalité souveraine des États et la non-ingérence dans les affaires intérieures",
            "La libre circulation sans contrôle douanier",
            "L'obligation de soumission aux décrets multilatéraux"
          ],
          correctAnswer: 1,
          explanation: "Article 2§1 de la Charte de l'ONU : L'Organisation est fondée sur le principe de l'égalité souveraine de tous ses Membres."
        },
        {
          id: `${id}-q3`,
          question: `Selon la théorie réaliste des Relations Internationales, quel est l'acteur principal du système ?`,
          choices: [
            "Les organisations non gouvernementales (ONG)",
            "L'État-nation agissant dans un système anarchique",
            "Les firmes multinationales",
            "Les instances religieuses supranationales"
          ],
          correctAnswer: 1,
          explanation: "Le réalisme (Morgenthau, Waltz) considère l'État souverain comme l'unité centrale guidée par la quête d'intérêt national et de puissance."
        },
        {
          id: `${id}-q4`,
          question: `Quelle est la définition juridique d'un marché public ?`,
          choices: [
            "Un contrat conclu à titre onéreux entre un acheteur public et un opérateur économique",
            "Une décision unilatérale prise par le préfet",
            "Un accord de partenariat informel entre deux communes",
            "Un bail commercial privé conclu sans mise en concurrence"
          ],
          correctAnswer: 0,
          explanation: "Le marché public est un contrat à titre onéreux répondant aux besoins de l'acheteur public en matière de travaux, fournitures ou services."
        },
        {
          id: `${id}-q5`,
          question: `En droit fiscal douanier, qu'appelle-t-on la valeur en douane à l'importation ?`,
          choices: [
            "Le prix de revente final sur le marché local",
            "La valeur transactionnelle ajustée des frais de transport et d'assurance (prix CIF)",
            "Le coût de fabrication net en usine",
            "Une taxe forfaitaire fixe attribuée par la douane"
          ],
          correctAnswer: 1,
          explanation: "La valeur en douane se base principalement sur la valeur transactionnelle (cout, assurance, fret jusqu'à la frontière d'entrée)."
        },
        {
          id: `${id}-q6`,
          question: `Quel auteur est associé au concept de 'Dilemme de sécurité' en Relations Internationales ?`,
          choices: [
            "John H. Herz",
            "Adam Smith",
            "René Cassin",
            "Hugo Grotius"
          ],
          correctAnswer: 0,
          explanation: "John Herz a formalisé le dilemme de sécurité en 1951, expliquant comment la quête de sécurité d'un État accroît l'insécurité des autres."
        },
        {
          id: `${id}-q7`,
          question: `Quelle condition est indispensable pour engager la responsabilité contractuelle de l'Administration ?`,
          choices: [
            "Une faute lourde ou un préjudice direct et certain",
            "Une grève générale des agents territoriaux",
            "Un avis défavorable du Conseil économique et social",
            "Une baisse du chiffre d'affaires du sous-traitant"
          ],
          correctAnswer: 0,
          explanation: "La responsabilité contractuelle administrative exige un manquement contractuel et un préjudice direct et certain."
        },
        {
          id: `${id}-q8`,
          question: `Dans le cadre de la GRH publique, que garantit le principe du statut général des fonctionnaires ?`,
          choices: [
            "La séparation du grade et de l'emploi",
            "L'attribution automatique d'un logement de fonction",
            "L'interdiction de tout syndicat dans l'administration",
            "L'exemption totale d'impôt sur le revenu"
          ],
          correctAnswer: 0,
          explanation: "Le principe fondamental du statut de la fonction publique garantit la séparation du grade (titre) et de l'emploi (poste occupé)."
        },
        {
          id: `${id}-q9`,
          question: `Qu'est-ce que le Traité de Westphalie (1648) a instauré dans l'ordre international ?`,
          choices: [
            "Le système westphalien fondé sur la souveraineté territoriale des États",
            "La création du Fonds Monétaire International",
            "Le contrôle des armements nucléaires",
            "La cour permanente de justice internationale"
          ],
          correctAnswer: 0,
          explanation: "Les traités de Westphalie ont consacré l'État souverain territorial comme fondement des relations internationales modernes."
        },
        {
          id: `${id}-q10`,
          question: `Quelle est la règle de décision principale du Conseil de Sécurité de l'ONU pour les questions non procédurales ?`,
          choices: [
            "Majorité simple des 193 membres de l'Assemblée Générale",
            "Vote affirmatif de 9 membres dont le droit de veto des 5 membres permanents",
            "Unanimité absolue des 15 membres sans possibilité d'abstention",
            "Consensus obligatoire des 27 membres de l'Union Européenne"
          ],
          correctAnswer: 1,
          explanation: "Article 27§3 de la Charte : les décisions requièrent 9 voix affirmatives incluant le vote concordant des 5 membres permanents (P5)."
        }
      ]
    });

    // 2. Modules & Sessions (Timeline Aug 11 - Aug 25 2026)
    this.modules = [
      {
        id: 'mod-1',
        code: 'MOD-101',
        title: 'Théorie & Doctrines des Relations Internationales',
        description: 'Analyse des paradigmes réaliste, libéral, constructiviste et étude des concepts clés d extranéité et de souveraineté.',
        sessions: [
          {
            id: 'sess-101-1',
            moduleId: 'mod-1',
            moduleTitle: 'Théorie & Doctrines des RI',
            title: 'Jour 1 - Courants Réalistes et Libéraux',
            date: '2026-08-12',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_RI_Module1_Jour1.pdf',
            pdfTextSnippet: 'Le réalisme considère les États comme des acteurs rationnels dans un système anarchique. Morgenthau formalise l intérêt national en termes de puissance.',
            quiz: createSampleQuiz('q-101-1', 'Quiz - Doctrines des RI (Jour 1)', 'Théorie des RI'),
            isQuizReady: true,
            status: 'ready'
          },
          {
            id: 'sess-101-2',
            moduleId: 'mod-1',
            moduleTitle: 'Théorie & Doctrines des RI',
            title: 'Jour 2 - Extranéité & Souveraineté des États',
            date: '2026-08-13',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_RI_Module1_Jour2.pdf',
            pdfTextSnippet: 'L extranéité caractérise toute situation juridique comportant un élément rattaché à un État étranger. La souveraineté en est le pilier.',
            quiz: createSampleQuiz('q-101-2', 'Quiz - Extranéité & Souveraineté (Jour 2)', 'Relations Internationales'),
            isQuizReady: true,
            status: 'ready'
          }
        ]
      },
      {
        id: 'mod-2',
        code: 'MOD-102',
        title: 'Législation Fiscale & Douanière',
        description: 'Régimes douaniers, valeur transactionnelle, TVA à l importation et contentieux fiscal international.',
        sessions: [
          {
            id: 'sess-102-1',
            moduleId: 'mod-2',
            moduleTitle: 'Législation Fiscale & Douanière',
            title: 'Jour 1 - Tarifs Douaniers & Valeur en Douane',
            date: '2026-08-14',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_Fiscalite_Module2_Jour1.pdf',
            pdfTextSnippet: 'La valeur en douane des marchandises importées est la valeur transactionnelle, c est-à-dire le prix effectivement payé.',
            quiz: createSampleQuiz('q-102-1', 'Quiz - Tarifs Douaniers & Fiscalité', 'Droit Fiscal'),
            isQuizReady: true,
            status: 'ready'
          },
          {
            id: 'sess-102-2',
            moduleId: 'mod-2',
            moduleTitle: 'Législation Fiscale & Douanière',
            title: 'Jour 2 - Procédures de Dédouanement',
            date: '2026-08-15',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_Fiscalite_Module2_Jour2.pdf',
            pdfTextSnippet: 'Le dédouanement informatisé permet l émission du Bon à Enlever. Les infractions douanières relèvent du code des douanes.',
            quiz: createSampleQuiz('q-102-2', 'Quiz - Procédures & Contentieux Douanier', 'Fiscalité Douanière'),
            isQuizReady: true,
            status: 'ready'
          }
        ]
      },
      {
        id: 'mod-3',
        code: 'MOD-103',
        title: 'Contrats Administratifs, Marchés Publics & GRH',
        description: 'Droit administratif des contrats, principes de mise en concurrence et gestion statutaire du personnel public.',
        sessions: [
          {
            id: 'sess-103-1',
            moduleId: 'mod-3',
            moduleTitle: 'Contrats Administratifs & GRH',
            title: 'Jour 1 - Passation des Marchés Publics',
            date: '2026-08-16',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_DroitAdmin_Module3_Jour1.pdf',
            pdfTextSnippet: 'Les marchés publics respectent la liberté d accès, l égalité de traitement des candidats et la transparence des procédures.',
            quiz: createSampleQuiz('q-103-1', 'Quiz - Marchés Publics & Commande Publique', 'Droit Administratif'),
            isQuizReady: true,
            status: 'ready'
          },
          {
            id: 'sess-103-2',
            moduleId: 'mod-3',
            moduleTitle: 'Contrats Administratifs & GRH',
            title: 'Jour 2 - Gestion des Ressources Humaines publiques',
            date: '2026-08-17',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_GRH_Module3_Jour2.pdf',
            pdfTextSnippet: 'Le statut général de la fonction publique protège le fonctionnaire contre les pressions politiques et garantit sa carrière.',
            quiz: createSampleQuiz('q-103-2', 'Quiz - GRH et Statut de la Fonction Publique', 'GRH Publique'),
            isQuizReady: true,
            status: 'ready'
          }
        ]
      },
      {
        id: 'mod-4',
        code: 'MOD-104',
        title: 'Géopolitique & Diplomatie Contemporaine',
        description: 'Organisations régionales, diplomatie multilatérale, droit de la mer et règlement pacifique des différends.',
        sessions: [
          {
            id: 'sess-104-1',
            moduleId: 'mod-4',
            moduleTitle: 'Géopolitique & Diplomatie',
            title: 'Jour 1 - Organisations Régionales & Gouvernance',
            date: '2026-08-18',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_Geopolitique_Module4_Jour1.pdf',
            pdfTextSnippet: 'Les organisations régionales complètent l action de l ONU. L Union Africaine et l Union Européenne constituent des modèles d intégration.',
            quiz: createSampleQuiz('q-104-1', 'Quiz - Organisations & Multilatéralisme', 'Géopolitique'),
            isQuizReady: true,
            status: 'ready'
          },
          {
            id: 'sess-104-2',
            moduleId: 'mod-4',
            moduleTitle: 'Géopolitique & Diplomatie',
            title: 'Jour 2 - Arbitrage & Règlement des Différends',
            date: '2026-08-19',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_Diplomatie_Module4_Jour2.pdf',
            pdfTextSnippet: 'L article 33 de la Charte des Nations Unies énumère les modes de règlement pacifique : négociation, enquête, médiation, conciliation, arbitrage.',
            quiz: createSampleQuiz('q-104-2', 'Quiz - Différends & Arbitrage International', 'Diplomatie'),
            isQuizReady: true,
            status: 'ready'
          }
        ]
      },
      {
        id: 'mod-5',
        code: 'MOD-105',
        title: 'Finances Publiques & Économie Internationale',
        description: 'Élaboration du budget, lois de finances, système de Bretton Woods et dette souveraine.',
        sessions: [
          {
            id: 'sess-105-1',
            moduleId: 'mod-5',
            moduleTitle: 'Finances Publiques & Économie',
            title: 'Jour 1 - Lois de Finances & Principes Budgétaires',
            date: '2026-08-20',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_Finances_Module5_Jour1.pdf',
            pdfTextSnippet: 'Les grands principes budgétaires sont l unité, l universalité, l annuité, la spécialité et la sincérité budgétaire.',
            quiz: createSampleQuiz('q-105-1', 'Quiz - Principes Budgétaires & Lois de Finances', 'Finances Publiques'),
            isQuizReady: true,
            status: 'ready'
          },
          {
            id: 'sess-105-2',
            moduleId: 'mod-5',
            moduleTitle: 'Finances Publiques & Économie',
            title: 'Jour 2 - FMI, Banque Mondiale & Stabilisation',
            date: '2026-08-21',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_Economie_Module5_Jour2.pdf',
            pdfTextSnippet: 'Le FMI veille à la stabilité du système monétaire international tandis que la Banque Mondiale finance les projets de développement à long terme.',
            quiz: createSampleQuiz('q-105-2', 'Quiz - Institutions Financières Internationales', 'Économie Internationale'),
            isQuizReady: true,
            status: 'ready'
          }
        ]
      },
      {
        id: 'mod-6',
        code: 'MOD-106',
        title: 'Grandes Synthèses & Oral de Diplôme',
        description: 'Cas pratiques transversaux, préparation aux épreuves orales et examen d assimilation générale.',
        sessions: [
          {
            id: 'sess-106-1',
            moduleId: 'mod-6',
            moduleTitle: 'Grandes Synthèses & Oral',
            title: 'Jour 1 - Cas Pratiques Transversaux',
            date: '2026-08-23',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_Synthese_Module6_Jour1.pdf',
            pdfTextSnippet: 'L examen oral évalue la maîtrise synthétique du droit public, des RI et des finances.',
            quiz: createSampleQuiz('q-106-1', 'Quiz - Synthèse Globale RI & Droit', 'Synthèse Générale'),
            isQuizReady: true,
            status: 'ready'
          },
          {
            id: 'sess-106-2',
            moduleId: 'mod-6',
            moduleTitle: 'Grandes Synthèses & Oral',
            title: 'Jour 2 - Examen Blanc Final',
            date: '2026-08-24',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_ExamenBlanc_Module6_Jour2.pdf',
            pdfTextSnippet: 'Test général de validation.',
            quiz: createSampleQuiz('q-106-2', 'Quiz - Examen Blanc Officiel', 'Examen Blanc'),
            isQuizReady: true,
            status: 'ready'
          },
          {
            id: 'sess-106-3',
            moduleId: 'mod-6',
            moduleTitle: 'Grandes Synthèses & Oral',
            title: 'Jour 3 - Clôture du Programme',
            date: '2026-08-25',
            startTime: '15:00',
            endTime: '16:00',
            pdfFileName: 'Cours_Cloture_Module6_Jour3.pdf',
            pdfTextSnippet: 'Évaluation finale du diplôme Team Diplôme.',
            quiz: createSampleQuiz('q-106-3', 'Quiz de Clôture Générale', 'Clôture Diplôme'),
            isQuizReady: true,
            status: 'ready'
          }
        ]
      }
    ];

    // 3. Seed student submissions for past days (e.g. 12/08/2026, 13/08/2026) to make Admin Analytics super rich!
    // -> RESET TO ZERO AS REQUESTED: No submissions seeded.
    /*
    const students = this.users.filter(u => u.role === 'student');
    const pastSessions = [
      { sess: this.modules[0].sessions[0], date: '2026-08-12' },
      { sess: this.modules[0].sessions[1], date: '2026-08-13' },
      { sess: this.modules[1].sessions[0], date: '2026-08-14' }
    ];
    ...
    */
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

  public registerStudent(name: string, email: string): User {
    const existing = this.getUserByEmail(email);
    if (existing) {
      return existing;
    }
    const newUser: User = {
      id: `u-stud-${Date.now()}`,
      email,
      name,
      role: 'student',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
    };
    this.users.push(newUser);
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
    return newSession;
  }

  public setSessionQuiz(sessionId: string, quiz: Quiz) {
    const found = this.getSessionById(sessionId);
    if (!found) throw new Error("Session non trouvée.");
    found.session.quiz = quiz;
    found.session.isQuizReady = true;
    found.session.status = 'ready';
  }

  public updateSessionStatus(sessionId: string, status: 'pending' | 'generating' | 'ready' | 'error') {
    const found = this.getSessionById(sessionId);
    if (found) {
      found.session.status = status;
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

    // Check if student already submitted for this session
    const existing = this.submissions.find(
      s => s.sessionId === sessionId && s.studentId === studentId
    );
    if (existing) {
      throw new Error("Vous avez déjà soumis vos réponses pour ce quiz.");
    }

    const correctAnswers = session.quiz.questions.map(q => q.correctAnswer);
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
    return newSub;
  }

  public getSubmissionsForStudent(studentId: string): Submission[] {
    return this.submissions
      .filter(s => s.studentId === studentId)
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
}

export const db = new DatabaseStore();

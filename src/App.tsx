import React, { useState, useEffect } from 'react';
import { User, Module, Session, Submission, AdminAnalytics } from './types';
import { Navbar } from './components/Navbar';
import { StudentPlanning } from './components/StudentPlanning';
import { QuizArena } from './components/QuizArena';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminModuleManagement } from './components/AdminModuleManagement';
import { AdminLoginModal } from './components/AdminLoginModal';
import { SupabaseAuth } from './components/SupabaseAuth';
import { supabase } from './supabaseClient';
import { RefreshCw, AlertCircle } from 'lucide-react';

// ────────────────────────────────────────────────────────────
// Tabs valides par rôle — stricte séparation admin / étudiant
// ────────────────────────────────────────────────────────────
const STUDENT_TABS = ['planning', 'student-dashboard'] as const;
const ADMIN_TABS   = ['admin-dashboard', 'admin-modules'] as const;

type StudentTab = typeof STUDENT_TABS[number];
type AdminTab   = typeof ADMIN_TABS[number];
type AppTab = StudentTab | AdminTab;

function isValidTabForRole(tab: string, role: 'admin' | 'student'): boolean {
  if (role === 'admin')   return (ADMIN_TABS as readonly string[]).includes(tab);
  return (STUDENT_TABS as readonly string[]).includes(tab);
}

function defaultTabForRole(role: 'admin' | 'student'): AppTab {
  return role === 'admin' ? 'admin-dashboard' : 'planning';
}

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<Submission[]>([]);
  const [adminAnalytics, setAdminAnalytics] = useState<AdminAnalytics | null>(null);

  const [activeTab, setActiveTab] = useState<AppTab>('planning');
  const [activeQuizSession, setActiveQuizSession] = useState<Session | null>(null);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ────────────────────────────────────────────────────────────
  // Garder le tab cohérent avec le rôle de l'utilisateur courant
  // ────────────────────────────────────────────────────────────
  const setActiveTabSafe = (tab: string) => {
    if (!currentUser) { setActiveTab(tab as AppTab); return; }
    if (isValidTabForRole(tab, currentUser.role)) {
      setActiveTab(tab as AppTab);
    } else {
      // Rediriger vers le tab par défaut du rôle si accès non autorisé
      setActiveTab(defaultTabForRole(currentUser.role));
    }
  };

  // ────────────────────────────────────────────────────────────
  // Initialiser l'écoute de session Supabase
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
      if (!session) {
        // Déconnexion → réinitialisation complète
        setCurrentUser(null);
        setModules([]);
        setStudentSubmissions([]);
        setAdminAnalytics(null);
        setActiveTab('planning');
        setActiveQuizSession(null);
      }
    });

    const handleOpenAdmin = () => setShowAdminLoginModal(true);
    window.addEventListener('open-admin-login', handleOpenAdmin);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('open-admin-login', handleOpenAdmin);
    };
  }, []);

  // ────────────────────────────────────────────────────────────
  // Charger les données de l'application
  // ────────────────────────────────────────────────────────────
  const fetchData = async (sessionUser?: any) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Modules (tous les utilisateurs connectés)
      const modulesRes = await fetch('/api/modules');
      if (!modulesRes.ok) throw new Error('Impossible de charger les modules.');
      const modulesData = await modulesRes.json();
      setModules(modulesData);

      // 2. Résoudre le profil utilisateur courant
      const authUser = sessionUser || supabaseSession?.user;
      if (authUser) {
        const usersRes = await fetch('/api/users');
        const usersData: User[] = usersRes.ok ? await usersRes.json() : [];
        setUsers(usersData);

        const localUser = usersData.find(u => u.email.toLowerCase() === authUser.email?.toLowerCase());
        if (localUser) {
          setCurrentUser(localUser);
          // Forcer l'onglet par défaut du rôle au premier chargement
          setActiveTab(defaultTabForRole(localUser.role));
        } else {
          const fallbackUser: User = {
            id: authUser.id,
            email: authUser.email!,
            name: authUser.user_metadata?.full_name || authUser.email!,
            role: 'student',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authUser.email!)}`
          };
          setCurrentUser(fallbackUser);
          setActiveTab('planning');
          fetch('/api/auth/register-student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: fallbackUser.name, email: fallbackUser.email, supabaseId: fallbackUser.id })
          }).catch(console.warn);
        }
      }

      // 3. Analytics admin (chargé en background si admin)
      if (currentUser?.role === 'admin') {
        fetch('/api/admin/analytics')
          .then(r => r.json())
          .then(data => setAdminAnalytics(data))
          .catch(() => {});
      }

    } catch (err: any) {
      console.error("Erreur chargement données :", err);
      setError("Impossible de se connecter au serveur. Vérifiez que le backend est démarré.");
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les données quand une session est disponible
  useEffect(() => {
    if (supabaseSession || currentUser?.role === 'admin') {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [supabaseSession]);

  // Charger l'historique étudiant quand currentUser change
  useEffect(() => {
    if (currentUser && currentUser.role === 'student') {
      fetch(`/api/student/${currentUser.id}/history`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setStudentSubmissions(data); })
        .catch(err => console.error("Erreur historique étudiant :", err));
    }
    // Si le rôle a changé (ex: connexion admin après session étudiant), forcer le bon onglet
    if (currentUser) {
      setActiveTab(defaultTabForRole(currentUser.role));
    }
  }, [currentUser]);

  // Recharger les analytics admin quand l'utilisateur est admin
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetch('/api/admin/analytics')
        .then(r => r.json())
        .then(data => setAdminAnalytics(data))
        .catch(() => {});
    }
  }, [currentUser]);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setActiveQuizSession(null);
    setStudentSubmissions([]);
  };

  const handleStartQuiz = (session: Session) => {
    setActiveQuizSession(session);
  };

  const handleQuizSubmitted = async (submission: Submission) => {
    setStudentSubmissions(prev => [...prev, submission]);
    // Rafraîchir les analytics si admin connecté
    if (currentUser?.role === 'admin') {
      try {
        const analyticsRes = await fetch('/api/admin/analytics');
        if (analyticsRes.ok) setAdminAnalytics(await analyticsRes.json());
      } catch {}
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSupabaseSession(null);
    setCurrentUser(null);
    setModules([]);
    setStudentSubmissions([]);
    setAdminAnalytics(null);
    setActiveTab('planning');
    setActiveQuizSession(null);
  };

  // ────────────────────────────────────────────────────────────
  // Rendu conditionnel
  // ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Chargement de Team Diplôme...</h2>
          <p className="text-sm text-slate-500">Connexion à la base de données Supabase en cours</p>
        </div>
      </div>
    );
  }

  // Si pas de session ET pas connecté admin → page de login étudiant
  if (!supabaseSession && currentUser?.role !== 'admin') {
    return (
      <>
        <SupabaseAuth onAuthSuccess={(supabaseUser) => {
          setSupabaseSession({ user: supabaseUser });
          fetchData(supabaseUser);
        }} />
        <AdminLoginModal
          isOpen={showAdminLoginModal}
          onClose={() => setShowAdminLoginModal(false)}
          onLoginSuccess={(adminUser) => {
            setCurrentUser(adminUser);
            setActiveTab('admin-dashboard');
            setShowAdminLoginModal(false);
            fetchData();
          }}
        />
      </>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Rendu principal — interface séparée par rôle
  // ────────────────────────────────────────────────────────────
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">

      {/* Header Navbar */}
      <Navbar
        currentUser={currentUser!}
        users={users}
        onSelectUser={handleSelectUser}
        activeTab={activeTab}
        setActiveTab={setActiveTabSafe}
        onOpenAdminLogin={() => setShowAdminLoginModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium flex items-center gap-2 rounded-r-xl">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            {error}
          </div>
        )}

        {/* ──────────────────────────────────────
            ESPACE ÉTUDIANT
            Seul un étudiant peut voir ces vues
        ────────────────────────────────────── */}
        {!isAdmin && (
          <>
            {/* Quiz Arena — lancé depuis le planning */}
            {activeQuizSession ? (
              <QuizArena
                key={`${currentUser?.id}-${activeQuizSession.id}`}
                session={activeQuizSession}
                currentUser={currentUser}
                onSubmitted={handleQuizSubmitted}
                onCancel={() => setActiveQuizSession(null)}
              />
            ) : (
              <>
                {activeTab === 'planning' && (
                  <StudentPlanning
                    modules={modules}
                    currentUser={currentUser!}
                    studentSubmissions={studentSubmissions}
                    onStartQuiz={handleStartQuiz}
                    onViewSubmissionDetail={(sub) => {
                      for (const m of modules) {
                        const sess = m.sessions.find(s => s.id === sub.sessionId);
                        if (sess) { setActiveQuizSession(sess); break; }
                      }
                    }}
                  />
                )}

                {activeTab === 'student-dashboard' && (
                  <StudentDashboard
                    currentUser={currentUser}
                    submissions={studentSubmissions}
                    onViewSubmissionDetail={(sub) => {
                      for (const m of modules) {
                        const sess = m.sessions.find(s => s.id === sub.sessionId);
                        if (sess) { setActiveQuizSession(sess); break; }
                      }
                    }}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* ──────────────────────────────────────
            ESPACE ADMINISTRATEUR
            Seul un admin peut voir ces vues
        ────────────────────────────────────── */}
        {isAdmin && (
          <>
            {activeTab === 'admin-dashboard' && (
              <AdminDashboard
                analytics={adminAnalytics}
                modules={modules}
                onRefresh={fetchData}
                onOpenModuleManagement={() => setActiveTabSafe('admin-modules')}
              />
            )}

            {activeTab === 'admin-modules' && (
              <AdminModuleManagement
                modules={modules}
                onRefresh={fetchData}
              />
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Team Diplôme – Plateforme de Révision RI &amp; Modules. Tous droits réservés.</p>
          <div className="flex items-center gap-4 text-slate-500">
            <span className="text-xs font-medium bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 text-slate-700">
              Barème : +2 bonus (≤16h00) • -1 malus (&gt;16h00) • Seuil : 6/10
            </span>
          </div>
        </div>
      </footer>

      {/* Admin Login Modal — accessible depuis le login étudiant uniquement */}
      <AdminLoginModal
        isOpen={showAdminLoginModal}
        onClose={() => setShowAdminLoginModal(false)}
        onLoginSuccess={(adminUser) => {
          setCurrentUser(adminUser);
          setActiveTab('admin-dashboard');
          setShowAdminLoginModal(false);
          fetchData();
        }}
      />
    </div>
  );
}

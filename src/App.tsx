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

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null); // Supabase session
  const [modules, setModules] = useState<Module[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<Submission[]>([]);
  const [adminAnalytics, setAdminAnalytics] = useState<AdminAnalytics | null>(null);

  const [activeTab, setActiveTab] = useState<string>('planning');
  const [activeQuizSession, setActiveQuizSession] = useState<Session | null>(null);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const handleOpenAdmin = () => setShowAdminLoginModal(true);
    window.addEventListener('open-admin-login', handleOpenAdmin);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('open-admin-login', handleOpenAdmin);
    };
  }, []);

  // Fetch initial app data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Users
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      setUsers(usersData);

      // Match Supabase session to local user if logged in
      if (session?.user) {
        const localUser = usersData.find((u: User) => u.email.toLowerCase() === session.user.email?.toLowerCase());
        if (localUser) {
          setCurrentUser(localUser);
        } else {
          // Fallback if not perfectly synced yet
          setCurrentUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.full_name || session.user.email!,
            role: 'student',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(session.user.email!)}`
          });
        }
      }

      // 2. Fetch Modules
      const modulesRes = await fetch('/api/modules');
      const modulesData = await modulesRes.json();
      setModules(modulesData);

      // 3. Fetch Admin Analytics
      const analyticsRes = await fetch('/api/admin/analytics');
      const analyticsData = await analyticsRes.json();
      setAdminAnalytics(analyticsData);

    } catch (err: any) {
      console.error("Erreur chargement données :", err);
      setError("Impossible de se connecter au serveur backend Team Diplôme.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [session]);

  // Fetch student submissions whenever currentUser changes
  useEffect(() => {
    if (currentUser && currentUser.role === 'student') {
      fetch(`/api/student/${currentUser.id}/history`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setStudentSubmissions(data);
          }
        })
        .catch(err => console.error("Erreur historique étudiant :", err));
    }
  }, [currentUser]);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setActiveQuizSession(null);
  };

  const handleStartQuiz = (session: Session) => {
    setActiveQuizSession(session);
  };

  const handleQuizSubmitted = async (submission: Submission) => {
    // Refresh student submissions & admin analytics
    setStudentSubmissions(prev => [...prev, submission]);
    const analyticsRes = await fetch('/api/admin/analytics');
    const analyticsData = await analyticsRes.json();
    setAdminAnalytics(analyticsData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-xl bg-white text-slate-900 flex items-center justify-center font-bold border border-slate-200 animate-pulse shadow-sm">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Chargement de Team Diplôme...</h2>
          <p className="text-sm text-slate-500">Initialisation de la plateforme de révision et du serveur de quiz</p>
        </div>
      </div>
    );
  }

  if (!session && currentUser?.role !== 'admin') {
    return (
      <>
        <SupabaseAuth onAuthSuccess={(user) => setSession({ user })} />
        {showAdminLoginModal && (
          <AdminLoginModal
            onClose={() => setShowAdminLoginModal(false)}
            onLoginSuccess={(adminUser) => {
              setCurrentUser(adminUser);
              setActiveTab('admin-dashboard');
              setShowAdminLoginModal(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      
      {/* Header Navbar */}
      <Navbar
        currentUser={currentUser}
        users={users}
        onSelectUser={handleSelectUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdminLogin={() => setShowAdminLoginModal(true)}
        onLogout={async () => {
          await supabase.auth.signOut();
          setSession(null);
          setCurrentUser(null);
        }}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium flex items-center gap-2 rounded-r-xl">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            {error}
          </div>
        )}

        {/* 1. QUIZ ARENA VIEW (Active Quiz taking or correction view) */}
        {activeQuizSession ? (
          <QuizArena
            session={activeQuizSession}
            currentUser={currentUser}
            onSubmitted={handleQuizSubmitted}
            onCancel={() => setActiveQuizSession(null)}
          />
        ) : (
          <>
            {/* 2. STUDENT PLANNING VIEW */}
            {activeTab === 'planning' && (
              <StudentPlanning
                modules={modules}
                currentUser={currentUser}
                studentSubmissions={studentSubmissions}
                onStartQuiz={handleStartQuiz}
                onViewSubmissionDetail={(sub) => {
                  // Find session and display QuizArena in submission view
                  for (const m of modules) {
                    const sess = m.sessions.find(s => s.id === sub.sessionId);
                    if (sess) {
                      setActiveQuizSession(sess);
                      break;
                    }
                  }
                }}
              />
            )}

            {/* 3. STUDENT DASHBOARD VIEW */}
            {activeTab === 'student-dashboard' && (
              <StudentDashboard
                currentUser={currentUser}
                submissions={studentSubmissions}
                onViewSubmissionDetail={(sub) => {
                  for (const m of modules) {
                    const sess = m.sessions.find(s => s.id === sub.sessionId);
                    if (sess) {
                      setActiveQuizSession(sess);
                      break;
                    }
                  }
                }}
              />
            )}

            {/* 4. ADMIN EVOLUTIONARY DASHBOARD VIEW */}
            {activeTab === 'admin-dashboard' && (
              <AdminDashboard
                analytics={adminAnalytics}
                modules={modules}
                onRefresh={fetchData}
                onOpenModuleManagement={() => setActiveTab('admin-modules')}
              />
            )}

            {/* 5. ADMIN MODULE MANAGEMENT VIEW */}
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
          <p>© 2026 Team Diplôme – Plateforme de Révision RI & Modules. Tous droits réservés.</p>
          <div className="flex items-center gap-4 text-slate-500">
            <span className="text-xs font-medium bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 text-slate-700">
              Barème : +2 bonus (≤16h00) • -1 malus (&gt;16h00) • Seuil : 6/10
            </span>
          </div>
        </div>
      </footer>

      {/* Dedicated Admin Login Modal */}
      <AdminLoginModal
        isOpen={showAdminLoginModal}
        onClose={() => setShowAdminLoginModal(false)}
        onLoginSuccess={(adminUser) => {
          setCurrentUser(adminUser);
          setActiveTab('admin-dashboard');
          setShowAdminLoginModal(false);
        }}
      />

    </div>
  );
}

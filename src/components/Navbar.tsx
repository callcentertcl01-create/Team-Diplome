import React from 'react';
import { User } from '../types';
import { Award, BookOpen, LayoutDashboard, ShieldCheck, UserCheck, Sparkles, ChevronDown, LogOut } from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  users: User[];
  onSelectUser: (user: User) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAdminLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenAdminLogin,
  onLogout
}) => {
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);

  return (
    <header className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab(currentUser.role === 'admin' ? 'admin-dashboard' : 'planning')}>
            <div className="w-10 h-10 bg-slate-900 text-white font-extrabold flex items-center justify-center rounded-2xl text-sm tracking-widest shadow-sm">
              TD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight uppercase text-slate-900">
                  TEAM DIPLÔME <span className="font-light text-slate-500">| Quiz RI</span>
                </span>
                <span className="px-2 py-0.5 text-[9px] uppercase tracking-widest font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-full">
                  11–25 AOUT 2026
                </span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider hidden sm:block font-medium">
                Console de Révision & Bilan Pédagogique
              </p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200">
            {currentUser.role === 'admin' ? (
              <>
                {/* ESPACE ADMIN UNIQUEMENT */}
                <button
                  onClick={() => setActiveTab('admin-dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'admin-dashboard'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Tableau de Bord Admin
                </button>
                <button
                  onClick={() => setActiveTab('admin-modules')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'admin-modules'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Modules &amp; Quiz IA
                </button>
              </>
            ) : (
              <>
                {/* ESPACE ÉTUDIANT UNIQUEMENT */}
                <button
                  onClick={() => setActiveTab('planning')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'planning'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Planning &amp; Quiz
                </button>
                <button
                  onClick={() => setActiveTab('student-dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'student-dashboard'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Mes Résultats &amp; Bilan
                </button>
              </>
            )}
          </nav>

          {/* Right User Menu */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-3xl transition-all text-left"
              >
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                />
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5 uppercase">
                    {currentUser.name}
                    {currentUser.role === 'admin' && (
                      <span className="bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded-md font-extrabold">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                    {currentUser.email}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {/* Account Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-3xl shadow-xl z-50 p-2 divide-y divide-slate-100">
                  <div className="px-3 py-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Compte Actif
                    </p>
                    <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mt-1">
                      {currentUser.role === 'admin' ? <ShieldCheck className="w-4 h-4 text-slate-900" /> : <UserCheck className="w-4 h-4 text-emerald-600" />}
                      {currentUser.name}
                    </p>
                  </div>

                  <div className="pt-2 pb-1 space-y-1">
                    {currentUser.role !== 'admin' && (
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenAdminLogin();
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-slate-600 font-bold hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors uppercase tracking-wider"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Connexion Admin
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-red-600 font-bold hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors uppercase tracking-wider"
                    >
                      <LogOut className="w-4 h-4" />
                      Se Déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

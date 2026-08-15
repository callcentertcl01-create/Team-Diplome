import React from 'react';
import { User } from '../types';
import { Award, BookOpen, LayoutDashboard, ShieldCheck, UserCheck, Sparkles, ChevronDown, LogOut } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
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

  const isAdmin = currentUser?.role === 'admin';
  const userName = currentUser?.name || currentUser?.email || 'Utilisateur';
  const userAvatar = currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';

  return (
    <header className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab(isAdmin ? 'admin-dashboard' : 'planning')}>
            <div className="w-8 h-8 bg-slate-900 text-white font-extrabold flex items-center justify-center rounded-xl text-xs tracking-wider shadow-sm">
              TD
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight uppercase text-slate-900">
                  TEAM DIPLÔME <span className="font-light text-slate-400">| Quiz RI</span>
                </span>
                <span className="px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-full">
                  SESSION EN COURS
                </span>
              </div>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider hidden sm:block font-medium leading-none mt-0.5">
                Console de Révision & Bilan Pédagogique
              </p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-50 p-0.5 rounded-xl border border-slate-200">
            {isAdmin ? (
              <>
                <button
                  onClick={() => setActiveTab('admin-dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'admin-dashboard'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Tableau de Bord Admin
                </button>
                <button
                  onClick={() => setActiveTab('admin-modules')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'admin-modules'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Modules & Quiz IA
                </button>
                <button
                  onClick={() => setActiveTab('planning')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'planning'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Vue Planning
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('planning')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'planning'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Planning & Quiz
                </button>
                <button
                  onClick={() => setActiveTab('student-dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wider font-bold transition-all ${
                    activeTab === 'student-dashboard'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Mes Résultats & Bilan
                </button>
              </>
            )}
          </nav>

          {/* Right User Menu */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-2xl transition-all text-left"
              >
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-7 h-7 rounded-full border border-slate-300 object-cover"
                />
                <div className="hidden sm:block">
                  <div className="text-[11px] font-bold text-slate-900 leading-tight flex items-center gap-1 uppercase">
                    {userName}
                    {isAdmin && (
                      <span className="bg-slate-900 text-white text-[8px] px-1 py-0.2 rounded font-extrabold">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 truncate max-w-[110px]">
                    {currentUser?.email || ''}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Account Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-3xl shadow-xl z-50 p-2 divide-y divide-slate-100">
                  <div className="px-3 py-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Compte Actif
                    </p>
                    <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mt-1">
                      {isAdmin ? <ShieldCheck className="w-4 h-4 text-slate-900" /> : <UserCheck className="w-4 h-4 text-emerald-600" />}
                      {userName}
                    </p>
                  </div>

                  <div className="pt-2 pb-1 space-y-1">
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

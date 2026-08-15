import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (adminUser: User) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [email, setEmail] = useState('admin@teamdiplome.com');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Try Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authErr) {
        throw new Error(authErr.message || "Identifiants d'administration incorrects.");
      }

      if (authData?.user) {
        const u = authData.user;
        const adminUser: User = {
          id: u.id,
          email: u.email!,
          name: u.name || u.user_metadata?.full_name || 'Prof. Alexandre Vance (Admin)',
          role: u.role || 'admin',
          avatar: u.avatar || u.user_metadata?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
        };
        onLoginSuccess(adminUser);
        onClose();
        return;
      }
    } catch (err: any) {
      setError(err.message || "Identifiants invalides.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-300 border-l-8 border-l-slate-900 rounded-2xl max-w-md w-full p-8 space-y-6 shadow-md relative overflow-hidden">
        
        <div className="text-center space-y-2 relative z-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            Portail Connexion Admin
          </h2>
          <p className="text-xs text-slate-400">
            Accès sécurisé réservé au responsable pédagogique Team Diplôme
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px] mb-1">Identifiant Email Admin</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-slate-900 font-medium focus:border-slate-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px] mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-slate-900 font-medium focus:border-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-700 text-slate-700 font-bold uppercase tracking-wider rounded-2xl text-xs border border-slate-300"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider rounded-2xl text-xs shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isLoading ? 'Vérification...' : 'Se connecter (Admin)'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="text-[11px] text-center text-slate-400 border-t border-slate-200 pt-4 font-mono">
          Comptes de démonstration pré-configurés. Vous pouvez également basculer de profil dans la barre supérieure.
        </div>
      </div>
    </div>
  );
};

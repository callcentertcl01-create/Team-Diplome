import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../supabaseClient';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, X } from 'lucide-react';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Connexion Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Email ou mot de passe incorrect.');
        }
        throw new Error(authError.message);
      }

      // 2. Vérifier le rôle admin dans la table users
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user!.id)
        .single();

      if (profileError || !userProfile) {
        await supabase.auth.signOut();
        throw new Error('Profil utilisateur introuvable. Contactez l\'administrateur.');
      }

      if (userProfile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Accès refusé. Ce compte n\'a pas les droits administrateur.');
      }

      // 3. Succès — passer le profil admin
      const adminUser: User = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: 'admin',
        avatar: userProfile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userProfile.email)}`
      };

      onLoginSuccess(adminUser);
      onClose();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-8 space-y-6 shadow-2xl relative">

        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 flex items-center justify-center shadow-md">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Portail Administrateur
          </h2>
          <p className="text-xs text-slate-500">
            Accès réservé au responsable pédagogique
          </p>
        </div>

        {/* Erreur */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Administrateur</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@teamdiplome.com"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  Connexion Admin
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-xs text-center text-slate-400 border-t border-slate-100 pt-4">
          Seuls les comptes avec le rôle <strong>admin</strong> dans Supabase peuvent accéder à ce portail.
        </div>
      </div>
    </div>
  );
};

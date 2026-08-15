import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { ShieldCheck, Mail, Lock, ArrowRight, User, CheckCircle } from 'lucide-react';

function translateSupabaseError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (message.includes('Email not confirmed')) return 'Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte mail.';
  if (message.includes('User already registered')) return 'Un compte existe déjà avec cet email. Connectez-vous.';
  if (message.includes('Password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (message.includes('Unable to validate email address')) return 'Adresse email invalide.';
  if (message.includes('Failed to fetch') || message.includes('fetch')) return 'Impossible de se connecter à Supabase. Vérifiez que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont correctement configurés.';
  if (message.includes('Invalid API key')) return 'Clé API Supabase invalide. Vérifiez VITE_SUPABASE_ANON_KEY (doit commencer par eyJ...).';
  if (message.includes('signup is disabled')) return 'Les inscriptions sont désactivées sur ce projet Supabase.';
  if (message.includes('rate limit')) return 'Trop de tentatives. Attendez quelques minutes avant de réessayer.';
  return message;
}

export function SupabaseAuth({ onAuthSuccess }: { onAuthSuccess: (user: any) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isLogin) {
        // --- CONNEXION ---
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Synchroniser le profil backend
        await syncUserWithBackend(data.user);
        onAuthSuccess(data.user);

      } else {
        // --- INSCRIPTION ---
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error('Veuillez renseigner votre prénom et votre nom.');
        }

        const fullName = `${firstName.trim()} ${lastName.trim()}`;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: fullName,
            }
          }
        });

        if (error) throw error;

        // Si l'email doit être confirmé, informer l'utilisateur
        if (data.user && !data.session) {
          setSuccessMessage(
            `✅ Compte créé ! Un email de confirmation a été envoyé à ${email}. Vérifiez votre boîte mail puis connectez-vous.`
          );
          setIsLogin(true);
          setEmail('');
          setPassword('');
          setFirstName('');
          setLastName('');
          return;
        }

        // Connexion immédiate si pas de confirmation d'email requise
        if (data.user && data.session) {
          await syncUserWithBackend(data.user);
          onAuthSuccess(data.user);
        }
      }
    } catch (err: any) {
      setError(translateSupabaseError(err.message || 'Une erreur est survenue.'));
    } finally {
      setLoading(false);
    }
  };

  const syncUserWithBackend = async (supabaseUser: any) => {
    if (!supabaseUser) return;
    const name = supabaseUser.user_metadata?.full_name || supabaseUser.email;
    try {
      await fetch('/api/auth/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: supabaseUser.email, supabaseId: supabaseUser.id }),
      });
    } catch (e) {
      console.warn('Sync backend:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-lg space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Diplôme</h1>
          <p className="text-sm text-slate-500">
            {isLogin ? 'Connectez-vous à votre espace étudiant' : 'Créez votre compte étudiant'}
          </p>
        </div>

        {/* Message de succès */}
        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Prénom</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex : Mutiya"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nom</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex : Emmanuel"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Adresse Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
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
                minLength={6}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
              />
            </div>
            {!isLogin && (
              <p className="text-xs text-slate-400 mt-1">Minimum 6 caractères</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Veuillez patienter...
              </>
            ) : (
              <>
                {isLogin ? 'Se connecter' : 'Créer mon compte'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Liens bas de page */}
        <div className="text-center space-y-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccessMessage(null);
            }}
            className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
          >
            {isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>

          <div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-admin-login'))}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Accès Professeur / Administrateur →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

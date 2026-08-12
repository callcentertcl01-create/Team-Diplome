// Client-side API proxy module
// Routes all authentication and database requests through our backend server
// so NO secret API keys or direct Supabase client calls exist in the browser!

const STORAGE_KEY = 'team_diplome_session';

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredSession(session: any) {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

export const supabase = {
  auth: {
    async getSession() {
      const session = getStoredSession();
      return { data: { session }, error: null };
    },

    onAuthStateChange(_callback: Function) {
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    },

    async signInWithPassword({ email, password }: { email: string; password: any }) {
      try {
        const res = await fetch('/api/auth/supabase-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          return { data: { user: null, session: null }, error: new Error(data.error || 'Erreur de connexion.') };
        }
        setStoredSession(data.session);
        return { data: { user: data.user, session: data.session }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: new Error("Impossible de joindre le serveur.") };
      }
    },

    async signUp({ email, password, options }: { email: string; password: any; options?: any }) {
      try {
        const firstName = options?.data?.first_name || '';
        const lastName = options?.data?.last_name || '';

        const res = await fetch('/api/auth/supabase-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, firstName, lastName })
        });
        const data = await res.json();
        if (!res.ok) {
          return { data: { user: null, session: null }, error: new Error(data.error || "Erreur lors de l'inscription.") };
        }
        setStoredSession(data.session);
        return { data: { user: data.user, session: data.session }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: new Error("Impossible de joindre le serveur.") };
      }
    },

    async signOut() {
      setStoredSession(null);
      return { error: null };
    }
  }
};

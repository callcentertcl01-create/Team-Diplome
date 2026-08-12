import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseServerClient: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient | null {
  if (supabaseServerClient) return supabaseServerClient;

  let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (url.includes('=')) {
    url = url.split('=').pop()?.trim() || '';
  }
  if (key.includes('=')) {
    key = key.split('=').pop()?.trim() || '';
  }

  if (url.startsWith('http') && key && key !== 'placeholder') {
    try {
      supabaseServerClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
      console.log('✅ Client Supabase Backend initialisé avec succès.');
      return supabaseServerClient;
    } catch (err) {
      console.error('❌ Échec initialisation Supabase Backend :', err);
      return null;
    }
  }

  console.warn('⚠️ Backend Supabase non configuré (Mode In-Memory activé pour le serveur).');
  return null;
}

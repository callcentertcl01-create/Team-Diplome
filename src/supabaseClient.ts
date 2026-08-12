import { createClient } from '@supabase/supabase-js';

let rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
let anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Clean up URL in case user copy-pasted "VITE_SUPABASE_URL=https://..." into the value field
if (rawUrl.includes('=')) {
  rawUrl = rawUrl.split('=').pop()?.trim() || '';
}

// Ensure valid HTTP/HTTPS URL
if (!rawUrl.startsWith('http')) {
  console.warn("⚠️ URL Supabase invalide ou manquante. Utilisation d'un espace réservé.");
  rawUrl = 'https://placeholder.supabase.co';
}

if (!anonKey || anonKey === 'placeholder') {
  console.warn("⚠️ Clé Supabase manquante.");
  anonKey = 'placeholder';
}

export const supabase = createClient(rawUrl, anonKey);

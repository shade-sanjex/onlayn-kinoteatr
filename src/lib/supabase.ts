import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Validation ──────────────────────────────────────────────────
if (!supabaseUrl) {
  console.error(
    '❌ VITE_SUPABASE_URL topilmadi!\n' +
    '👉 .env faylida VITE_SUPABASE_URL=https://xxxx.supabase.co bo\'lishi kerak.'
  );
}

if (!supabaseAnonKey) {
  console.error(
    '❌ VITE_SUPABASE_ANON_KEY topilmadi!\n' +
    '👉 .env faylida VITE_SUPABASE_ANON_KEY=eyJhbGci... bo\'lishi kerak.\n' +
    '👉 Supabase Dashboard → Settings → API → "anon public" tugmacha.'
  );
} else if (!supabaseAnonKey.startsWith('eyJ')) {
  console.error(
    '❌ VITE_SUPABASE_ANON_KEY noto\'g\'ri format!\n' +
    '   Hozirgi qiymat: ' + supabaseAnonKey.slice(0, 20) + '...\n' +
    '   To\'g\'ri format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n' +
    '👉 Supabase Dashboard → Project Settings → API → "anon public" kalit.'
  );
}

// ── Client initialization ────────────────────────────────────────
// Falls back to placeholder values so the app loads without crashing,
// but real keys are required for actual functionality.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

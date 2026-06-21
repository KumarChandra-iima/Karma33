// Karma33 is a Vite SPA (no server runtime), so this uses the plain
// @supabase/supabase-js browser client rather than @supabase/ssr - that
// package is for Next.js's cookie-based server/middleware session model,
// which doesn't apply here. supabase-js persists the session in
// localStorage itself and refreshes tokens automatically.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). ' +
    'Cloud sync/auth features will be unavailable; the app still works fully offline via localStorage.'
  );
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

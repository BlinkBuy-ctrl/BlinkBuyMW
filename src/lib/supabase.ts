import { createClient } from '@supabase/supabase-js'

// These values are read from Netlify environment variables at build time.
// If they are missing, we fall back to the hardcoded values below so the
// app still loads (Google OAuth will still work as long as Supabase is configured).
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://atjjsgbhbeuzqrpyrspa.supabase.co"

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ampzZ2JoYmV1enFycHlyc3BhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzY4NjMsImV4cCI6MjA5MjAxMjg2M30.cjn4PJCkZQ31B0DZ5NRz86Pehn9IRTDLghSFnt6jB-A"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

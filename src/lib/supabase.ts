import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn instead of throw — throwing here crashes the entire app on import.
  // The missing-env error will surface naturally as a failed Supabase request.
  console.error(
    '[BlinkBuy] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.\n' +
    'Go to Vercel → Project → Settings → Environment Variables and add both keys.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Single explicit storage key — identical in browser AND PWA/standalone installed mode
    storageKey: 'blinkbuy_auth_token',
    storage: window.localStorage,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
    timeout: 20000,
  },
  global: {
    headers: { 'X-Client-Info': 'blinkbuy-web' },
  },
})

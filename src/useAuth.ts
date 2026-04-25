import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// export interface AuthContextType {
  user: User | null
  profile: any | null
  isLoading: boolean
  setProfile: (profile: any | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
}

export interface RegisterData {
  email: string
  password: string
  name: string
  phone?: string
  whatsapp?: string
  role: 'customer' | 'worker' | 'both'
  location?: string
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function useAuthState(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session — wait for profile fetch before marking loading done
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
      setIsLoading(false)
    })

    // Listen for auth changes.
    // Welcome message + notification are handled by the DB trigger
    // (handle_new_user_welcome on public.profiles) — no frontend action needed
    // for new signups, including Google OAuth redirects.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      setProfile(data)
    } catch (e) {
      console.error('Failed to fetch profile:', e)
      setProfile(null)
    }
  }

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  const register = async (data: RegisterData) => {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { name: data.name, phone: data.phone, role: data.role, location: data.location }
      }
    })
    if (error) throw new Error(error.message)

    // If email confirmation is disabled, a session is returned immediately.
    // Either way, sign in to ensure the user is authenticated.
    if (signUpData.user && !signUpData.session) {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (loginError) throw new Error(loginError.message)
    }

    // ✅ Welcome conversation + message + bell notification are created
    // automatically by the Supabase trigger `on_new_user_welcome` on
    // public.profiles — no frontend insert needed here.
    // This also covers Google OAuth signups (trigger fires on profile insert).
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return { user, profile, isLoading, setProfile, login, register, logout }
}

export function useAuth() {
  return useContext(AuthContext)
}

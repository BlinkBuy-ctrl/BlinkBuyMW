import { useState, useEffect, createContext, useContext, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface AuthContextType {
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

function normalizeProfile(data: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}
  for (const key in data) {
    const camel = key.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase())
    normalized[camel] = data[key]
  }
  if (typeof normalized.totalViews === 'undefined' || normalized.totalViews === null) {
    normalized.totalViews = 0
  }
  return normalized
}

export function useAuthState(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  // FIX: start as true — stays true until INITIAL_SESSION fires
  const [isLoading, setIsLoading] = useState(true)

  const lastFetchedUserId = useRef<string | null>(null)
  const isFetchingRef = useRef(false)

  const fetchProfile = async (userId: string, force = false) => {
    if (!force && lastFetchedUserId.current === userId) return
    if (isFetchingRef.current) return

    isFetchingRef.current = true
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 6000)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(controller.signal)
      clearTimeout(timer)

      if (error) throw error
      lastFetchedUserId.current = userId
      setProfile(normalizeProfile(data as Record<string, unknown>))
    } catch (e) {
      console.error('Failed to fetch profile:', e)
      setProfile((prev: any) => prev ?? null)
    } finally {
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    // FIX: Remove getSession() call entirely.
    // onAuthStateChange fires INITIAL_SESSION synchronously on mount with the
    // persisted session — this is the single authoritative source of truth.
    // Calling getSession() in parallel creates a race with isFetchingRef that
    // silently drops the profile fetch, leaving profile=null after refresh.

    // Safety valve — if Supabase never fires, unblock UI after 8s
    const safetyTimer = setTimeout(() => setIsLoading(false), 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // INITIAL_SESSION fires on mount with persisted session (or null)
      // SIGNED_IN fires after login
      // TOKEN_REFRESHED fires on silent refresh
      // SIGNED_OUT fires on logout

      setUser(session?.user ?? null)

      if (session?.user) {
        if (
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'USER_UPDATED' ||
          event === 'TOKEN_REFRESHED'
        ) {
          // Force re-fetch on TOKEN_REFRESHED; use cache for the rest
          const force = event === 'TOKEN_REFRESHED'
          await fetchProfile(session.user.id, force)
        }
      } else {
        lastFetchedUserId.current = null
        setProfile(null)
      }

      // FIX: Only resolve loading after INITIAL_SESSION — this is the event
      // that indicates Supabase has finished restoring persisted auth.
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        clearTimeout(safetyTimer)
        setIsLoading(false)
      }
    })

    return () => {
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  const register = async (data: RegisterData) => {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          phone: data.phone,
          role: data.role,
          location: data.location
        }
      }
    })
    if (error) throw new Error(error.message)

    if (signUpData.user && !signUpData.session) {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (loginError) throw new Error(loginError.message)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    lastFetchedUserId.current = null
    setProfile(null)
  }

  return { user, profile, isLoading, setProfile, login, register, logout }
}

export function useAuth() {
  return useContext(AuthContext)
}

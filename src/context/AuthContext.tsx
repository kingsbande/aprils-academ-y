import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { Profile } from '../types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, school_id, schools ( name )')
      .eq('id', userId)
      .single()

    if (!error && data) {
      const row = data as unknown as {
        id: string
        full_name: string
        role: Profile['role']
        school_id: string
        schools: { name: string } | null
      }
      setProfile({
        id: row.id,
        full_name: row.full_name,
        role: row.role,
        school_id: row.school_id,
        school_name: row.schools?.name ?? 'your school',
      })
    } else {
      setProfile(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const currentSession = data.session
      setSession(currentSession)
      if (currentSession) {
        setLoading(true)
        setProfile(null)
        await loadProfile(currentSession.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        setLoading(true)
        setProfile(null)
        loadProfile(newSession.user.id).finally(() => setLoading(false))
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    setLoading(true)
    setProfile(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error && data.session) {
      setSession(data.session)
      await loadProfile(data.session.user.id)
    } else {
      setSession(null)
      setProfile(null)
    }

    setLoading(false)
    return { error: error ? error.message : null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

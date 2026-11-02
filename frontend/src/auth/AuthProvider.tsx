import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Account } from '../lib/types'

type AuthState = {
  /** True until we know both the Supabase session and the Kazi Connect account. */
  loading: boolean
  session: Session | null
  /** Null when signed out, or signed in with Supabase but no Kazi Connect account yet. */
  account: Account | null
  setAccount: (account: Account | null) => void
  refreshAccount: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [account, setAccount] = useState<Account | null>(null)
  const [accountLoaded, setAccountLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoaded(true)
    })
    // Supabase warns against calling its other methods inside this callback, so it only stores the session.
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession))
    return () => data.subscription.unsubscribe()
  }, [])

  const refreshAccount = useCallback(async () => {
    try {
      setAccount(await api<Account>('/me/'))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setAccount(null)
      else throw error
    } finally {
      setAccountLoaded(true)
    }
  }, [])

  // Load the account whenever a different user signs in.
  const userId = session?.user.id
  useEffect(() => {
    if (!sessionLoaded) return
    if (!userId) {
      setAccount(null)
      setAccountLoaded(true)
      return
    }
    setAccountLoaded(false)
    refreshAccount().catch(() => setAccountLoaded(true))
  }, [userId, sessionLoaded, refreshAccount])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setAccount(null)
  }, [])

  const value: AuthState = {
    loading: !sessionLoaded || !accountLoaded,
    session,
    account,
    setAccount,
    refreshAccount,
    signOut,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

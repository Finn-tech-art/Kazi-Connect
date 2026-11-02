import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Alert, Spinner } from '../components/ui'
import { useAuth } from './AuthProvider'

/** Signed in with Supabase. The account may not exist yet. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  return children
}

/** Has an Active Kazi Connect account: email and phone verified (BR-F-02). */
export function RequireActiveAccount({ children }: { children: ReactNode }) {
  const { loading, session, account } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  if (!account || account.status === 'pending_verification') return <Navigate to="/welcome" replace />
  if (account.status !== 'active') {
    return (
      <main className="page narrow">
        <Alert tone="error">Your account is {account.status}. Contact Kazi Connect support for help.</Alert>
      </main>
    )
  }
  return children
}

/** Has finished the provider upgrade (SR-F-ACC-09). */
export function RequireActiveProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth()
  return (
    <RequireActiveAccount>
      {account?.provider?.status === 'active' ? children : <Navigate to="/become-provider" replace />}
    </RequireActiveAccount>
  )
}

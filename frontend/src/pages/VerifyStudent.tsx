import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, useAction } from '../components/ui'
import { api } from '../lib/api'

/**
 * Landing page for the emailed student link. Confirming takes a click, so email
 * scanners that open links automatically can't use up the single-use token.
 */
export default function VerifyStudent() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { session, refreshAccount } = useAuth()
  const [done, setDone] = useState<string | null>(null)
  const { busy, error, run } = useAction()

  async function confirm() {
    const result = await run(() => api<{ detail: string }>('/student-verification/confirm/', { method: 'POST', body: { token }, auth: false }))
    if (!result) return
    setDone(result.detail)
    if (session) await refreshAccount()
  }

  return (
    <main className="page narrow">
      <h1>Confirm your student email</h1>
      {done ? (
        <>
          <Alert tone="success">{done}</Alert>
          <Link className="btn btn-primary" to={session ? '/become-provider' : '/signin'}>{session ? 'Continue' : 'Sign in'}</Link>
        </>
      ) : !token ? (
        <Alert tone="error">This link is missing its code. Open the link from your email again.</Alert>
      ) : (
        <>
          <p className="lead">Confirm to give your Kazi Connect account the Student category for 12 months.</p>
          {error && <Alert tone="error">{error.message}</Alert>}
          <Button busy={busy} onClick={confirm}>Confirm student email</Button>
        </>
      )}
    </main>
  )
}

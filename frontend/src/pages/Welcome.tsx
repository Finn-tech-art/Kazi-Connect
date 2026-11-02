import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Checkbox, TextField, useAction } from '../components/ui'
import { api } from '../lib/api'
import type { Account } from '../lib/types'

/**
 * Finishes registration after Supabase sign-up (US-01):
 * 1. create the Kazi Connect account and record consent, 2. verify the phone by SMS code.
 */
export default function Welcome() {
  const { account, session } = useAuth()
  const intent = session?.user.user_metadata?.intent

  if (account?.status === 'active') return <Navigate to={intent === 'work' ? '/become-provider' : '/dashboard'} replace />
  return (
    <main className="page narrow">
      <p className="eyebrow">Step {account ? 2 : 1} of 2</p>
      {account ? <PhoneStep account={account} /> : <ProfileStep />}
    </main>
  )
}

function ProfileStep() {
  const { session, setAccount } = useAuth()
  const metadata = session?.user.user_metadata ?? {}
  const [fullName, setFullName] = useState<string>(metadata.full_name ?? '')
  const [phone, setPhone] = useState<string>(metadata.phone ?? '')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const { busy, error, run } = useAction()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const account = await run(() =>
      api<Account>('/me/', {
        method: 'POST',
        body: { full_name: fullName, phone, accept_terms: acceptTerms, accept_privacy: acceptPrivacy },
      }),
    )
    if (!account) return
    // If this first SMS fails, the next step has a "Send a new code" button.
    await api('/me/phone/send-code/', { method: 'POST' }).catch(() => undefined)
    setAccount(account)
  }

  return (
    <>
      <h1>Confirm your details</h1>
      <p className="lead">Signed in as {session?.user.email}. Your email is verified.</p>
      <form onSubmit={submit} className="stack card">
        <TextField id="full_name" label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={error?.fields.full_name} />
        <TextField
          id="phone" label="Phone number (M-Pesa)" type="tel" placeholder="0712 345 678" value={phone}
          onChange={(e) => setPhone(e.target.value)} error={error?.fields.phone} hint="We'll text a 6-digit code to this number."
        />
        <Checkbox
          id="accept_terms" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} error={error?.fields.accept_terms}
          label="I accept the Kazi Connect terms of use (draft)."
        />
        <Checkbox
          id="accept_privacy" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} error={error?.fields.accept_privacy}
          label="I have read the privacy notice (draft) and agree to my data being used to run my account."
        />
        {error && !Object.keys(error.fields).length && <Alert tone="error">{error.message}</Alert>}
        <Button type="submit" busy={busy}>Continue</Button>
      </form>
    </>
  )
}

function PhoneStep({ account }: { account: Account }) {
  const { setAccount } = useAuth()
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const verify = useAction()
  const resend = useAction()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const updated = await verify.run(() => api<Account>('/me/phone/verify/', { method: 'POST', body: { code } }))
    if (updated) setAccount(updated)
  }

  async function sendAgain() {
    const result = await resend.run(() => api<{ detail: string }>('/me/phone/send-code/', { method: 'POST' }))
    if (result) setNotice(result.detail)
  }

  return (
    <>
      <h1>Verify your phone</h1>
      <p className="lead">Enter the 6-digit code we sent to {account.phone}. It expires in 5 minutes.</p>
      {import.meta.env.DEV && <Alert>Development mode: the code is printed in the Django runserver terminal.</Alert>}
      <form onSubmit={submit} className="stack card">
        <TextField
          id="code" label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} error={verify.error?.fields.code ?? verify.error?.message}
        />
        <Button type="submit" busy={verify.busy} disabled={code.length !== 6}>Verify phone</Button>
        <Button type="button" variant="ghost" busy={resend.busy} onClick={sendAgain}>Send a new code</Button>
        {notice && <Alert tone="success">{notice}</Alert>}
        {resend.error && <Alert tone="error">{resend.error.message}</Alert>}
      </form>
    </>
  )
}

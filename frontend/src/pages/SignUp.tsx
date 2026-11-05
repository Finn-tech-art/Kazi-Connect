import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, PasswordField, TextField } from '../components/ui'
import { supabase } from '../lib/supabase'

export type SignUpIntent = 'hire' | 'work'

export default function SignUp() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [intent, setIntent] = useState<SignUpIntent>(params.get('intent') === 'work' ? 'work' : 'hire')
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (session) return <Navigate to="/welcome" replace />

  const update = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm({ ...form, [field]: event.target.value })

  async function submit(event: FormEvent) {
    event.preventDefault()
    // SR-F-ACC-05: at least 8 characters with letters and numbers.
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      setErrors({ password: 'Use at least 8 characters, with both letters and numbers.' })
      return
    }
    setErrors({})
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/welcome`,
        // Only used to pre-fill the next step. Django never trusts these values for access decisions.
        data: { full_name: form.full_name.trim(), phone: form.phone.trim(), intent },
      },
    })
    setBusy(false)
    if (error) setErrors({ form: error.message })
    else if (data.session) navigate('/welcome')
    else setSentTo(form.email.trim())
  }

  if (sentTo) {
    return (
      <main className="page narrow">
        <p className="eyebrow">Almost there</p>
        <h1>Check your email</h1>
        <p className="lead">
          We sent a link to <b>{sentTo}</b>. Open it to confirm your address, then we'll ask for your phone number.
        </p>
        <Alert>Can't find it? Check your spam folder. The link expires in 24 hours.</Alert>
      </main>
    )
  }

  return (
    <main className="page narrow">
      <p className="eyebrow">Create your account</p>
      <h1>Join Kazi Connect</h1>
      <p className="lead">Everyone starts with a client account. No documents needed.</p>

      <form onSubmit={submit} className="stack card" noValidate>
        <fieldset className="choice-group">
          <legend>How will you use Kazi Connect?</legend>
          <label className={`choice ${intent === 'hire' ? 'on' : ''}`}>
            <input type="radio" name="intent" checked={intent === 'hire'} onChange={() => setIntent('hire')} />
            <b>I want to hire</b>
            <span>Post jobs and book verified providers.</span>
          </label>
          <label className={`choice ${intent === 'work' ? 'on' : ''}`}>
            <input type="radio" name="intent" checked={intent === 'work'} onChange={() => setIntent('work')} />
            <b>I want to offer services</b>
            <span>Become a Student or General provider after sign-up.</span>
          </label>
        </fieldset>

        <TextField id="full_name" label="Full name" autoComplete="name" required value={form.full_name} onChange={update('full_name')} />
        <TextField id="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} />
        <TextField
          id="phone" label="Phone number (M-Pesa)" type="tel" autoComplete="tel" placeholder="0712 345 678" required
          value={form.phone} onChange={update('phone')} hint="We'll text you a 6-digit code to confirm it."
        />
        <PasswordField
          id="password" label="Password" autoComplete="new-password" required
          value={form.password} onChange={update('password')} error={errors.password}
          hint="At least 8 characters, with letters and numbers."
        />
        {errors.form && <Alert tone="error">{errors.form}</Alert>}
        <Button type="submit" busy={busy}>Create account</Button>
        <p className="muted center">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </form>
      <p className="legal-note">
        By continuing, you confirm that you have read and accepted our <Link to="/privacy">Privacy Policy</Link> and{' '}
        <Link to="/terms">Terms of Service</Link>.
      </p>
    </main>
  )
}

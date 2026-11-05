import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, TextArea, TextField, useAction } from '../components/ui'
import { api } from '../lib/api'
import type { Account, ChecklistStep } from '../lib/types'

type StepProps = { account: Account; onSaved: (account: Account) => void }

/** The provider upgrade checklist (SR-F-ACC-08, 09). */
export default function BecomeProvider() {
  const { account, setAccount } = useAuth()
  const navigate = useNavigate()
  const start = useAction()
  const switchMode = useAction()
  const [openKey, setOpenKey] = useState<ChecklistStep['key'] | null>(null)
  if (!account) return null
  const provider = account.provider

  if (!provider) {
    return (
      <main className="page narrow">
        <p className="eyebrow">Become a provider</p>
        <h1>Offer your services on Kazi Connect</h1>
        <p className="lead">
          Your client account stays as it is. Finish five steps and your provider profile goes live. You can switch between
          Hiring and Working with the same login.
        </p>
        <ol className="plain-list card">
          <li>Write a short bio and list your skills</li>
          <li>Add your M-Pesa payout number</li>
          <li>Choose Student (lower commission, MMU email) or General</li>
          <li>Accept the provider code of conduct</li>
          <li>Create your first listing</li>
        </ol>
        {start.error && <Alert tone="error">{start.error.message}</Alert>}
        <Button busy={start.busy} onClick={async () => {
          const updated = await start.run(() => api<Account>('/provider/', { method: 'POST' }))
          if (updated) setAccount(updated)
        }}>Start</Button>
      </main>
    )
  }

  if (provider.status === 'active') {
    return (
      <main className="page narrow">
        <p className="eyebrow">Become a provider</p>
        <h1>You're a provider</h1>
        <p className="lead">All five steps are done. Publish your listing so clients can find you.</p>
        {switchMode.error && <Alert tone="error">{switchMode.error.message}</Alert>}
        <Button busy={switchMode.busy} onClick={async () => {
          const updated = await switchMode.run(() => api<Account>('/me/mode/', { method: 'POST', body: { mode: 'provider' } }))
          if (updated) {
            setAccount(updated)
            navigate('/dashboard')
          }
        }}>Switch to Working mode</Button>
      </main>
    )
  }

  const steps = provider.checklist
  const firstOpen = steps.find((step) => !step.done)?.key ?? null
  const current = openKey ?? firstOpen
  const firstOpenIndex = steps.findIndex((step) => step.key === firstOpen)

  const forms: Record<ChecklistStep['key'], ReactNode> = {
    profile: <ProfileStep account={account} onSaved={(a) => { setAccount(a); setOpenKey(null) }} />,
    payout_phone: <PayoutStep account={account} onSaved={(a) => { setAccount(a); setOpenKey(null) }} />,
    category: <CategoryStep account={account} onSaved={(a) => { setAccount(a); setOpenKey(null) }} />,
    code_of_conduct: <ConductStep account={account} onSaved={(a) => { setAccount(a); setOpenKey(null) }} />,
    listing: (
      <p>
        <Link className="btn btn-primary" to="/listings/new">Create a listing</Link>
      </p>
    ),
  }

  return (
    <main className="page narrow">
      <p className="eyebrow">Become a provider</p>
      <h1>{provider.steps_done} of 5 steps done</h1>
      <p className="lead">Your client account stays as it is. Until every step is done, your provider profile shows as Pending.</p>
      <div className="progress" aria-hidden="true">
        {steps.map((step) => <span key={step.key} className={step.done ? 'done' : ''} />)}
      </div>

      <ol className="checklist card">
        {steps.map((step, index) => {
          const locked = !step.done && index > firstOpenIndex
          const isOpen = current === step.key && !locked
          return (
            <li key={step.key} className={`${step.done ? 'done' : ''} ${locked ? 'locked' : ''}`}>
              <span className="step-num" aria-hidden="true">{step.done ? '✓' : index + 1}</span>
              <div className="step-body">
                <div className="step-head">
                  <h3>{step.label}</h3>
                  {step.done && !isOpen && step.key !== 'listing' && (
                    <button type="button" className="link-btn" onClick={() => setOpenKey(step.key)}>Edit</button>
                  )}
                </div>
                {!isOpen && <p className="muted">{summary(step, account)}</p>}
                {isOpen && forms[step.key]}
              </div>
            </li>
          )
        })}
      </ol>
      <p className="muted">Profile photos are not required yet.</p>
    </main>
  )
}

function summary(step: ChecklistStep, account: Account) {
  const provider = account.provider!
  if (!step.done) {
    return {
      profile: 'Tell clients what you do.',
      payout_phone: 'We pay your earnings to this M-Pesa number.',
      category: 'Student accounts pay a lower commission. You need a current MMU student email.',
      code_of_conduct: 'Covers safety, honest pricing and keeping payments on the platform.',
      listing: 'Pick a category, describe the service and set your price.',
    }[step.key]
  }
  return {
    profile: `${provider.skills.length} skill(s) · bio ${provider.bio.length} characters`,
    payout_phone: provider.payout_phone_verified ? `${provider.payout_phone} verified by SMS code` : provider.payout_phone,
    category: account.category === 'student' ? 'Student' : 'General',
    code_of_conduct: 'Accepted',
    listing: 'Created',
  }[step.key]
}

function ProfileStep({ account, onSaved }: StepProps) {
  const [bio, setBio] = useState(account.provider?.bio ?? '')
  const [skills, setSkills] = useState(account.provider?.skills.join(', ') ?? '')
  const { busy, error, run } = useAction()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const body = { bio, skills: skills.split(',').map((s) => s.trim()).filter(Boolean) }
    const updated = await run(() => api<Account>('/provider/', { method: 'PATCH', body }))
    if (updated) onSaved(updated)
  }

  return (
    <form onSubmit={submit} className="stack">
      <TextArea id="bio" label="Bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} error={error?.fields.bio} hint={`${bio.length} / 1000`} />
      <TextField id="skills" label="Skills" placeholder="Maths, Physics, KCSE revision" value={skills} onChange={(e) => setSkills(e.target.value)} error={error?.fields.skills} hint="Separate skills with commas." />
      {error && !Object.keys(error.fields).length && <Alert tone="error">{error.message}</Alert>}
      <Button type="submit" busy={busy} disabled={!bio.trim() || !skills.trim()}>Save</Button>
    </form>
  )
}

function PayoutStep({ account, onSaved }: StepProps) {
  return account.phone_verification_enabled
    ? <VerifiedPayoutStep account={account} onSaved={onSaved} />
    : <PlainPayoutStep account={account} onSaved={onSaved} />
}

/** While SMS codes are switched off (system evolution E-02): the number is saved as typed. */
function PlainPayoutStep({ account, onSaved }: StepProps) {
  const [phone, setPhone] = useState(account.phone)
  const { busy, error, run } = useAction()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const updated = await run(() => api<Account>('/provider/payout-phone/', { method: 'POST', body: { phone } }))
    if (updated) onSaved(updated)
  }

  return (
    <form onSubmit={submit} className="stack">
      <div className="inline-form">
        <TextField id="payout_phone" label="M-Pesa number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={error?.fields.phone ?? error?.message} />
        <Button type="submit" busy={busy}>Save</Button>
      </div>
      <p className="field-hint">Check it carefully: your earnings are sent to this number.</p>
    </form>
  )
}

function VerifiedPayoutStep({ account, onSaved }: StepProps) {
  const [phone, setPhone] = useState(account.phone)
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const send = useAction()
  const verify = useAction()

  async function sendCode(event: FormEvent) {
    event.preventDefault()
    if (await send.run(() => api('/provider/payout-phone/send-code/', { method: 'POST', body: { phone } })) !== undefined) setSent(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const updated = await verify.run(() => api<Account>('/provider/payout-phone/verify/', { method: 'POST', body: { code } }))
    if (updated) onSaved(updated)
  }

  return (
    <div className="stack">
      <form onSubmit={sendCode} className="inline-form">
        <TextField id="payout_phone" label="M-Pesa number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={send.error?.fields.phone ?? send.error?.message} />
        <Button type="submit" variant={sent ? 'secondary' : 'primary'} busy={send.busy}>{sent ? 'Send again' : 'Send code'}</Button>
      </form>
      {sent && (
        <form onSubmit={submit} className="inline-form">
          <TextField id="payout_code" label="6-digit code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} error={verify.error?.fields.code ?? verify.error?.message} />
          <Button type="submit" busy={verify.busy} disabled={code.length !== 6}>Verify</Button>
        </form>
      )}
      {import.meta.env.DEV && sent && <p className="field-hint">Development mode: the code is in the Django terminal.</p>}
    </div>
  )
}

function CategoryStep({ account, onSaved }: StepProps) {
  const { refreshAccount } = useAuth()
  const [choice, setChoice] = useState<'student' | 'general'>('student')
  const [studentEmail, setStudentEmail] = useState(account.student_verification?.student_email ?? '')
  const [notice, setNotice] = useState<string | null>(null)
  const confirm = useAction()
  const link = useAction()

  async function confirmCategory(category: 'student' | 'general') {
    const updated = await confirm.run(() => api<Account>('/provider/category/', { method: 'POST', body: { category } }))
    if (updated) onSaved(updated)
  }

  async function sendLink(event: FormEvent) {
    event.preventDefault()
    const result = await link.run(() => api<{ detail: string }>('/me/student-verification/', { method: 'POST', body: { student_email: studentEmail } }))
    if (result) setNotice(result.detail)
  }

  return (
    <div className="stack">
      <div className="choice-group two">
        <label className={`choice ${choice === 'student' ? 'on' : ''}`}>
          <input type="radio" name="category" checked={choice === 'student'} onChange={() => setChoice('student')} />
          <b>🎓 Student</b>
          <span>MMU student email · lower commission · reverify yearly</span>
        </label>
        <label className={`choice ${choice === 'general' ? 'on' : ''}`}>
          <input type="radio" name="category" checked={choice === 'general'} onChange={() => setChoice('general')} />
          <b>General</b>
          <span>Phone and email only · standard commission</span>
        </label>
      </div>

      {choice === 'general' && <Button busy={confirm.busy} onClick={() => confirmCategory('general')}>Continue as General</Button>}

      {choice === 'student' && account.category === 'student' && (
        <>
          <Alert tone="success">{account.student_verification?.student_email} is verified.</Alert>
          <Button busy={confirm.busy} onClick={() => confirmCategory('student')}>Continue as Student</Button>
        </>
      )}

      {choice === 'student' && account.category !== 'student' && (
        <>
          <form onSubmit={sendLink} className="inline-form">
            <TextField
              id="student_email" label="MMU student email" type="email" placeholder="name@students.mmu.ac.ke" value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)} error={link.error?.fields.student_email ?? link.error?.message}
              hint="We email a link valid for 24 hours. Student status lasts 12 months."
            />
            <Button type="submit" busy={link.busy}>Send link</Button>
          </form>
          {notice && (
            <>
              <Alert tone="success">{notice}</Alert>
              <Button variant="secondary" onClick={() => refreshAccount()}>I've opened the link</Button>
            </>
          )}
        </>
      )}
      {confirm.error && <Alert tone="error">{confirm.error.message}</Alert>}
    </div>
  )
}

function ConductStep({ onSaved }: StepProps) {
  const { busy, error, run } = useAction()
  return (
    <div className="stack">
      <ul className="plain-list">
        <li>Follow the job rules of every category you work in.</li>
        <li>Describe your skills and prices honestly.</li>
        <li>Keep payment on Kazi Connect so both sides stay protected.</li>
        <li>Treat clients with respect and keep their information private.</li>
      </ul>
      <p className="field-hint">This is a summary. The full code of conduct will be published before the pilot.</p>
      {error && <Alert tone="error">{error.message}</Alert>}
      <Button busy={busy} onClick={async () => {
        const updated = await run(() => api<Account>('/provider/code-of-conduct/', { method: 'POST' }))
        if (updated) onSaved(updated)
      }}>I accept the code of conduct</Button>
    </div>
  )
}

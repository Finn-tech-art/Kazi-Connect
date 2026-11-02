import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Pill, TextField, useAction } from '../components/ui'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'

export default function AccountPage() {
  const { account, signOut } = useAuth()
  const navigate = useNavigate()
  const [studentEmail, setStudentEmail] = useState(account?.student_verification?.student_email ?? '')
  const [notice, setNotice] = useState<string | null>(null)
  const { busy, error, run } = useAction()
  if (!account) return null
  const student = account.student_verification

  async function sendLink(event: FormEvent) {
    event.preventDefault()
    const result = await run(() => api<{ detail: string }>('/me/student-verification/', { method: 'POST', body: { student_email: studentEmail } }))
    if (result) setNotice(result.detail)
  }

  return (
    <main className="page narrow">
      <h1>Your account</h1>
      <section className="card stack">
        <dl className="details">
          <dt>Name</dt><dd>{account.full_name}</dd>
          <dt>Email</dt><dd>{account.email} <Pill tone="success">verified</Pill></dd>
          <dt>Phone</dt><dd>{account.phone} {account.phone_verified && <Pill tone="success">verified</Pill>}</dd>
          <dt>Category</dt><dd><Pill tone={account.category === 'student' ? 'accent' : 'neutral'}>{account.category === 'student' ? 'Student' : 'General'}</Pill></dd>
          <dt>Provider</dt>
          <dd>
            {account.provider ? <Pill tone={account.provider.status === 'active' ? 'success' : 'neutral'}>{account.provider.status}</Pill> : 'Not a provider'}{' '}
            {account.provider?.status !== 'active' && <Link to="/become-provider">{account.provider ? 'Continue setup' : 'Become a provider'}</Link>}
          </dd>
          <dt>Member since</dt><dd>{formatDate(account.created_at)}</dd>
        </dl>
      </section>

      <section className="card stack">
        <h2>Student status</h2>
        {student?.verified_at && student.expires_at ? (
          <Alert tone="success">
            {student.student_email} is verified until {formatDate(student.expires_at)}. We'll remind you before it's due.
          </Alert>
        ) : (
          <p className="muted">Verify a current MMU student email to get the Student category and a lower commission.</p>
        )}
        <form onSubmit={sendLink} className="inline-form">
          <TextField
            id="student_email" label="Student email" type="email" placeholder="name@students.mmu.ac.ke" value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)} error={error?.fields.student_email ?? error?.message}
          />
          <Button type="submit" busy={busy}>{student?.verified_at ? 'Reverify' : 'Send link'}</Button>
        </form>
        {notice && <Alert tone="success">{notice}</Alert>}
      </section>

      <Button variant="secondary" onClick={async () => { await signOut(); navigate('/') }}>Sign out</Button>
    </main>
  )
}

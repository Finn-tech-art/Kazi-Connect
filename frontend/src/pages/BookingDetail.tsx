import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Alert, Button, Checkbox, Pill, Spinner, TextArea, useAction } from '../components/ui'
import { api } from '../lib/api'
import { BOOKINGS_PATH, describeEvent, quantityLabel, STATE_TONE } from '../lib/bookings'
import { formatDateTime, formatKES, UNIT_LABELS } from '../lib/format'
import type { Booking, BookingRole } from '../lib/types'

export default function BookingDetail({ role }: { role: BookingRole }) {
  const { id } = useParams()
  const location = useLocation()
  const flash = (location.state as { flash?: string } | null)?.flash
  const [booking, setBooking] = useState<Booking | null>(null)
  const load = useAction()

  useEffect(() => {
    load.run(() => api<Booking>(`${BOOKINGS_PATH[role]}/${id}/`)).then((result) => result && setBooking(result))
  }, [role, id])

  if (load.error) {
    return (
      <main className="page narrow">
        <Alert tone="error">{load.error.status === 404 ? "We couldn't find this booking." : load.error.message}</Alert>
        <p><Link to={BOOKINGS_PATH[role]}>Back to your bookings</Link></p>
      </main>
    )
  }
  if (!booking) return <Spinner />

  const other = role === 'client' ? booking.provider.name : booking.client.first_name

  return (
    <main className="page">
      <p className="eyebrow"><Link to={BOOKINGS_PATH[role]}>{role === 'client' ? 'Your bookings' : 'Booking requests'}</Link> / <span className="mono">{booking.reference}</span></p>
      <div className="row-title">
        <h1>{booking.listing?.title ?? booking.category_name}</h1>
        <Pill tone={STATE_TONE[booking.state]}>{booking.state_label}</Pill>
      </div>
      {flash && <Alert tone="success">{flash}</Alert>}

      <div className="grid-2 booking-grid">
        <section className="stack">
          <NextStep booking={booking} role={role} other={other} />
          <Actions booking={booking} role={role} onChange={setBooking} />

          <div className="card">
            <h2>Details</h2>
            <dl className="details">
              <dt>{role === 'client' ? 'Provider' : 'Client'}</dt>
              <dd>{other}{(role === 'client' ? booking.provider.account_category : booking.client.account_category) === 'student' && ' (Student)'}</dd>
              <dt>Category</dt><dd>{booking.category_name}</dd>
              <dt>Starts</dt><dd>{formatDateTime(booking.scheduled_start)}</dd>
              <dt>Length</dt><dd>{quantityLabel(booking.pricing_unit, booking.quantity)}</dd>
              <dt>Where</dt>
              <dd>
                {booking.is_remote ? 'Remote' : booking.location_hidden
                  ? <span className="muted">Shown after you accept</span>
                  : booking.location_text}
              </dd>
              <dt>Price</dt>
              <dd>
                <b className="money">{formatKES(booking.price_kes)}</b>{' '}
                <span className="muted">({formatKES(booking.unit_price_kes)} {UNIT_LABELS[booking.pricing_unit]} × {booking.quantity})</span>
              </dd>
              {booking.notes && <><dt>Notes</dt><dd>{booking.notes}</dd></>}
            </dl>
          </div>

          <details className="card">
            <summary>Rules both of you accept</summary>
            <ul>{booking.job_rules_snapshot.split('\n').map((rule) => <li key={rule}>{rule}</li>)}</ul>
            {booking.provider_terms_snapshot && (
              <>
                <p className="terms-heading"><b>Provider's terms</b></p>
                <p className="muted">{booking.provider_terms_snapshot}</p>
              </>
            )}
          </details>
        </section>

        <aside className="card">
          <h2>History</h2>
          <ol className="timeline">
            {booking.events.map((event, index) => (
              <li key={index}>
                {describeEvent(event, role)}
                {event.note && <span className="muted"> — “{event.note}”</span>}
                <small>{formatDateTime(event.created_at)}</small>
              </li>
            ))}
          </ol>
          {/* SR-F-SAF-05: every booking links to the safety page. */}
          <p className="booking-safety">
            In an emergency call <a href="tel:999">999</a> or <a href="tel:112">112</a>. <Link to="/safety">Trust and safety</Link>
          </p>
        </aside>
      </div>
    </main>
  )
}

/** One sentence telling the viewer what happens next and by when. */
function NextStep({ booking, role, other }: { booking: Booking; role: BookingRole; other: string }) {
  const due = (iso: string | null) => (iso ? formatDateTime(iso) : '')
  const messages: Partial<Record<Booking['state'], Record<BookingRole, string>>> = {
    requested: {
      client: `Waiting for ${other} to answer. If there's no answer by ${due(booking.response_due_at)}, the request expires.`,
      provider: `Answer by ${due(booking.response_due_at)}, or the request expires.`,
    },
    accepted: {
      client: `${other} accepted. Pay by ${due(booking.payment_due_at)} to confirm the booking, or it's cancelled.`,
      provider: `Waiting for ${other} to pay by ${due(booking.payment_due_at)}. Don't start until the booking shows as paid.`,
    },
    declined: {
      client: `${other} can't take this booking. Try another provider.`,
      provider: 'You declined this request.',
    },
    expired: {
      client: `${other} didn't answer in time, so the request expired. Nothing was charged.`,
      provider: "This request expired because it wasn't answered in time.",
    },
    cancelled: {
      client: 'This booking was cancelled. Nothing was charged.',
      provider: 'This booking was cancelled.',
    },
  }
  const message = messages[booking.state]?.[role]
  return message ? <Alert tone="info">{message}</Alert> : null
}

function Actions({ booking, role, onChange }: { booking: Booking; role: BookingRole; onChange: (booking: Booking) => void }) {
  const [acceptRules, setAcceptRules] = useState(false)
  const [reasonFor, setReasonFor] = useState<'decline' | 'cancel' | null>(null)
  const [reason, setReason] = useState('')
  const { busy, error, run } = useAction()
  const url = `${BOOKINGS_PATH[role]}/${booking.id}`

  async function act(action: 'accept' | 'decline' | 'cancel', body: object) {
    const updated = await run(() => api<Booking>(`${url}/${action}/`, { method: 'POST', body }))
    if (updated) {
      onChange(updated)
      setReasonFor(null)
      setReason('')
    } else {
      // The booking may have changed underneath us (for example, it just expired), so show its real state.
      api<Booking>(`${url}/`).then(onChange).catch(() => {})
    }
  }

  const canPay = role === 'client' && booking.state === 'accepted'
  if (!booking.actions.length && !canPay) return null

  return (
    <div className="card stack">
      {booking.actions.includes('accept') && (
        <>
          <h2>Answer this request</h2>
          <Checkbox
            id="accept_rules" checked={acceptRules} onChange={(e) => setAcceptRules(e.target.checked)}
            label={`I accept the ${booking.category_name} job rules and can do this job at the time shown.`}
          />
          <div className="actions">
            <Button busy={busy} disabled={!acceptRules} onClick={() => act('accept', { accept_job_rules: true })}>Accept</Button>
            <Button variant="secondary" disabled={busy} onClick={() => setReasonFor('decline')}>Decline</Button>
          </div>
        </>
      )}

      {canPay && (
        <>
          <h2>Pay to confirm</h2>
          <p className="muted">M-Pesa payment arrives in the next update. Until then, accepted bookings can't be paid.</p>
          <div className="actions"><Button disabled>Pay {formatKES(booking.price_kes)} with M-Pesa</Button></div>
        </>
      )}

      {booking.actions.includes('cancel') && reasonFor !== 'cancel' && (
        <div className="actions">
          <Button variant="ghost" onClick={() => setReasonFor('cancel')}>Cancel booking</Button>
        </div>
      )}

      {reasonFor && (
        <div className="stack">
          <TextArea
            id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
            label={reasonFor === 'decline' ? 'Reason (optional, the client sees it)' : 'Reason (optional, the other person sees it)'}
          />
          <div className="actions">
            <Button variant="secondary" busy={busy} onClick={() => act(reasonFor, { reason })}>
              {reasonFor === 'decline' ? 'Decline request' : 'Cancel booking'}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setReasonFor(null)}>Keep it</Button>
          </div>
        </div>
      )}

      {error && <Alert tone="error">{error.message}</Alert>}
    </div>
  )
}

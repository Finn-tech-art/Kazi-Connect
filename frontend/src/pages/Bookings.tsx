import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Pill, Spinner, useAction } from '../components/ui'
import { api } from '../lib/api'
import { BOOKINGS_PATH, quantityLabel, STATE_TONE } from '../lib/bookings'
import { formatDateTime, formatKES } from '../lib/format'
import type { Booking, BookingRole, BookingState, Page } from '../lib/types'

const FILTERS: { state: BookingState | ''; label: string }[] = [
  { state: '', label: 'All' },
  { state: 'requested', label: 'Waiting for an answer' },
  { state: 'accepted', label: 'Accepted' },
]

const COPY: Record<BookingRole, { eyebrow: string; title: string; lead: string; empty: string }> = {
  client: {
    eyebrow: 'Hiring mode',
    title: 'Your bookings',
    lead: 'Requests you sent to providers, and where each one stands.',
    empty: 'No bookings yet. Find a service and send a request.',
  },
  provider: {
    eyebrow: 'Working mode',
    title: 'Booking requests',
    lead: 'Answer each request within 24 hours, or it expires.',
    empty: 'No booking requests yet. Clients find you through your published listings.',
  },
}

export default function Bookings({ role }: { role: BookingRole }) {
  const [params, setParams] = useSearchParams()
  const state = params.get('state') ?? ''
  const [page, setPage] = useState<Page<Booking> | null>(null)
  const { error, run } = useAction()
  const copy = COPY[role]

  useEffect(() => {
    setPage(null)
    run(() => api<Page<Booking>>(`${BOOKINGS_PATH[role]}/${state ? `?state=${state}` : ''}`)).then((result) => result && setPage(result))
  }, [role, state])

  return (
    <main className="page">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1>{copy.title}</h1>
      <p className="lead">{copy.lead}</p>

      <div className="chips" role="group" aria-label="Filter by state">
        {FILTERS.map((filter) => (
          <button
            type="button" key={filter.label} className={state === filter.state ? 'on' : ''}
            onClick={() => setParams(filter.state ? { state: filter.state } : {})}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <Alert tone="error">{error.message}</Alert>}
      {page === null ? <Spinner /> : page.results.length === 0 ? (
        <div className="card empty"><p>{state ? 'Nothing here right now.' : copy.empty}</p></div>
      ) : (
        <div className="stack">
          {page.results.map((booking) => (
            <Link key={booking.id} to={`${BOOKINGS_PATH[role]}/${booking.id}`} className="card row-card link-card">
              <div>
                <div className="row-title">
                  <h3>{booking.listing?.title ?? booking.category_name}</h3>
                  <Pill tone={STATE_TONE[booking.state]}>{booking.state_label}</Pill>
                </div>
                <p className="muted">
                  <span className="mono">{booking.reference}</span> ·{' '}
                  {role === 'client' ? booking.provider.name : booking.client.first_name} ·{' '}
                  {formatDateTime(booking.scheduled_start)} · {quantityLabel(booking.pricing_unit, booking.quantity)}
                </p>
              </div>
              <span className="money">{formatKES(booking.price_kes)}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}

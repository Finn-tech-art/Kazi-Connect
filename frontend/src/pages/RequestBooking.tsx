import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Checkbox, Pill, Spinner, TextArea, TextField, useAction } from '../components/ui'
import { api } from '../lib/api'
import { quantityNoun } from '../lib/bookings'
import { eatToISO, formatKES, LEVEL_LABELS, todayInEAT, UNIT_LABELS } from '../lib/format'
import type { Booking, PublicListing } from '../lib/types'

/** SR-F-BKG-01, 02: date, time, quantity, place and notes, then accept the rules and send. */
export default function RequestBooking() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState<PublicListing | null>(null)
  const [form, setForm] = useState({ date: '', time: '', quantity: '1', location_text: '', notes: '' })
  const [isRemote, setIsRemote] = useState(false)
  const [acceptRules, setAcceptRules] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const load = useAction()
  const { busy, error, run } = useAction()

  useEffect(() => {
    load.run(() => api<PublicListing>(`/listings/${listingId}/`, { auth: false })).then((result) => result && setListing(result))
  }, [listingId])

  if (load.error) {
    return <main className="page narrow"><Alert tone="error">This listing isn't available any more.</Alert></main>
  }
  if (!listing) return <Spinner />

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value })
  const perJob = listing.pricing_unit === 'per_job'
  const quantity = perJob ? 1 : Math.max(1, Number(form.quantity) || 1)
  const hasTerms = listing.provider_terms.trim() !== ''
  const fields = error?.fields ?? {}

  async function submit(event: FormEvent) {
    event.preventDefault()
    const booking = await run(() =>
      api<Booking>('/bookings/', {
        method: 'POST',
        body: {
          listing: listing!.id,
          scheduled_start: form.date && form.time ? eatToISO(form.date, form.time) : null,
          quantity,
          is_remote: isRemote,
          location_text: isRemote ? '' : form.location_text,
          notes: form.notes,
          accept_job_rules: acceptRules,
          accept_provider_terms: acceptTerms,
        },
      }),
    )
    if (booking) {
      navigate(`/bookings/${booking.id}`, {
        state: { flash: `Request ${booking.reference} sent. ${booking.provider.name.split(' ')[0]} has 24 hours to answer.` },
      })
    }
  }

  return (
    <main className="page narrow">
      <p className="eyebrow">Request a booking</p>
      <h1>{listing.title}</h1>
      <p className="lead">
        {listing.provider.name}{' '}
        <Pill tone={listing.provider.account_category === 'student' ? 'accent' : 'neutral'}>
          {listing.provider.account_category === 'student' ? 'Student' : 'General'}
        </Pill>{' '}
        <Pill>{LEVEL_LABELS[listing.provider.experience_level]}</Pill>
        <br />
        {listing.category.name} · {listing.area_name} · {formatKES(listing.price)} {UNIT_LABELS[listing.pricing_unit]}
      </p>

      <form onSubmit={submit} className="stack card" noValidate>
        <div className="grid-2 tight">
          <TextField id="date" label="Date" type="date" min={todayInEAT()} value={form.date} onChange={set('date')} error={fields.scheduled_start} />
          <TextField id="time" label="Start time" type="time" value={form.time} onChange={set('time')} hint="Kenya time" />
        </div>
        {!perJob && (
          <TextField
            id="quantity" label={`Number of ${quantityNoun(listing.pricing_unit)}`} type="number" min={1} max={24}
            value={form.quantity} onChange={set('quantity')} error={fields.quantity}
          />
        )}
        {listing.availability && <p className="field-hint">Usually available: {listing.availability}</p>}

        <Checkbox id="is_remote" label="This can be done remotely" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} />
        {!isRemote && (
          <TextField
            id="location_text" label="Where?" placeholder="e.g. Hostel B, room 12, MMU" value={form.location_text}
            onChange={set('location_text')} error={fields.location_text}
            hint="The provider sees this only after accepting your request."
          />
        )}
        <TextArea id="notes" label="Notes for the provider (optional)" rows={3} value={form.notes} onChange={set('notes')} error={fields.notes} />

        <div className="rules">
          <h3>{listing.category.name} job rules</h3>
          <ul>{listing.category.job_rules.split('\n').map((rule) => <li key={rule}>{rule}</li>)}</ul>
          <Checkbox id="accept_rules" label={`I accept the ${listing.category.name} job rules.`} checked={acceptRules} onChange={(e) => setAcceptRules(e.target.checked)} />
        </div>
        {hasTerms && (
          <div className="rules">
            <h3>{listing.provider.name.split(' ')[0]}'s terms</h3>
            <p className="muted">{listing.provider_terms}</p>
            <Checkbox id="accept_terms" label="I accept the provider's terms." checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
          </div>
        )}

        <div className="payout">
          <span>Total{perJob ? '' : ` for ${quantity} ${quantityNoun(listing.pricing_unit)}`}</span>
          <b className="mono">{formatKES(listing.price * quantity)}</b>
          <small>Nothing is charged now. You pay by M-Pesa once the provider accepts, and the funds are held in escrow until the job is complete.</small>
        </div>

        {error && !Object.keys(fields).length && <Alert tone="error">{error.message}</Alert>}
        <Button type="submit" busy={busy} disabled={!acceptRules || (hasTerms && !acceptTerms)}>Send request</Button>
      </form>
    </main>
  )
}

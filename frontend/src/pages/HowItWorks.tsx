import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead, SideToggle } from '../components/marketing'
import type { Side } from '../lib/marketing'

const JOURNEY: Record<Side, { title: string; body: string }[]> = {
  hire: [
    { title: 'Create your account', body: 'Sign up with your email and phone number and verify both. No documents are needed to hire.' },
    { title: 'Find a provider or post a job', body: 'Browse listings by category, or post a job with your budget and let providers see it on the job board.' },
    { title: 'Send a booking request', body: "Choose a date, time, length and place, and add notes. Accept the category's job rules and the provider's terms. Nothing is charged yet." },
    { title: 'Pay by M-Pesa', body: 'When the provider accepts (they have 24 hours), you have 2 hours to pay the full price by M-Pesa. Kazi Connect holds the money.' },
    { title: 'Confirm the work', body: 'The provider marks the job delivered. Confirm it, or raise a dispute within 48 hours if something is wrong.' },
    { title: 'Leave a review', body: 'Once the payment is released, you and the provider can review each other for 14 days.' },
  ],
  work: [
    { title: 'Upgrade to provider', body: 'From your account, start the provider setup: profile and skills, a verified M-Pesa payout number, your account category, and the code of conduct.' },
    { title: 'Verify as a student', body: 'Verify your MMU student email for the lower Student commission. It lasts 12 months, and we remind you before it expires.' },
    { title: 'Publish a listing', body: 'Set your price per job, hour or session. We show an estimate for your experience level, and you may price above or below it.' },
    { title: 'Answer requests', body: "Accept or decline each request within 24 hours. Accepting means you accept the category's job rules too. Your exact location is shared only after you accept." },
    { title: 'Do the job, mark it delivered', body: "Start once the booking shows as paid. When you're done, mark it delivered, with proof if you like." },
    { title: 'Get paid', body: 'You receive the price less commission to your M-Pesa number when the client confirms, or automatically 48 hours after delivery if there is no dispute.' },
  ],
}

const STATES = [
  { state: 'Requested', note: 'Client sends the request' },
  { state: 'Accepted', note: 'Provider answers within 24 h' },
  { state: 'Paid', note: 'Client pays within 2 h' },
  { state: 'In progress', note: 'Provider starts the job' },
  { state: 'Delivered', note: '48 h to confirm or dispute' },
  { state: 'Completed', note: 'Money released, reviews open' },
]

const TIMINGS = [
  ['Provider answers a request', '24 hours, then it expires'],
  ['Client pays after acceptance', '2 hours, then the booking is cancelled'],
  ['Client confirms after delivery', '48 hours, then the money is released'],
  ['Other side responds to a dispute', '48 hours'],
  ['Admin decides a dispute', 'Target of 5 working days'],
  ['Appeal a dispute decision', 'Once, within 7 days'],
  ['Leave a review', '14 days after release'],
]

export default function HowItWorks() {
  const [side, setSide] = useState<Side>('hire')

  return (
    <main className="page info">
      <PageHead
        eyebrow="How it works"
        title="From first search to final review"
        lead="Every booking follows the same steps, so both sides always know what happens next and by when."
      >
        <SideToggle side={side} onChange={setSide} />
      </PageHead>

      <ol className="journey">
        {JOURNEY[side].map((step, index) => (
          <li key={step.title}>
            <span className="journey-num">{index + 1}</span>
            <div><h3>{step.title}</h3><p className="muted">{step.body}</p></div>
          </li>
        ))}
      </ol>

      <section className="info-section">
        <h2 className="mk-title">The life of a booking</h2>
        <p className="muted mk-body">The usual path. A booking can also be declined, expire, be cancelled, or go to a dispute that ends in a release, a refund or a split.</p>
        <ol className="lifecycle">
          {STATES.map((s) => <li key={s.state}><b>{s.state}</b><span>{s.note}</span></li>)}
        </ol>
      </section>

      <section className="info-section grid-2 info-grid">
        <div>
          <h2 className="mk-title">Time limits</h2>
          <p className="muted mk-body">Timers keep bookings moving. Admins may adjust some of them; the current values are shown here.</p>
        </div>
        <table className="info-table">
          <tbody>{TIMINGS.map(([what, when]) => <tr key={what}><th scope="row">{what}</th><td>{when}</td></tr>)}</tbody>
        </table>
      </section>

      <div className="info-cta">
        <h2>Ready to start?</h2>
        <div className="actions">
          <Link to="/signup?intent=hire" className="btn btn-primary">Hire someone</Link>
          <Link to="/signup?intent=work" className="btn btn-secondary">Offer your services</Link>
        </div>
      </div>
    </main>
  )
}

import { Link } from 'react-router-dom'
import { CheckList, PageHead } from '../components/marketing'

export default function Pricing() {
  return (
    <main className="page info">
      <PageHead
        eyebrow="Pricing and fees"
        title="Free to join. We earn only when a job is paid."
        lead="Kazi Connect charges two fees: a commission on each paid job, and an optional fee for the verified badge."
      />

      <div className="mk-plans">
        <div className="mk-plan">
          <h3>Hiring</h3>
          <p className="mk-plan-price">Free</p>
          <CheckList>{[
            'Signing up and posting jobs is free',
            'You pay the price shown on the booking, nothing on top',
            'Pay by M-Pesa only after the provider accepts',
            'Money held until you confirm the work',
          ]}</CheckList>
        </div>
        <div className="mk-plan featured">
          <span className="mk-plan-tag">Lower rate for students</span>
          <h3>Working</h3>
          <p className="mk-plan-price">Commission <small>per paid job</small></p>
          <CheckList>{[
            'Listing your services is free',
            'Student accounts pay a lower rate than General accounts',
            'Your rate is fixed on each booking when the client pays',
            'Rounded down to whole shillings, in your favour',
          ]}</CheckList>
        </div>
      </div>

      <section className="info-section grid-2 info-grid">
        <div>
          <h2 className="mk-title">Where the money goes</h2>
          <p className="muted mk-body">
            An example 2-session tutoring booking at KES 500 per session. Commission rates are set by Kazi Connect admins and
            shown to providers before they publish a listing.
          </p>
        </div>
        <ol className="money-flow">
          <li><b>Client pays</b><span className="money">KES 1,000</span><small>By M-Pesa, after the tutor accepts</small></li>
          <li><b>Kazi Connect holds it</b><span className="money">KES 1,000</span><small>Until the client confirms, or 48 h after delivery</small></li>
          <li><b>Tutor receives</b><span className="money">KES 1,000 − commission</span><small>To their verified M-Pesa payout number</small></li>
        </ol>
      </section>

      <section className="info-section">
        <h2 className="mk-title">Other fees and refunds</h2>
        <div className="cards">
          <div className="card">
            <h3>Verified badge</h3>
            <p className="muted">Optional. A one-off fee for a manual check of your national ID (and student ID for Student accounts). It lasts 12 months. If your application is rejected, you can resubmit once within 30 days without paying again.</p>
          </div>
          <div className="card">
            <h3>Cancellations</h3>
            <p className="muted">Free for either side before payment. A client who cancels a paid booking more than 24 hours before the start gets a full refund. Cancelling within 24 hours of the start may carry a late cancellation fee, which goes to the provider.</p>
          </div>
          <div className="card">
            <h3>Disputes</h3>
            <p className="muted">No fee. An admin decides on a full release, a full refund, or a split. Commission applies only to the provider's share.</p>
          </div>
        </div>
      </section>

      <div className="info-cta">
        <h2>Questions about a payment?</h2>
        <div className="actions">
          <Link to="/help" className="btn btn-secondary">Help centre</Link>
          <Link to="/contact" className="btn btn-ghost">Contact us</Link>
        </div>
      </div>
    </main>
  )
}

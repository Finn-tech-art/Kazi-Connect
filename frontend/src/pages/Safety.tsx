import { Link } from 'react-router-dom'
import { Icon } from '../components/icons'
import { CheckList, PageHead } from '../components/marketing'
import { useCategories } from '../lib/categories'
import { FALLBACK_CATEGORIES } from '../lib/marketing'

/** SR-F-SAF-05: a safety page with emergency numbers, linked from every active booking. */
export default function Safety() {
  const loaded = useCategories()
  const categories = loaded.length ? loaded : FALLBACK_CATEGORIES

  return (
    <main className="page info">
      <PageHead
        eyebrow="Trust and safety"
        title="Staying safe on Kazi Connect"
        lead="How Kazi Connect keeps clients and providers safe, and what to do if something goes wrong."
      />

      <div className="emergency" role="note">
        <span className="mk-icon danger"><Icon name="phone" /></span>
        <div>
          <h2>In an emergency, call 999 or 112</h2>
          <p>If you are in danger, leave the situation and call the police first. Then tell us, and quote the booking reference.</p>
        </div>
        <div className="emergency-numbers">
          <a href="tel:999" className="btn btn-danger">Call 999</a>
          <a href="tel:112" className="btn btn-secondary">Call 112</a>
        </div>
      </div>

      <section className="info-section">
        <h2 className="mk-title">How we protect you</h2>
        <div className="mk-trust">
          <div className="mk-trust-card">
            <span className="mk-icon"><Icon name="user" /></span>
            <h3>Verified accounts</h3>
            <p className="muted">Email and phone verified for everyone. Students verify an MMU email every year. The optional verified badge adds a manual ID review, and ID images are deleted 30 days after the decision.</p>
          </div>
          <div className="mk-trust-card">
            <span className="mk-icon"><Icon name="lock" /></span>
            <h3>Private details</h3>
            <p className="muted">The client's exact location is shown to the provider only after they accept the booking. Phone numbers are not shown on public profiles.</p>
          </div>
          <div className="mk-trust-card">
            <span className="mk-icon"><Icon name="wallet" /></span>
            <h3>Protected money</h3>
            <p className="muted">Payment is held until the client confirms. A dispute freezes the money until an admin decides, and every movement is recorded in a ledger that can't be edited.</p>
          </div>
        </div>
      </section>

      <section className="info-section grid-2 info-grid">
        <div>
          <h2 className="mk-title">Safety tips</h2>
          <p className="muted mk-body">Precautions for both sides of a booking.</p>
        </div>
        <div className="grid-2 tight">
          <div className="card">
            <h3>If you're hiring</h3>
            <CheckList>{[
              "Check the provider's category, level and reviews",
              'Keep payment and messages on Kazi Connect',
              'Be present, or have an adult present, at the start and end of home jobs',
              'For learners under 18, a parent or guardian stays on the premises',
            ]}</CheckList>
          </div>
          <div className="card">
            <h3>If you're working</h3>
            <CheckList>{[
              'Only start once the booking shows as paid',
              'Tell a friend where you are going and when',
              'Meet in shared areas of a home or in public places',
              'If you feel unsafe, leave and report it to us',
            ]}</CheckList>
          </div>
        </div>
      </section>

      <section className="info-section">
        <h2 className="mk-title">Job rules by category</h2>
        <p className="muted mk-body">Both sides accept these before a booking is confirmed. Providers may add their own terms, but never weaker ones.</p>
        <div className="cards">
          {categories.map((category) => (
            <div key={category.slug} className="card">
              <h3>{category.name}</h3>
              <ul className="plain-list rule-list">{category.job_rules.split('\n').map((rule) => <li key={rule}>{rule}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section className="info-section grid-2 info-grid">
        <div>
          <h2 className="mk-title">When something goes wrong</h2>
        </div>
        <div className="stack">
          <div className="card">
            <h3>Raise a dispute</h3>
            <p className="muted">From payment until release, either side can raise a dispute with a reason and evidence. The money is frozen, the other side has 48 hours to respond, and an admin decides. You can appeal once within 7 days, and a different admin reviews it.</p>
          </div>
          <div className="card">
            <h3>Report a person, listing, message or review</h3>
            <p className="muted">Reports go to our admin team, and you receive an acknowledgement by email. Admins can suspend or ban accounts that break the rules.</p>
          </div>
          <div className="card">
            <h3>Stay on the platform</h3>
            <p className="muted">Jobs arranged outside Kazi Connect have no payment protection, no dispute support and can't be reviewed.</p>
          </div>
        </div>
      </section>

      <div className="info-cta">
        <h2>Need to report something?</h2>
        <div className="actions"><Link to="/contact" className="btn btn-primary">Contact us</Link></div>
      </div>
    </main>
  )
}

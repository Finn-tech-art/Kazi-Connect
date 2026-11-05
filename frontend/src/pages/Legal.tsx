import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../components/ui'
import { PageHead } from '../components/marketing'
import { SUPPORT_EMAIL } from '../lib/marketing'

// Both documents are drafted from the SRS business rules and data requirements.
// They need a legal review before launch (SRS 1.3.4: Data Protection Act, 2019).
const UPDATED = '5 November 2026'

function LegalPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <main className="page info narrow-info legal">
      <PageHead eyebrow={eyebrow} title={title} lead={`Last updated ${UPDATED}`} />
      <Alert tone="info">Draft for the Kazi Connect pilot. This text will be reviewed before public launch.</Alert>
      {children}
    </main>
  )
}

export function Privacy() {
  return (
    <LegalPage eyebrow="Privacy notice" title="How we handle your data">
      <section>
        <h2>Who we are</h2>
        <p>Kazi Connect is a marketplace that connects clients with service providers near Multimedia University of Kenya. We process personal data in line with Kenya's Data Protection Act, 2019.</p>
      </section>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li><b>Account details:</b> your name, email address, phone number, account category and mode.</li>
          <li><b>Student verification:</b> your student email address and its verification and expiry dates.</li>
          <li><b>Provider details:</b> your profile, skills, listings and M-Pesa payout number.</li>
          <li><b>Bookings and payments:</b> booking details, M-Pesa receipt numbers, amounts and payouts.</li>
          <li><b>Messages, reviews, reports and disputes</b> you send or that concern you.</li>
          <li><b>Verified badge documents</b>, only if you apply: images of your national ID and, for Student accounts, your student ID.</li>
          <li><b>Location</b>, only if you allow it, to find services near you. We ask for this separately.</li>
        </ul>
        <p>We collect only what the platform needs to work. We do not sell your data.</p>
      </section>
      <section>
        <h2>Why we use it</h2>
        <ul>
          <li>To create and verify your account and confirm student status.</li>
          <li>To run bookings, take payments by M-Pesa, hold them in escrow and pay providers.</li>
          <li>To show reviews and experience levels, and rank search results.</li>
          <li>To resolve disputes and reports, and keep the platform safe.</li>
          <li>To send you emails about your account and bookings.</li>
        </ul>
      </section>
      <section>
        <h2>Who we share it with</h2>
        <p>Safaricom (M-Pesa) to process payments, our email and SMS providers to send messages, and map services to find places. The other party on a booking sees what they need for the job. For example, a provider sees your location only after accepting your request.</p>
      </section>
      <section>
        <h2>How long we keep it</h2>
        <table className="info-table">
          <tbody>
            <tr><th scope="row">ID document images</th><td>30 days after the badge decision</td></tr>
            <tr><th scope="row">Chat messages</th><td>12 months after your last booking with that person</td></tr>
            <tr><th scope="row">Payment and ledger records</th><td>5 years, or as tax law requires</td></tr>
            <tr><th scope="row">Dispute records and evidence</th><td>2 years after the decision</td></tr>
            <tr><th scope="row">Account data after you ask us to delete it</th><td>Deleted or anonymised within 30 days, except financial records</td></tr>
          </tbody>
        </table>
      </section>
      <section>
        <h2>How we protect it</h2>
        <p>Identity documents are encrypted, only authorised admins can open them, and every view is logged. Admins read chat history only while handling a dispute or report, and that access is logged too.</p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>You can view and update your personal data, download a copy (JSON or CSV), withdraw consent to location access, and ask us to delete your account. We handle deletion requests within 30 days. You may also complain to the Office of the Data Protection Commissioner.</p>
        <p>To make a request, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  )
}

export function Terms() {
  return (
    <LegalPage eyebrow="Terms of service" title="The rules of Kazi Connect">
      <section>
        <h2>1. Accounts</h2>
        <ul>
          <li>Everyone starts as a client, with a verified email address and phone number.</li>
          <li>Clients can upgrade to provider by completing the provider setup, and providers can switch back to Hiring mode with the same sign-in.</li>
          <li>Every account is Student or General. Student requires a verified MMU student email, valid for 12 months and renewed every year. A lapsed account becomes General until it is reverified.</li>
          <li>Keep your sign-in details private. You are responsible for activity on your account.</li>
        </ul>
      </section>
      <section>
        <h2>2. Listings and prices</h2>
        <p>Providers set their own prices. We show an estimate based on the category and the provider's experience, and providers may price above or below it, within the limits for the category.</p>
      </section>
      <section>
        <h2>3. Bookings and job rules</h2>
        <ul>
          <li>Each category has job rules. Client and provider both accept them before a booking is confirmed. Providers may add their own terms, which may add to the rules but not weaken them.</li>
          <li>A provider has 24 hours to accept or decline a request. After acceptance the client has 2 hours to pay.</li>
          <li>Either side may cancel at no cost before payment. A client who cancels a paid booking more than 24 hours before the start gets a full refund. Cancelling within 24 hours of the start may carry the late cancellation fee for the category, which goes to the provider.</li>
        </ul>
      </section>
      <section>
        <h2>4. Payment</h2>
        <ul>
          <li>The client pays the full price by M-Pesa before the job. Kazi Connect holds the funds in escrow until the provider marks the job delivered and the client confirms.</li>
          <li>If the client neither confirms nor disputes within 48 hours of delivery, the payment is released to the provider.</li>
          <li>We keep a commission set by admins. The Student rate is lower than the General rate. Each booking uses the rate in force when the client pays.</li>
        </ul>
      </section>
      <section>
        <h2>5. Disputes</h2>
        <p>Either side may raise a dispute between payment and release. The payment then remains in escrow until an admin decides on a release, a refund or a split. Each side may appeal once within 7 days, and a different admin's decision on appeal is final.</p>
      </section>
      <section>
        <h2>6. Reviews</h2>
        <p>Only the client who paid for a completed booking may review the provider, and only that provider may rate the client. Admins may hide reviews that break our policies but never edit them.</p>
      </section>
      <section>
        <h2>7. Jobs arranged off the platform</h2>
        <p>You may choose to arrange a service outside Kazi Connect, but it then has no payment protection, no dispute support and no reviews.</p>
      </section>
      <section>
        <h2>8. Conduct and safety</h2>
        <p>Treat others with respect, follow the job rules and the law, and don't misuse other people's data. We may suspend or ban accounts that break these terms. Read our <Link to="/safety">trust and safety</Link> page for how to stay safe and report problems.</p>
      </section>
      <section>
        <h2>9. Privacy</h2>
        <p>Our <Link to="/privacy">privacy notice</Link> explains how we collect and use your personal data.</p>
      </section>
      <section>
        <h2>10. Contact</h2>
        <p>Questions about these terms? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </section>
    </LegalPage>
  )
}

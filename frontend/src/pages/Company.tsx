import { Link } from 'react-router-dom'
import { useCategories } from '../lib/categories'
import { SUPPORT_EMAIL } from '../lib/marketing'

export function About() {
  return (
    <main className="page narrow stack">
      <p className="eyebrow">About us</p>
      <h1>A local services marketplace for the MMU community</h1>
      <p className="lead">
        Kazi Connect links people near MMU with students and local providers who can tutor, clean, photograph and
        design. We started it because finding someone you can trust for a small job shouldn't depend on who you know.
      </p>
      <div className="cards three">
        <div className="card"><h3>Verified people</h3><p className="muted">Every account confirms an email and phone. Students verify their MMU email every year.</p></div>
        <div className="card"><h3>Escrow payments</h3><p className="muted">Clients pay by M-Pesa up front, and the funds are held in escrow. Providers are paid once the client confirms the work is complete.</p></div>
        <div className="card"><h3>Real reviews</h3><p className="muted">Only paid, completed jobs can be reviewed, by both sides.</p></div>
      </div>
    </main>
  )
}

export function Services() {
  const categories = useCategories()

  return (
    <main className="page stack">
      <p className="eyebrow">Services</p>
      <h1>What you can hire for</h1>
      <p className="lead">Pick a category to see providers, or open the job board if you want to take on work.</p>
      <div className="cards">
        {categories.map((category) => (
          <div key={category.slug} className="card stack">
            <div>
              <h3>{category.name}</h3>
              <p className="muted">{category.description}</p>
            </div>
            <div className="actions">
              <Link to={`/find?category=${category.slug}`} className="btn btn-primary">Hire</Link>
              <Link to={`/job-board?category=${category.slug}`} className="btn btn-secondary">Find work</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

export function Contact() {
  return (
    <main className="page narrow stack">
      <p className="eyebrow">Contact us</p>
      <h1>Contact the Kazi Connect team</h1>
      <p className="lead">
        Questions about a booking, a payment or your account? Email us and we'll get back to you.
      </p>
      <div className="card stack">
        <div>
          <h3>Email</h3>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </div>
        <div>
          <h3>Problem with a job?</h3>
          <p className="muted">Email us with the booking reference so we can see the job details while we look into it.</p>
        </div>
      </div>
    </main>
  )
}

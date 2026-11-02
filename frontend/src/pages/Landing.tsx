import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { api } from '../lib/api'
import type { Category } from '../lib/types'

export default function Landing() {
  const { account } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const active = account?.status === 'active'

  useEffect(() => {
    api<Category[]>('/categories/', { auth: false }).then(setCategories).catch(() => undefined)
  }, [])

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Built by students for students</p>
        <h1 className="display">Hire verified students. Pay only when the job is done.</h1>
        <p className="lead">
          Tutors, cleaners, photographers and designers near MMU. Your M-Pesa payment is held by Kazi Connect until you
          confirm delivery.
        </p>
        <div className="actions">
          <Link to={active ? '/jobs/new' : '/signup?intent=hire'} className="btn btn-primary">Post a job</Link>
          <Link to={active ? '/become-provider' : '/signup?intent=work'} className="btn btn-secondary">Offer your services</Link>
        </div>
      </section>

      <section className="cards four">
        {categories.map((category) => (
          <Link key={category.slug} to={`/find?category=${category.slug}`} className="card link-card">
            <h3>{category.name}</h3>
            <p className="muted">{category.description}</p>
          </Link>
        ))}
      </section>

      <section className="cards three">
        <div className="card"><h3>Verified people</h3><p className="muted">Every account confirms an email and phone. Students verify their MMU email every year.</p></div>
        <div className="card"><h3>Protected payment</h3><p className="muted">You pay by M-Pesa before the job; the provider is paid after you confirm it's done.</p></div>
        <div className="card"><h3>Real reviews</h3><p className="muted">Only paid, completed jobs can be reviewed, by both sides.</p></div>
      </section>
    </main>
  )
}

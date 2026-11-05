import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/icons'
import { FaqList, PageHead } from '../components/marketing'
import { FAQ } from '../lib/marketing'

export default function Help() {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const groups = FAQ
    .map((group) => ({ ...group, items: group.items.filter((item) => !needle || `${item.q} ${item.a}`.toLowerCase().includes(needle)) }))
    .filter((group) => group.items.length)

  return (
    <main className="page info narrow-info">
      <PageHead eyebrow="Help centre" title="How can we help?">
        <label className="help-search">
          <Icon name="search" />
          <input type="search" placeholder="Search questions, e.g. refund" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search help" />
        </label>
      </PageHead>

      {groups.length === 0 ? (
        <div className="card empty"><p>No answers match “{query}”. <Link to="/contact">Ask us directly</Link>.</p></div>
      ) : (
        groups.map((group) => (
          <section key={group.title} className="help-group">
            <h2>{group.title}</h2>
            <FaqList items={group.items} />
          </section>
        ))
      )}

      <div className="info-cta">
        <h2>Still stuck?</h2>
        <p className="muted">Email us with your booking reference and we'll look into it.</p>
        <div className="actions">
          <Link to="/contact" className="btn btn-primary">Contact us</Link>
          <Link to="/safety" className="btn btn-secondary">Trust and safety</Link>
        </div>
      </div>
    </main>
  )
}

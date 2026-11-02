import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Pill, Spinner, useAction } from '../components/ui'
import { api } from '../lib/api'
import { formatDate, formatKES, formatKESRange, UNIT_LABELS } from '../lib/format'
import type { Account, JobPost, Listing, Page } from '../lib/types'

export default function Dashboard() {
  const { account } = useAuth()
  const location = useLocation()
  const flash = (location.state as { flash?: string } | null)?.flash
  if (!account) return null

  return (
    <main className="page">
      <p className="eyebrow">{account.active_mode === 'provider' ? 'Working mode' : 'Hiring mode'}</p>
      <h1>Habari, {account.full_name.split(' ')[0]}</h1>
      {flash && <Alert tone="success">{flash}</Alert>}
      {account.active_mode === 'provider' ? <ProviderDashboard /> : <ClientDashboard account={account} />}
    </main>
  )
}

function ClientDashboard({ account }: { account: Account }) {
  const [posts, setPosts] = useState<JobPost[] | null>(null)
  const { error, run } = useAction()

  useEffect(() => {
    run(() => api<Page<JobPost>>('/job-posts/mine/')).then((page) => page && setPosts(page.results))
  }, [])

  async function close(post: JobPost) {
    const updated = await run(() => api<JobPost>(`/job-posts/mine/${post.id}/close/`, { method: 'POST' }))
    if (updated) setPosts((current) => current?.map((p) => (p.id === updated.id ? updated : p)) ?? null)
  }

  return (
    <div className="grid-2">
      <section className="stack">
        <div className="section-head">
          <h2>Your job posts</h2>
          <Link to="/jobs/new" className="btn btn-primary">Post a job</Link>
        </div>
        {error && <Alert tone="error">{error.message}</Alert>}
        {posts === null ? <Spinner /> : posts.length === 0 ? (
          <div className="card empty">
            <p>You haven't posted a job yet. Describe what you need and providers near you will see it.</p>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="card row-card">
              <div>
                <div className="row-title">
                  <h3>{post.title}</h3>
                  <Pill tone={post.status === 'open' && !post.is_expired ? 'success' : 'neutral'}>
                    {post.status === 'open' && post.is_expired ? 'expired' : post.status}
                  </Pill>
                </div>
                <p className="muted">
                  {post.category_name} · {post.is_remote ? 'Remote' : post.area_name} · posted {formatDate(post.created_at)}
                </p>
              </div>
              <div className="row-side">
                <span className="money">{formatKESRange(post.budget_min, post.budget_max)}</span>
                {post.status === 'open' && <Button variant="ghost" onClick={() => close(post)}>Close</Button>}
              </div>
            </article>
          ))
        )}
      </section>
      <aside className="stack">
        <ProviderPromo account={account} />
      </aside>
    </div>
  )
}

function ProviderPromo({ account }: { account: Account }) {
  const provider = account.provider
  if (provider?.status === 'active') {
    return (
      <div className="card">
        <h3>You're a provider</h3>
        <p className="muted">Switch to Working mode to manage your listings and browse jobs.</p>
      </div>
    )
  }
  return (
    <div className="card accent-card">
      <h3>{provider ? `Provider setup: ${provider.steps_done} of 5 done` : 'Earn with your skills'}</h3>
      <p className="muted">
        {account.category === 'student'
          ? 'Student accounts pay a lower commission.'
          : 'MMU students pay a lower commission after verifying their student email.'}
      </p>
      <Link to="/become-provider" className="btn btn-secondary">{provider ? 'Continue setup' : 'Become a provider'}</Link>
    </div>
  )
}

const LISTING_TONE = { draft: 'neutral', published: 'success', paused: 'accent', removed: 'neutral' } as const

function ProviderDashboard() {
  const [listings, setListings] = useState<Listing[] | null>(null)
  const { error, run } = useAction()

  useEffect(() => {
    run(() => api<Page<Listing>>('/provider/listings/')).then((page) => page && setListings(page.results))
  }, [])

  return (
    <div className="grid-2">
      <section className="stack">
        <div className="section-head">
          <h2>Your listings</h2>
          <Link to="/listings/new" className="btn btn-primary">New listing</Link>
        </div>
        {error && <Alert tone="error">{error.message}</Alert>}
        {listings === null ? <Spinner /> : listings.length === 0 ? (
          <div className="card empty"><p>No listings yet.</p></div>
        ) : (
          listings.map((listing) => (
            <Link key={listing.id} to={`/listings/${listing.id}`} className="card row-card link-card">
              <div>
                <div className="row-title">
                  <h3>{listing.title}</h3>
                  <Pill tone={LISTING_TONE[listing.status]}>{listing.status}</Pill>
                </div>
                <p className="muted">{listing.category_name} · {listing.area_name || 'No location yet'}</p>
              </div>
              <span className="money">{formatKES(listing.price)} <small>{UNIT_LABELS[listing.pricing_unit]}</small></span>
            </Link>
          ))
        )}
      </section>
      <aside className="stack">
        <div className="card">
          <h3>Clients are posting jobs</h3>
          <p className="muted">See open job requests in your categories.</p>
          <Link to="/job-board" className="btn btn-secondary">Open the job board</Link>
        </div>
      </aside>
    </div>
  )
}

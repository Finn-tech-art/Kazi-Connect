import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Pill, Spinner, useAction } from '../components/ui'
import { api } from '../lib/api'
import { formatKES, LEVEL_LABELS, UNIT_LABELS } from '../lib/format'
import type { Category, Page, PublicListing } from '../lib/types'

/** Published listings. Location search and the map arrive with SR-F-SRC. */
export default function FindServices() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? ''
  const [categories, setCategories] = useState<Category[]>([])
  const [page, setPage] = useState<Page<PublicListing> | null>(null)
  const { error, run } = useAction()

  useEffect(() => {
    api<Category[]>('/categories/', { auth: false }).then(setCategories)
  }, [])

  useEffect(() => {
    setPage(null)
    run(() => api<Page<PublicListing>>(`/listings/${category ? `?category=${category}` : ''}`, { auth: false })).then((result) => result && setPage(result))
  }, [category])

  return (
    <main className="page">
      <h1>Find services</h1>
      <div className="chips" role="group" aria-label="Filter by category">
        <button type="button" className={category === '' ? 'on' : ''} onClick={() => setParams({})}>All</button>
        {categories.map((c) => (
          <button type="button" key={c.slug} className={category === c.slug ? 'on' : ''} onClick={() => setParams({ category: c.slug })}>{c.name}</button>
        ))}
      </div>
      {error && <Alert tone="error">{error.message}</Alert>}
      {page === null ? <Spinner /> : page.results.length === 0 ? (
        <div className="card empty"><p>No published listings here yet.</p></div>
      ) : (
        <div className="cards">
          {page.results.map((listing) => (
            <article key={listing.id} className="card stack">
              <p className="muted">
                {listing.provider.name}{' '}
                <Pill tone={listing.provider.account_category === 'student' ? 'accent' : 'neutral'}>
                  {listing.provider.account_category === 'student' ? 'Student' : 'General'}
                </Pill>{' '}
                <Pill>{LEVEL_LABELS[listing.provider.experience_level]}</Pill>
              </p>
              <h3>{listing.title}</h3>
              <p>{listing.description}</p>
              <p className="muted">{listing.category.name} · {listing.area_name} · travels up to {listing.radius_km} km</p>
              <div className="row-title">
                <p className="preview-price"><span>From</span> <b className="mono">{formatKES(listing.price)}</b> <small>{UNIT_LABELS[listing.pricing_unit]}</small></p>
                <Link to={`/book/${listing.id}`} className="btn btn-secondary">Request booking</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

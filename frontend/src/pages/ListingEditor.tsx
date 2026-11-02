import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Pill, Select, Spinner, TextArea, TextField, useAction } from '../components/ui'
import { api } from '../lib/api'
import { formatKES, formatKESRange, LEVEL_LABELS, netAfterCommission, UNIT_LABELS } from '../lib/format'
import type { Category, ExperienceLevel, Listing, PricingUnit } from '../lib/types'

type Form = {
  category: string
  title: string
  description: string
  price: string
  pricing_unit: PricingUnit
  area_name: string
  radius_km: string
  availability: string
  provider_terms: string
}

const EMPTY: Form = {
  category: '', title: '', description: '', price: '', pricing_unit: 'per_session',
  area_name: '', radius_km: '5', availability: '', provider_terms: '',
}

const LEVELS: ExperienceLevel[] = ['entry', 'intermediate', 'experienced']

/** Listing editor with the price estimate (Figma: Provider / 08). */
export default function ListingEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { account, refreshAccount } = useAuth()
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [notice, setNotice] = useState<string | null>(null)
  const save = useAction()
  const load = useAction()

  useEffect(() => {
    load.run(async () => setCategories(await api<Category[]>('/categories/', { auth: false })))
  }, [])

  useEffect(() => {
    if (!id) {
      setListing(null)
      setForm(EMPTY)
      return
    }
    if (listing?.id === Number(id)) return // just created here; no need to fetch it again
    load.run(async () => {
      const existing = await api<Listing>(`/provider/listings/${id}/`)
      setListing(existing)
      setForm({ ...existing, category: String(existing.category), price: String(existing.price), radius_km: String(existing.radius_km) })
    })
  }, [id])

  if (!account?.provider) return <Navigate to="/become-provider" replace />
  if (load.error) return <main className="page narrow"><Alert tone="error">{load.error.message}</Alert></main>
  if (!categories || (id && !listing)) return <Spinner />

  const category = categories.find((c) => String(c.id) === form.category)
  const pricing = category?.pricing.find((p) => p.unit === form.pricing_unit)
  const level = account.provider.experience_level
  const price = Number(form.price) || 0
  const payout = netAfterCommission(price, account.commission_percent)
  const fields = save.error?.fields ?? {}
  const set = (field: keyof Form) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value })

  async function persist(publish: boolean) {
    setNotice(null)
    const body = { ...form, category: Number(form.category) || null, price: price || null, radius_km: Number(form.radius_km) || null }
    // Save first, and remember the result even if publishing then fails, so a retry
    // updates this listing instead of creating a second one.
    const saved = await save.run(() =>
      listing
        ? api<Listing>(`/provider/listings/${listing.id}/`, { method: 'PATCH', body })
        : api<Listing>('/provider/listings/', { method: 'POST', body }),
    )
    if (!saved) return
    setListing(saved)
    if (!listing) navigate(`/listings/${saved.id}`, { replace: true })

    const published = publish ? await save.run(() => api<Listing>(`/provider/listings/${saved.id}/publish/`, { method: 'POST' })) : null
    if (published) setListing(published)
    if (!publish || published) setNotice(published ? 'Published. Clients can find this listing now.' : 'Saved.')
    await refreshAccount() // the first listing completes a provider step
  }

  async function changeStatus(action: 'pause' | 'remove') {
    if (!listing) return
    const result = await save.run(() =>
      action === 'pause'
        ? api<Listing>(`/provider/listings/${listing.id}/pause/`, { method: 'POST' })
        : api<undefined>(`/provider/listings/${listing.id}/`, { method: 'DELETE' }).then(() => null),
    )
    if (result === null) navigate('/dashboard', { state: { flash: 'Listing removed.' } })
    else if (result) setListing(result)
  }

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <h1>
            {listing ? 'Edit listing' : 'New listing'} {listing && <Pill tone={listing.status === 'published' ? 'success' : 'neutral'}>{listing.status}</Pill>}
          </h1>
          <p className="lead">Clients inside your service area will find this listing once you publish.</p>
        </div>
        <div className="actions">
          {listing?.status === 'published' ? (
            <Button busy={save.busy} onClick={() => persist(false)}>Save changes</Button>
          ) : (
            <>
              <Button variant="secondary" busy={save.busy} onClick={() => persist(false)}>Save draft</Button>
              <Button busy={save.busy} onClick={() => persist(true)}>Publish listing</Button>
            </>
          )}
        </div>
      </div>
      {notice && <Alert tone="success">{notice}</Alert>}
      {save.error && <Alert tone="error">{save.error.message}</Alert>}

      <div className="editor">
        <div className="stack">
          <section className="card stack">
            <h2>Basics</h2>
            <TextField id="title" label="Listing title" placeholder="KCSE Maths revision" value={form.title} onChange={set('title')} error={fields.title} />
            <div className="grid-2 tight">
              <Select id="category" label="Category" value={form.category} onChange={set('category')} error={fields.category}>
                <option value="">Choose a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select id="pricing_unit" label="Priced" value={form.pricing_unit} onChange={set('pricing_unit')} error={fields.pricing_unit}>
                {(Object.keys(UNIT_LABELS) as PricingUnit[]).map((unit) => <option key={unit} value={unit}>{UNIT_LABELS[unit]}</option>)}
              </Select>
            </div>
            <TextArea
              id="description" label="Description" rows={5} maxLength={600} value={form.description} onChange={set('description')}
              error={fields.description} hint={`What's included and what clients should prepare. ${form.description.length} / 600 (at least 80 to publish)`}
            />
          </section>

          <section className="card stack accent-card">
            <h2>Price</h2>
            {category && pricing ? (
              <>
                <p className="muted">
                  Based on {category.name} prices on Kazi and your experience level. You can price above or below.
                </p>
                <p>Your level: <b className="success-text">{LEVEL_LABELS[level]}</b></p>
                <div className="estimate">
                  <div className="estimate-top mono">
                    <span>Category min {formatKES(pricing.min_price)}</span>
                    {pricing.estimates[level] && (
                      <b>Suggested {formatKESRange(pricing.estimates[level]!.low, pricing.estimates[level]!.high)}</b>
                    )}
                    <span>Category max {formatKES(pricing.max_price)}</span>
                  </div>
                  <div className="estimate-bands">
                    {LEVELS.map((l) => pricing.estimates[l] && (
                      <span key={l} className={l === level ? 'mine' : ''}>
                        {LEVEL_LABELS[l]} {formatKESRange(pricing.estimates[l]!.low, pricing.estimates[l]!.high)}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="muted">
                {category ? `An admin hasn't set ${category.name} prices ${UNIT_LABELS[form.pricing_unit]} yet, so this can't be published.` : 'Choose a category to see the price estimate.'}
              </p>
            )}
            <div className="grid-2 tight">
              <TextField
                id="price" label={`Your price (KES, ${UNIT_LABELS[form.pricing_unit]})`} inputMode="numeric" className="mono big"
                value={form.price} onChange={set('price')} error={fields.price}
              />
              <div className="payout">
                <span>You receive {UNIT_LABELS[form.pricing_unit]}</span>
                <b className="mono">{payout ? formatKES(payout.net) : '—'}</b>
                <small>
                  {payout
                    ? `after ${account.commission_percent}% ${account.category === 'student' ? 'Student' : 'General'} commission`
                    : 'Commission rates are not set yet'}
                </small>
              </div>
            </div>
          </section>

          <section className="card stack">
            <h2>Service area and your terms</h2>
            <div className="grid-2 tight">
              <TextField id="area_name" label="Base location" placeholder="MMU Main Campus, Rongai" value={form.area_name} onChange={set('area_name')} error={fields.area_name} hint="Clients see this approximate area only." />
              <TextField id="radius_km" label="Travel up to (km)" inputMode="numeric" value={form.radius_km} onChange={set('radius_km')} error={fields.radius_km} />
            </div>
            <TextField id="availability" label="Availability" placeholder="Weekday evenings, Saturday mornings" value={form.availability} onChange={set('availability')} error={fields.availability} />
            <TextArea
              id="provider_terms" label="Your own terms (optional)" rows={2} value={form.provider_terms} onChange={set('provider_terms')}
              error={fields.provider_terms} hint={category ? `Your terms can add to the ${category.name} job rules but can't weaken them.` : undefined}
            />
          </section>

          {listing && listing.status !== 'removed' && (
            <div className="actions">
              {listing.status === 'published' && <Button variant="secondary" onClick={() => changeStatus('pause')}>Pause listing</Button>}
              <Button variant="ghost" onClick={() => changeStatus('remove')}>Remove listing</Button>
            </div>
          )}
        </div>

        <aside className="stack">
          <p className="eyebrow">How clients see it</p>
          <div className="card preview">
            <p className="muted">{account.full_name} {account.category === 'student' && <Pill tone="accent">Student</Pill>}</p>
            <h3>{form.title || 'Your listing title'}</h3>
            <p className="muted">{category?.name ?? 'Category'} · {form.area_name || 'Area'}</p>
            <p className="preview-price"><span>From</span> <b className="mono">{price ? formatKES(price) : 'KES —'}</b></p>
          </div>
          <div className="card">
            <h3>Before you publish</h3>
            {listing ? (
              <ul className="checks">
                {listing.publish_checks.map((check) => (
                  <li key={check.key} className={check.done ? 'done' : ''}>{check.label}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">Save a draft to see what's still missing.</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}

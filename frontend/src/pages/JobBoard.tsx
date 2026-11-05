import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Pill, Spinner, useAction } from '../components/ui'
import { api } from '../lib/api'
import { formatDate, formatKESRange } from '../lib/format'
import type { Category, OpenJobPost, Page } from '../lib/types'

/** Open job posts for providers (change request CR-01). */
export default function JobBoard() {
  const [categories, setCategories] = useState<Category[]>([])
  // The category lives in the URL so the top bar's "Find work" links can open a filtered board.
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? ''
  const setCategory = (slug: string) => setParams(slug ? { category: slug } : {})
  const [page, setPage] = useState<Page<OpenJobPost> | null>(null)
  const { error, run } = useAction()

  useEffect(() => {
    api<Category[]>('/categories/', { auth: false }).then(setCategories)
  }, [])

  useEffect(() => {
    setPage(null)
    run(() => api<Page<OpenJobPost>>(`/job-posts/${category ? `?category=${category}` : ''}`)).then((result) => result && setPage(result))
  }, [category])

  return (
    <main className="page">
      <p className="eyebrow">Working mode</p>
      <h1>Job board</h1>
      <p className="lead">Open requests from clients. You will be able to reply to a job once in-app messaging launches.</p>

      <div className="chips" role="group" aria-label="Filter by category">
        <button type="button" className={category === '' ? 'on' : ''} onClick={() => setCategory('')}>All</button>
        {categories.map((c) => (
          <button type="button" key={c.slug} className={category === c.slug ? 'on' : ''} onClick={() => setCategory(c.slug)}>{c.name}</button>
        ))}
      </div>

      {error && <Alert tone="error">{error.message}</Alert>}
      {page === null ? <Spinner /> : page.results.length === 0 ? (
        <div className="card empty"><p>No open jobs here yet.</p></div>
      ) : (
        <div className="cards">
          {page.results.map((post) => (
            <article key={post.id} className="card stack">
              <div className="row-title">
                <Pill>{post.category.name}</Pill>
                <span className="money">{formatKESRange(post.budget_min, post.budget_max)}</span>
              </div>
              <h3>{post.title}</h3>
              <p>{post.description}</p>
              <p className="muted">
                {post.is_remote ? 'Remote' : post.area_name}
                {post.preferred_date && ` · preferred ${formatDate(post.preferred_date)}`} · posted by {post.client.first_name}
                {post.client.account_category === 'student' && ' (Student)'} on {formatDate(post.created_at)}
              </p>
              <details>
                <summary>{post.category.name} job rules</summary>
                <ul>{post.category.job_rules.split('\n').map((rule) => <li key={rule}>{rule}</li>)}</ul>
              </details>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

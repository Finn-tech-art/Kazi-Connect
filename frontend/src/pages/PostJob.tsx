import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Checkbox, Select, Spinner, TextArea, TextField, useAction } from '../components/ui'
import { api } from '../lib/api'
import type { Category, JobPost } from '../lib/types'

const EMPTY = { category: '', title: '', description: '', budget_min: '', budget_max: '', area_name: '', preferred_date: '' }

export default function PostJob() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [isRemote, setIsRemote] = useState(false)
  const [acceptRules, setAcceptRules] = useState(false)
  const { busy, error, run } = useAction()

  useEffect(() => {
    api<Category[]>('/categories/', { auth: false }).then(setCategories)
  }, [])

  const category = categories?.find((c) => String(c.id) === form.category)
  const set = (field: keyof typeof EMPTY) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value })

  async function submit(event: FormEvent) {
    event.preventDefault()
    const post = await run(() =>
      api<JobPost>('/job-posts/mine/', {
        method: 'POST',
        body: {
          ...form,
          category: Number(form.category) || null,
          budget_min: Number(form.budget_min) || null,
          budget_max: Number(form.budget_max) || null,
          preferred_date: form.preferred_date || null,
          is_remote: isRemote,
          accept_job_rules: acceptRules,
        },
      }),
    )
    if (post) navigate('/dashboard', { state: { flash: `Your job "${post.title}" is posted. Providers can see it now.` } })
  }

  if (!categories) return <Spinner />
  const fields = error?.fields ?? {}

  return (
    <main className="page narrow">
      <p className="eyebrow">Hiring</p>
      <h1>Post a job</h1>
      <p className="lead">Describe what you need. Providers see your first name and rough area, never your phone or email.</p>

      <form onSubmit={submit} className="stack card" noValidate>
        <Select id="category" label="Category" value={form.category} onChange={set('category')} error={fields.category}>
          <option value="">Choose a category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <TextField id="title" label="Job title" placeholder="e.g. Clean a 2-bedroom flat" value={form.title} onChange={set('title')} error={fields.title} />
        <TextArea
          id="description" label="What needs doing?" rows={5} value={form.description} onChange={set('description')} error={fields.description}
          hint={`${form.description.length} / 2000. Include what's included and anything the provider should bring.`}
        />
        <div className="grid-2 tight">
          <TextField id="budget_min" label="Budget from (KES)" inputMode="numeric" value={form.budget_min} onChange={set('budget_min')} error={fields.budget_min} />
          <TextField id="budget_max" label="Budget up to (KES)" inputMode="numeric" value={form.budget_max} onChange={set('budget_max')} error={fields.budget_max} />
        </div>
        <Checkbox id="is_remote" label="This job can be done remotely" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} />
        {!isRemote && (
          <TextField
            id="area_name" label="Area" placeholder="e.g. Rongai, near MMU gate" value={form.area_name} onChange={set('area_name')}
            error={fields.area_name} hint="An approximate area only. Share the exact address after you book."
          />
        )}
        <TextField id="preferred_date" label="Preferred date (optional)" type="date" value={form.preferred_date} onChange={set('preferred_date')} error={fields.preferred_date} />

        {category && (
          <div className="rules">
            <h3>{category.name} job rules{category.is_higher_risk && <span className="pill pill-accent">Higher risk</span>}</h3>
            <ul>{category.job_rules.split('\n').map((rule) => <li key={rule}>{rule}</li>)}</ul>
            <Checkbox id="accept_rules" label={`I accept the ${category.name} job rules.`} checked={acceptRules} onChange={(e) => setAcceptRules(e.target.checked)} />
          </div>
        )}

        {error && !Object.keys(fields).length && <Alert tone="error">{error.message}</Alert>}
        <Button type="submit" busy={busy} disabled={!category || !acceptRules}>Post job</Button>
      </form>
    </main>
  )
}

import { supabase } from './supabase'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

/** An error response from the Django API, with per-field messages when the input was invalid. */
export class ApiError extends Error {
  status: number
  code?: string
  fields: Record<string, string>

  constructor(status: number, payload: Record<string, unknown>) {
    const fields: Record<string, string> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (key !== 'detail' && key !== 'code') fields[key] = Array.isArray(value) ? String(value[0]) : String(value)
    }
    const detail = typeof payload.detail === 'string' ? payload.detail : undefined
    super(detail ?? fields.non_field_errors ?? (Object.keys(fields).length ? 'Please fix the highlighted fields.' : 'Something went wrong. Please try again.'))
    this.status = status
    this.code = typeof payload.code === 'string' ? payload.code : undefined
    this.fields = fields
  }
}

type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; auth?: boolean }

/** Calls the Django API, sending the Supabase access token so Django knows who is asking. */
export async function api<T>(path: string, { method = 'GET', body, auth = true }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (auth) {
    // getSession() refreshes the access token first if it has expired.
    const { data } = await supabase.auth.getSession()
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_URL}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (response.status === 204) return undefined as T
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, payload)
  return payload as T
}

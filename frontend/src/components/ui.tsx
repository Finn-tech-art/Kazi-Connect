import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ApiError } from '../lib/api'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; busy?: boolean }

export function Button({ variant = 'primary', busy, disabled, children, className = '', ...rest }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={disabled || busy} {...rest}>
      {busy ? 'Please wait…' : children}
    </button>
  )
}

type FieldShell = { label: string; error?: string; hint?: ReactNode; id: string }

function Shell({ label, error, hint, id, children }: FieldShell & { children: ReactNode }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="field-error" id={`${id}-error`}>{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  )
}

export function TextField({ label, error, hint, id, ...rest }: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Shell label={label} error={error} hint={hint} id={id}>
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...rest} />
    </Shell>
  )
}

export function TextArea({ label, error, hint, id, ...rest }: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Shell label={label} error={error} hint={hint} id={id}>
      <textarea id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...rest} />
    </Shell>
  )
}

export function Select({ label, error, hint, id, children, ...rest }: FieldShell & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Shell label={label} error={error} hint={hint} id={id}>
      <select id={id} aria-invalid={Boolean(error)} {...rest}>{children}</select>
    </Shell>
  )
}

export function Checkbox({ label, error, id, ...rest }: { label: ReactNode; error?: string; id: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`checkbox ${error ? 'has-error' : ''}`}>
      <input type="checkbox" id={id} {...rest} />
      <label htmlFor={id}>{label}</label>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: ReactNode }) {
  return <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />
}

export function Pill({ tone = 'neutral', children }: { tone?: 'neutral' | 'accent' | 'success'; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

/**
 * Runs an API call and keeps track of whether it's busy and what went wrong,
 * so every form can show a clear confirmation or error (UR-NF-07).
 */
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    setBusy(true)
    setError(null)
    try {
      return await action()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, { detail: 'Network error. Check your connection and try again.' }))
      return undefined
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, run, setError }
}

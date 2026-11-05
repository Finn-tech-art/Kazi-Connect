import type { ExperienceLevel, PricingUnit } from './types'

// Money is whole Kenya shillings and times are East Africa Time (UR-NF-09).
const kes = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 })
const eatDate = new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric' })
const eatDateTime = new Intl.DateTimeFormat('en-KE', {
  timeZone: 'Africa/Nairobi', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
})
const eatIsoDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }) // en-CA writes YYYY-MM-DD

export const formatKES = (amount: number) => `KES ${kes.format(amount)}`

export const formatKESRange = (low: number, high: number) =>
  low === high ? formatKES(low) : `KES ${kes.format(low)}–${kes.format(high)}`

export const formatDate = (iso: string) => eatDate.format(new Date(iso))

export const formatDateTime = (iso: string) => eatDateTime.format(new Date(iso))

/** Today's date in Kenya, as a date input expects it. */
export const todayInEAT = () => eatIsoDate.format(new Date())

/** A date and time typed in Kenya (UTC+3 all year, no daylight saving) as an ISO timestamp. */
export const eatToISO = (date: string, time: string) => `${date}T${time}:00+03:00`

export const UNIT_LABELS: Record<PricingUnit, string> = {
  per_job: 'per job',
  per_hour: 'per hour',
  per_session: 'per session',
}

export const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Entry',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
}

/** Same rule as the backend: commission rounds down so the provider keeps the odd shilling. */
export function netAfterCommission(price: number, percent: string | null) {
  if (percent === null || !price) return null
  const commission = Math.floor((price * Number(percent)) / 100)
  return { commission, net: price - commission }
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('')

import type { BookingEvent, BookingRole, BookingState, PricingUnit } from './types'

/** Where each side's bookings live, in the API and in the app. */
export const BOOKINGS_PATH: Record<BookingRole, string> = {
  client: '/bookings',
  provider: '/provider/bookings',
}

export const STATE_TONE: Record<BookingState, 'neutral' | 'accent' | 'success'> = {
  requested: 'accent',
  accepted: 'success',
  paid: 'success',
  in_progress: 'success',
  delivered: 'success',
  disputed: 'accent',
  released: 'success',
  completed: 'success',
  declined: 'neutral',
  expired: 'neutral',
  cancelled: 'neutral',
  refunded: 'neutral',
}

const QUANTITY_NOUN: Record<PricingUnit, [string, string]> = {
  per_job: ['job', 'jobs'],
  per_hour: ['hour', 'hours'],
  per_session: ['session', 'sessions'],
}

export const quantityLabel = (unit: PricingUnit, quantity: number) =>
  `${quantity} ${QUANTITY_NOUN[unit][quantity === 1 ? 0 : 1]}`

export const quantityNoun = (unit: PricingUnit) => QUANTITY_NOUN[unit][1]

const EVENT_TEXT: Record<BookingState, string> = {
  requested: 'Request sent',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired: no answer in time',
  cancelled: 'Cancelled',
  paid: 'Paid',
  in_progress: 'Started',
  delivered: 'Marked delivered',
  disputed: 'Dispute raised',
  released: 'Payment released',
  refunded: 'Refunded',
  completed: 'Completed',
}

/** "Accepted by you", "Cancelled automatically", and so on. */
export function describeEvent(event: BookingEvent, viewer: BookingRole) {
  const text = EVENT_TEXT[event.to_state]
  if (event.actor_type === 'system') return event.to_state === 'expired' ? text : `${text} automatically`
  if (event.actor_type === viewer) return `${text} by you`
  return `${text} by the ${event.actor_type}`
}

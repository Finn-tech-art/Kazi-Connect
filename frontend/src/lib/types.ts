export type AccountCategory = 'student' | 'general'
export type AccountStatus = 'pending_verification' | 'active' | 'suspended' | 'banned' | 'deactivated'
export type Mode = 'client' | 'provider'
export type ExperienceLevel = 'entry' | 'intermediate' | 'experienced'
export type PricingUnit = 'per_job' | 'per_hour' | 'per_session'

export type ChecklistStep = {
  key: 'profile' | 'payout_phone' | 'category' | 'code_of_conduct' | 'listing'
  label: string
  done: boolean
}

export type ProviderInfo = {
  status: 'pending' | 'active'
  bio: string
  skills: string[]
  payout_phone: string
  payout_phone_verified: boolean
  experience_level: ExperienceLevel
  checklist: ChecklistStep[]
  steps_done: number
}

export type Account = {
  id: number
  full_name: string
  email: string
  phone: string
  phone_verified: boolean
  /** False while SMS codes are switched off (system evolution E-02). */
  phone_verification_enabled: boolean
  category: AccountCategory
  status: AccountStatus
  active_mode: Mode
  created_at: string
  student_verification: {
    student_email: string
    verified_at: string | null
    expires_at: string | null
    link_pending: boolean
  } | null
  provider: ProviderInfo | null
  commission_percent: string | null
}

export type CategoryPricing = {
  unit: PricingUnit
  min_price: number
  max_price: number
  estimates: Partial<Record<ExperienceLevel, { low: number; high: number }>>
}

export type Category = {
  id: number
  name: string
  slug: string
  description: string
  job_rules: string
  is_higher_risk: boolean
  requires_badge: boolean
  pricing: CategoryPricing[]
}

export type Check = { key: string; label: string; done: boolean }

export type Listing = {
  id: number
  category: number
  category_name: string
  title: string
  description: string
  price: number
  pricing_unit: PricingUnit
  area_name: string
  radius_km: number
  availability: string
  provider_terms: string
  status: 'draft' | 'published' | 'paused' | 'removed'
  published_at: string | null
  updated_at: string
  commission: number | null
  net_payout: number | null
  publish_checks: Check[]
}

export type PublicListing = {
  id: number
  title: string
  description: string
  price: number
  pricing_unit: PricingUnit
  area_name: string
  radius_km: number
  availability: string
  provider_terms: string
  category: { name: string; slug: string; job_rules: string }
  provider: { name: string; account_category: AccountCategory; experience_level: ExperienceLevel; member_since: string }
}

export type JobPost = {
  id: number
  category: number
  category_name: string
  title: string
  description: string
  budget_min: number
  budget_max: number
  area_name: string
  is_remote: boolean
  preferred_date: string | null
  status: 'open' | 'closed' | 'removed'
  expires_at: string
  is_expired: boolean
  created_at: string
}

export type OpenJobPost = {
  id: number
  category: { name: string; slug: string; job_rules: string }
  title: string
  description: string
  budget_min: number
  budget_max: number
  area_name: string
  is_remote: boolean
  preferred_date: string | null
  expires_at: string
  created_at: string
  client: { first_name: string; account_category: AccountCategory; member_since: string }
}

export type BookingState =
  | 'requested' | 'declined' | 'expired' | 'accepted' | 'cancelled' | 'paid'
  | 'in_progress' | 'delivered' | 'disputed' | 'released' | 'refunded' | 'completed'
export type BookingActor = 'client' | 'provider' | 'system' | 'admin'
/** Which side of a booking the viewer is on. */
export type BookingRole = 'client' | 'provider'

export type BookingEvent = { from_state: BookingState | ''; to_state: BookingState; actor_type: BookingActor; note: string; created_at: string }

export type Booking = {
  id: number
  reference: string
  state: BookingState
  state_label: string
  listing: { id: number; title: string } | null
  category_name: string
  scheduled_start: string
  quantity: number
  pricing_unit: PricingUnit
  unit_price_kes: number
  price_kes: number
  is_remote: boolean
  location_text: string
  location_hidden: boolean
  notes: string
  job_rules_snapshot: string
  provider_terms_snapshot: string
  response_due_at: string
  payment_due_at: string | null
  accepted_at: string | null
  cancelled_at: string | null
  cancelled_by: BookingActor | ''
  created_at: string
  client: { first_name: string; account_category: AccountCategory; member_since: string }
  provider: { name: string; account_category: AccountCategory; experience_level: ExperienceLevel }
  events: BookingEvent[]
  actions: ('accept' | 'decline' | 'cancel')[]
}

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] }

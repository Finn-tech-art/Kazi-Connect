import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabaseConfigured = Boolean(url && publishableKey)

// The publishable key is meant to be public. It only lets the browser talk to Supabase Auth;
// all Kazi Connect data goes through the Django API.
export const supabase = createClient(url || 'http://localhost:54321', publishableKey || 'not-configured')

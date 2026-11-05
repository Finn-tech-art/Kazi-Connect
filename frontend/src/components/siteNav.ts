import type { Category } from '../lib/types'

export type NavItem = { to: string; label: string; hint?: string }
export type NavGroup = { label: string; items: NavItem[]; footer?: NavItem }

/**
 * The public navigation, shared by the top bar dropdowns and the footer columns
 * so the two never drift apart.
 */
export function siteNav(categories: Category[]): NavGroup[] {
  return [
    {
      label: 'Hire talent',
      items: categories.map((c) => ({ to: `/find?category=${c.slug}`, label: c.name, hint: c.description })),
      footer: { to: '/find', label: 'Browse all categories' },
    },
    {
      label: 'Find work',
      items: categories.map((c) => ({ to: `/job-board?category=${c.slug}`, label: c.name, hint: c.description })),
      footer: { to: '/job-board', label: 'Browse all categories' },
    },
    {
      label: 'Why Kazi',
      items: [
        { to: '/how-it-works', label: 'How it works', hint: 'Every step from request to review' },
        { to: '/pricing', label: 'Pricing and fees', hint: 'Free to join, commission only on paid jobs' },
        { to: '/safety', label: 'Trust and safety', hint: 'Verification, protected payment, emergencies' },
        { to: '/help', label: 'Help centre', hint: 'Answers to common questions' },
      ],
    },
    {
      label: 'Company',
      items: [
        { to: '/about', label: 'About us', hint: 'Who we are and why we built Kazi Connect' },
        { to: '/services', label: 'Services', hint: 'What you can hire for, and how payment works' },
        { to: '/contact', label: 'Contact us', hint: 'Questions, disputes and support' },
      ],
    },
  ]
}

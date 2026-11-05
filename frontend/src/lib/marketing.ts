// Public-page copy, taken from the SRS (Kazi_Connect_SRS.docx). Kept in one place so the
// landing page, How it works, Pricing and Help never contradict each other.
import type { Category } from './types'

export type Side = 'hire' | 'work'

// TODO: replace with the real support inbox before launch.
export const SUPPORT_EMAIL = 'support@kaziconnect.example'

/** Photos and clips for each category (public/media). Unknown categories fall back to a generic photo. */
export const CATEGORY_MEDIA: Record<string, { video?: string; image: string }> = {
  tutoring: { image: '/media/tutoring.jpg' },
  'home-cleaning': { video: '/media/cat-cleaning.mp4', image: '/media/cat-cleaning.jpg' },
  photography: { image: '/media/editing.jpg' },
  'graphic-design': { video: '/media/cat-design.mp4', image: '/media/cat-design.jpg' },
}
export const FALLBACK_MEDIA = { image: '/media/online-meeting.jpg' }

/** Shown while the API loads or if it is unreachable, so the landing page is never empty (SRS Appendix B). */
export const FALLBACK_CATEGORIES: Category[] = [
  ['Tutoring', 'tutoring', 'Lessons, revision and homework help.',
    'Sessions with a learner under 18 take place with a parent or guardian present on the premises.\nSessions at a private home take place in a shared area of the home.\nSession length and subject are stated in the booking.'],
  ['Home cleaning', 'home-cleaning', 'Rooms, laundry and household cleaning.',
    'Work takes place between 7:00 and 19:00.\nThe client or an adult representative is present at the start and end of the job.\nThe client lists the rooms and tasks in the booking.'],
  ['Photography', 'photography', 'Events, portraits and product photos.',
    'The booking states the event, hours, number of edited photos and delivery date.\nThe client and provider agree in the booking how the photos may be used.\nDelivery means sending the final photos through an agreed link.'],
  ['Graphic design', 'graphic-design', 'Logos, posters, social media and print design.',
    "The booking states the deliverables, file formats, number of revisions and deadline.\nThe provider keeps the client's materials confidential.\nDelivery means sending final files through the platform chat or an agreed link."],
].map(([name, slug, description, job_rules], i) => ({
  id: -(i + 1), name, slug, description, job_rules, is_higher_risk: false, requires_badge: false, pricing: [],
}))

export type Step = { title: string; body: string; media: string; tone?: 'phone' | 'photo' }

export const STEPS: Record<Side, Step[]> = {
  hire: [
    { title: 'Find someone near campus', body: 'Browse verified students and local pros by category, or post a job for free and let providers come to you.', media: '/showcase/phone-find-services.png', tone: 'phone' },
    { title: 'Book with clear rules', body: "Pick a time and place. You and the provider both accept the category's job rules before anything is confirmed.", media: '/showcase/phone-request-booking.png', tone: 'phone' },
    { title: 'Pay when the work is done', body: 'Pay by M-Pesa after the provider accepts. We hold the money and release it only when you confirm the job is done.', media: '/showcase/phone-booking-accepted.png', tone: 'phone' },
  ],
  work: [
    { title: 'Verify and set up', body: 'Confirm your email and phone, add an M-Pesa payout number, and verify your MMU student email for the lower Student commission.', media: '/showcase/phone-provider-setup.png', tone: 'phone' },
    { title: 'List services or find jobs', body: 'Publish listings at your own price, with an estimate to guide you, and browse the job board for open requests.', media: '/showcase/phone-job-board.png', tone: 'phone' },
    { title: 'Get paid after you deliver', body: 'Accept requests, do the job and mark it delivered. You are paid once the client confirms, or automatically after 48 hours.', media: '/showcase/phone-provider-request.png', tone: 'phone' },
  ],
}

export type Faq = { q: string; a: string }
export type FaqGroup = { title: string; items: Faq[] }

export const FAQ: FaqGroup[] = [
  {
    title: 'Getting started',
    items: [
      { q: 'Who can use Kazi Connect?', a: 'Anyone can sign up to hire. We launched with Multimedia University of Kenya (MMU), so most providers are MMU students, but members of the public can also offer services on a General account.' },
      { q: 'What do I need to sign up?', a: 'A verified email address and phone number. Hiring needs no documents. You can become a provider later from the same account.' },
      { q: 'Can I hire and work with one account?', a: "Yes. Providers can switch between Working and Hiring mode at any time with the same sign-in. The current mode is always shown at the top of the screen." },
    ],
  },
  {
    title: 'Bookings and payment',
    items: [
      { q: 'When do I pay?', a: 'After the provider accepts your request. You then have 2 hours to pay the full price with M-Pesa, or the booking is cancelled. Nothing is charged when you send a request.' },
      { q: 'Who holds the money?', a: 'Kazi Connect holds your payment until the provider marks the job delivered and you confirm it. If you neither confirm nor raise a dispute within 48 hours of delivery, the payment is released to the provider.' },
      { q: 'What if the provider does not answer?', a: 'Providers have 24 hours to accept or decline. A request with no answer expires and you are not charged.' },
      { q: 'Can I cancel?', a: 'Either side can cancel before payment at no cost. If you cancel a paid booking more than 24 hours before the start, you get a full refund. Cancelling within 24 hours of the start may carry a late cancellation fee set for the category.' },
    ],
  },
  {
    title: 'For providers',
    items: [
      { q: 'How much does it cost to offer services?', a: 'Listing is free. We keep a commission on each paid job. Student accounts pay a lower rate than General accounts.' },
      { q: 'How do I get the Student rate?', a: 'Verify an MMU student email address. The verification lasts 12 months and must be renewed every year. If it lapses, the account moves to General until you reverify.' },
      { q: 'How do I get paid?', a: 'To your verified M-Pesa payout number, as the job price less commission, once the client confirms delivery or the 48-hour window ends with no dispute.' },
      { q: 'How is my experience level decided?', a: 'From your completed jobs and rating: Entry for 0 to 4 jobs, Intermediate for 5 to 19 jobs with a rating of 4.0 or more, and Experienced for 20 or more jobs with a rating of 4.3 or more.' },
    ],
  },
  {
    title: 'Trust and safety',
    items: [
      { q: 'What if something goes wrong with a job?', a: 'Either side can raise a dispute from payment until release. The money is frozen, the other side can respond within 48 hours, and an admin decides: release, refund or a split. Each side can appeal once within 7 days.' },
      { q: 'How do reviews work?', a: 'Only the client who paid for a completed booking can review the provider, and only that provider can rate the client. Reviews open after the payment is released and stay open for 14 days.' },
      { q: 'What is the verified badge?', a: 'An optional badge for users who pay a small fee and submit their national ID (and student ID for Student accounts) for manual review. It lasts 12 months and helps you appear higher in search.' },
      { q: 'Can I arrange a job outside the app?', a: "You can, but jobs arranged outside Kazi Connect have no payment protection, no dispute support and can't be reviewed." },
    ],
  },
]

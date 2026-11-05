import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Icon } from '../components/icons'
import { AutoVideo, categoryIcon, CheckList, FaqList, HeroReel, SideToggle } from '../components/marketing'
import { useCategories } from '../lib/categories'
import { CATEGORY_MEDIA, FALLBACK_CATEGORIES, FALLBACK_MEDIA, FAQ, STEPS, type Side } from '../lib/marketing'

const HERO: Record<Side, { title: string; lead: string }> = {
  hire: {
    title: 'Hire verified students. Pay only when the job is done.',
    lead: 'Tutors, cleaners, photographers and designers near MMU. Your M-Pesa payment is held in escrow and released only once you confirm the work is complete.',
  },
  work: {
    title: 'Offer your services to clients near campus.',
    lead: 'Set your own prices, take the jobs that fit your timetable, and get paid to M-Pesa when each job is confirmed. Verified MMU students pay a lower commission.',
  },
}

// All five clips, crossfading in the hero.
const HERO_CLIPS = ['hero-hire', 'hero-cleaning', 'hero-work', 'hero-office', 'cta-call'].map((name) => ({
  src: `/media/${name}.mp4`, poster: `/media/${name}.jpg`,
}))

export default function Landing() {
  const { account } = useAuth()
  const loaded = useCategories()
  const categories = loaded.length ? loaded : FALLBACK_CATEGORIES
  const active = account?.status === 'active'
  const [side, setSide] = useState<Side>('hire')
  const [categorySlug, setCategorySlug] = useState<string | null>(null)
  const category = categories.find((c) => c.slug === categorySlug) ?? categories[0]
  const media = CATEGORY_MEDIA[category.slug] ?? FALLBACK_MEDIA
  const hero = HERO[side]

  const hireLink = active ? '/jobs/new' : '/signup?intent=hire'
  const workLink = active ? '/become-provider' : '/signup?intent=work'

  return (
    <main className="mk">
      {/* Hero */}
      <section className="mk-hero">
        <HeroReel clips={HERO_CLIPS} className="mk-hero-media" />
        <div className="mk-hero-shade" />
        <div className="mk-hero-body">
          <SideToggle side={side} onChange={setSide} dark />
          <h1 className="mk-hero-title">{hero.title}</h1>
          <p className="mk-hero-lead">{hero.lead}</p>
          <div className="actions">
            {side === 'hire' ? (
              <>
                <Link to={hireLink} className="btn btn-primary btn-lg">Post a job <Icon name="arrow" size={18} /></Link>
                <Link to="/find" className="btn btn-glass btn-lg">Browse services</Link>
              </>
            ) : (
              <>
                <Link to={workLink} className="btn btn-primary btn-lg">Start earning <Icon name="arrow" size={18} /></Link>
                <Link to="/job-board" className="btn btn-glass btn-lg">See open jobs</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Who it's for and how it pays */}
      <section className="mk-brands" aria-label="Kazi Connect, launching with Multimedia University of Kenya, payments by M-Pesa">
        <p className="mk-kicker">Launching with the Multimedia University of Kenya community</p>
        <div className="mk-brands-row">
          <img src="/kazi-mark.svg" alt="Kazi Connect" />
          <img src="/brand/mmu.png" alt="Multimedia University of Kenya" />
          <img src="/brand/mpesa.svg" alt="M-Pesa" />
        </div>
      </section>

      {/* Categories */}
      <section className="mk-section">
        <h2 className="mk-title center">Browse services by category</h2>
        <div className="mk-tabs" role="tablist" aria-label="Service categories">
          {categories.map((c) => (
            <button
              key={c.slug} type="button" role="tab" aria-selected={c.slug === category.slug}
              className={c.slug === category.slug ? 'on' : ''} onClick={() => setCategorySlug(c.slug)}
            >
              <span className="mk-tab-icon"><Icon name={categoryIcon(c.slug)} size={20} /></span>
              {c.name}
            </button>
          ))}
        </div>
        <div className="mk-category" role="tabpanel">
          <div className="mk-category-media">
            {media.video
              ? <AutoVideo src={media.video} poster={media.image} label={category.name} />
              : <img src={media.image} alt={category.name} loading="lazy" />}
          </div>
          <div className="mk-category-body">
            <h3 className="mk-subtitle">{category.name}</h3>
            <p className="muted mk-body">{category.description}</p>
            <div className="mk-rules">
              <p className="mk-rules-head"><Icon name="shield" size={18} /> Job rules</p>
              <ul>{category.job_rules.split('\n').map((rule) => <li key={rule}>{rule}</li>)}</ul>
            </div>
            <div className="actions">
              <Link to={`/find?category=${category.slug}`} className="btn btn-primary">Hire for {category.name.toLowerCase()}</Link>
              <Link to={`/job-board?category=${category.slug}`} className="btn btn-secondary">Find {category.name.toLowerCase()} work</Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mk-section">
        <div className="mk-section-head">
          <h2 className="mk-title">How it works</h2>
          <SideToggle side={side} onChange={setSide} />
        </div>
        <div className="mk-steps">
          {STEPS[side].map((step, index) => (
            <article key={step.title} className="mk-step">
              <div className={`mk-step-media ${step.tone}`}><img src={step.media} alt="" loading="lazy" /></div>
              <p className="mk-step-num">Step {index + 1}</p>
              <h3>{step.title}</h3>
              <p className="muted">{step.body}</p>
            </article>
          ))}
        </div>
        <p className="center"><Link to="/how-it-works" className="mk-more">Every step of a booking <Icon name="arrow" size={16} /></Link></p>
      </section>

      {/* Product demo */}
      <section className="mk-split mk-band">
        <div className="mk-split-text">
          <p className="eyebrow">Booking</p>
          <h2 className="mk-title">Send a booking request in under a minute</h2>
          <p className="muted mk-body">
            Pick a listing, choose a time, accept the job rules and send. The provider has 24 hours to answer, and
            nothing is charged until they accept.
          </p>
          <CheckList>{[
            'Prices shown up front, per session, hour or job',
            'Your exact location is shared only after the provider accepts',
            "The category's job rules and the provider's terms, accepted by both sides",
          ]}</CheckList>
          <Link to="/find" className="btn btn-primary">Browse services</Link>
        </div>
        <div className="mk-split-media">
          <AutoVideo src="/showcase/booking-flow.mp4" poster="/showcase/booking-flow-poster.jpg" className="mk-demo" label="A client booking a tutor in Kazi Connect" />
        </div>
      </section>

      {/* Trust */}
      <section className="mk-section">
        <h2 className="mk-title center">Why book through Kazi Connect</h2>
        <p className="lead center mk-center-lead">A WhatsApp group or a friend's referral cannot verify identity, secure your payment in escrow, or show a provider's track record.</p>
        <div className="mk-trust">
          <div className="mk-trust-card">
            <span className="mk-icon"><Icon name="user" /></span>
            <h3>Verified people</h3>
            <p className="muted">Every account confirms an email address and phone number. Students verify their status annually with an MMU email, and an optional verified badge adds a manual ID check.</p>
          </div>
          <div className="mk-trust-card">
            <span className="mk-icon"><Icon name="wallet" /></span>
            <h3>Escrow payments</h3>
            <p className="muted">You pay by M-Pesa before the job begins, and the funds are held in escrow. The provider is paid once you confirm completion. If a dispute is raised, the funds stay in escrow until an admin rules on it.</p>
          </div>
          <div className="mk-trust-card">
            <span className="mk-icon"><Icon name="star" /></span>
            <h3>Reviews from real jobs</h3>
            <p className="muted">Only paid, completed bookings can be reviewed, and both parties review each other. Ratings and job history determine each provider's experience level.</p>
          </div>
        </div>
        <div className="mk-showcase">
          <AutoVideo src="/showcase/showcase-5s.mp4" poster="/showcase/showcase-5s-poster.jpg" label="Kazi Connect on a phone" />
          <div>
            <h3 className="mk-subtitle">Runs in your phone's browser</h3>
            <p className="muted mk-body">There is no app to install. You can sign up, book and get paid from any smartphone with M-Pesa.</p>
            <Link to="/safety" className="mk-more">Read about trust and safety <Icon name="arrow" size={16} /></Link>
          </div>
        </div>
      </section>

      {/* For providers */}
      <section className="mk-split mk-split-reverse">
        <div className="mk-split-media mk-photo-stack">
          <img src="/media/repair.jpg" alt="A student repairing a computer" loading="lazy" />
          <img src="/media/online-meeting.jpg" alt="A provider meeting a client online" loading="lazy" />
        </div>
        <div className="mk-split-text">
          <p className="eyebrow">For providers</p>
          <h2 className="mk-title">Keep a record of your work</h2>
          <p className="muted mk-body">
            Each completed job adds a review to your profile. As your job count and rating grow, your experience level
            moves from Entry to Intermediate to Experienced.
          </p>
          <CheckList>{[
            'Lower commission for verified MMU students',
            'Set your own price, with an estimate for your experience level',
            'Paid to your M-Pesa number after each confirmed job',
            'Switch to Hiring mode any time with the same account',
          ]}</CheckList>
          <Link to={workLink} className="btn btn-primary">Become a provider</Link>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mk-section">
        <h2 className="mk-title center">Pricing</h2>
        <p className="lead center mk-center-lead">No subscriptions. Kazi Connect takes a commission only when a job is paid.</p>
        <div className="mk-plans">
          <div className="mk-plan">
            <h3>Hiring</h3>
            <p className="muted">For students, households and small businesses near campus.</p>
            <p className="mk-plan-price">Free <small>to join and post jobs</small></p>
            <CheckList>{[
              'Pay only the job price you agreed',
              'Payment held in escrow until you approve the work',
              'Free cancellation before you pay',
              'Disputes reviewed by a Kazi Connect admin',
            ]}</CheckList>
            <Link to={hireLink} className="btn btn-secondary">Start hiring</Link>
          </div>
          <div className="mk-plan featured">
            <span className="mk-plan-tag">Lower rate for students</span>
            <h3>Working</h3>
            <p className="muted">For MMU students and local providers who want to earn.</p>
            <p className="mk-plan-price">Free <small>to list, commission per paid job</small></p>
            <CheckList>{[
              'Student accounts pay a lower commission',
              'Commission is rounded down to the whole shilling',
              'Optional verified badge, which ranks you higher in search',
              'A job board of open requests near you',
            ]}</CheckList>
            <Link to={workLink} className="btn btn-primary">Start earning</Link>
          </div>
        </div>
        <p className="center"><Link to="/pricing" className="mk-more">Pricing and fees in detail <Icon name="arrow" size={16} /></Link></p>
      </section>

      {/* FAQ */}
      <section className="mk-section mk-faq-section">
        <div>
          <h2 className="mk-title">Frequently asked questions</h2>
          <p className="muted mk-body">For anything else, see the <Link to="/help">help centre</Link> or <Link to="/contact">contact us</Link>.</p>
        </div>
        <FaqList items={[FAQ[1].items[0], FAQ[1].items[1], FAQ[2].items[0], FAQ[3].items[0], FAQ[3].items[3]]} />
      </section>

      {/* Closing call to action */}
      <section className="mk-cta">
        <AutoVideo src="/media/cta-call.mp4" poster="/media/cta-call.jpg" className="mk-hero-media" />
        <div className="mk-hero-shade" />
        <div className="mk-cta-body">
          <h2>Hire or work on Kazi Connect</h2>
          <p>Free to join for clients near MMU, students and local providers.</p>
          <div className="actions">
            <Link to={hireLink} className="btn btn-primary btn-lg">Post a job</Link>
            <Link to={workLink} className="btn btn-glass btn-lg">Offer your services</Link>
          </div>
        </div>
      </section>
    </main>
  )
}

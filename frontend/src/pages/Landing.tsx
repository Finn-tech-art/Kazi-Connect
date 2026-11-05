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
    lead: 'Tutors, cleaners, photographers and designers near MMU. Your M-Pesa payment is held by Kazi Connect until you confirm the work is done.',
  },
  work: {
    title: 'Turn your skills into income, on your schedule.',
    lead: 'Offer your services to clients near campus, set your own prices, and get paid to M-Pesa once the job is confirmed. Students pay a lower commission.',
  },
}

// All five clips, crossfading in the hero.
const HERO_CLIPS = ['hero-hire', 'hero-cleaning', 'hero-work', 'hero-office', 'cta-call'].map((name) => ({
  src: `/media/${name}.mp4`, poster: `/media/${name}.jpg`,
}))

const FACTS = [
  { value: 'M-Pesa', label: 'Payment held until you confirm the job' },
  { value: '48 h', label: 'Then funds release automatically if there is no dispute' },
  { value: '24 h', label: 'For a provider to answer your request' },
  { value: '12 months', label: 'Student status is reverified every year' },
]

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

      {/* Facts strip: real platform rules, not marketing numbers */}
      <section className="mk-facts" aria-label="How Kazi Connect protects you">
        <p className="mk-kicker">Launching with the Multimedia University of Kenya community</p>
        <div className="mk-facts-row">
          {FACTS.map((fact) => (
            <div key={fact.value} className="mk-fact"><b>{fact.value}</b><span>{fact.label}</span></div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mk-section">
        <h2 className="mk-title center">Find help for every kind of job</h2>
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
              <p className="mk-rules-head"><Icon name="shield" size={18} /> Job rules both sides accept</p>
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
        <p className="center"><Link to="/how-it-works" className="mk-more">The full booking journey <Icon name="arrow" size={16} /></Link></p>
      </section>

      {/* Product demo */}
      <section className="mk-split mk-band">
        <div className="mk-split-text">
          <p className="eyebrow">See it in action</p>
          <h2 className="mk-title">From request to "sent" in under a minute</h2>
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
        <h2 className="mk-title center">Trust is built in, not bolted on</h2>
        <p className="lead center mk-center-lead">Three things informal groups and referrals can't give you.</p>
        <div className="mk-trust">
          <div className="mk-trust-card">
            <span className="mk-icon"><Icon name="user" /></span>
            <h3>Verified people</h3>
            <p className="muted">Every account confirms an email and phone. Students prove their status with an MMU email, renewed every year. An optional verified badge adds a manual ID check.</p>
          </div>
          <div className="mk-trust-card">
            <span className="mk-icon"><Icon name="wallet" /></span>
            <h3>Protected payment</h3>
            <p className="muted">You pay by M-Pesa before the job and the money is held. The provider is paid when you confirm, and disputes freeze the funds until an admin decides.</p>
          </div>
          <div className="mk-trust-card">
            <span className="mk-icon"><Icon name="star" /></span>
            <h3>Real reputation</h3>
            <p className="muted">Only paid, completed jobs can be reviewed, and by both sides. Ratings and job counts set each provider's experience level.</p>
          </div>
        </div>
        <div className="mk-showcase">
          <AutoVideo src="/showcase/showcase-5s.mp4" poster="/showcase/showcase-5s-poster.jpg" label="Kazi Connect on a phone" />
          <div>
            <h3 className="mk-subtitle">Works on the phone you already have</h3>
            <p className="muted mk-body">Kazi Connect runs in your mobile browser. No app to install: sign up, book and get paid from any smartphone with M-Pesa.</p>
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
          <p className="eyebrow">For students with skills</p>
          <h2 className="mk-title">Build a reputation that follows you</h2>
          <p className="muted mk-body">
            Group chats and referrals don't keep a record of your good work. Kazi Connect does, with reviews from every
            completed job and an experience level that grows with you.
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
        <h2 className="mk-title center">Simple, honest pricing</h2>
        <p className="lead center mk-center-lead">No subscriptions. Kazi Connect earns only when a job is paid.</p>
        <div className="mk-plans">
          <div className="mk-plan">
            <h3>Hiring</h3>
            <p className="muted">For students, households and small businesses near campus.</p>
            <p className="mk-plan-price">Free <small>to join and post jobs</small></p>
            <CheckList>{[
              'Pay only the job price you agreed',
              'Payment held until you confirm the work',
              'Free cancellation before you pay',
              'Disputes decided by a person, not a bot',
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
              'Commission rounds down, so you keep the odd shilling',
              'Optional verified badge to rank higher',
              'Job board with open requests near you',
            ]}</CheckList>
            <Link to={workLink} className="btn btn-primary">Start earning</Link>
          </div>
        </div>
        <p className="center"><Link to="/pricing" className="mk-more">Pricing and fees in detail <Icon name="arrow" size={16} /></Link></p>
      </section>

      {/* FAQ */}
      <section className="mk-section mk-faq-section">
        <div>
          <h2 className="mk-title">Questions, answered</h2>
          <p className="muted mk-body">Can't find what you need? <Link to="/help">Visit the help centre</Link> or <Link to="/contact">contact us</Link>.</p>
        </div>
        <FaqList items={[FAQ[1].items[0], FAQ[1].items[1], FAQ[2].items[0], FAQ[3].items[0], FAQ[3].items[3]]} />
      </section>

      {/* Closing call to action */}
      <section className="mk-cta">
        <AutoVideo src="/media/cta-call.mp4" poster="/media/cta-call.jpg" className="mk-hero-media" />
        <div className="mk-hero-shade" />
        <div className="mk-cta-body">
          <h2>Get it done by someone you can trust</h2>
          <p>Join the MMU community on Kazi Connect, to hire or to work.</p>
          <div className="actions">
            <Link to={hireLink} className="btn btn-primary btn-lg">Post a job</Link>
            <Link to={workLink} className="btn btn-glass btn-lg">Offer your services</Link>
          </div>
        </div>
      </section>
    </main>
  )
}

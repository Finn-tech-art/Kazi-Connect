import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Faq, Side } from '../lib/marketing'
import { Icon, type IconName } from './icons'

const CATEGORY_ICONS: Record<string, IconName> = {
  tutoring: 'book', 'home-cleaning': 'sparkle', photography: 'camera', 'graphic-design': 'pen',
}
export const categoryIcon = (slug: string): IconName => CATEGORY_ICONS[slug] ?? 'briefcase'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * A muted, looping background clip. It plays only while on screen, and never for people who
 * ask for reduced motion: they see the poster instead.
 */
export function AutoVideo({ src, poster, className = '', label }: { src: string; poster: string; className?: string; label?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [still] = useState(prefersReducedMotion)

  useEffect(() => {
    const video = ref.current
    if (!video || still) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => undefined) // autoplay can be refused; the poster stays
      else video.pause()
    }, { threshold: 0.15 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [src, still])

  if (still) return <img src={poster} alt={label ?? ''} className={className} />
  return (
    <video
      ref={ref} key={src} className={className} src={src} poster={poster}
      muted loop playsInline preload="metadata" aria-label={label} aria-hidden={label ? undefined : true}
    />
  )
}

export type Clip = { src: string; poster: string }

/**
 * Background clips that crossfade one into the next. Only the visible clip (and the one fading in)
 * plays; the rest stay paused. Reduced motion shows the first poster, and nothing plays off screen.
 */
export function HeroReel({ clips, seconds = 6, className = '' }: { clips: Clip[]; seconds?: number; className?: string }) {
  const [current, setCurrent] = useState(0)
  const [onScreen, setOnScreen] = useState(true)
  const [still] = useState(prefersReducedMotion)
  const wrap = useRef<HTMLDivElement>(null)
  const videos = useRef<(HTMLVideoElement | null)[]>([])

  useEffect(() => {
    if (!wrap.current || still) return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(wrap.current)
    return () => observer.disconnect()
  }, [still])

  // Play the current clip from the start, and pause the others once the fade has finished.
  useEffect(() => {
    if (still) return
    const active = videos.current[current]
    if (!active) return
    if (!onScreen) {
      active.pause()
      return
    }
    active.currentTime = 0
    active.play().catch(() => undefined) // autoplay refused: the poster stays visible
    const stopOthers = setTimeout(() => videos.current.forEach((v, i) => i !== current && v?.pause()), 1500)
    const next = setTimeout(() => setCurrent((index) => (index + 1) % clips.length), seconds * 1000)
    return () => { clearTimeout(stopOthers); clearTimeout(next) }
  }, [current, onScreen, still, clips.length, seconds])

  if (still) return <img src={clips[0].poster} alt="" className={className} />
  return (
    <div ref={wrap} className={`reel ${className}`} aria-hidden="true">
      {clips.map((clip, index) => (
        <video
          key={clip.src} ref={(el) => { videos.current[index] = el }} src={clip.src} poster={clip.poster}
          className={index === current ? 'on' : ''} muted loop playsInline
          preload={index === current || index === (current + 1) % clips.length ? 'auto' : 'none'}
        />
      ))}
    </div>
  )
}

/** The Hire / Work switch used by the hero and the How it works section. */
export function SideToggle({ side, onChange, dark }: { side: Side; onChange: (side: Side) => void; dark?: boolean }) {
  return (
    <div className={`side-toggle${dark ? ' dark' : ''}`} role="tablist" aria-label="I want to">
      {(['hire', 'work'] as const).map((value) => (
        <button key={value} type="button" role="tab" aria-selected={side === value} className={side === value ? 'on' : ''} onClick={() => onChange(value)}>
          {value === 'hire' ? 'Hire' : 'Work'}
        </button>
      ))}
    </div>
  )
}

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="faq">
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}<Icon name="chevron" size={18} /></summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  )
}

export function CheckList({ children }: { children: ReactNode[] }) {
  return (
    <ul className="check-list">
      {children.map((child, index) => <li key={index}><Icon name="check" size={18} />{child}</li>)}
    </ul>
  )
}

/** A heading block for the long-form public pages. */
export function PageHead({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display">{title}</h1>
      {lead && <p className="lead">{lead}</p>}
      {children}
    </header>
  )
}

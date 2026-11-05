import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from './icons'
import type { NavGroup } from './siteNav'

// Hover only makes sense with a mouse and the full-width bar; the phone menu stays tap-to-open.
const HOVER_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 900px)'
// A short grace period so the panel doesn't vanish while the pointer crosses the gap to it.
const CLOSE_DELAY_MS = 150
// Groups with a "browse all" link only preview a few items; the full list is one click away.
const PREVIEW_COUNT = 3

/**
 * A top bar dropdown. It's a disclosure (a button that shows a list of links),
 * not an ARIA menu, so Tab and screen readers treat the links as ordinary links.
 */
export function NavMenu({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const location = useLocation()
  const closeTimer = useRef<number | undefined>(undefined)
  const openedByHover = useRef(false)

  const canHover = () => window.matchMedia(HOVER_QUERY).matches

  function onPointerEnter(event: ReactPointerEvent) {
    if (event.pointerType !== 'mouse' || !canHover()) return
    window.clearTimeout(closeTimer.current)
    openedByHover.current = true
    setOpen(true)
  }

  function onPointerLeave(event: ReactPointerEvent) {
    if (event.pointerType !== 'mouse' || !openedByHover.current) return
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }

  function onTriggerClick() {
    // A mouse click on a hover-opened menu would otherwise close it under the pointer.
    if (openedByHover.current && open) return
    openedByHover.current = false
    setOpen((current) => !current)
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  // Close after navigating.
  useEffect(() => {
    openedByHover.current = false
    setOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={root}
      className={`nav-menu${open ? ' open' : ''}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      // Closes when keyboard focus leaves the whole dropdown.
      onBlur={(event) => !root.current?.contains(event.relatedTarget as Node) && setOpen(false)}
    >
      <button
        ref={button}
        type="button"
        className="nav-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onTriggerClick}
      >
        {group.label}
        <Icon name="chevron" size={16} />
      </button>
      <div id={panelId} className="nav-panel" hidden={!open}>
        {group.footer && group.items.length === 0 && (
          <p className="nav-empty">Categories couldn't be loaded. Try again in a moment.</p>
        )}
        <ul>
          {(group.footer ? group.items.slice(0, PREVIEW_COUNT) : group.items).map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="nav-item">
                <span>{item.label}</span>
                {item.hint && <small>{item.hint}</small>}
              </Link>
            </li>
          ))}
        </ul>
        {group.footer && (
          <Link to={group.footer.to} className="nav-panel-foot">
            {group.footer.label}
          </Link>
        )}
      </div>
    </div>
  )
}

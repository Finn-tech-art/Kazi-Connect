import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useCategories } from '../lib/categories'
import { initials } from '../lib/format'
import { BackgroundLines } from './BackgroundLines'
import { Footer } from './Footer'
import { Icon } from './icons'
import { Logo } from './Logo'
import { NavMenu } from './NavMenu'
import { Sidebar } from './Sidebar'
import { siteNav } from './siteNav'

// Sign-in and sign-up are kept plain: no footer and no background line art.
const PLAIN_PAGES = ['/signin', '/signup']

const COLLAPSED_KEY = 'kazi.sidebarCollapsed'

// Storage can be unavailable (private windows, blocked site data), so the sidebar must work without it.
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function saveCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
  } catch {
    // Not saved; the sidebar just opens expanded next time.
  }
}

export function Layout() {
  const { account, session } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navGroups = siteNav(useCategories())
  const signedIn = account?.status === 'active' ? account : null
  const plain = PLAIN_PAGES.includes(location.pathname)

  // Close the mobile drawer whenever the user moves to another page.
  useEffect(() => setDrawerOpen(false), [location.pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  function toggleCollapsed() {
    setCollapsed((current) => {
      saveCollapsed(!current)
      return !current
    })
  }

  return (
    <>
      {!plain && <BackgroundLines />}
      <header className="topbar">
        {signedIn && (
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-controls="sidebar"
            aria-expanded={drawerOpen}
          >
            <Icon name="menu" />
          </button>
        )}
        <Logo />
        {signedIn && (
          // On phones the sidebar (and its mode switch) is hidden, but the mode must show on every page (SR-F-ACC-10).
          <span className="pill pill-accent mode-pill">{signedIn.active_mode === 'provider' ? 'Working' : 'Hiring'}</span>
        )}
        <nav className={`nav${signedIn ? ' signed-in' : ''}`} aria-label="Main">
          {navGroups.map((group) => <NavMenu key={group.label} group={group} />)}
        </nav>
        <div className="topbar-right">
          {account ? (
            <Link to="/account" className="avatar" title={`${account.full_name} — account settings`}>
              {initials(account.full_name)}
            </Link>
          ) : !session ? (
            <>
              <Link to="/signin" className="btn btn-ghost">Sign in</Link>
              <Link to="/signup" className="btn btn-primary">Join</Link>
            </>
          ) : null}
        </div>
      </header>

      {signedIn ? (
        <div className={`app-shell${collapsed ? ' is-collapsed' : ''}`}>
          <Sidebar
            account={signedIn}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
          {drawerOpen && <div className="sidebar-backdrop" onClick={() => setDrawerOpen(false)} />}
          <div className="app-main">
            <Outlet />
          </div>
        </div>
      ) : (
        <>
          <Outlet />
          {!plain && <Footer />}
        </>
      )}
    </>
  )
}

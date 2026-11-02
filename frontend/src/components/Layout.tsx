import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { initials } from '../lib/format'
import { Icon } from './icons'
import { Sidebar } from './Sidebar'

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

function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Kazi Connect home">
      <img src="/kazi-mark.svg" alt="" width={32} height={32} />
      <span>kazi <b>connect</b></span>
    </Link>
  )
}

export function Layout() {
  const { account, session } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const signedIn = account?.status === 'active' ? account : null

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
        {!signedIn && (
          <nav className="nav" aria-label="Main">
            <NavLink to="/find">Find services</NavLink>
          </nav>
        )}
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
        <Outlet />
      )}
    </>
  )
}

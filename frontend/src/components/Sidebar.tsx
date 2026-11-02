import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { api } from '../lib/api'
import type { Account, Mode } from '../lib/types'
import { Icon, type IconName } from './icons'

type NavItem = { to: string; label: string; icon: IconName }

// The sidebar is drawn from these lists, so adding a page means adding one line.
const CLIENT_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: 'home' },
  { to: '/jobs/new', label: 'Post a job', icon: 'plus' },
  { to: '/find', label: 'Find services', icon: 'search' },
]

const PROVIDER_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: 'home' },
  { to: '/listings/new', label: 'New listing', icon: 'plus' },
  { to: '/job-board', label: 'Job board', icon: 'board' },
]

function itemsFor(account: Account): NavItem[] {
  if (account.active_mode === 'provider') return PROVIDER_ITEMS
  if (account.provider?.status === 'active') return CLIENT_ITEMS
  const label = account.provider ? 'Finish provider setup' : 'Become a provider'
  return [...CLIENT_ITEMS, { to: '/become-provider', label, icon: 'star' }]
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <li>
      <NavLink to={item.to} className="sidebar-link" title={collapsed ? item.label : undefined}>
        <Icon name={item.icon} />
        <span className="sidebar-label">{item.label}</span>
      </NavLink>
    </li>
  )
}

/** Hiring / Working switch (SR-F-ACC-10). */
function ModeSwitch({ account }: { account: Account }) {
  const { setAccount, refreshAccount } = useAuth()
  const navigate = useNavigate()
  const isProvider = account.provider?.status === 'active'

  async function choose(mode: Mode) {
    if (mode === account.active_mode) return
    if (mode === 'provider' && !isProvider) {
      navigate('/become-provider')
      return
    }
    try {
      setAccount(await api<Account>('/me/mode/', { method: 'POST', body: { mode } }))
      navigate('/dashboard')
    } catch {
      await refreshAccount() // our copy of the account was out of date; show the real state
    }
  }

  return (
    <div className="mode-switch" role="group" aria-label="Mode">
      {(['client', 'provider'] as const).map((mode) => {
        const label = mode === 'client' ? 'Hiring' : 'Working'
        return (
          <button
            key={mode}
            type="button"
            title={label}
            aria-pressed={account.active_mode === mode}
            className={account.active_mode === mode ? 'on' : ''}
            onClick={() => choose(mode)}
          >
            <Icon name={mode === 'client' ? 'users' : 'briefcase'} size={16} />
            <span className="sidebar-label">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

type SidebarProps = {
  account: Account
  collapsed: boolean
  onToggleCollapsed: () => void
  open: boolean
  onClose: () => void
}

/**
 * Signed-in navigation. On wide screens it sits beside the page and can shrink to icons;
 * below 700px it is a drawer opened from the menu button in the top bar.
 */
export function Sidebar({ account, collapsed, onToggleCollapsed, open, onClose }: SidebarProps) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <aside id="sidebar" className={`sidebar${open ? ' open' : ''}`} aria-label="Sidebar">
      <div className="sidebar-head">
        <span className="eyebrow">Menu</span>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close navigation">
          <Icon name="close" />
        </button>
      </div>

      <nav aria-label="Primary">
        <ul className="sidebar-list">
          {itemsFor(account).map((item) => <SidebarLink key={item.to} item={item} collapsed={collapsed} />)}
        </ul>
      </nav>

      <div className="sidebar-foot">
        <ModeSwitch account={account} />
        <ul className="sidebar-list">
          <SidebarLink item={{ to: '/account', label: 'Account', icon: 'user' }} collapsed={collapsed} />
          <li>
            <button
              type="button"
              className="sidebar-link"
              title={collapsed ? 'Sign out' : undefined}
              onClick={async () => { await signOut(); navigate('/') }}
            >
              <Icon name="logout" />
              <span className="sidebar-label">Sign out</span>
            </button>
          </li>
          <li className="sidebar-collapse-item">
            <button
              type="button"
              className="sidebar-link"
              title={collapsed ? 'Expand sidebar' : undefined}
              aria-expanded={!collapsed}
              onClick={onToggleCollapsed}
            >
              <Icon name={collapsed ? 'expand' : 'collapse'} />
              <span className="sidebar-label">Collapse</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  )
}

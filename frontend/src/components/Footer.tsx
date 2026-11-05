import { Link } from 'react-router-dom'
import { useCategories } from '../lib/categories'
import { Logo } from './Logo'
import { siteNav } from './siteNav'

export function Footer() {
  const groups = siteNav(useCategories())

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo />
          <p className="muted">
            Hire verified students and local pros near MMU. Your M-Pesa payment is held until you confirm the job is done.
          </p>
          <Link to="/signup" className="btn btn-primary">Join Kazi Connect</Link>
        </div>

        {groups.map((group) => (
          <nav key={group.label} className="footer-col" aria-label={group.label}>
            <h3>{group.label}</h3>
            <ul>
              {group.items.map((item) => (
                <li key={item.to}><Link to={item.to}>{item.label}</Link></li>
              ))}
              {group.footer && <li><Link to={group.footer.to}>{group.footer.label}</Link></li>}
            </ul>
          </nav>
        ))}
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Kazi Connect</span>
        <nav className="footer-legal" aria-label="Legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/safety">Safety</Link>
          <Link to="/help">Help</Link>
        </nav>
      </div>
    </footer>
  )
}

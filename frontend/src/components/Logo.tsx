import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Kazi Connect home">
      <img src="/kazi-mark.svg" alt="" width={32} height={32} />
      <span>kazi <b>connect</b></span>
    </Link>
  )
}

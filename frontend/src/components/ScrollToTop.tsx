import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * BrowserRouter keeps the scroll position between pages, so a link near the bottom of a long
 * page opens the next one scrolled down (often straight to the footer). Reset to the top
 * whenever the path changes. Query-only changes, like a category filter, keep the position.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

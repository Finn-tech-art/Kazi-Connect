import { useEffect, useState } from 'react'
import { api } from './api'
import type { Category } from './types'

// One request per page load, shared by the top bar, the footer and any page that needs the list.
let request: Promise<Category[]> | null = null

function loadCategories() {
  request ??= api<Category[]>('/categories/', { auth: false }).catch((error) => {
    request = null // let the next caller try again
    throw error
  })
  return request
}

/** The service categories, or an empty list while loading or if the API is unreachable. */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    let current = true
    loadCategories().then((result) => current && setCategories(result)).catch(() => undefined)
    return () => {
      current = false
    }
  }, [])

  return categories
}

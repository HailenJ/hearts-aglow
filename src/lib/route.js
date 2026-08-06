import { WINDOW_IDS } from './windows.js'

// Converts a title to a URL-safe slug. Returns empty string for punctuation-only
// input; callers assigning slugs must supply a fallback (e.g. record id) to ensure
// all releases have shareable detail routes. Empty detail in buildHash degrades to
// the bare window route, breaking deep-linking.
export function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseHash(hash) {
  const path = String(hash).replace(/^#\/?/, '').replace(/\/+$/, '')
  if (!path) return null
  const [id, detail] = path.split('/')
  if (!WINDOW_IDS.includes(id)) return null
  return { id, detail: detail || null }
}

export function buildHash(id, detail) {
  return detail ? `#/${id}/${detail}` : `#/${id}`
}

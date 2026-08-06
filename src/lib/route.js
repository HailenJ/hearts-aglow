import { WINDOW_IDS } from './windows.js'

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

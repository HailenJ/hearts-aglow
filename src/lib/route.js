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

// Pure decision layer between a parsed route and what should be visible:
// which window opens, which release slug (if any) is selected, and which
// Works tab that slug belongs to. A null route (empty or unknown hash)
// means nothing should be open. A detail slug that doesn't exist in any
// collection degrades to the bare release grid rather than a dangling
// selection. Kept collection-agnostic about *which* window carries detail
// slugs today (only 'works' does) so this stays a plain lookup, not a
// hardcoded branch.
export function resolveRoute(route, { musicReleases = [], software = [] } = {}) {
  if (!route) return { windowToOpen: null, slug: null, activeTab: null }
  if (route.id !== 'works' || !route.detail) {
    return { windowToOpen: route.id, slug: null, activeTab: null }
  }
  const byTab = { music: musicReleases, software }
  const activeTab = Object.keys(byTab).find(tab => byTab[tab].some(item => item.slug === route.detail)) ?? null
  return activeTab
    ? { windowToOpen: 'works', slug: route.detail, activeTab }
    : { windowToOpen: 'works', slug: null, activeTab: null }
}

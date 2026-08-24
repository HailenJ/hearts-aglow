import { WINDOW_IDS } from './windows.js'

// The catalogue's three views — music, games, software — are routes, not
// windows. They share one pane because five floating windows do not fit a
// 1280px laptop, and because a dock that shows all three at once is the only
// way a visitor who came for the music finds out the games and software exist.
// `works` is the pre-2026-08 name for the same pane and still resolves, so
// links shared under it keep working.
export const WORKS_TABS = ['music', 'games', 'software']

const ROUTE_IDS = [...WINDOW_IDS, ...WORKS_TABS]

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
  if (!ROUTE_IDS.includes(id)) return null
  return { id, detail: detail || null }
}

export function buildHash(id, detail) {
  return detail ? `#/${id}/${detail}` : `#/${id}`
}

// Pure decision layer between a parsed route and what should be visible:
// which window opens, which release slug (if any) is selected, and which
// catalogue view that slug belongs to. A null route (empty or unknown hash)
// means nothing should be open. A detail slug that doesn't exist in any
// collection degrades to the bare grid rather than a dangling selection.
export function resolveRoute(route, { musicReleases = [], software = [] } = {}) {
  if (!route) return { windowToOpen: null, slug: null, activeTab: null }

  const isWorks = route.id === 'works' || WORKS_TABS.includes(route.id)
  if (!isWorks) return { windowToOpen: route.id, slug: null, activeTab: null }

  // A slug that matches something outranks the route's own view name: a
  // software link must not land on the music view rendering music-only
  // fields. Games carry no slugs (a games card opens the takeover, not a
  // detail pane), so a games route only ever resolves to the bare grid.
  const byTab = { music: musicReleases, software }
  const slugTab = route.detail
    ? Object.keys(byTab).find(tab => byTab[tab].some(item => item.slug === route.detail)) ?? null
    : null

  return {
    windowToOpen: 'works',
    slug: slugTab ? route.detail : null,
    // The legacy `works` route names no view, so it lands on music.
    activeTab: slugTab ?? (WORKS_TABS.includes(route.id) ? route.id : 'music'),
  }
}

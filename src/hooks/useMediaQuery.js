import { useSyncExternalStore } from 'react'

// One MediaQueryList per query string, shared across every call site/render.
// Without this, `subscribe` below would get a new closure (over a fresh
// `matchMedia()` call) on every render, and useSyncExternalStore would tear
// down and re-add the change listener each time instead of subscribing once.
const mqls = new Map()
function getMql(query) {
  if (typeof window === 'undefined') return null
  let mql = mqls.get(query)
  if (!mql) {
    mql = window.matchMedia(query)
    mqls.set(query, mql)
  }
  return mql
}

// A bare `matchMedia(q).matches` read during render is stale — nothing
// re-renders when the viewport crosses the breakpoint, so rotating a phone
// or dragging a desktop window across it would leave the wrong affordances
// mounted. Subscribe via useSyncExternalStore instead.
export function useMediaQuery(query) {
  const mql = getMql(query)
  return useSyncExternalStore(
    (cb) => {
      if (!mql) return () => {}
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => (mql ? mql.matches : false),
    () => false,
  )
}

export const COMPACT = '(max-width: 767px)'

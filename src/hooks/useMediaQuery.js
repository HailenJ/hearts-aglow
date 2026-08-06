import { useSyncExternalStore } from 'react'

// A bare `matchMedia(q).matches` read during render is stale — nothing
// re-renders when the viewport crosses the breakpoint, so rotating a phone
// or dragging a desktop window across it would leave the wrong affordances
// mounted. Subscribe via useSyncExternalStore instead.
export function useMediaQuery(query) {
  const mql = typeof window === 'undefined' ? null : window.matchMedia(query)
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

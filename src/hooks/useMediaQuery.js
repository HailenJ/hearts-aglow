import { useSyncExternalStore } from 'react'

// One MediaQueryList per query string, shared across every call site/render,
// with the subscribe/getSnapshot closures cached alongside it. Without this,
// each render would hand useSyncExternalStore a fresh `subscribe` function
// (a new closure over a fresh `matchMedia()` call), and it would tear down
// and re-add the change listener every render instead of subscribing once.
const mqls = new Map()
function getMql(query) {
  if (typeof window === 'undefined') return null
  let entry = mqls.get(query)
  if (!entry) {
    const mql = window.matchMedia(query)
    entry = {
      mql,
      subscribe: (cb) => {
        mql.addEventListener('change', cb)
        return () => mql.removeEventListener('change', cb)
      },
      getSnapshot: () => mql.matches,
    }
    mqls.set(query, entry)
  }
  return entry
}

const noopSubscribe = () => () => {}
const getServerSnapshot = () => false

// A bare `matchMedia(q).matches` read during render is stale — nothing
// re-renders when the viewport crosses the breakpoint, so rotating a phone
// or dragging a desktop window across it would leave the wrong affordances
// mounted. Subscribe via useSyncExternalStore instead.
export function useMediaQuery(query) {
  const entry = getMql(query)
  return useSyncExternalStore(
    entry ? entry.subscribe : noopSubscribe,
    entry ? entry.getSnapshot : getServerSnapshot,
    getServerSnapshot,
  )
}

export const COMPACT = '(max-width: 767px)'

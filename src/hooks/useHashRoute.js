import { useEffect, useRef, useLayoutEffect } from 'react'
import { parseHash } from '../lib/route'

// Fires onRoute on mount and on every hashchange. Deliberately no router
// dependency — the native event is the whole mechanism.
export function useHashRoute(onRoute) {
  const handler = useRef(onRoute)

  useLayoutEffect(() => {
    handler.current = onRoute
  })

  useEffect(() => {
    const fire = () => handler.current(parseHash(window.location.hash))
    fire()
    window.addEventListener('hashchange', fire)
    return () => window.removeEventListener('hashchange', fire)
  }, [])
}

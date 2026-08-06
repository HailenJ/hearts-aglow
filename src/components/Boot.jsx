import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const LINES = [
  'aglow.os',
  'mounting /works ......... ok',
  'mounting /connect ....... ok',
  'field ................... live',
]

const KEY = 'aglow.booted'

// ponytail: Safari private browsing has historically thrown on sessionStorage
// access rather than just failing silently — a throw during render here would
// take the whole app down, so reads/writes are guarded and treated as "not
// booted yet" / "couldn't persist" respectively.
function hasBooted() {
  try {
    return !!sessionStorage.getItem(KEY)
  } catch {
    return false
  }
}

function markBooted() {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // Can't persist the flag — worst case the boot replays next load.
  }
}

export default function Boot({ onDone }) {
  const skip = typeof window === 'undefined'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || hasBooted()

  const [shown, setShown] = useState(skip ? LINES.length : 0)
  const [leaving, setLeaving] = useState(false)

  // onDone is whatever identity the caller passes on a given render (App.jsx
  // passes an inline arrow, so it's a new function every render). Reading it
  // through a ref kept current by a layout effect means our own effect below
  // depends only on `skip` — it never tears down and reschedules every timer
  // just because the parent re-rendered mid-boot (e.g. a Sanity fetch
  // resolving). Pattern matches src/hooks/useHashRoute.js.
  const doneRef = useRef(onDone)
  useLayoutEffect(() => { doneRef.current = onDone })

  // Guards onDone against firing more than once per mount (e.g. the
  // completion timer and a skip landing on the same tick).
  const firedRef = useRef(false)

  useEffect(() => {
    const fire = () => {
      if (firedRef.current) return
      firedRef.current = true
      doneRef.current()
    }

    if (skip) { fire(); return }

    const timers = LINES.map((_, i) => setTimeout(() => setShown(i + 1), 380 + i * 420))
    const out = setTimeout(() => setLeaving(true), 380 + LINES.length * 420 + 300)
    const done = setTimeout(() => { markBooted(); fire() }, 380 + LINES.length * 420 + 700)

    const bail = () => {
      timers.forEach(clearTimeout); clearTimeout(out); clearTimeout(done)
      markBooted()
      fire()
    }
    window.addEventListener('keydown', bail)
    window.addEventListener('pointerdown', bail)

    return () => {
      timers.forEach(clearTimeout); clearTimeout(out); clearTimeout(done)
      window.removeEventListener('keydown', bail)
      window.removeEventListener('pointerdown', bail)
    }
  }, [skip])

  if (skip) return null

  return (
    <div className={`boot ${leaving ? 'boot--leaving' : ''}`} role="status" aria-live="polite">
      <div className="boot__aperture" aria-hidden="true" />
      <pre className="boot__log">{LINES.slice(0, shown).join('\n')}</pre>
      <p className="boot__skip">press any key to skip</p>
    </div>
  )
}

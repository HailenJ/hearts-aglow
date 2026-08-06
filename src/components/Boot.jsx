import { useEffect, useState } from 'react'

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

  useEffect(() => {
    if (skip) { onDone(); return }

    const timers = LINES.map((_, i) => setTimeout(() => setShown(i + 1), 380 + i * 420))
    const out = setTimeout(() => setLeaving(true), 380 + LINES.length * 420 + 300)
    const done = setTimeout(() => { markBooted(); onDone() }, 380 + LINES.length * 420 + 700)

    const bail = () => {
      timers.forEach(clearTimeout); clearTimeout(out); clearTimeout(done)
      markBooted()
      onDone()
    }
    window.addEventListener('keydown', bail)
    window.addEventListener('pointerdown', bail)

    return () => {
      timers.forEach(clearTimeout); clearTimeout(out); clearTimeout(done)
      window.removeEventListener('keydown', bail)
      window.removeEventListener('pointerdown', bail)
    }
  }, [skip, onDone])

  if (skip) return null

  return (
    <div className={`boot ${leaving ? 'boot--leaving' : ''}`} role="status" aria-live="polite">
      <div className="boot__aperture" aria-hidden="true" />
      <pre className="boot__log">{LINES.slice(0, shown).join('\n')}</pre>
      <p className="boot__skip">press any key to skip</p>
    </div>
  )
}

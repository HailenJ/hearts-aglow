import { useEffect, useLayoutEffect, useRef } from 'react'

// The game is the site's commercial priority, so it does not compete for
// z-order with three other panes. It takes the field: everything else recedes
// and it gets the visitor's undivided attention. This is the one surface where
// the OS metaphor deliberately steps aside for the thing being sold.
export default function Takeover({ open, title, label, onClose, children }) {
  const ref = useRef(null)
  // Synced in a layout effect, not during render — same pattern as
  // useHashRoute. Keeps Escape bound to the current handler without
  // re-subscribing the listener on every render.
  const closeRef = useRef(onClose)
  useLayoutEffect(() => { closeRef.current = onClose })

  useEffect(() => {
    if (!open) return
    ref.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div className="takeover" role="dialog" aria-modal="true" aria-label={label || title}>
      <div className="takeover__scrim" onClick={onClose} aria-hidden="true" />
      <section className="takeover__panel" ref={ref} tabIndex={-1}>
        <header className="takeover__bar">
          <h2 className="takeover__title">{title}</h2>
          <button className="takeover__close" onClick={onClose} aria-label={`Close ${title}`}>
            <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2 2 8 8M8 2 2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="takeover__body">{children}</div>
      </section>
    </div>
  )
}

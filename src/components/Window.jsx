import { useEffect, useRef } from 'react'

const MIN_W = 320
const MIN_H = 240

export default function Window({
  id, title, state, isFocused, defaultGeom,
  onFocus, onClose, onMinimize, onMaximize, onMove, onResize, children,
}) {
  const winRef = useRef(null)
  const drag = useRef(null)

  const opened = state.open && !state.minimized
  useEffect(() => {
    // Move focus into a newly-opened window so keyboard users land inside it.
    // Deliberately no trap: Tab must be able to leave for the dock and the
    // other windows, exactly as a real desktop behaves.
    if (opened) winRef.current?.focus()
  }, [opened])

  if (!state.open || state.minimized) return null

  const style = state.maximized
    ? { inset: '4%', width: 'auto', height: 'auto' }
    : {
        top: state.y != null ? `${state.y}px` : defaultGeom.top,
        left: state.x != null ? `${state.x}px` : defaultGeom.left,
        width: state.w != null ? `${state.w}px` : defaultGeom.width,
        height: state.h != null ? `${state.h}px` : defaultGeom.height,
      }

  const beginDrag = (mode) => (e) => {
    if (e.target.closest('.window__btn')) return
    const r = winRef.current.getBoundingClientRect()
    drag.current = { mode, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, x0: e.clientX, y0: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    onFocus()
  }

  const move = (e) => {
    const d = drag.current
    if (!d) return
    if (d.mode === 'move') {
      const x = Math.max(-(d.w - 120), Math.min(window.innerWidth - 120, e.clientX - d.dx))
      const y = Math.max(36, Math.min(window.innerHeight - 80, e.clientY - d.dy))
      winRef.current.style.left = `${x}px`
      winRef.current.style.top = `${y}px`
    } else {
      const w = Math.max(MIN_W, Math.min(window.innerWidth - 24, d.w + (e.clientX - d.x0)))
      const h = Math.max(MIN_H, Math.min(window.innerHeight - 80, d.h + (e.clientY - d.y0)))
      winRef.current.style.width = `${w}px`
      winRef.current.style.height = `${h}px`
    }
  }

  const end = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    const r = winRef.current.getBoundingClientRect()
    if (d.mode === 'move') onMove(Math.round(r.left), Math.round(r.top))
    else onResize(Math.round(r.width), Math.round(r.height))
  }

  return (
    <section
      ref={winRef}
      className={`window ${isFocused ? 'window--focused' : ''} ${state.maximized ? 'window--max' : ''}`}
      style={{ ...style, zIndex: 10 + state.z }}
      aria-label={title}
      tabIndex={-1}
      onPointerDown={onFocus}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <header
        className="window__bar"
        onPointerDown={beginDrag('move')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <h2 className="window__title">{title}</h2>
        <div className="window__btns">
          <button className="window__btn" onClick={onMinimize} aria-label={`Minimize ${title}`} title="Minimize">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
          <button className="window__btn" onClick={onMaximize} aria-label={`${state.maximized ? 'Restore' : 'Maximize'} ${title}`} aria-pressed={state.maximized} title="Maximize">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="2" y="2" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
          <button className="window__btn" onClick={onClose} aria-label={`Close ${title}`} title="Close">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2 8 8M8 2 2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
        </div>
      </header>

      <div className="window__body" id={`window-${id}`}>{children}</div>

      {!state.maximized && (
        <div
          className="window__grip"
          role="separator"
          aria-label={`Resize ${title}`}
          onPointerDown={beginDrag('resize')}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      )}
    </section>
  )
}

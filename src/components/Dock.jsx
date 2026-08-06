function Dock({ windows, onToggleWindow }) {
  const items = [
    { id: 'about', label: 'About' },
    { id: 'works', label: 'Works' },
    { id: 'connect', label: 'Connect' },
  ]

  return (
    <nav className="dock" aria-label="Primary">
      {items.map(item => {
        const w = windows[item.id]
        const visible = w.open && !w.minimized
        const minimized = w.open && w.minimized
        return (
          <button
            key={item.id}
            className={`dock__item ${visible ? 'dock__item--active' : ''} ${minimized ? 'dock__item--minimized' : ''}`}
            onClick={() => onToggleWindow(item.id)}
            aria-pressed={w.open}
            aria-label={minimized ? `${item.label} (minimized)` : item.label}
          >
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default Dock

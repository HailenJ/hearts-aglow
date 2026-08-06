import { WINDOW_IDS } from '../lib/windows'

const LABELS = { about: 'About', works: 'Works', game: 'Game', connect: 'Say hi' }

export default function Dock({ windows, onToggle }) {
  return (
    <nav className="dock" aria-label="Primary">
      {WINDOW_IDS.map(id => {
        const w = windows[id]
        const active = w.open && !w.minimized
        return (
          <button
            key={id}
            id={`dock-${id}`}
            className={`dock__item ${active ? 'dock__item--active' : ''} ${w.minimized ? 'dock__item--min' : ''}`}
            onClick={() => onToggle(id)}
            aria-pressed={w.open}
            aria-label={w.minimized ? `${LABELS[id]} (minimized)` : LABELS[id]}
          >
            {LABELS[id]}
          </button>
        )
      })}
    </nav>
  )
}

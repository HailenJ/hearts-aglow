import { WINDOW_IDS } from '../lib/windows'

const LABELS = { about: 'About', works: 'Works', game: 'Game', connect: 'Say hi' }

// Four states, not two. With every window open, "active" on all four says
// nothing — so the signal accent is spent only on the FOCUSED window, and
// merely-open windows get a quieter marker. That is the distinction a person
// actually needs from a dock.
export default function Dock({ windows, focused, onToggle }) {
  return (
    <nav className="dock" aria-label="Primary">
      {WINDOW_IDS.map(id => {
        const w = windows[id]
        const open = w.open && !w.minimized
        const isFocused = open && focused === id

        const state = w.minimized ? 'minimized' : isFocused ? 'focused' : open ? 'open' : 'closed'

        return (
          <button
            key={id}
            id={`dock-${id}`}
            className={`dock__item dock__item--${state}`}
            onClick={() => onToggle(id)}
            aria-pressed={w.open}
            aria-label={
              state === 'minimized' ? `${LABELS[id]} (minimized)`
                : state === 'focused' ? `${LABELS[id]} (in front)`
                  : state === 'open' ? `${LABELS[id]} (open)`
                    : LABELS[id]
            }
          >
            <span className="dock__marker" aria-hidden="true" />
            {LABELS[id]}
          </button>
        )
      })}
    </nav>
  )
}

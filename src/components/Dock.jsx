import { WORKS_TABS } from '../lib/route'

// Five items, four windows. The catalogue's three views share the `works`
// pane, so their dock items name a view rather than a window — which is the
// point: MUSIC alone would let a visitor leave without ever learning that
// GAMES and SOFTWARE are there.
//
// The takeover has no item at all. It used to sit here labelled "Game",
// looking like a peer and behaving like a trapdoor — opening it closes every
// other window. It is reached from the hero CTA, a games card, or #/game.
const ITEMS = [
  { id: 'about', label: 'About' },
  { id: 'music', label: 'Music' },
  { id: 'games', label: 'Games' },
  { id: 'software', label: 'Software' },
  { id: 'connect', label: 'Say hi' },
]

// Four states, not two. With every window open, "active" on all of them says
// nothing — so the signal accent is spent only on the FOCUSED window, and
// merely-open windows get a quieter marker. That is the distinction a person
// actually needs from a dock.
export default function Dock({ windows, focused, activeTab, onNavigate }) {
  return (
    <nav className="dock" aria-label="Primary">
      {ITEMS.map(({ id, label }) => {
        const isView = WORKS_TABS.includes(id)
        const wid = isView ? 'works' : id
        const w = windows[wid]
        // A view item only reads as open when it is the view on show. With
        // works open on Music, GAMES and SOFTWARE are closed doors, and
        // lighting all three would undo the accent's whole job.
        const showing = w.open && (!isView || activeTab === id)
        const live = showing && !w.minimized
        const isFocused = live && focused === wid

        const state = !showing ? 'closed'
          : w.minimized ? 'minimized'
            : isFocused ? 'focused' : 'open'

        return (
          <button
            key={id}
            id={`dock-${id}`}
            className={`dock__item dock__item--${state}`}
            onClick={() => onNavigate(id)}
            aria-pressed={showing}
            aria-label={
              state === 'minimized' ? `${label} (minimized)`
                : state === 'focused' ? `${label} (in front)`
                  : state === 'open' ? `${label} (open)`
                    : label
            }
          >
            <span className="dock__marker" aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

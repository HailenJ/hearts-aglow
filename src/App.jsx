import { useReducer, useState, useEffect } from 'react'
import { useSanityData } from './hooks/useSanityData'
import { useHashRoute } from './hooks/useHashRoute'
import { useMediaQuery, COMPACT } from './hooks/useMediaQuery'
import { buildHash, resolveRoute, parseHash } from './lib/route'
import LightField from './components/LightField'
import ErrorBoundary from './components/ErrorBoundary'
import Window from './components/Window'
import TitleBar from './components/TitleBar'
import Player from './components/Player'
import Dock from './components/Dock'
import Hero from './components/Hero'
import Boot from './components/Boot'
import About from './windows/About'
import Works from './windows/Works'
import Game from './windows/Game'
import Connect from './windows/Connect'
import { windowsReducer, initialWindows, focusedId, openIds, WINDOW_IDS } from './lib/windows'
import './styles/globals.css'

// ============================================
// COMPONENTS
// ============================================

function DesktopBackground() {
  return (
    <div className="desktop__bg">
      <div className="grain" aria-hidden="true" />
      <ErrorBoundary>
        <LightField />
      </ErrorBoundary>
    </div>
  )
}

// ============================================
// MAIN APP
// ============================================

function App() {
  const { data } = useSanityData()

  // Seed state from the hash synchronously (lazy initializers, run once on
  // mount) rather than starting closed and waiting for a post-mount effect
  // to open things. Otherwise the state->hash sync effect below would see
  // `focused: null` on the very first render — before the listener has had
  // a chance to process a real deep link — and clear the address bar an
  // instant before correcting it back.
  const [windows, dispatch] = useReducer(windowsReducer, initialWindows, (blank) => {
    const { windowToOpen } = resolveRoute(parseHash(window.location.hash), data)
    return windowToOpen ? windowsReducer(blank, { type: 'OPEN', id: windowToOpen }) : blank
  })
  const focused = focusedId(windows)
  const compact = useMediaQuery(COMPACT)
  const [playing, setPlaying] = useState(null)
  const [booted, setBooted] = useState(false)
  const [worksSlug, setWorksSlug] = useState(
    () => resolveRoute(parseHash(window.location.hash), data).slug
  )

  // Window state is the single source of truth for what is open — the hash
  // can only ever hold one route, but several windows can be open at once,
  // so the hash is a PROJECTION of state (the focused window + its detail
  // slug), not the other way around.
  //
  // This effect is that projection: it runs after every state change,
  // however it happened (Dock, titlebar close, minimize, focusing a window),
  // and keeps the hash accurate via replaceState — which never fires
  // `hashchange`, so this can't loop back into the listener below.
  useEffect(() => {
    const next = focused ? buildHash(focused, focused === 'works' ? worksSlug : null) : ''
    if (window.location.hash === next) return
    history.replaceState(null, '', next || window.location.pathname)
  }, [focused, worksSlug])

  // The other direction: hash -> state, for pasted links and back/forward.
  // A route that resolves to nothing (empty hash, unknown id, or a detail
  // slug that matches no release) closes every window rather than being
  // ignored — otherwise back-ing all the way out leaves a window open under
  // a blank URL.
  useHashRoute((route) => {
    const { windowToOpen, slug } = resolveRoute(route, data)
    if (!windowToOpen) {
      openIds(windows).forEach(id => dispatch({ type: 'CLOSE', id }))
      setWorksSlug(null)
      return
    }
    dispatch({ type: 'OPEN', id: windowToOpen })
    setWorksSlug(slug)
  })

  // User-initiated navigation: writes the hash directly (a real assignment,
  // not replaceState) so opening a window or drilling into a release detail
  // leaves a history entry for the back button to land on.
  const openWindow = (id) => {
    const isOpen = windows[id].open && !windows[id].minimized
    if (isOpen) {
      dispatch({ type: 'CLOSE', id })
      return
    }
    // Below 768px only one window is ever visible — close the rest before
    // the hashchange listener opens this one, so the sheet metaphor holds.
    if (compact) {
      openIds(windows).filter(w => w !== id).forEach(w => dispatch({ type: 'CLOSE', id: w }))
    }
    window.location.hash = buildHash(id, null)
  }

  const selectRelease = (slug) => {
    window.location.hash = buildHash('works', slug)
    if (!slug) setWorksSlug(null)
  }

  const windowConfigs = {
    about: {
      title: 'About',
      geom: { top: '14%', left: '8%', width: '440px', height: 'min(560px, 78vh)' }
    },
    works: {
      title: 'Works',
      geom: { top: '9%', left: '28%', width: '640px', height: '76%' }
    },
    game: {
      title: 'Game',
      geom: { top: '12%', left: '22%', width: '560px', height: 'min(620px, 78vh)' }
    },
    connect: {
      title: 'Connect',
      geom: { top: '18%', left: '58%', width: '400px', height: 'min(560px, 78vh)' }
    }
  }

  const windowContent = {
    about: <About aboutParagraphs={data.aboutParagraphs} />,
    works: <Works musicReleases={data.musicReleases} games={data.games} software={data.software} onPlay={setPlaying} selectedSlug={worksSlug} onSelect={selectRelease} />,
    game: <Game game={data.game} />,
    connect: <Connect socialLinks={data.socialLinks} />
  }

  // Only ids with registered content actually mount a Window.
  const renderableOpen = openIds(windows).filter(id => windowConfigs[id])

  return (
    <div className="desktop">
      <Boot onDone={() => setBooted(true)} />
      <DesktopBackground />
      <TitleBar nowPlaying={playing?.title ?? null} />

      <main className="desktop__content">
        <Hero
          visible={booted && renderableOpen.length === 0}
          heroSubtitle={data.heroSubtitle}
          game={data.game}
          onOpenGame={() => dispatch({ type: 'OPEN', id: 'game' })}
        />

        {WINDOW_IDS.filter(id => windowConfigs[id]).map(id => (
          <Window
            key={id}
            id={id}
            title={windowConfigs[id].title}
            state={windows[id]}
            isFocused={focused === id}
            defaultGeom={windowConfigs[id].geom}
            onFocus={() => dispatch({ type: 'FOCUS', id })}
            onClose={() => dispatch({ type: 'CLOSE', id })}
            onMinimize={() => dispatch({ type: 'MINIMIZE', id })}
            onMaximize={() => dispatch({ type: 'MAXIMIZE', id })}
            onMove={(x, y) => dispatch({ type: 'MOVE', id, x, y })}
            onResize={(w, h) => dispatch({ type: 'RESIZE', id, w, h })}
          >
            {windowContent[id]}
          </Window>
        ))}
      </main>

      <Player release={playing} onClose={() => setPlaying(null)} />

      <Dock
        windows={windows}
        onToggle={openWindow}
      />
    </div>
  )
}

export default App

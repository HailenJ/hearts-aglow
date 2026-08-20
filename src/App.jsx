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
import Takeover from './components/Takeover'
import Dock from './components/Dock'
import Hero from './components/Hero'
import Boot from './components/Boot'
import About from './windows/About'
import Works from './windows/Works'
import Game from './windows/Game'
import Connect from './windows/Connect'
import { windowsReducer, initialWindows, focusedId, openIds, WINDOW_IDS } from './lib/windows'
import { recordTint } from './lib/vizSeed'
import './styles/globals.css'

// ============================================
// COMPONENTS
// ============================================

function DesktopBackground({ bpm, playing, tint, activity }) {
  return (
    <div className="desktop__bg">
      <div className="grain" aria-hidden="true" />
      <ErrorBoundary>
        <LightField bpm={bpm} playing={playing} tint={tint} activity={activity} />
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
  // The tempo of whatever track the player has loaded, reported up from Player
  // because only Player knows which one that is. Zero means nothing is loaded
  // and the field holds still.
  const [pulse, setPulse] = useState(0)
  // Which game the takeover is showing. null means the featured one (what the
  // hero CTA opens); a Works games card sets its own, so the tab can launch
  // any title without the takeover needing a route of its own.
  const [shownGame, setShownGame] = useState(null)
  const [booted, setBooted] = useState(false)
  // The raw detail segment from the hash, not a record resolved against
  // `data` — at mount `data` is still the local fallback, and Sanity hasn't
  // loaded yet, so resolving eagerly here would null out any slug that only
  // exists in Sanity. Works re-resolves this string against current `data`
  // at render time, so it naturally picks up the match once Sanity arrives.
  const [worksSlug, setWorksSlug] = useState(() => {
    const route = parseHash(window.location.hash)
    return route && route.id === 'works' ? route.detail : null
  })

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
    // windowToOpen depends only on the route's id/detail presence, not on
    // whether the detail matches anything in `data` — so it's safe to read
    // here even before Sanity has loaded. The detail string itself is
    // stashed raw (see worksSlug above) rather than resolved.
    const { windowToOpen } = resolveRoute(route, data)
    if (!windowToOpen) {
      openIds(windows).forEach(id => dispatch({ type: 'CLOSE', id }))
      setWorksSlug(null)
      return
    }
    // Below 768px only one window is ever visible. Closing the rest happens
    // here, in the same dispatch pass that opens the new route, rather than
    // in openWindow before the hash is even written — that would render an
    // intermediate `focused: null` state and race the projection effect
    // against this listener over what the hash should be.
    if (compact) {
      openIds(windows).filter(id => id !== windowToOpen).forEach(id => dispatch({ type: 'CLOSE', id }))
    }
    // The game takeover is exclusive: opening anything else dismisses it,
    // so the two can never be stacked on screen at the same time.
    if (windowToOpen !== 'game' && windows.game.open) dispatch({ type: 'CLOSE', id: 'game' })
    dispatch({ type: 'OPEN', id: windowToOpen })
    // Only the works window carries a detail slug — opening any other
    // window (e.g. About) must not clobber whatever Works detail was
    // already selected underneath it.
    if (windowToOpen === 'works') setWorksSlug(route.detail)
  })

  // User-initiated navigation: writes the hash directly (a real assignment,
  // not replaceState) so opening a window or drilling into a release detail
  // leaves a history entry for the back button to land on. Reconciling which
  // windows end up open — including the mobile one-at-a-time rule — is the
  // hashchange listener's job above; this just requests the route.
  const openWindow = (id) => {
    const isOpen = windows[id].open && !windows[id].minimized
    if (isOpen && focused === id) {
      dispatch({ type: 'CLOSE', id })
      return
    }
    if (isOpen) {
      dispatch({ type: 'FOCUS', id })
      return
    }
    window.location.hash = buildHash(id, null)
  }

  // Dispatches rather than assigning the hash, matching what the hero CTA
  // has always done: the takeover is exclusive, so the projection effect
  // writes #/game for it either way. Passing a game only picks which one
  // renders; null means the featured one.
  const openGame = (game) => {
    setShownGame(game ?? null)
    dispatch({ type: 'OPEN', id: 'game' })
  }

  const selectRelease = (slug) => {
    window.location.hash = buildHash('works', slug)
    if (!slug) setWorksSlug(null)
  }

  // Tuned so all four can be open at once without burying each other. The
  // earlier values were set when there were three windows and Game was added
  // later, which piled Connect under Game and pushed About off the left edge.
  // Widths use clamp() so the set still fits a 1280px laptop.
  const windowConfigs = {
    about: {
      title: 'About',
      geom: { top: '10%', left: '3%', width: 'clamp(320px, 24vw, 400px)', maxHeight: 'min(560px, 74vh)' }
    },
    works: {
      title: 'Works',
      geom: { top: '10%', left: '30%', width: 'clamp(430px, 38vw, 620px)', maxHeight: 'min(700px, 76vh)' }
    },
    connect: {
      title: 'Connect',
      geom: { top: '10%', left: '74%', width: 'clamp(290px, 22vw, 360px)', maxHeight: 'min(560px, 74vh)' }
    }
  }

  // null shownGame falls back to the featured game, which is what the hero
  // CTA and a bare #/game deep link should always show.
  const takeoverGame = shownGame ?? data.game

  const windowContent = {
    about: <About aboutParagraphs={data.aboutParagraphs} />,
    works: <Works musicReleases={data.musicReleases} games={data.games} software={data.software} onPlay={setPlaying} onOpenGame={openGame} selectedSlug={worksSlug} onSelect={selectRelease} />,
    connect: <Connect socialLinks={data.socialLinks} />
  }

  // Only ids with registered content actually mount a Window.
  const renderableOpen = openIds(windows).filter(id => windowConfigs[id])

  // The closest thing to "energy" this page can honestly measure. Real audio
  // is unreachable (see LightField.jsx), so the field responds to what the
  // visitor has actually done: opened windows, taken the game, put a record
  // on. Capped at three so the fourth window is not required to reach full.
  const activity = Math.min(
    1,
    (renderableOpen.length + (windows.game.open ? 1 : 0) + (playing ? 1 : 0)) / 3
  )

  return (
    <div className="desktop">
      <Boot onDone={() => setBooted(true)} />
      <DesktopBackground
        bpm={pulse}
        playing={Boolean(playing)}
        tint={recordTint(playing)}
        activity={activity}
      />
      <TitleBar nowPlaying={playing?.title ?? null} />

      <main className="desktop__content">
        <Hero
          visible={booted && renderableOpen.length === 0 && !windows.game.open}
          heroSubtitle={data.heroSubtitle}
          game={data.game}
          onOpenGame={() => openGame(null)}
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

      <Takeover
        open={windows.game.open && !windows.game.minimized}
        title="Game"
        label={takeoverGame?.title ? `${takeoverGame.title} — the game` : 'The game'}
        onClose={() => { setShownGame(null); dispatch({ type: 'CLOSE', id: 'game' }) }}
      >
        <Game game={takeoverGame} />
      </Takeover>

      <Player
        release={playing}
        onClose={() => { setPulse(0); setPlaying(null) }}
        onPulse={setPulse}
      />

      <Dock
        windows={windows}
        focused={focused}
        onToggle={openWindow}
      />
    </div>
  )
}

export default App

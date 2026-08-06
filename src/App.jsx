import { useReducer, useState } from 'react'
import { useSanityData } from './hooks/useSanityData'
import LightField from './components/LightField'
import ErrorBoundary from './components/ErrorBoundary'
import Window from './components/Window'
import TitleBar from './components/TitleBar'
import Player from './components/Player'
import Dock from './components/Dock'
import Hero from './components/Hero'
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
  const [windows, dispatch] = useReducer(windowsReducer, initialWindows)
  const focused = focusedId(windows)
  const [playing, setPlaying] = useState(null)

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
    works: <Works musicReleases={data.musicReleases} games={data.games} software={data.software} onPlay={setPlaying} />,
    game: <Game game={data.game} />,
    connect: <Connect socialLinks={data.socialLinks} />
  }

  // Only ids with registered content actually mount a Window.
  const renderableOpen = openIds(windows).filter(id => windowConfigs[id])

  return (
    <div className="desktop">
      <DesktopBackground />
      <TitleBar nowPlaying={playing?.title ?? null} />

      <main className="desktop__content">
        <Hero
          visible={renderableOpen.length === 0}
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
        onToggle={(id) => dispatch({ type: 'TOGGLE', id })}
      />
    </div>
  )
}

export default App

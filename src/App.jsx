import { useState, useEffect, useRef, useCallback } from 'react'
import { useSanityData } from './hooks/useSanityData'
import './styles/globals.css'

const releaseTypes = [
  { key: 'drift', label: 'Drift Series' },
  { key: 'album', label: 'Albums' },
  { key: 'soundtrack', label: 'Soundtracks' },
]

// ============================================
// COMPONENTS
// ============================================

function TitleBar() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="titlebar">
      <div className="titlebar__brand">
        <span className="titlebar__dot" />
        <span>heartsaglow</span>
      </div>
      <span className="titlebar__time">{time}</span>
    </header>
  )
}

function Dock({ openWindows, onToggleWindow }) {
  const items = [
    { id: 'about', label: 'About' },
    { id: 'works', label: 'Works' },
    { id: 'contact', label: 'Connect' },
  ]

  return (
    <nav className="dock">
      {items.map(item => (
        <button
          key={item.id}
          className={`dock__item ${openWindows.includes(item.id) ? 'dock__item--active' : ''}`}
          onClick={() => onToggleWindow(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

function Window({ title, isOpen, isFocused, onClose, onFocus, defaultPosition, dragPosition, onDragEnd, children }) {
  const windowRef = useRef(null)
  const headerRef = useRef(null)
  const dragState = useRef({ active: false, offsetX: 0, offsetY: 0 })

  if (!isOpen) return null

  const style = dragPosition
    ? { left: `${dragPosition.x}px`, top: `${dragPosition.y}px`, width: defaultPosition.width, height: defaultPosition.height }
    : { top: defaultPosition.top, left: defaultPosition.left, width: defaultPosition.width, height: defaultPosition.height }

  const handlePointerDown = (e) => {
    if (e.target.closest('.window__close')) return
    const rect = windowRef.current.getBoundingClientRect()
    dragState.current = {
      active: true,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    }
    headerRef.current.setPointerCapture(e.pointerId)
    onFocus()
  }

  const handlePointerMove = (e) => {
    if (!dragState.current.active) return
    const x = e.clientX - dragState.current.offsetX
    const y = e.clientY - dragState.current.offsetY
    windowRef.current.style.left = `${x}px`
    windowRef.current.style.top = `${y}px`
  }

  const handlePointerUp = () => {
    if (!dragState.current.active) return
    dragState.current.active = false
    const rect = windowRef.current.getBoundingClientRect()
    onDragEnd({ x: rect.left, y: rect.top })
  }

  return (
    <div
      ref={windowRef}
      className={`window ${isFocused ? 'window--focused' : ''}`}
      style={style}
      onClick={onFocus}
    >
      <header
        ref={headerRef}
        className="window__header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span className="window__title">{title}</span>
        <button
          className="window__close"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Close window"
        >&times;</button>
      </header>
      <div className="window__content">
        {children}
      </div>
    </div>
  )
}

function AboutContent({ aboutParagraphs }) {
  const lead = aboutParagraphs[0]
  const body = aboutParagraphs.slice(1)

  return (
    <div className="about">
      <p className="about__lead">{lead.text}</p>
      <div className="about__text">
        {body.map((p, i) => (
          <p key={i}>
            {p.linkText ? (
              <>
                {'Founded by '}
                <a href={p.linkUrl} target="_blank" rel="noopener noreferrer">
                  {p.linkText}
                </a>
                {', '}
                {p.text}
              </>
            ) : (
              p.text
            )}
          </p>
        ))}
      </div>
    </div>
  )
}

function ProjectGrid({ items, emptyTitle, emptyDescription }) {
  if (items.length === 0) {
    return (
      <div className="works__section">
        <div className="works__empty">
          <div className="works__empty-icon">&loz;</div>
          <h3>{emptyTitle}</h3>
          <p>{emptyDescription}</p>
          <span className="works__empty-status">Coming Soon</span>
        </div>
      </div>
    )
  }

  return (
    <div className="works__section">
      <div className="works__grid">
        {items.map(item => (
          <a
            key={item.id}
            className="works__item"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.image && (
              <div className="works__artwork">
                <img src={item.image} alt={item.title} loading="lazy" />
              </div>
            )}
            <div className="works__info">
              <h3 className="works__title">{item.title}</h3>
              <span className="works__meta">{item.year}{item.status === 'development' ? ' · In Development' : ''}</span>
              {item.description && <p className="works__desc">{item.description}</p>}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

function WorksContent({ musicReleases, games, software }) {
  const [activeTab, setActiveTab] = useState('music')
  const [selectedRelease, setSelectedRelease] = useState(null)
  const tabs = ['music', 'games', 'software']

  const handleReleaseClick = (release) => {
    setSelectedRelease(release)
  }

  const handleBack = () => {
    setSelectedRelease(null)
  }

  return (
    <div className="works">
      <nav className="works__tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`works__tab ${activeTab === tab ? 'works__tab--active' : ''}`}
            onClick={() => { setActiveTab(tab); setSelectedRelease(null); }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'music' && (
        <>
          {selectedRelease ? (
            <div className="works__detail">
              <button className="works__back" onClick={handleBack}>&larr; Back</button>
              <div className="works__detail-header">
                <div className="works__detail-artwork">
                  <img src={selectedRelease.image} alt={selectedRelease.title} />
                </div>
                <div className="works__detail-info">
                  <h2 className="works__detail-title">{selectedRelease.title}</h2>
                  <span className="works__detail-meta">{selectedRelease.year} &middot; {selectedRelease.artist}</span>
                  <a
                    href={selectedRelease.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="works__detail-link"
                  >
                    Listen on Bandcamp &rarr;
                  </a>
                </div>
              </div>
              {selectedRelease.description && (
                <p className="works__detail-desc">{selectedRelease.description}</p>
              )}
              {selectedRelease.tracks && selectedRelease.tracks.length > 0 && (
                <div className="works__detail-tracks">
                  <h4>Tracks</h4>
                  <ol>
                    {selectedRelease.tracks.map((track, i) => (
                      <li key={i}>{track}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <>
              {releaseTypes.map(type => {
                const releases = musicReleases.filter(r => r.type === type.key)
                if (releases.length === 0) return null
                return (
                  <div key={type.key} className="works__type-section">
                    <h3 className="works__type-label">{type.label}</h3>
                    <div className="works__grid">
                      {releases.map(release => (
                        <button
                          key={release.id}
                          className="works__item"
                          onClick={() => handleReleaseClick(release)}
                        >
                          <div className="works__artwork">
                            <img src={release.image} alt={release.title} loading="lazy" />
                          </div>
                          <div className="works__info">
                            <h3 className="works__title">{release.title}</h3>
                            <span className="works__meta">{release.year}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
              <footer className="works__footer">
                <a
                  href="https://hailenjackson.bandcamp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="works__link"
                >
                  View full discography &rarr;
                </a>
              </footer>
            </>
          )}
        </>
      )}

      {activeTab === 'games' && (
        <ProjectGrid items={games} emptyTitle="Games" emptyDescription="Interactive experiences in development." />
      )}

      {activeTab === 'software' && (
        <ProjectGrid items={software} emptyTitle="Software" emptyDescription="Tools and utilities in development." />
      )}
    </div>
  )
}

function ContactContent({ socialLinks }) {
  return (
    <div className="contact">
      <ul className="contact__list">
        {socialLinks.map((link, i) => (
          <li key={i} className="contact__item">
            <span className="contact__label">{link.name}</span>
            <a
              href={link.url}
              target={link.url.startsWith('mailto') ? undefined : '_blank'}
              rel={link.url.startsWith('mailto') ? undefined : 'noopener noreferrer'}
              className="contact__value"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Hero({ hasOpenWindows, heroTitle, heroSubtitle }) {
  if (hasOpenWindows) return null

  return (
    <div className="hero">
      <h1 className="hero__title">{heroTitle}</h1>
      <p className="hero__tagline">{heroSubtitle}</p>
    </div>
  )
}

function DesktopBackground() {
  return (
    <div className="desktop__bg">
      <div className="desktop__aperture" />
      <div className="desktop__haze" />
      <div className="desktop__grain" />
    </div>
  )
}

// ============================================
// MAIN APP
// ============================================

function App() {
  const { data } = useSanityData()
  const [openWindows, setOpenWindows] = useState([])
  const [focusedWindow, setFocusedWindow] = useState(null)
  const [dragPositions, setDragPositions] = useState({})

  const windowConfigs = {
    about: {
      title: 'About',
      position: { top: '15%', left: '10%', width: '420px', height: 'auto' }
    },
    works: {
      title: 'Works',
      position: { top: '10%', left: '30%', width: '600px', height: '70%' }
    },
    contact: {
      title: 'Connect',
      position: { top: '20%', left: '55%', width: '380px', height: 'auto' }
    }
  }

  const toggleWindow = (id) => {
    if (openWindows.includes(id)) {
      setOpenWindows(openWindows.filter(w => w !== id))
      if (focusedWindow === id) {
        setFocusedWindow(openWindows.filter(w => w !== id)[0] || null)
      }
    } else {
      setOpenWindows([...openWindows, id])
      setFocusedWindow(id)
    }
  }

  const closeWindow = (id) => {
    setOpenWindows(openWindows.filter(w => w !== id))
    if (focusedWindow === id) {
      setFocusedWindow(openWindows.filter(w => w !== id)[0] || null)
    }
  }

  const focusWindow = (id) => {
    setFocusedWindow(id)
  }

  const handleDragEnd = useCallback((id, pos) => {
    setDragPositions(prev => ({ ...prev, [id]: pos }))
  }, [])

  const windowContent = {
    about: <AboutContent aboutParagraphs={data.aboutParagraphs} />,
    works: <WorksContent musicReleases={data.musicReleases} games={data.games} software={data.software} />,
    contact: <ContactContent socialLinks={data.socialLinks} />
  }

  return (
    <div className="desktop">
      <DesktopBackground />
      <TitleBar />

      <main className="desktop__content">
        <Hero hasOpenWindows={openWindows.length > 0} heroTitle={data.heroTitle} heroSubtitle={data.heroSubtitle} />

        {Object.entries(windowConfigs).map(([id, config]) => (
          <Window
            key={id}
            title={config.title}
            isOpen={openWindows.includes(id)}
            isFocused={focusedWindow === id}
            onClose={() => closeWindow(id)}
            onFocus={() => focusWindow(id)}
            defaultPosition={config.position}
            dragPosition={dragPositions[id]}
            onDragEnd={(pos) => handleDragEnd(id, pos)}
          >
            {windowContent[id]}
          </Window>
        ))}
      </main>

      <Dock
        openWindows={openWindows}
        onToggleWindow={toggleWindow}
      />
    </div>
  )
}

export default App

import { useState, useEffect, useReducer } from 'react'
import { useSanityData } from './hooks/useSanityData'
import LightField from './components/LightField'
import ErrorBoundary from './components/ErrorBoundary'
import SocialIcon from './components/SocialIcon'
import Window from './components/Window'
import { windowsReducer, initialWindows, focusedId, openIds, WINDOW_IDS } from './lib/windows'
import * as fallbackData from './data/fallback'
import './styles/globals.css'

const releaseTypes = [
  { key: 'drift', label: 'Drift Series' },
  { key: 'album', label: 'Albums' },
  { key: 'soundtrack', label: 'Soundtracks' },
]

const SOCIAL_ORDER = ['email', 'bandcamp', 'bluesky', 'instagram', 'twitter', 'x', 'tiktok']
const socialRank = (name) => {
  const key = (name || '').toLowerCase().replace(/[^a-z]/g, '')
  const i = SOCIAL_ORDER.indexOf(key)
  return i === -1 ? SOCIAL_ORDER.length : i
}
const isPrimary = (name) => /^email$/i.test((name || '').trim())

// ============================================
// COMPONENTS
// ============================================

function TitleBar() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const formatted = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).toLowerCase().replace(' ', ' ')
      setTime(formatted)
    }
    updateTime()
    const interval = setInterval(updateTime, 30_000)
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

function ArtworkPlaceholder({ title }) {
  const seed = (title || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const h = (seed * 17) % 360
  const h2 = (h + 180) % 360
  return (
    <div
      className="works__artwork works__artwork--placeholder"
      style={{ '--placeholder-h': h, '--placeholder-h2': h2 }}
    >
      <span className="works__artwork-glyph">{(title || '·').trim()[0]}</span>
    </div>
  )
}

function ProjectGrid({ items, emptyTitle, emptyDescription, selectedItem, onSelect, onBack }) {
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

  if (selectedItem) {
    return (
      <div className="works__detail">
        <button className="works__back" onClick={onBack}>&larr; Back</button>
        <div className="works__detail-header">
          {selectedItem.image
            ? (
              <div className="works__detail-artwork">
                <img src={selectedItem.image} alt={selectedItem.title} />
              </div>
            )
            : (
              <div className="works__detail-artwork">
                <ArtworkPlaceholder title={selectedItem.title} />
              </div>
            )
          }
          <div className="works__detail-info">
            <h2 className="works__detail-title">{selectedItem.title}</h2>
            <span className="works__detail-meta">
              {selectedItem.year}
              {selectedItem.status === 'development' ? ' · In Development' : ''}
            </span>
            {selectedItem.url && (
              <a
                href={selectedItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="works__detail-link"
              >
                View Project &rarr;
              </a>
            )}
          </div>
        </div>
        {selectedItem.description && (
          <p className="works__detail-desc">{selectedItem.description}</p>
        )}
      </div>
    )
  }

  return (
    <div className="works__section">
      <div className="works__grid">
        {items.map(item => (
          <button
            key={item.id}
            className="works__item"
            onClick={() => onSelect(item)}
          >
            {item.image
              ? (
                <div className="works__artwork">
                  <img src={item.image} alt={item.title} loading="lazy" />
                </div>
              )
              : <ArtworkPlaceholder title={item.title} />
            }
            <div className="works__info">
              <h3 className="works__title">{item.title}</h3>
              <span className="works__meta">{item.year}{item.status === 'development' ? ' · In Development' : ''}</span>
            </div>
          </button>
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
                const featuredEnabled = type.key === 'drift' && releases.length > 2
                return (
                  <div key={type.key} className="works__type-section">
                    <h3 className="works__type-label">{type.label}</h3>
                    <div className={`works__grid ${featuredEnabled ? 'works__grid--featured' : ''}`}>
                      {releases.map((release, idx) => (
                        <button
                          key={release.id}
                          className={`works__item ${featuredEnabled && idx === 0 ? 'works__item--featured' : ''}`}
                          onClick={() => handleReleaseClick(release)}
                        >
                          {release.image
                            ? (
                              <div className="works__artwork">
                                <img src={release.image} alt={release.title} loading="lazy" />
                              </div>
                            )
                            : <ArtworkPlaceholder title={release.title} />
                          }
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
        <ProjectGrid items={games} emptyTitle="Games" emptyDescription="Interactive experiences in development." selectedItem={selectedRelease} onSelect={handleReleaseClick} onBack={handleBack} />
      )}

      {activeTab === 'software' && (
        <ProjectGrid items={software} emptyTitle="Software" emptyDescription="Tools and utilities in development." selectedItem={selectedRelease} onSelect={handleReleaseClick} onBack={handleBack} />
      )}
    </div>
  )
}

function ContactContent({ socialLinks }) {
  const seen = new Set(socialLinks.map(l => (l.name || '').toLowerCase().trim()))
  const filledFromFallback = fallbackData.socialLinks.filter(
    l => !seen.has((l.name || '').toLowerCase().trim())
  )
  const merged = [...socialLinks, ...filledFromFallback].sort(
    (a, b) => socialRank(a.name) - socialRank(b.name)
  )

  const primary = merged.find(l => isPrimary(l.name))
  const secondary = merged.filter(l => !isPrimary(l.name))

  return (
    <div className="contact">
      {primary && (
        <a
          className="contact__primary"
          href={primary.url}
          target={primary.url.startsWith('mailto') ? undefined : '_blank'}
          rel={primary.url.startsWith('mailto') ? undefined : 'noopener noreferrer'}
        >
          <span className="contact__primary-label">Inquiries &amp; collaboration</span>
          <span className="contact__primary-value">
            <SocialIcon name={primary.name} className="contact__icon" />
            {primary.label}
          </span>
        </a>
      )}
      <ul className="contact__list">
        {secondary.map((link, i) => (
          <li key={`${link.name}-${i}`} className="contact__item">
            <span className="contact__label">
              <SocialIcon name={link.name} className="contact__icon" />
              {link.name}
            </span>
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

function Hero({ hasOpenWindows, heroSubtitle }) {
  if (hasOpenWindows) return null

  return (
    <div className="hero">
      <img src="/logo.png" alt="Hearts Aglow" className="hero__logo" />
      <p className="hero__tagline">{heroSubtitle}</p>
    </div>
  )
}

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

  const windowConfigs = {
    about: {
      title: 'About',
      geom: { top: '14%', left: '8%', width: '440px', height: 'min(560px, 78vh)' }
    },
    works: {
      title: 'Works',
      geom: { top: '9%', left: '28%', width: '640px', height: '76%' }
    },
    connect: {
      title: 'Connect',
      geom: { top: '18%', left: '58%', width: '400px', height: 'min(560px, 78vh)' }
    }
  }

  const windowContent = {
    about: <AboutContent aboutParagraphs={data.aboutParagraphs} />,
    works: <WorksContent musicReleases={data.musicReleases} games={data.games} software={data.software} />,
    connect: <ContactContent socialLinks={data.socialLinks} />
  }

  return (
    <div className="desktop">
      <DesktopBackground />
      <TitleBar />

      <main className="desktop__content">
        <Hero hasOpenWindows={openIds(windows).length > 0} heroSubtitle={data.heroSubtitle} />

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

      <Dock
        windows={windows}
        onToggleWindow={(id) => dispatch({ type: 'TOGGLE', id })}
      />
    </div>
  )
}

export default App

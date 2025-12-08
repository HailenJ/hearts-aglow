import { useState, useEffect } from 'react'
import './styles/globals.css'

/*
  Hearts Aglow — OS Interface
  
  A spiritual operating system aesthetic inspired by:
  - .hack // THE WORLD / Altimit OS
  - James Turrell light installations
  - Jordan Belson cosmic visuals
  
  The website as a desktop environment with floating windows.
*/

// ============================================
// DATA
// ============================================

const musicReleases = [
  { 
    id: 1, 
    title: 'Drift 6', 
    year: '2024', 
    url: 'https://hailenjackson.bandcamp.com/album/drift-6', 
    image: 'https://f4.bcbits.com/img/a3819146014_10.jpg',
    artist: 'Hailen Jackson',
    tracks: ['Drift 36: Beau', 'Drift 37: Patrick', 'Drift 38: Ryder', 'Drift 39: Rich', 'Drift 40: Taegan', 'Drift 41: Lisa', 'Drift 42: Gavin', 'Drift 43: Maycee', 'Drift 44: Julie', 'Drift 45: Diane', 'Drift 46: Mary', 'Drift 47: River'],
    description: `Drift 6 is the latest in the Drift album series, ambient albums created to help rest, relax, and inspire. Written completely with bio midi sonification from loved ones - friends and family had diodes strapped to their arms and that data was translated to midi notes. A love letter to important people in my life in a digital form that could last beyond their lifetimes.`,
    bandcampId: '329094219'
  },
  { 
    id: 2, 
    title: 'Drift 5', 
    year: '2022', 
    url: 'https://hailenjackson.bandcamp.com/album/drift-5', 
    image: 'https://f4.bcbits.com/img/a3423859940_10.jpg',
    artist: 'Hailen Jackson',
    tracks: ['Drift 28', 'Drift 29', 'Drift 30', 'Drift 31', 'Drift 32', 'Drift 33', 'Drift 34', 'Drift 35'],
    description: `Fifth release in the Drift series, albums created for sleep/relaxation/studying. All sounds are guitar with help from Chase Bliss, Collision Devices, GFI System, Strymon Engineering and Empress Effects. Art by Justin LaGuff.`,
    bandcampId: '3943694481'
  },
  { 
    id: 3, 
    title: 'Coda', 
    year: '2021', 
    url: 'https://hailenjackson.bandcamp.com/album/coda', 
    image: 'https://f4.bcbits.com/img/a3405404133_10.jpg',
    artist: 'Hailen Jackson',
    tracks: ['Process (feat Peachole, Maddi Baird)', 'Coda', 'Dusk', 'Amor Fati (feat. Beardy, Jess Pluto, Sleepyhaze, Maddi Baird)', 'From', 'Shift', 'Twin', 'We Don\'t Talk Anymore (feat. Maddi Baird)', 'Sunrise'],
    description: `The follow-up to Rebuild, in the works since 2019. A mix of everything I've made so far with some new things thrown in. Features people that mean the world to me - from features, field recordings, to voicemails left for this album. Art by grayson_bear.`,
    bandcampId: '2367866191'
  },
  { 
    id: 4, 
    title: 'The Secrets We Keep', 
    year: '2021', 
    url: 'https://hailenjackson.bandcamp.com/album/the-secrets-we-keep', 
    image: 'https://f4.bcbits.com/img/a4145378259_10.jpg',
    artist: 'Hailen Jackson',
    tracks: ['The Secrets We Keep I', 'The Secrets We Keep II', 'The Secrets We Keep III', 'The Secrets We Keep IV', 'The Secrets We Keep V', 'The Secrets We Keep VI', 'The Secrets We Keep VII', 'The Secrets We Keep VIII', 'The Secrets We Keep IX', 'The Secrets We Keep X', 'The Secrets We Keep XI', 'The Secrets We Keep XII'],
    description: 'Original Soundtrack',
    bandcampId: '2841498943'
  },
  { 
    id: 5, 
    title: 'Drift 4', 
    year: '2021', 
    url: 'https://hailenjackson.bandcamp.com/album/drift-4', 
    image: 'https://f4.bcbits.com/img/a0800919021_10.jpg',
    artist: 'Hailen Jackson',
    tracks: ['Drift 22: Philodendron Hederaceum', 'Drift 23: Pleurotus Djamor', 'Drift 24: Salix', 'Drift 25: Adenium Obesum', 'Drift 26: Hyacinthus', 'Drift 27: Crassula'],
    description: `Every song on this album was written by the plant in the title using a bio midi sonification device. Track 3 Salix was written by the dying willow tree that has been in my backyard my entire life. Art by Alexander Laird.`,
    bandcampId: '3050261402'
  },
  { 
    id: 6, 
    title: 'Drift 3', 
    year: '2020', 
    url: 'https://hailenjackson.bandcamp.com/album/drift-3', 
    image: 'https://f4.bcbits.com/img/a3086208354_10.jpg',
    artist: 'Hailen Jackson',
    tracks: ['Drift Fifteen', 'Drift Sixteen', 'Drift Seventeen', 'Drift Eighteen', 'Drift Nineteen', 'Drift Twenty-one'],
    description: `Third release in the Drift series, created for sleep and relaxation. Made using an Octatrack sampler.`,
    bandcampId: ''
  },
  { 
    id: 7, 
    title: 'Exalt', 
    year: '2020', 
    url: 'https://hailenjackson.bandcamp.com/album/exalt', 
    image: 'https://f4.bcbits.com/img/a0774289478_10.jpg',
    artist: 'Hailen Jackson',
    tracks: ['Exalt I', 'Exalt II', 'Exalt III', 'Exalt IV', 'Exalt V', 'Exalt VI', 'Exalt VII', 'Exalt VIII'],
    description: `Beat-driven electronic album exploring hip-hop and downtempo territories.`,
    bandcampId: ''
  },
  { 
    id: 8, 
    title: 'Drift 2', 
    year: '2020', 
    url: 'https://hailenjackson.bandcamp.com/album/drift-2', 
    image: 'https://f4.bcbits.com/img/a1941621832_10.jpg',
    artist: 'Hailen Jackson',
    tracks: ['Drift Eight', 'Drift Nine', 'Drift Ten', 'Drift Eleven', 'Drift Twelve', 'Drift Thirteen', 'Drift Fourteen'],
    description: `Second release in the Drift series, created for sleep and relaxation. Made using an OP-1 synth.`,
    bandcampId: ''
  },
  { 
    id: 9, 
    title: 'Drift', 
    year: '2020', 
    url: 'https://hailenjackson.bandcamp.com/album/drift', 
    image: 'https://f4.bcbits.com/img/a3393213433_10.jpg',
    artist: 'Hailen Jackson',
    tracks: ['Drift One', 'Drift Two', 'Drift Three', 'Drift Four', 'Drift Five', 'Drift Six', 'Drift Seven'],
    description: `The first Drift album, started during quarantine. Inspired by Brian Eno's Music For Airports. Created for sleep and relaxation using a Deluge sequencer.`,
    bandcampId: ''
  },
  { 
    id: 10, 
    title: 'Rebuild', 
    year: '2019', 
    url: 'https://hailenjackson.bandcamp.com/album/rebuild', 
    image: 'https://f4.bcbits.com/img/a1518516741_10.jpg',
    artist: 'Hailen Jackson',
    tracks: ['Walk', 'Campfire', 'Ponder', 'Steps', 'You Were Here', 'Build', 'Home', 'Waiting', 'Limb', 'Still'],
    description: `Atmospheric electronic album blending ambient textures with introspective beats.`,
    bandcampId: ''
  },
]

const socialLinks = [
  { name: 'Email', url: 'mailto:Hailen@Hailen.info', label: 'Hailen@Hailen.info' },
  { name: 'Bandcamp', url: 'https://hailenjackson.bandcamp.com', label: 'hailenjackson.bandcamp.com' },
  { name: 'Bluesky', url: 'https://bsky.app/profile/heartsaglow.io', label: '@heartsaglow.io' },
  { name: 'Twitter', url: 'https://twitter.com/heartsaglow', label: '@heartsaglow' },
  { name: 'TikTok', url: 'https://tiktok.com/@hearts_aglow', label: '@hearts_aglow' },
]

// ============================================
// COMPONENTS
// ============================================

// Title Bar (Top System Bar)
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
        <span className="titlebar__brand-icon"></span>
        <span>Hearts Aglow OS</span>
      </div>
      <div className="titlebar__status">
        <span>sys.online</span>
        <span className="titlebar__time">{time}</span>
      </div>
    </header>
  )
}

// Dock (Bottom Navigation)
function Dock({ openWindows, onToggleWindow }) {
  const items = [
    { id: 'about', icon: '✦', label: 'About' },
    { id: 'works', icon: '◈', label: 'Works' },
    { id: 'contact', icon: '◎', label: 'Connect' },
  ]

  return (
    <nav className="dock">
      {items.map(item => (
        <button
          key={item.id}
          className={`dock__item ${openWindows.includes(item.id) ? 'dock__item--active' : ''}`}
          onClick={() => onToggleWindow(item.id)}
        >
          <span className="dock__icon">{item.icon}</span>
          <span className="dock__label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

// Window Component
function Window({ id, title, isOpen, isFocused, onClose, onFocus, position, children }) {
  if (!isOpen) return null

  return (
    <div 
      className={`window ${isFocused ? 'window--focused' : ''}`}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        height: position.height,
      }}
      onClick={onFocus}
    >
      <header className="window__header">
        <div className="window__controls">
          <button 
            className="window__control window__control--close"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Close window"
          />
          <button className="window__control window__control--minimize" aria-label="Minimize" />
          <button className="window__control window__control--maximize" aria-label="Maximize" />
        </div>
        <span className="window__title">{title}</span>
        <div style={{ width: '52px' }} /> {/* Spacer for centering */}
      </header>
      <div className="window__content">
        {children}
      </div>
    </div>
  )
}

// About Window Content
function AboutContent() {
  return (
    <div className="about">
      <p className="about__lead">Some things glow from within.</p>
      <div className="about__text">
        <p>
          Hearts Aglow is a small studio for games, software, and music — all built 
          on the belief that digital spaces can feel alive.
        </p>
        <p>
          Founded by{' '}
          <a href="https://hailenjackson.bandcamp.com" target="_blank" rel="noopener noreferrer">
            Hailen Jackson
          </a>, 
          whose atmospheric electronic work has soundtracked games, films, 
          and late-night radio across the world.
        </p>
        <p>We make things that breathe. Come drift with us.</p>
      </div>
    </div>
  )
}

// Works Window Content
function WorksContent() {
  const [activeTab, setActiveTab] = useState('music')
  const [selectedRelease, setSelectedRelease] = useState(null)
  const tabs = ['music', 'software', 'games']

  // Handle clicking on an album
  const handleReleaseClick = (release) => {
    setSelectedRelease(release)
  }

  // Go back to grid view
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

      {/* MUSIC TAB */}
      {activeTab === 'music' && (
        <>
          {selectedRelease ? (
            <div className="works__detail">
              <button className="works__back" onClick={handleBack}>← Back</button>
              <div className="works__detail-header">
                <div className="works__detail-artwork">
                  <img src={selectedRelease.image} alt={selectedRelease.title} />
                </div>
                <div className="works__detail-info">
                  <h2 className="works__detail-title">{selectedRelease.title}</h2>
                  <span className="works__detail-meta">{selectedRelease.year} · {selectedRelease.artist}</span>
                  <a 
                    href={selectedRelease.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="works__detail-link"
                  >
                    Listen on Bandcamp →
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
              <div className="works__grid">
                {musicReleases.map(release => (
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
              <footer className="works__footer">
                <a 
                  href="https://hailenjackson.bandcamp.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="works__link"
                >
                  View full discography →
                </a>
              </footer>
            </>
          )}
        </>
      )}

      {/* SOFTWARE TAB */}
      {activeTab === 'software' && (
        <div className="works__section">
          <div className="works__empty">
            <div className="works__empty-icon">◇</div>
            <h3>Software</h3>
            <p>Tools and utilities in development.</p>
            <span className="works__empty-status">Coming Soon</span>
          </div>
        </div>
      )}

      {/* GAMES TAB */}
      {activeTab === 'games' && (
        <div className="works__section">
          <div className="works__empty">
            <div className="works__empty-icon">◈</div>
            <h3>Games</h3>
            <p>Interactive experiences in development.</p>
            <span className="works__empty-status">Coming Soon</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Contact Window Content
function ContactContent() {
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

// Hero / Welcome Screen
function Hero({ hasOpenWindows }) {
  if (hasOpenWindows) return null

  return (
    <div className="hero">
      <h1 className="hero__title">Hearts Aglow</h1>
      <p className="hero__tagline">Light, sound, and what hums beneath.</p>
      <p className="hero__hint">Select an icon below to begin</p>
    </div>
  )
}

// Desktop Background
function DesktopBackground() {
  return (
    <div className="desktop__bg">
      <div className="desktop__gradient" />
      <div className="desktop__orb desktop__orb--1" />
      <div className="desktop__orb desktop__orb--2" />
      <div className="desktop__orb desktop__orb--3" />
      <div className="desktop__grid" />
    </div>
  )
}

// ============================================
// MAIN APP
// ============================================

function App() {
  const [openWindows, setOpenWindows] = useState([])
  const [focusedWindow, setFocusedWindow] = useState(null)

  // Window positions (responsive defaults)
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

  const windowContent = {
    about: <AboutContent />,
    works: <WorksContent />,
    contact: <ContactContent />
  }

  return (
    <div className="desktop">
      <DesktopBackground />
      <TitleBar />
      
      <main className="desktop__content">
        <Hero hasOpenWindows={openWindows.length > 0} />
        
        {Object.entries(windowConfigs).map(([id, config]) => (
          <Window
            key={id}
            id={id}
            title={config.title}
            isOpen={openWindows.includes(id)}
            isFocused={focusedWindow === id}
            onClose={() => closeWindow(id)}
            onFocus={() => focusWindow(id)}
            position={config.position}
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

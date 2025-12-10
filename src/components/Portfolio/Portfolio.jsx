import { useState } from 'react'
import './Portfolio.css'

/*
  Portfolio Component
  
  Three categories: Music, Software, Games
  Music shows album cards with artwork and links to Bandcamp
  Software shows project cards
  Games shows placeholder for future projects
*/

// Music releases - using direct Bandcamp links and album art
const musicReleases = [
  {
    id: 1,
    title: 'Drift 6',
    year: '2024',
    url: 'https://hailenjackson.bandcamp.com/album/drift-6',
    image: 'https://f4.bcbits.com/img/a3819146014_10.jpg',
  },
  {
    id: 2,
    title: 'Drift 5',
    year: '2022',
    url: 'https://hailenjackson.bandcamp.com/album/drift-5',
    image: 'https://f4.bcbits.com/img/a3423859940_10.jpg',
  },
  {
    id: 3,
    title: 'Coda',
    year: '2021',
    url: 'https://hailenjackson.bandcamp.com/album/coda',
    image: 'https://f4.bcbits.com/img/a3405404133_10.jpg',
  },
  {
    id: 4,
    title: 'The Secrets We Keep',
    year: '2021',
    url: 'https://hailenjackson.bandcamp.com/album/the-secrets-we-keep',
    image: 'https://f4.bcbits.com/img/a4145378259_10.jpg',
  },
  {
    id: 5,
    title: 'Drift 4',
    year: '2021',
    url: 'https://hailenjackson.bandcamp.com/album/drift-4',
    image: 'https://f4.bcbits.com/img/a0800919021_10.jpg',
  },
  {
    id: 6,
    title: 'Drift 3',
    year: '2020',
    url: 'https://hailenjackson.bandcamp.com/album/drift-3',
    image: 'https://f4.bcbits.com/img/a3086208354_10.jpg',
  },
  {
    id: 7,
    title: 'Drift 2',
    year: '2020',
    url: 'https://hailenjackson.bandcamp.com/album/drift-2',
    image: 'https://f4.bcbits.com/img/a1008735498_10.jpg',
  },
  {
    id: 8,
    title: 'Drift',
    year: '2020',
    url: 'https://hailenjackson.bandcamp.com/album/drift',
    image: 'https://f4.bcbits.com/img/a2877498498_10.jpg',
  },
]

// Software projects
const softwareProjects = [
  {
    id: 1,
    title: 'Coming Soon',
    description: 'Tools and utilities in development.',
    status: 'in-development',
    url: null,
    image: null,
  },
]

// Game projects (placeholder)
const gameProjects = [
  {
    id: 1,
    title: 'Coming Soon',
    description: 'New projects in development.',
    status: 'in-development',
    url: null,
    image: null,
  },
]

function Portfolio() {
  const [activeFilter, setActiveFilter] = useState('all')

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'music', label: 'Music' },
    { key: 'software', label: 'Software' },
    { key: 'games', label: 'Games' },
  ]

  return (
    <section id="portfolio" className="portfolio">
      <div className="portfolio__container">
        {/* Section Header */}
        <header className="portfolio__header">
          <h2 className="portfolio__title glow-text-subtle">Works</h2>
          
          {/* Filter Tabs */}
          <nav className="portfolio__filters">
            {filters.map(filter => (
              <button 
                key={filter.key}
                className={`portfolio__filter font-mono ${activeFilter === filter.key ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </nav>
        </header>

        {/* Portfolio Grid */}
        <div className="portfolio__grid">
          
          {/* Music Items */}
          {(activeFilter === 'all' || activeFilter === 'music') && 
            musicReleases.map(release => (
              <article key={`music-${release.id}`} className="portfolio__item portfolio__item--music">
                <a 
                  href={release.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="portfolio__item-link"
                >
                  <div className="portfolio__item-inner glass-panel">
                    <div className="portfolio__artwork">
                      <img 
                        src={release.image} 
                        alt={release.title}
                        loading="lazy"
                      />
                      <div className="portfolio__artwork-overlay">
                        <span className="portfolio__play-hint">Listen →</span>
                      </div>
                    </div>
                    <div className="portfolio__item-info">
                      <h3 className="portfolio__item-title">{release.title}</h3>
                      <span className="portfolio__item-year font-mono">{release.year}</span>
                    </div>
                    <span className="portfolio__item-type font-mono">Music</span>
                  </div>
                </a>
              </article>
            ))
          }

          {/* Software Items */}
          {(activeFilter === 'all' || activeFilter === 'software') && 
            softwareProjects.map(project => (
              <article key={`software-${project.id}`} className="portfolio__item portfolio__item--software">
                <div className="portfolio__item-inner portfolio__item-inner--placeholder glass-panel">
                  <div className="portfolio__placeholder-content">
                    <h3>{project.title}</h3>
                    <p className="text-secondary">{project.description}</p>
                  </div>
                  <span className="portfolio__item-type font-mono">Software</span>
                </div>
              </article>
            ))
          }

          {/* Game Items */}
          {(activeFilter === 'all' || activeFilter === 'games') && 
            gameProjects.map(game => (
              <article key={`game-${game.id}`} className="portfolio__item portfolio__item--game">
                <div className="portfolio__item-inner portfolio__item-inner--placeholder glass-panel">
                  <div className="portfolio__placeholder-content">
                    <h3>{game.title}</h3>
                    <p className="text-secondary">{game.description}</p>
                  </div>
                  <span className="portfolio__item-type font-mono">Games</span>
                </div>
              </article>
            ))
          }
        </div>

        {/* Link to full Bandcamp */}
        {(activeFilter === 'all' || activeFilter === 'music') && (
          <footer className="portfolio__footer">
            <a 
              href="https://hailenjackson.bandcamp.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="portfolio__more-link font-mono"
            >
              View full discography →
            </a>
          </footer>
        )}
      </div>
    </section>
  )
}

export default Portfolio

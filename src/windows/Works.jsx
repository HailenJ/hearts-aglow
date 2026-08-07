import { useState } from 'react'
import { resolveRoute } from '../lib/route'

const releaseTypes = [
  { key: 'drift', label: 'Drift Series' },
  { key: 'album', label: 'Albums' },
  { key: 'soundtrack', label: 'Soundtracks' },
]

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

function Works({ musicReleases, software, onPlay, selectedSlug, onSelect }) {
  const [manualTab, setManualTab] = useState('music')
  const tabs = ['music', 'software']

  // The tab follows a deep-linked slug (so a software link doesn't land on
  // the music tab rendering music-only fields); with no slug selected, the
  // user's own tab click wins. resolveRoute is the same lookup App uses to
  // turn a hash into a window + slug, reused here to turn a slug into a tab.
  const resolved = resolveRoute(
    selectedSlug ? { id: 'works', detail: selectedSlug } : null,
    { musicReleases, software }
  )
  const activeTab = resolved.activeTab ?? manualTab
  const collectionsByTab = { music: musicReleases, software }
  const selectedRelease = resolved.slug
    ? collectionsByTab[resolved.activeTab].find(r => r.slug === resolved.slug) ?? null
    : null

  return (
    <div className="works">
      <nav className="works__tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`works__tab ${activeTab === tab ? 'works__tab--active' : ''}`}
            onClick={() => { setManualTab(tab); onSelect(null); }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'music' && (
        <>
          {selectedRelease ? (
            <div className="works__detail">
              <button className="works__back" onClick={() => onSelect(null)}>&larr; Back</button>
              <div className="works__detail-header">
                <div className="works__detail-artwork">
                  {selectedRelease.image
                    ? <img src={selectedRelease.image} alt={selectedRelease.title} />
                    : <ArtworkPlaceholder title={selectedRelease.title} />
                  }
                </div>
                <div className="works__detail-info">
                  <h2 className="works__detail-title">{selectedRelease.title}</h2>
                  <span className="works__detail-meta">{selectedRelease.year} &middot; {selectedRelease.artist}</span>
                  {/* Play is the primary action — this site is for drifting,
                      and every release now carries a player. Bandcamp drops to
                      a quiet secondary link for buying and credits, so the two
                      no longer compete for the same emphasis. */}
                  {selectedRelease.bandcampId && (
                    <button className="works__play" onClick={() => onPlay(selectedRelease)}>
                      <span className="works__play-icon" aria-hidden="true">&#9654;</span>
                      Play
                    </button>
                  )}
                  {selectedRelease.url && (
                    <a
                      href={selectedRelease.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="works__detail-link"
                    >
                      On Bandcamp &#8599;
                    </a>
                  )}
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
                        // A card is a div, not a button, because it now holds
                        // its own play control and buttons cannot nest.
                        <div
                          key={release.id}
                          className={`works__item ${featuredEnabled && idx === 0 ? 'works__item--featured' : ''}`}
                        >
                          <button
                            className="works__item-open"
                            onClick={() => onSelect(release.slug)}
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
                          {release.bandcampId && (
                            <button
                              className="works__item-play"
                              onClick={() => onPlay(release)}
                              aria-label={`Play ${release.title}`}
                            >
                              <span aria-hidden="true">&#9654;</span>
                            </button>
                          )}
                        </div>
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

      {activeTab === 'software' && (
        <ProjectGrid items={software} emptyTitle="Software" emptyDescription="Tools and utilities in development." selectedItem={selectedRelease} onSelect={(item) => onSelect(item.slug)} onBack={() => onSelect(null)} />
      )}
    </div>
  )
}

export default Works

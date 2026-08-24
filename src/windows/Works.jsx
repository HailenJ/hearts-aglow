// Tracks may be a bare string (older/Sanity data) or { title, duration }.
// Tolerating both means a CMS entry without durations still renders.
const trackTitle = (t) => (typeof t === 'string' ? t : t?.title ?? '')
const trackDuration = (t) => (typeof t === 'string' ? 0 : t?.duration ?? 0)
const totalRuntime = (tracks) => (tracks ?? []).reduce((a, t) => a + trackDuration(t), 0)
const formatRuntime = (secs) => {
  if (!secs) return ''
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

const releaseTypes = [
  { key: 'drift', label: 'Drift Series' },
  { key: 'album', label: 'Albums' },
  { key: 'soundtrack', label: 'Soundtracks' },
]

function ArtworkPlaceholder({ title }) {
  const seed = (title || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  // Held inside the field's own arc (rose 340 through peach 20) instead of the
  // full colour wheel. A free-running hue put missing covers anywhere on it,
  // including greens the palette never uses and ~195, which is --signal's hue
  // and reserved by Signal Discipline. Two neighbouring warms, not a lottery.
  const h = (340 + (seed * 7) % 40) % 360
  const h2 = (h + 340) % 360
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
        <button className="works__back" onClick={onBack}>← Back</button>
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
                View Project →
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

// The view and the selected slug both arrive as props: they are route state,
// and the dock is the tab bar now. App resolves them against current data,
// which is why this component holds none of its own.
function Works({ musicReleases, games, software, onPlay, onOpenGame, activeTab, selectedSlug, onSelect }) {
  const collectionsByTab = { music: musicReleases, software }
  const selectedRelease = selectedSlug
    ? (collectionsByTab[activeTab] ?? []).find(r => r.slug === selectedSlug) ?? null
    : null

  return (
    <div className="works">
      {activeTab === 'music' && (
        <>
          {selectedRelease ? (
            <div className="works__detail">
              <button className="works__back" onClick={() => onSelect(null)}>← Back</button>
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
                      On Bandcamp ↗
                    </a>
                  )}
                </div>
              </div>
              {selectedRelease.description && (
                <p className="works__detail-desc">{selectedRelease.description}</p>
              )}
              {selectedRelease.tracks && selectedRelease.tracks.length > 0 && (
                <div className="works__detail-tracks">
                  <h4>
                    Tracks
                    <span className="works__runtime">{formatRuntime(totalRuntime(selectedRelease.tracks))}</span>
                  </h4>
                  <ol>
                    {selectedRelease.tracks.map((track, i) => (
                      <li key={i}>
                        <span className="works__track-title">{trackTitle(track)}</span>
                        {trackDuration(track) > 0 && (
                          <span className="works__track-time">{formatRuntime(trackDuration(track))}</span>
                        )}
                      </li>
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
                  View full discography →
                </a>
              </footer>
            </>
          )}
        </>
      )}

      {/* Games are launchers, not detail panes: a card opens the full-field
          takeover, which is where the game already lives. That is why games
          are absent from resolveRoute's byTab (no #/works/<game> route) —
          one item must not have two competing detail views.
          ponytail: no per-game deep link; add one to resolveRoute if a
          second game ever ships and needs its own shareable URL. */}
      {activeTab === 'games' && (
        <ProjectGrid
          items={games ?? []}
          emptyTitle="Games"
          emptyDescription="One title in development."
          selectedItem={null}
          onSelect={onOpenGame}
          onBack={() => {}}
        />
      )}

      {activeTab === 'software' && (
        <ProjectGrid items={software} emptyTitle="Software" emptyDescription="Tools and utilities in development." selectedItem={selectedRelease} onSelect={(item) => onSelect(item.slug)} onBack={() => onSelect(null)} />
      )}
    </div>
  )
}

export default Works

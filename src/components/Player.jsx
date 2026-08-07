import { useState } from 'react'
import Visualizer from './Visualizer'

const fmt = (secs) => {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
const trackTitle = (t) => (typeof t === 'string' ? t : t?.title ?? '')
const trackDuration = (t) => (typeof t === 'string' ? 0 : t?.duration ?? 0)

export default function Player({ release, onClose }) {
  const [showTracks, setShowTracks] = useState(false)
  if (!release) return null

  // Bandcamp's slim variant. We cannot style inside the iframe, so it borrows
  // as little space as possible and our own chrome carries the identity.
  const src = `https://bandcamp.com/EmbeddedPlayer/album=${release.bandcampId}`
    + '/size=small/bgcol=0a0810/linkcol=dff4ff/transparent=true/'

  const tracks = release.tracks ?? []
  const total = tracks.reduce((a, t) => a + trackDuration(t), 0)

  return (
    <aside className="player" aria-label={`Player — ${release.title}`}>
      <div className="player__viz-wrap">
        <Visualizer release={release} />
        <div className="player__meta">
          {release.image
            ? <img className="player__art" src={release.image} alt="" aria-hidden="true" />
            : null}
          <div className="player__text">
            <span className="player__title">{release.title}</span>
            <span className="player__year">
              {release.year}
              {total ? ` · ${Math.round(total / 60)} min` : ''}
              {tracks.length ? ` · ${tracks.length} tracks` : ''}
            </span>
          </div>
          <button className="player__close" onClick={onClose} aria-label={`Stop playing ${release.title}`}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2 2 8 8M8 2 2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <iframe
        className="player__frame"
        title={`${release.title} — Bandcamp player`}
        src={src}
        seamless
      />

      {tracks.length > 0 && (
        <>
          <button
            className="player__tracks-toggle"
            onClick={() => setShowTracks(v => !v)}
            aria-expanded={showTracks}
            aria-controls="player-tracks"
          >
            {showTracks ? 'Hide tracks' : `${tracks.length} tracks`}
            <span className={`player__chev ${showTracks ? 'player__chev--up' : ''}`} aria-hidden="true">▾</span>
          </button>
          {showTracks && (
            <ol className="player__tracks" id="player-tracks">
              {tracks.map((t, i) => (
                <li key={i}>
                  <span className="player__track-title">{trackTitle(t)}</span>
                  <span className="player__track-time">{fmt(trackDuration(t))}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </aside>
  )
}

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
const trackId = (t) => (typeof t === 'string' ? '' : t?.trackId ?? '')

export default function Player({ release, onClose }) {
  // Selecting a track swaps the embed to that track's own Bandcamp player.
  // The album-level `t=` parameter is silently ignored by the small embed
  // (verified by rendering t=1 and t=4 — both showed track one), so per-track
  // embeds are the only route that actually changes what is loaded.
  const [picked, setPicked] = useState(null)
  if (!release) return null

  // Bandcamp's slim variant. We cannot style inside the iframe, so it borrows
  // as little space as possible and our own chrome carries the identity.
  const src = picked
    ? `https://bandcamp.com/EmbeddedPlayer/track=${picked}/size=small/bgcol=0a0810/linkcol=dff4ff/transparent=true/`
    : `https://bandcamp.com/EmbeddedPlayer/album=${release.bandcampId}/size=small/bgcol=0a0810/linkcol=dff4ff/transparent=true/`

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
        <ol className="player__tracks" id="player-tracks">
          {tracks.map((t, i) => {
            const id = trackId(t)
            const active = picked ? picked === id : i === 0
            return (
              <li key={i}>
                <button
                  className={`player__track ${active ? 'player__track--active' : ''}`}
                  onClick={() => id && setPicked(id)}
                  disabled={!id}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="player__track-title">{trackTitle(t)}</span>
                  <span className="player__track-time">{fmt(trackDuration(t))}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {picked && (
        <p className="player__hint">Press play — browsers block autoplay across sites.</p>
      )}

    </aside>
  )
}

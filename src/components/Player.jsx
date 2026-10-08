import { useEffect, useRef, useState } from 'react'
import Visualizer from './Visualizer'
import ErrorBoundary from './ErrorBoundary'
import { useMediaQuery, COMPACT } from '../hooks/useMediaQuery'
import { VIZ_MODES, DEFAULT_MODE, isMode } from '../lib/vizModes'
import { trackBpm } from '../lib/vizSeed'

const fmt = (secs) => {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
const trackTitle = (t) => (typeof t === 'string' ? t : t?.title ?? '')
const trackDuration = (t) => (typeof t === 'string' ? 0 : t?.duration ?? 0)
const trackId = (t) => (typeof t === 'string' ? '' : t?.trackId ?? '')

// A component rather than an effect in Player, because Player returns early
// when there is no release and hooks cannot live behind that branch.
function PulseReport({ bpm, onPulse }) {
  useEffect(() => { onPulse?.(bpm) }, [bpm, onPulse])
  return null
}

export default function Player({ release, onClose, onPulse }) {
  // Selecting a track swaps the embed to that track's own Bandcamp player.
  // The album-level `t=` parameter is silently ignored by the small embed
  // (verified by rendering t=1 and t=4 — both showed track one), so per-track
  // embeds are the only route that actually changes what is loaded.
  const [picked, setPicked] = useState(null)
  // Remembered across sessions: which visual someone prefers is a taste
  // setting, not state worth re-asking for on every visit.
  // Validated on read, not just defaulted: the modes were renamed once, so a
  // returning visitor can hold a stored id that no longer exists.
  const [viz, setViz] = useState(() => {
    try {
      const saved = localStorage.getItem('aglow.viz')
      return isMode(saved) ? saved : DEFAULT_MODE
    } catch { return DEFAULT_MODE }
  })
  const chooseViz = (id) => {
    setViz(id)
    try { localStorage.setItem('aglow.viz', id) } catch { /* private mode */ }
  }
  // On a phone the full panel covered three quarters of the window it plays
  // over, so the tracklist starts folded there. Desktop keeps it open.
  const compact = useMediaQuery(COMPACT)
  const [tracksOpen, setTracksOpen] = useState(false)
  const showTracks = !compact || tracksOpen

  // The panel's height, published as --player-h so a phone sheet can stop
  // above it instead of running underneath. Measured, because it rides on
  // the track count and on whether the list is open.
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const root = document.documentElement
    if (!el) return
    const ro = new ResizeObserver(() => root.style.setProperty('--player-h', `${el.offsetHeight}px`))
    ro.observe(el)
    return () => { ro.disconnect(); root.style.removeProperty('--player-h') }
  }, [release])

  if (!release) return null

  // Bandcamp's slim variant. We cannot style inside the iframe, so it borrows
  // as little space as possible and our own chrome carries the identity.
  const src = picked
    ? `https://bandcamp.com/EmbeddedPlayer/track=${picked}/size=small/bgcol=0a0810/linkcol=dff4ff/transparent=true/`
    : `https://bandcamp.com/EmbeddedPlayer/album=${release.bandcampId}/size=small/bgcol=0a0810/linkcol=dff4ff/transparent=true/`

  const tracks = release.tracks ?? []
  const total = tracks.reduce((a, t) => a + trackDuration(t), 0)

  // The embed opens on track one, so that is what the visual should pulse at
  // until someone picks another.
  const active = (picked && tracks.find(t => trackId(t) === picked)) || tracks[0]
  const bpm = trackBpm(release, active)

  // The field pulses at whatever is loaded here, so the panel is the only
  // thing that knows the answer — `picked` is its own state. Reported upward
  // rather than recomputed in App, which would have to duplicate the
  // album-opens-on-track-one rule to get the same number.
  return (
    <aside className="player" ref={ref} aria-label={`Player — ${release.title}`}>
      <PulseReport bpm={bpm} onPulse={onPulse} />
      {/* The visual is the panel's background, not a strip above it: Belson's
          mandala and Minter's kaleidoscope are centric forms and a 108px
          letterbox gave them nowhere to be centric. The chrome sits on top of
          it, and `player__stage` reserves the one region it keeps clear. */}
      {/* No WebGL means ogl throws, and without a boundary pressing play
          blanked the entire site. The panel works without its visual. */}
      <ErrorBoundary>
        <Visualizer release={release} mode={viz} bpm={bpm} />
      </ErrorBoundary>

      <div className="player__viz-modes" role="group" aria-label="Visual style">
        {VIZ_MODES.map(m => (
          <button
            key={m.id}
            className={`player__viz-mode ${viz === m.id ? 'player__viz-mode--on' : ''}`}
            onClick={() => chooseViz(m.id)}
            aria-pressed={viz === m.id}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="player__stage" aria-hidden="true" />

      <div className="player__body">
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

        <iframe
          className="player__frame"
          title={`${release.title} — Bandcamp player`}
          src={src}
          seamless
        />

        {compact && tracks.length > 0 && (
          <button
            className="player__tracks-toggle"
            onClick={() => setTracksOpen(o => !o)}
            aria-expanded={tracksOpen}
            aria-controls="player-tracks"
          >
            {tracks.length} tracks
            <svg className={`player__chev ${tracksOpen ? 'player__chev--up' : ''}`} width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {showTracks && tracks.length > 0 && (
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
      </div>
    </aside>
  )
}

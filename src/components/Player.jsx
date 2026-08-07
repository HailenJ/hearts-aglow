export default function Player({ release, onClose }) {
  if (!release) return null

  // Bandcamp's slim variant, not the 340px artwork one. We cannot style inside
  // the iframe, so the goal is to borrow as little visual real estate as
  // possible and let our own chrome carry the identity. The artwork already
  // lives in the Works window; repeating it here bought nothing but bulk.
  const src = `https://bandcamp.com/EmbeddedPlayer/album=${release.bandcampId}`
    + '/size=small/bgcol=0a0810/linkcol=dff4ff/transparent=true/'

  return (
    <aside className="player" aria-label={`Player — ${release.title}`}>
      <div className="player__meta">
        {release.image
          ? <img className="player__art" src={release.image} alt="" aria-hidden="true" />
          : null}
        <div className="player__text">
          <span className="player__title">{release.title}</span>
          <span className="player__year">{release.year}</span>
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
    </aside>
  )
}

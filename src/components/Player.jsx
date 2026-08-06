export default function Player({ release, onClose }) {
  if (!release) return null

  const src = `https://bandcamp.com/EmbeddedPlayer/album=${release.bandcampId}/size=large/bgcol=181a1b/linkcol=dff4ff/artwork=small/transparent=true/`

  return (
    <aside className="player" aria-label={`Player — ${release.title}`}>
      <header className="player__bar">
        <span className="player__title">{release.title}</span>
        <button className="player__close" onClick={onClose} aria-label="Close player">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2 2 8 8M8 2 2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      <iframe
        className="player__frame"
        title={`${release.title} on Bandcamp`}
        src={src}
        seamless
      />
    </aside>
  )
}

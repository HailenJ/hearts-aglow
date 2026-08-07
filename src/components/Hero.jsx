export default function Hero({ visible, heroSubtitle, game, onOpenGame }) {
  if (!visible) return null

  const named = Boolean(game?.title)

  return (
    <div className="hero">
      <img src="/logo.png" alt="Hearts Aglow" className="hero__logo" />
      <p className="hero__tagline">{heroSubtitle}</p>

      <div className="hero__rule" aria-hidden="true" />

      {/* The surface's single call to action. Quiet by design — a shout would
          break the field, and the dock carries the game everywhere. But quiet
          is not the same as unreadable as a button: this used to be a title, a
          date and a bare arrow, which named no action and carried less surface
          than the dock items below it. The verb is the fix, not volume. */}
      <button className="hero__cta" onClick={onOpenGame}>
        <span className="hero__cta-name">{named ? game.title : 'A game'}</span>
        <span className="hero__cta-meta">
          {game?.year ? `${game.year} · ` : ''}{game?.status || 'in development'}
        </span>
        <span className="hero__cta-go">
          Look inside <span aria-hidden="true">→</span>
        </span>
      </button>
    </div>
  )
}

export default function Hero({ visible, heroSubtitle, game, onOpenGame }) {
  if (!visible) return null

  const named = Boolean(game?.title)

  return (
    <div className="hero">
      <img src="/logo.png" alt="Hearts Aglow" className="hero__logo" />
      <p className="hero__tagline">{heroSubtitle}</p>

      <div className="hero__rule" aria-hidden="true" />

      {/* The surface's single call to action. Quiet by design — a shout
          would break the field, and the dock carries the game everywhere. */}
      <button className="hero__cta" onClick={onOpenGame}>
        <span className="hero__cta-name">{named ? game.title : 'A game'}</span>
        <span className="hero__cta-meta">
          {game?.year ? `${game.year} · ` : ''}{game?.status || 'in development'}
        </span>
        <span className="hero__cta-go" aria-hidden="true">→</span>
      </button>
    </div>
  )
}

import { NEWSLETTER_URL } from '../lib/config'

export default function Game({ game }) {
  const named = Boolean(game?.title)
  const canSubscribe = Boolean(NEWSLETTER_URL)

  return (
    <div className="game">
      <div className="game__art">
        {game?.keyArt
          ? <img src={game.keyArt} alt={named ? game.title : 'Key art'} />
          : <p className="game__art-empty">Key art in progress</p>}
      </div>

      <h3 className="game__title">{named ? game.title : 'Untitled'}</h3>
      <p className="game__meta">
        {game?.year ? `${game.year} · ` : ''}{game?.status || 'in development'}
      </p>

      {game?.logline && <p className="game__logline">{game.logline}</p>}

      {/* GET, not POST: beehiiv's hosted subscribe page takes the address as a
          query parameter, so this hands off with the field already filled in
          rather than embedding an unstylable widget. Opens in a new tab so a
          visitor mid-browse does not lose the site. */}
      <form
        className="game__form"
        action={NEWSLETTER_URL || undefined}
        method="get"
        target="_blank"
        rel="noopener noreferrer"
      >
        <label className="game__label" htmlFor="game-email">
          Hear when it ships
        </label>
        <div className="game__row">
          <input
            id="game-email"
            className="game__input"
            type="email"
            name="email"
            placeholder="you@somewhere"
            autoComplete="email"
            required
            disabled={!canSubscribe}
            aria-describedby="game-signup-note"
          />
          <button className="game__submit" type="submit" disabled={!canSubscribe}>
            Notify me
          </button>
        </div>
        <p className="game__note" id="game-signup-note">
          {canSubscribe
            ? 'Opens beehiiv in a new tab to confirm.'
            : 'Signup opens shortly — the list is not live yet.'}
        </p>
      </form>

      {game?.storeUrl && (
        <a
          className="game__store"
          href={game.storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={named ? `Get ${game.title}` : 'Get the game'}
        >
          Get it →
        </a>
      )}
    </div>
  )
}

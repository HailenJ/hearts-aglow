import { EMAIL_ENDPOINT } from '../lib/config'

export default function Game({ game }) {
  const named = Boolean(game?.title)
  const canSubscribe = Boolean(EMAIL_ENDPOINT)

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

      <form
        className="game__form"
        action={EMAIL_ENDPOINT || undefined}
        method="post"
        target="_blank"
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
            required
            disabled={!canSubscribe}
          />
          <button className="game__submit" type="submit" disabled={!canSubscribe}>
            Notify me
          </button>
        </div>
        {!canSubscribe && (
          <p className="game__note">Signup opens shortly — the list is not live yet.</p>
        )}
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

import { NEWSLETTER_URL } from '../lib/config'
import { statusLabel } from '../lib/game'

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
        {game?.year ? `${game.year} · ` : ''}{statusLabel(game?.status)}
      </p>

      {game?.logline && <p className="game__logline">{game.logline}</p>}

      {/* A link, not a form: beehiiv does not prefill from a query parameter,
          so collecting the address here would only make the visitor type it
          twice. One action, styled as ours. */}
      {canSubscribe ? (
        <div className="game__signup">
          <a
            className="game__submit"
            href={NEWSLETTER_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Hear when it ships
          </a>
          <p className="game__note">Opens the newsletter signup in a new tab.</p>
        </div>
      ) : (
        <p className="game__note">Signup opens shortly — the list is not live yet.</p>
      )}

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

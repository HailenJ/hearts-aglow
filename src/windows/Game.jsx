import { useState } from 'react'
import { NEWSLETTER_URL } from '../lib/config'
import { isWishlist, statusLabel } from '../lib/game'
import { sized } from '../lib/img'
import { track } from '../lib/track'

export default function Game({ game }) {
  const named = Boolean(game?.title)
  const canSubscribe = Boolean(NEWSLETTER_URL)
  // The player loads only on request: an idle YouTube embed is ~1 MB of
  // script and a third-party cookie jar on a page most people only glance at.
  // The Games pane's "Watch the trailer" opens straight into the player.
  const [watching, setWatching] = useState(Boolean(game?.autoplay && game?.trailer))
  const art = game?.keyArt ? sized(game.keyArt, 1600) : game?.trailer && `https://i.ytimg.com/vi/${game.trailer}/hqdefault.jpg`
  const alt = named ? game.title : 'Key art'
  const wishlist = isWishlist(game)

  return (
    <div className="game">
      <div className="game__art">
        {watching ? (
          <iframe
            className="game__video"
            src={`https://www.youtube-nocookie.com/embed/${game.trailer}?autoplay=1&rel=0`}
            title={named ? `${game.title} trailer` : 'Trailer'}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : game?.trailer ? (
          <button className="game__trailer" onClick={() => { setWatching(true); track('trailer') }}>
            <img src={art} alt={alt} />
            <span className="game__trailer-play"><span aria-hidden="true">▶</span> Watch the trailer</span>
          </button>
        ) : art
          ? <img src={art} alt={alt} />
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
          aria-label={wishlist ? `Wishlist ${named ? game.title : 'the game'} on Steam` : named ? `Get ${game.title}` : 'Get the game'}
        >
          {wishlist ? 'Wishlist on Steam →' : 'Get it →'}
        </a>
      )}

      {game?.links?.map(b => (
        <a key={b.url} className="game__store" href={b.url} target="_blank" rel="noopener noreferrer">
          {b.label} →
        </a>
      ))}
    </div>
  )
}

# heartsaglow.io

The site for Hearts Aglow — a small studio for games, software and music.

It is a single-page React app that presents itself as a desktop OS: a light
field for a ground, floating windows for content, a dock, and a short boot
sequence on first visit. The ground is the point. Everything else floats in it.

## Running it

```bash
npm install
npm run dev        # Vite dev server with HMR
npm run build      # production build to dist/
npm run preview    # serve the built output
npm run lint       # eslint (v9 flat config)
npm test           # node:test, no framework
```

No environment variables. No API keys. The Sanity dataset is public and
read-only, so a fresh clone runs with nothing configured.

## How it is put together

| Path | What lives there |
| --- | --- |
| `src/App.jsx` | Window state, routing, and what the takeover shows |
| `src/components/` | The shell: light field, window chrome, dock, boot, player |
| `src/windows/` | The four window bodies: About, Works, Game, Connect |
| `src/hooks/` | Hash routing, media queries, the Sanity fetch |
| `src/lib/` | Window reducer, route resolution, visualizer seeds, site constants |
| `src/data/fallback.js` | The offline copy of every piece of content |
| `src/styles/globals.css` | The entire stylesheet, tokens first |

Four things are worth knowing before changing anything:

**The light field is one fragment shader.** `components/LightField.jsx` holds
its whole palette as four GLSL constants, mirrored into `--bloom-*` tokens in
`globals.css`. `test/fieldContrast.test.js` fails if the two drift apart, and
also pins a contrast floor under the text that sits on the field.

**Content comes from Sanity, but the site never depends on it.** `useSanityData`
starts from `data/fallback.js` and replaces what the fetch returns. A Sanity
outage degrades to the local copy rather than blanking the page. Anything that
is a conversion path — the contact address, the Bandcamp link, the newsletter
URL — lives in `lib/config.js` instead, where a CMS edit cannot delete it.

**Window state is the source of truth; the URL is a projection of it.** Several
windows can be open at once but a hash can only hold one route, so `App.jsx`
writes the focused window into the hash and reads hashes back the other way.
`lib/windows.js` is a plain reducer and is the most heavily tested file here.

**The game is deliberately not a window.** It takes the whole field, because it
is the one thing being sold and it should not compete for z-order with three
other panes.

## Design

`DESIGN.md` is the contract: the palette, the four sanctioned uses of the signal
colour, the single breakpoint, and an Open Questions section recording the
inconsistencies that are known and unresolved rather than smoothed over. The
same thesis is duplicated as a comment at the bottom of `index.html`, so it
travels with the markup. Change one and change the other.

## Deploying

Push to `main`. GitHub Actions builds once and publishes to both GitHub Pages
and the Namecheap host — a cutover that is still in progress, so the live site
never depends on the new path working. There is no `npm run deploy`, and `dist/`
is never committed.

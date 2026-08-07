# Revamp handoff — "Signal in the Bloom"

**Branch merged:** `revamp/signal-in-the-bloom` → `main` (local, **not pushed yet** — see Deploy below)
**Design spec:** `docs/superpowers/specs/2026-08-06-heartsaglow-revamp-design.md`
**Plan:** `docs/superpowers/plans/2026-08-06-heartsaglow-revamp.md`
**Design system as built:** `DESIGN.md`
**Screenshots:** `docs/screenshots/`

---

## Deploy — do this first

**GitHub Pages currently serves heartsaglow.io from `main`'s root.** That is why `index.html` had a hardcoded `<script src="/assets/index-tGwAZRz3.js">` — the deploy method was copying build output into the repo root and committing it.

That single line silently broke this entire revamp: `npm run dev` and `npm run build` both operated on the **old** prebuilt bundle for all fifteen tasks. It was only caught at the end.

The fix is in place, but it requires one action from you:

1. **GitHub → Settings → Pages → Source → branch `gh-pages`, folder `/ (root)`.**
2. Confirm heartsaglow.io loads the new site.
3. Then `git push origin main`.

`gh-pages` already holds a clean 9-file build of the new site, published and verified. It is not live until you flip that setting.

**Do not push `main` before flipping**, or the site will 404 — `index.html` on main now correctly points at `/src/main.jsx`, which is source, not a build artifact.

After the flip, deploying is `npm run deploy` and nothing else. `dist/`, `assets/`, and `node_modules/` are now gitignored and untracked (7,661 → 52 tracked files).

---

## Still needs you

| Item | Where | Effect until supplied |
|---|---|---|
| **Newsletter URL** | `src/lib/config.js` → `NEWSLETTER_URL` | The signup form renders **disabled** with honest copy until set. Set it to your beehiiv subscribe page, e.g. `https://yourname.beehiiv.com/subscribe`. The form GETs there with the address prefilled, so our styled field stays ours instead of embedding beehiiv's unstylable widget. |
| **5 missing Bandcamp IDs** | `src/data/fallback.js` | Drift 3, Exalt, Drift 2, Drift, and Rebuild show "Listen on Bandcamp →" with no inline player. The other five (Drift 6, Drift 5, Coda, The Secrets We Keep, Drift 4) have players. |
| **Confirm the game record** | Sanity | The hero CTA and Game window read "YARG VENUES · 2026 · 2 Audio reactive venues." straight from your Sanity `game` document, with key art and a live store link. Confirm that is real and current, not test data. |

Note: the local `src/data/fallback.js` `game` export is intentionally all empty strings. The game only appears when the Sanity fetch succeeds. If you want it visible offline, copy the real values in.

---

## What shipped

- **Light field** — WebGL fragment shader (`src/components/LightField.jsx`) using gaussian falloff so the field has no boundary anywhere, on three cycles of 431/619/787s so it never visibly repeats, with per-pixel dither against banding. Reuses the already-installed `ogl`. **No new dependencies were added anywhere in this revamp.**
- **Type** — Anybody / Archivo / Martian Mono, replacing Cormorant / Outfit / Space Mono.
- **Window chrome** — minimize, maximize, resize, z-order. Focus reads as *more light* rather than a highlight ring.
- **Boot sequence** — an aperture opening, ~2.5s, once per session, skippable, and skipped entirely under `prefers-reduced-motion`.
- **Deep links** — `#/works/drift-6` and friends, on native `hashchange`. No router dependency.
- **Player** — Bandcamp's unstylable iframe wrapped in chrome we control, persisting across window open/close.
- **Game window** — key art, logline, email capture, and a store-link slot that appears only when a store URL exists.
- **Mobile** — full-bleed sheets, one window at a time, single 767px breakpoint.
- **Structure** — `App.jsx` went from 584 lines to ~160, split across `components/` and `windows/`.
- **Tests** — 38, on Node's built-in `node --test`. No test framework was added.

---

## Known deferred items

None block use. Listed so they are not rediscovered as surprises.

- `.about__text` (48ch) and `.works__detail-desc` (54ch) are narrower than the 68ch guideline. Narrow is safe; too wide is the failure mode.
- `--glow-warm-soft` is a single-use token.
- `.titlebar__time` inherits its font and colour from `.titlebar` rather than declaring them.
- `TOGGLE` in `src/lib/windows.js` and `isLoaded` in `useSanityData` are currently unused by the app but retained — both have tests and plausible near-term use.
- `parseHash` folds a query string into the detail segment (`#/works/drift-6?x=1`). Harmless, since nothing generates such links.
- `@sanity/client` is roughly a third of the 360 kB bundle for one read-only GROQ query. A plain `fetch()` to the Sanity query URL would drop ~30 kB gzip and two chunks. Worth doing if bundle size ever matters.
- `queries.js` fetches music, games, software, and social only — `aboutParagraphs` and `heroSubtitle` are permanently fallback-only despite the "content comes from Sanity" story. Extend the query if you want to edit them in Sanity.
- `package.json` `homepage` still reads `yourusername`.

---

## The one thing nobody verified

**Nothing in this build was seen in a real browser by a human.** Automated screenshots were taken (`docs/screenshots/`) and they look right, but they were captured headlessly and, for most of the build, against the stale bundle described above.

Before considering this done, open it yourself and check the light field in particular — its brightness and colour are the heart of the direction, and they are the one thing a screenshot cannot settle to a designer's satisfaction.

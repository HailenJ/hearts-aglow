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

**Newsletter is live.** `NEWSLETTER_URL` points at `https://heartsaglow.beehiiv.com/subscribe`. It is a styled link rather than a form because beehiiv does not prefill from a query parameter — verified by rendering `/subscribe?email=probe@example.com` and finding the address nowhere in the DOM. A form here would have made people type their address twice.

| Item | Where | Effect until supplied |
|---|---|---|
| **Real key art** | Sanity | The takeover currently shows a near-white card reading "OTO" — the brightest object on a site whose whole subject is a dark light field. It reads as a placeholder because it is one. This is the single biggest visual weakness. |
| **A store URL** | Sanity, game `url` | Empty on the current record, so the "Get it →" button does not render. With the newsletter still disabled, the game has no live action at all. |

**Bandcamp IDs are done** — all 10 releases now have one. The five that were missing (Drift 3, Exalt, Drift 2, Drift, Rebuild) were extracted from the public album pages, so every release has an inline player and the affordance is finally consistent.

Note: the local `src/data/fallback.js` `game` export is intentionally all empty strings. The game only appears when the Sanity fetch succeeds. If you want it visible offline, copy the real values in.

---

## What shipped

- **Light field** — WebGL fragment shader (`src/components/LightField.jsx`) using gaussian falloff so the field has no boundary anywhere, on three cycles of 431/619/787s so it never visibly repeats, with per-pixel dither against banding. Reuses the already-installed `ogl`. **No new dependencies were added anywhere in this revamp.**
- **Type** — Anybody / Archivo / Martian Mono, replacing Cormorant / Outfit / Space Mono.
- **Window chrome** — minimize, maximize, resize, z-order. Focus reads as *more light* rather than a highlight ring.
- **Boot sequence** — an aperture opening, ~2.5s, once per session, skippable, and skipped entirely under `prefers-reduced-motion`.
- **Deep links** — `#/works/drift-6` and friends, on native `hashchange`. No router dependency.
- **Player** — Bandcamp's unstylable iframe wrapped in chrome we control, persisting across window open/close.
- **Game takeover** — the game is deliberately NOT a window. It takes the whole field so the site's commercial priority never competes for z-order with three other panes; the dock stays above it so nobody gets trapped, and opening any window dismisses it.
- **Windows size to content** up to a cap, with an overflow cue at the lower edge — macOS hides scrollbars until used, which previously left seven of ten releases invisible with no signal.
- **Mobile** — full-bleed sheets, one window at a time, single 767px breakpoint.
- **Structure** — `App.jsx` went from 584 lines to ~160, split across `components/` and `windows/`.
- **Tests** — 38, on Node's built-in `node --test`. No test framework was added.

---

## Next session: rebuild the visualizers

The three player visualizers (Drift / Belson / Minter, `src/components/Visualizer.jsx`) work
and are honest, but they look rough. The owner's verdict on 2026-08-07 was "really bad and
rough and not beautiful," and that is correct. The diagnosis, so it does not have to be
rediscovered:

1. **Wrong medium.** The light field is a WebGL fragment shader built on gaussian falloff and
   per-pixel dither — deliberately edgeless. The visualizers are Canvas 2D hairline strokes
   with `shadowBlur` standing in for glow. That is a cruder visual language inside a refined
   one; they read as wireframes taped onto a light field. Tuning alpha and line width does not
   fix a materials mismatch.
2. **Wrong canvas shape.** 108px tall by ~340px wide is a letterbox. Belson's mandala and
   Minter's kaleidoscope both want square-ish space to read as centric forms.
3. **`shadowBlur` is not bloom.** Real bloom wants additive passes or a blur kernel.

Recommended approach: rebuild in WebGL reusing the same vocabulary as `LightField.jsx` —
gaussian primitives, dither, no hard edges — rather than porting the canvas maths. `ogl` is
already a dependency and `LightField.jsx` is a working reference for renderer setup, the
reduced-motion path and teardown. Consider giving the player a taller visual area, or making
the visual a full-panel background the chrome sits on rather than a strip above it.

Keep: the deterministic per-record seeding (it makes each release its own figure), the
mode picker with localStorage persistence, the reduced-motion freeze, and the honest comment
at the top of the file explaining why an audio analyser is impossible here.

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

## Verification status

The build **has** now been seen in a real browser and critiqued against those screenshots. The light field renders as intended — smooth violet-to-amber, no banding, no visible edge.

Three findings I reported during the build turned out to be **wrong**, and they are recorded here because the failure mode is worth remembering:

- A mobile horizontal-overflow bug that did not exist. macOS Chrome clamps its window to ~500px, so a `--window-size=390` screenshot lays out at 500 and crops. Measured in a true 390px iframe, there is zero overflow on any route.
- A hero contrast failure that did not exist. A subagent sampled the peach logo and reported it as the field. The shader's true worst case across the full 787s cycle is 7.50 / 5.89 / 4.59:1 for the three text tokens — all pass, though `--text-faint` is thin.
- A claim in a code comment that the window geometry was "tuned so all four can be open without burying each other." It was not; Game covered 66.9% of Works. Geometry is now verified by computing rectangles at five widths rather than asserted in prose.

The common cause in all three: accepting a premise because of how it was packaged. Numbers in this document were computed and re-checked against the thing itself.

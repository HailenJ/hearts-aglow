# Revamp handoff — "Signal in the Bloom"

**Branch merged:** `revamp/signal-in-the-bloom` → `main`, pushed and live at heartsaglow.io.
**Design spec:** `docs/superpowers/specs/2026-08-06-heartsaglow-revamp-design.md`
**Plan:** `docs/superpowers/plans/2026-08-06-heartsaglow-revamp.md`
**Design system as built:** `DESIGN.md`
**Screenshots:** `docs/screenshots/`

---

## Deploy — settled 2026-08-07

**Deploying is `git push origin main`. There is nothing else.**

Pages `build_type` is now `workflow`, so `.github/workflows/deploy.yml` builds from source on
every push to `main` and publishes `dist/`. `public/CNAME` carries the custom domain into the
artifact. No build output is ever committed.

The history, because it cost a whole revamp: Pages used to serve heartsaglow.io from `main`'s
root, so the deploy method was copying build output into the repo root and committing it. That
left a hardcoded `<script src="/assets/index-tGwAZRz3.js">` in `index.html`, and `npm run dev`
and `npm run build` both silently operated on the **old** prebuilt bundle for all fifteen tasks
of the revamp. It was only caught at the end.

Three mechanisms existed at once — `main`/root, the `gh-pages` branch, and `deploy.yml`. Only
the workflow survives. The `gh-pages` branch, the `predeploy`/`deploy` scripts, and the
`gh-pages` devDependency were deleted so the mistake cannot recur. `dist/`, `assets/`, and
`node_modules/` are gitignored and untracked (7,661 → 52 tracked files).

---

## Still needs you

**Newsletter is live.** `NEWSLETTER_URL` points at `https://heartsaglow.beehiiv.com/subscribe`. It is a styled link rather than a form because beehiiv does not prefill from a query parameter — verified by rendering `/subscribe?email=probe@example.com` and finding the address nowhere in the DOM. A form here would have made people type their address twice.

| Item | Where | Effect until supplied |
|---|---|---|
| **Real key art** | Sanity | Re-checked 2026-08-07 and still a placeholder: a grey wordmark on cream. In the takeover it is a ~700×395 near-white slab taking roughly 45% of the viewport, the brightest object on a site whose whole subject is dark light — and it is the one surface meant to sell something. Still the single biggest visual weakness. |
| **A store URL** | Sanity, game `url` | Still `null` on the record as of 2026-08-07, so the "Get it →" button does not render. The beehiiv signup is live, so the game is not actionless — but there is nowhere to send anyone who wants it. |

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

## Visualizers — rebuilt in WebGL, 2026-08-07

Done. The three modes are now one fragment shader (`src/components/Visualizer.jsx`) speaking
the same vocabulary as `LightField.jsx`: every figure is a sum of gaussians, each a tight core
plus a wide halo, dithered, with no hard edge anywhere. No new dependencies — `ogl` was already
there. Seeding moved to `src/lib/vizSeed.js`, which is pure and now has 7 tests.

All three diagnosed causes are addressed:

1. **Medium** — gaussian primitives instead of Canvas 2D hairlines. The halo term is what
   `shadowBlur` was imitating, done properly and additively.
2. **Shape** — the visual is the whole panel's background (340×469, portrait) rather than a
   108px letterbox strip. `.player__stage` reserves the top 148px as the region the chrome
   leaves clear; the figure continues behind the meta bar, the embed and the tracklist.
3. **Bloom** — real additive accumulation.

Two things the browser caught that the code did not:

- Centring the figures on the *panel* buried every focal point under the chrome — Minter's core
  and Belson's aperture both landed behind the Bandcamp iframe. Figures now centre on `uFocus`,
  78px down from the top edge, computed per-resize because the panel's height rides on the
  tracklist while the chrome below it is a fixed pixel count.
- Additive accumulation pegged Minter's origin at pure white, exactly the trap the old Canvas
  file warned about. Spokes are held off the centre by a `smoothstep` and the core is drawn
  once, deliberately, rather than summed seven times.

Kept, as intended: deterministic per-record seeding, the mode picker with `localStorage`
persistence, the reduced-motion freeze, and the honest note about why an audio analyser is
impossible through a cross-origin iframe.

**Verified in Chrome**, not asserted: shaders compile with no ogl warnings, context is live,
all three modes draw, reduced motion freezes without blanking, and mobile at 390px has no
horizontal overflow and no off-screen panel. Screenshots were looked at, one mode at a time,
and two rounds of intensity fixes came out of that.

### Modes renamed, and a BPM pulse — same day

The modes are **Strand / Halo / Bloom**, named for what they look like rather than for who
inspired them. The debts to Jordan Belson and Jeff Minter are paid in the comments where the
maths actually is. Stored preferences are validated against `VIZ_MODES` on read now, so a
returning visitor holding the old `belson` id lands on the default instead of an empty picker.

**BPM drives a pulse, and it is a pulse, not sync.** `bpm` is optional per track in
`src/data/fallback.js`, falling back to a release-level value and then to 60 — a resting heart
rate, which for the bio-sonified Drift records is literally the quantity the music came from.
Out-of-range values are clamped to 20–220 so a typo cannot become a strobe. The shader gets
`uBeat` in Hz and every mode responds: brightness swings 17–27% per beat, plus a small
geometric swell.

The phase is **not** aligned to the audio and cannot be. Same iframe wall as the analyser: no
`currentTime`, no play or pause events. An iframe-focus heuristic could guess when someone hit
play but cannot see a pause, so it would desync permanently the first time anyone used one. The
pulse is free-running at the right rate, which is honest; a fake sync that drifts would not be.

**No BPM values are in the data yet, deliberately.** Inventing heart rates and attributing them
to Beau, Patrick and Ryder by name would have looked authoritative and been fiction. The shape
and a worked example are documented at the top of `fallback.js`; add real numbers as you have
them and each track picks its own up immediately.

Verified by measurement, not assertion: with a temporary `bpm: 150` on one track the pulse was
counted at 150/min in Chrome, and the untouched next track at 61/min. The test value was
reverted. Note `useSanityData.js` names the fields that survive the Sanity merge one by one —
`bpm` had to be added there or it would have been silently dropped for remote data, the exact
trap that function's own comment warns about.

One shortcut is marked in the file: Bloom's trail is analytic — each spoke re-evaluated at
five past instants — not a feedback buffer. Ceiling: a very fast spin reads as a dotted arc
rather than a smear. Upgrade path is a ping-pong `RenderTarget`, which costs two framebuffers
and a second program for a 340px panel.

## Known deferred items

None block use. Listed so they are not rediscovered as surprises.

- `.about__text` (48ch) and `.works__detail-desc` (54ch) are narrower than the 68ch guideline. Narrow is safe; too wide is the failure mode.
- `.titlebar__time` inherits its font and colour from `.titlebar` rather than declaring them.
- `TOGGLE` in `src/lib/windows.js` and `isLoaded` in `useSanityData` are currently unused by the app but retained — both have tests and plausible near-term use.
- `parseHash` folds a query string into the detail segment (`#/works/drift-6?x=1`). Harmless, since nothing generates such links.
- `queries.js` sends the whole GROQ query in a GET query string. It is ~1.2 kB encoded, well inside every practical URL limit, but a much larger query would need a POST.
- `queries.js` now fetches the About copy too, from a single `about` document (`aboutText`) whose `paragraphs` are plain strings; `{link}` in a paragraph marks where `linkText`/`linkUrl` land. `heroSubtitle` is still fallback-only — extend the query the same way if you want it editable.
- The Studio source is **not in this repo**. It lives in `~/Downloads/hearts-aglow-sanity/hearts-aglow`, has no git remote, and was found stale on 2026-08-24: its music type was named `music` with a `url` field while the live docs are `musicRelease` with `link`, so music releases would have shown as an unknown type after any deploy. Realigned and redeployed. Give that folder a remote before it is lost.

---

## Verification status

The build **has** now been seen in a real browser and critiqued against those screenshots. The light field renders as intended — smooth violet-to-amber, no banding, no visible edge.

Three findings I reported during the build turned out to be **wrong**, and they are recorded here because the failure mode is worth remembering:

- A mobile horizontal-overflow bug that did not exist. macOS Chrome clamps its window to ~500px, so a `--window-size=390` screenshot lays out at 500 and crops. Measured in a true 390px iframe, there is zero overflow on any route.
- A hero contrast failure that did not exist. A subagent sampled the peach logo and reported it as the field. The shader's true worst case across the full 787s cycle is 7.50 / 5.89 / 4.59:1 for the three text tokens — all pass, though `--text-faint` is thin.
- A claim in a code comment that the window geometry was "tuned so all four can be open without burying each other." It was not; Game covered 66.9% of Works. Geometry is now verified by computing rectangles at five widths rather than asserted in prose.

The common cause in all three: accepting a premise because of how it was packaged. Numbers in this document were computed and re-checked against the thing itself.

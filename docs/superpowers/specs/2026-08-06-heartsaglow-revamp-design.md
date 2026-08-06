# heartsaglow.io revamp — design spec

**Date:** 2026-08-06
**Status:** approved pending user review
**Seed key:** `155321e4` (direction pinned by user; the roll is superseded per new-work's pin rule)
**Mode:** Experience, carrying a Persuade duty (sell the game)

---

## 1. What this is

heartsaglow.io is a single-page React 19 + Vite app presenting Hearts Aglow — a one-person studio making games, software, and music. It simulates a desktop OS: draggable windows, a dock, a light-field background.

The revamp does three things:

1. **Replaces the visual world.** The current look (warm brown, Cormorant/Outfit/Space Mono, dust particles) is evidence of intent, not authority. It is replaced, not polished.
2. **Pushes the OS fiction further.** Real window chrome, a boot sequence, deep links, and a persistent player — the four features the user selected.
3. **Fixes the hierarchy.** Product priority is sell games → drive listens → field collaborations. The current site buries games as an empty tab behind music. The revamp inverts that without burying the music.

Product truth lives in `PRODUCT.md` and is not restated here.

---

## 2. The visual world — "Signal in the Bloom"

### Thesis

The site is a Turrell Ganzfeld with an operating system floating in it. The light field is the work; the interface is the thin, precise thing that lets you move through it. It refuses the category default for a music/studio portfolio — a dark page with a neon accent and a grid of album cards — by making the ground itself the primary visual event and reducing the chrome to hairlines.

### Why the field must be WebGL

Research finding that drives the build: Turrell's Ganzfelds work because the visual field has **no boundary** and because color moves slowly enough — over 10 to 15 minutes — that the viewer becomes aware of their own perception. Belson's films are "live manipulation of pure light," centric, "moving into the void."

Two consequences:

- **No visible edge, anywhere.** CSS radial-gradients band visibly on near-black at full-viewport scale. Banding is an edge. A Ganzfeld with edges is just a gradient. The field therefore renders in a fragment shader with ordered-dither noise applied per-pixel.
- **A ~12-minute hue cycle, not a loop you can catch.** Three independently-phased sine drivers on hue, bloom position, and intensity, with periods that do not share a common multiple inside a plausible visit.

`ogl` is already a dependency, already mounted through `src/components/Particles.jsx`. The particle shader is replaced with the light-field shader in that same slot. No new dependency.

### Palette

**Strategy: Drenched.** The surface *is* the color; this is permitted for Experience and is the whole point of the direction.

| Role | Value | Use |
|---|---|---|
| Void | `#08070b` | Base ground beneath the field |
| Bloom warm | `#c48aff` → `#ffa878` | The drifting aperture; violet through amber-rose |
| Bloom deep | `#483478` | Lower field, weight |
| Signal | `#dff4ff` (cold cyan-white) | Focus, active state, live data **only** |
| Text primary | `rgba(255,255,255,.92)` | Body |
| Text secondary | `rgba(255,255,255,.62)` | Metadata |
| Hairline | `rgba(255,255,255,.11)` | Window borders at rest |
| Hairline focused | `rgba(223,244,255,.34)` | Focused window border |

Signal cyan is the entire cyberspace budget. It appears on focus, on live readouts, and nowhere else. Scattering it would turn the site into the near-black-plus-neon default the direction exists to refuse.

Dark is chosen from the use scene, not category habit: this is ambient music for resting, sleeping, and working late, viewed in a dim room. A light ground would be wrong for the listening scene.

### Typography

The incumbent stack — Cormorant Garamond, Outfit, Space Mono — is three faces from the known generated-default set. Replaced with three faces, each with one job:

| Face | Job | Rationale |
|---|---|---|
| **Anybody** (variable, width 50–150) | Display: wordmark support, window titles, release titles, section labels | Wide-range technical grotesque. At expanded width, thin weight, and wide tracking it reads as light spreading laterally across the field — the type behaves like the world. |
| **Archivo** (variable) | Body: about copy, release descriptions, form labels | Workhorse with enough width range to stay coherent beside Anybody. Body measure held to 65–75ch. |
| **Martian Mono** (variable) | Data only: clock, track durations, hash paths, boot log, coordinates | Mono is earned here as measurement and interface readout, not worn as a costume for "technical." If a string is not a number, a path, or a machine utterance, it does not get mono. |

All three are OFL and load from the existing Google Fonts link. Availability verified.

### Texture

Film grain over the whole composition at low opacity, `mix-blend-mode: overlay`. It is not decoration: it is the second half of the anti-banding strategy and it is the shoegaze reference doing real work. The existing grain overlay in `globals.css` is retained and retuned.

---

## 3. Structure

### First viewport

No windows open. Centered, generous vertical air:

```
wordmark (logo.png)
tagline — "Light, sound, and what hums beneath."
hairline rule
[ game title ] · [year]
in development →          ← the one primary action
```

The game line is the surface's single call to action. It is quiet — one line, one arrow — because a shout would break the field, and because the visitor who scrolls past it still has the dock. The dock gains a fourth item so the game is reachable from anywhere.

Music is not demoted: it remains the deepest real content on the site and owns the largest window.

### Dock

`About · Works · [Game] · Say hi` — four items. Active items carry a signal-cyan underglow. Minimized windows show a dimmed state distinct from closed.

### Window chrome

| Feature | Behavior |
|---|---|
| **Focus** | Raises z-index; hairline brightens to signal cyan at 34%; a faint bloom halo appears behind the window. Focus reads as *more light* — the world's own vocabulary, not a borrowed highlight ring. |
| **Minimize** | Window scales and fades toward its dock item over 240ms; dock item enters minimized state. |
| **Maximize** | Expands to inset 4% of the field on a slower 380ms ease; toggles back to prior geometry. |
| **Resize** | Bottom-right grip, pointer events, min 320×240, clamped to viewport. |
| **Close** | Existing behavior retained. |
| **Drag** | Existing pointer-capture drag retained, with the existing clamping. |

Window geometry (position, size, minimized, maximized) moves into a single `windows` state object in `App.jsx`, replacing the current three parallel `useState`s (`openWindows`, `focusedWindow`, `dragPositions`) which cannot express the new states.

### Boot sequence

An aperture opening. Pure black → a point of light dilating into the full field, with mono log lines resolving over it:

```
aglow.os
mounting /works ......... ok
mounting /connect ....... ok
field ................... live
```

- ~2.5s total.
- Runs once per session, gated on `sessionStorage`.
- Skippable on any key, click, or touch.
- Skipped entirely under `prefers-reduced-motion` — the site renders straight to the resolved desktop.

### Deep links

Native `hashchange`, no router dependency.

| Hash | Opens |
|---|---|
| `#/about` | About window |
| `#/works` | Works window |
| `#/works/<slug>` | Works window, that release's detail view |
| `#/game` | Game window |
| `#/connect` | Connect window |

Slugs derive from titles (`Drift 6` → `drift-6`). Opening a window pushes its hash; the browser back button closes it. Unknown hashes fall through to the bare desktop rather than erroring.

### Player

Bandcamp's embed iframe cannot be styled and would fight this world if placed inline. It is therefore wrapped: a dedicated **Player** window — chrome we control around an embed we do not — that persists while other windows open and close, because it lives outside the window map in the component tree.

- Offered only for releases carrying a `bandcampId`. Five of ten currently qualify.
- Releases without an ID show `Listen on Bandcamp →` and no player affordance. No broken player, no fake one.
- The title bar shows a small mono "now playing" readout when the player is open.

### Games

The game is **not** a tab inside Works. It gets its own window, for two reasons: a grid of one item is a bad grid, and the game carries a commercial job the Works window is not shaped for. The Works window therefore holds **Music** and **Software** tabs only.

If a second game ships, games move into Works as a tab and the Game window retires. That is a data-shape change, not a redesign — `windows/Game.jsx` and the Works tab list are the only files affected.

One title, in development, publicly teased, not yet named in site data. The Game window holds:

- Key art slot (full-width, bloom-treated edge)
- Title, year, status
- Logline
- Email capture — primary action now
- Store button — a slot that renders only when a store URL exists, sitting beside the email form so adding it later is a data change, not a redesign

Until real details arrive, the window renders a deliberate unreleased state: the field showing through where key art will sit, with honest status copy. No placeholder title, no fake screenshot, no invented date.

### Email capture

Static hosting, no server. A plain `POST` form to a hosted endpoint — no JS, no dependency, works without React hydration.

Endpoint lives as a single exported constant. Buttondown recommended. **Undecided — user must supply.** Until then the constant is empty and the form renders disabled with honest copy rather than silently failing.

### Mobile

Below 768px the desktop metaphor cannot survive literally — dragging is meaningless and windows overlap into unusability.

- Windows become full-bleed sheets rising from the dock, one at a time.
- Drag, resize, maximize, and minimize are suppressed; close remains.
- The dock becomes a fixed bottom bar.
- The light field stays at full fidelity — it is the one part of the direction that works better on a phone, not worse.

The metaphor survives as *one app at a time*, which is what a phone OS actually is.

---

## 4. Code structure

`src/App.jsx` is 584 lines holding nine components. It is split as part of this work — not as unrelated refactoring, but because every feature above touches it and the file is already past the size where edits stay reliable.

```
src/
  App.jsx              state + composition only
  components/
    LightField.jsx     replaces Particles.jsx — ogl light-field shader
    TitleBar.jsx       clock, brand, now-playing readout
    Dock.jsx
    Window.jsx         chrome, drag, resize, min/max
    Hero.jsx
    Boot.jsx
    Player.jsx         persistent Bandcamp wrapper
    ErrorBoundary.jsx  unchanged
    SocialIcon.jsx     unchanged
  windows/
    About.jsx
    Works.jsx          + ProjectGrid, ArtworkPlaceholder
    Game.jsx           new
    Connect.jsx
  hooks/
    useSanityData.js   unchanged interface
    useHashRoute.js    new
  lib/
    sanityClient.js, queries.js
  data/
    fallback.js        extended: game object, slugs
  styles/
    globals.css        rewritten for the new world
```

Sanity is retained. `queries.js` and `fallback.js` gain a `game` document shape (`title`, `year`, `status`, `logline`, `keyArt`, `storeUrl`) and `slug` on releases. The `useSanityData` interface does not change, so the fallback path keeps working offline.

---

## 5. Accessibility

Non-negotiable, and load-bearing given a moving background:

- All text clears WCAG AA against the field at its brightest phase — verified against the bloom peak, not the dark trough.
- `prefers-reduced-motion` freezes the light field to a static frame and skips the boot sequence entirely.
- Every window is keyboard-operable: opening one moves focus into it, `Escape` closes it, and dock items are real buttons in tab order. **No focus trap** — these windows are non-modal, and trapping focus inside one would strand keyboard users where a real desktop lets them tab away.
- Focus indicators are visible against the field — signal cyan, not a default outline lost in the bloom.
- The field is `aria-hidden`; it carries no information.
- Reduced transparency is respected where the platform reports it.

---

## 6. Blocked on user

These do not block starting. They block finishing, and none of them may be invented:

1. **Game:** title, key art, logline, year, status. Store URL when it exists.
2. **Bandcamp IDs** for the five releases lacking one — Drift 3, Exalt, Drift 2, Drift, Rebuild.
3. **Email endpoint** — provider account and form URL.

Each renders as an honest empty or reduced state until supplied. No placeholders that could be mistaken for real content.

---

## 7. Verification

- One batched inspection round at desktop and mobile together, fixes applied in one batch, one confirming round. Two rounds is the ceiling.
- Contract comment recorded in the emitted markup and verified present in the built output.
- `npm run lint` and `npm run build` clean.
- Reduced-motion path exercised.
- Deep links exercised: direct load, back button, unknown hash.

---

## 8. Explicitly out of scope

- Any redesign of the Sanity Studio itself.
- Analytics, cookie consent, or tracking.
- A software catalog beyond the honest empty state.
- Server-side rendering or a framework change.

---
name: Hearts Aglow
description: A Turrell Ganzfeld light field with a quiet desktop OS floating in it.
colors:
  void: "#08070b"
  bloom-warm: "#c48aff"
  signal: "#dff4ff"
  text: "rgba(255, 255, 255, 0.95)"
  text-dim: "rgba(255, 255, 255, 0.80)"
  text-faint: "rgba(255, 255, 255, 0.66)"
  hairline: "rgba(255, 255, 255, 0.11)"
  hairline-focus: "rgba(223, 244, 255, 0.34)"
  pane: "rgba(255, 255, 255, 0.045)"
  # Shadow steps. Deliberately untinted — a shadow is the absence of the
  # field's light, and a violet one would make windows read as lit from below.
  shadow-30: "rgba(0, 0, 0, 0.3)"
  shadow-40: "rgba(0, 0, 0, 0.4)"
  shadow-50: "rgba(0, 0, 0, 0.5)"
  shadow-55: "rgba(0, 0, 0, 0.55)"
  shadow-60: "rgba(0, 0, 0, 0.6)"
  # The boot sequence opens from true black by design (index.html contract).
  boot-ground: "#000000"
typography:
  display:
    fontFamily: "'Anybody', system-ui, sans-serif"
    fontSize: "0.58rem–22px depending on role"
    fontWeight: 300
    letterSpacing: "0.12em–0.24em"
    fontVariation: "font-stretch 118%–125%"
  body:
    fontFamily: "'Archivo', system-ui, sans-serif"
    fontWeight: 300
    lineHeight: 1.6–1.7
  data:
    fontFamily: "'Martian Mono', ui-monospace, monospace"
    fontSize: "9px–11px"
    letterSpacing: "0.06em–0.2em"
rounded:
  chrome: "2px"
  window: "3px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
  s-7: "48px"
components:
  hero-cta-go:
    textColor: "{colors.signal}"
  game-submit:
    textColor: "{colors.signal}"
    padding: "12px 24px"
    rounded: "{rounded.chrome}"
  game-store:
    textColor: "{colors.signal}"
  window:
    backgroundColor: "{colors.pane}"
    rounded: "{rounded.window}"
  dock-item-active:
    textColor: "{colors.signal}"
    rounded: "{rounded.chrome}"
---

# Design System: Hearts Aglow

## Overview

**Creative North Star: "Signal in the Bloom"** (seed key `155321e4`, user-pinned — this direction was chosen deliberately and stays fixed, not a placeholder awaiting revision).

The site's own thesis, recorded as the first child of `<body>` in `index.html:39-60`, states it plainly:

> **THESIS:** A Turrell Ganzfeld with an operating system floating in it. Refuses the studio-portfolio default of a dark page with a neon accent over a grid of album cards; the ground itself is the primary visual event.

> **OWN-WORLD:** Void #08070b under three gaussian light blooms cycling rose #ff4d6d to peach #ffa878 over a wine #7a2f43 floor across ~12 minutes, dithered so no edge ever forms — ember rather than violet, so the ground burns the same colours the brand marks (logo.png, favicon.svg) already use. The ground is also the visualiser: when a record is loaded the field pulses at its tempo, leans toward its own hue between rose and coral, and raises an ember layer as the visitor opens windows. Not audio-reactive and never pretending to be — the Bandcamp iframe makes real analysis impossible, so the field responds to a record being LOADED and to windows being OPENED, which are things the page can actually observe. Signal cyan #dff4ff on focus, active state, live data, and primary interactive affordance (.hero__cta-go, .game__submit, .game__store) — nowhere else. Text: --text rgba(255,255,255,0.95), --text-dim rgba(255,255,255,0.80), --text-faint rgba(255,255,255,0.66), raised during the build against the light field's brightest phase. Re-measured for the ember palette by evaluating the shader numerically, including its reactive layer at full energy: peak rgb(128,80,69), where --text clears WCAG AA 4.5:1 at 6.21:1, --text-dim now clears it too at 4.95:1, and --text-faint (3.94:1) clears AA for large text. Highlight compression is what bought that headroom — the field rolls off toward white instead of clamping, which lowered the peak even as the ember layer added light. See Open Questions 4 for how this relates to the previously recorded peak of rgb(90,64,103). Anybody (display), Archivo (body), Martian Mono (data). Hairline glass panes, 3px radii, film grain over everything.

The ground is not decoration behind the UI; it is the UI's primary event, rendered as a live WebGL fragment shader (`src/components/LightField.jsx`) that fills the entire viewport behind a transparent, hairline-bordered desktop metaphor (windows, a dock, a title bar). Nothing in the interface is opaque enough to fully hide the field — panes are `rgba(255,255,255,0.045)` glass (`globals.css:33`), not solid cards.

**Key Characteristics:**
- The light field is the primary visual event; the OS chrome is glass floating over it, not a page sitting on a background.
- A hard, named rule (Signal Discipline) restricts the one saturated color in the system to four functional roles — never decorative.
- Type is role-strict: display is always shouted (uppercase, wide tracking, light weight), data is always whispered in mono, and prose is never dressed as either.
- Motion is transform/opacity only, system-wide, so the light field never has to compete with layout thrash.
- There is exactly one responsive breakpoint (767px); the desktop metaphor collapses to one-app-at-a-time sheets below it rather than gaining a second, intermediate layout.

## Colors

The palette is almost monochrome by design — a near-black void, a narrow warm bloom, and one reserved signal color — so that the field's slow color cycling reads as the site's only real chromatic event.

### Primary
- **Void** (`#08070b`, `--void`, `globals.css:7`): the ground of the entire surface — `body` background and the shader's base black. Everything else sits on top of it as light, not as painted color.
- **Bloom Warm** (`#c48aff`, `--bloom-warm`, `globals.css:10`): the violet member of the field's own light. Used sparingly as a CSS token in exactly two places — the `.about__lead::before` rule (`globals.css:398`) and works/contact hover accents (see Open Questions: most "warm" accents elsewhere use an untokenized rgba, not this variable).
- **Signal** (`#dff4ff`, `--signal`, `globals.css:13`): the one saturated, cool accent in the system. See **The Signal Discipline Rule** below — this is the whole reason the color exists as a named token instead of an ordinary accent.

### Neutral
- **Text** (`rgba(255,255,255,0.95)`, `--text`, `globals.css:26`): primary reading color — headings, focused window titles, primary body text.
- **Text Dim** (`rgba(255,255,255,0.80)`, `--text-dim`, `globals.css:27`): secondary text — unfocused window titles, tab labels at rest, meta lines, body copy in About/Works/Contact.
- **Text Faint** (`rgba(255,255,255,0.66)`, `--text-faint`, `globals.css:28`): tertiary — title-bar clock, empty-state icons, disabled-adjacent notes, dock minimize state.
- **Hairline** (`rgba(255,255,255,0.11)`, `--hairline`, `globals.css:31`): the default border color for every glass edge — windows, dock items, the CTA button, input fields.
- **Hairline Focus** (`rgba(223,244,255,0.34)`, `--hairline-focus`, `globals.css:32`): the focused/hovered border state, derived from signal's hue at higher alpha rather than from `--signal` directly.
- **Pane** (`rgba(255,255,255,0.045)`, `--pane`, `globals.css:33`): the glass fill for windows, dock items, and the player — always this faint, never opaque.

### Shadow & scrim (declared, deliberately untinted)

These are part of the palette. They are listed here so they read as system rather than drift, and they are deliberately NOT tinted toward the field's violet — a shadow is the absence of the field's light, and a violet shadow would make windows read as lit from underneath.

- **Structural shadow**, five declared steps, used for elevation only and always with an offset plus a soft blur — never a zero-offset halo:
  `rgba(0, 0, 0, 0.3)` (`globals.css:1090`), `rgba(0, 0, 0, 0.4)` (`globals.css:669`), `rgba(0, 0, 0, 0.5)` (`globals.css:337`), `rgba(0, 0, 0, 0.55)` (`globals.css:1204`), `rgba(0, 0, 0, 0.6)` (`globals.css:356`, `globals.css:1406`).
- **Boot ground** (`#000`, `globals.css:1337`): the boot sequence opens from true black by design, named in the `index.html` direction contract. `--void` would be wrong — the aperture's effect depends on starting from nothing.
- **Void scrim** (`--void-rgb`, `globals.css:11`): the channel form of `--void`, for translucent surfaces that DO belong to the world — the "Latest" badge, the grid play affordance, the game takeover's scrim. Use this, not a bare black, whenever the thing is a surface rather than a shadow.

### Settled decisions (do not re-litigate)

- **Design specificity.** A critique on 2026-08-07 judged the visual language category-interchangeable and recommended leading with the bio-MIDI provenance in the hero. The owner considered it and declined: **the mood is the point.** The site is meant to feel like the music rather than explain it. This is a deliberate authorial choice, not an oversight; do not re-raise it.
- **The game is not a window.** It renders as a full-field takeover (`src/components/Takeover.jsx`) rather than a fourth floating pane, so the site's commercial priority never competes for z-order with three other windows. Opening any window dismisses it; the dock stays above it so a visitor is never trapped.

### Named Rules

**The Signal Discipline Rule.** `--signal` (`#dff4ff`) is a real, recorded decision, not an ordinary accent color, and it has exactly four sanctioned uses: **focus** (`:focus-visible` outline, `globals.css:89`), **active state** (`.dock__item--active`, `globals.css:278`; `.works__tab--active`, `globals.css:451`), **live data** (`.titlebar__dot--live` and `.titlebar__np`, `globals.css:191-195`; `.player__title`, the now-playing readout, `globals.css:1103`), and **primary interactive affordance**, named explicitly in the `index.html` thesis as `.hero__cta-go`, `.game__submit`, and `.game__store`. A future editor reaching for cyan to make something "pop" is breaking a stated invariant, not making a stylistic choice — see Open Questions for two selectors that already appear to drift outside this list.

## Typography

**Display Font:** Anybody (variable, wght 100–900), loaded via Google Fonts in `index.html:36`.
**Body Font:** Archivo (variable, wght 300–700).
**Data/Mono Font:** Martian Mono (variable, wght 300–600).

**Character:** Anybody carries every label, title, and tab in shouted uppercase with wide tracking and a stretched, light-weight face — closer to a wordmark than a heading font. Archivo is quiet, italic-leaning prose that never shouts. Martian Mono is reserved for numbers and system readouts, giving the boot log and track listings a console feel against the otherwise soft type.

### Hierarchy
- **Display** (weight ≤ 300, font-stretch 118%, letter-spacing ≥ 0.12em, uppercase): titles, section labels, tab labels, nav items, CTA labels. Never used for prose. Examples: `.window__title` (`globals.css:327-336`), `.works__tab` (`globals.css:430-444`), `.works__type-label` (`globals.css:474-489`), `.hero__cta-name` (`globals.css:240-244`), `.dock__item` (`globals.css:262-275`).
- **Body** (weight 300–400, line-height 1.6–1.7, max-width ~48–68ch): prose paragraphs. Examples: `.about__text` (48ch, `globals.css:402-407`), `.game__logline` (68ch, `globals.css:1031`), `.works__empty p` (68ch, `globals.css:804-810`).
- **Data** (mono, 9px–11px, letter-spacing 0.06em–0.2em, uppercase where it doubles as a label): years, durations, track numbers, status readouts, the boot log, and the title-bar clock. Examples: `.works__detail-tracks li::before` (track number, `globals.css:766-775`), `.works__empty-status` (`globals.css:812-823`), `.boot__log` (`globals.css:1220-1227`), `.game__meta` (`globals.css:1025-1030`).

### Named Rules

**The Data Voice Rule.** Martian Mono is reserved for genuinely numeric or system-status content — years, durations, track numbers, status readouts, the boot log — never for a release title. `globals.css` enforces this with inline comments at every boundary case: `.works__title` is explicitly marked "display voice, not data" (`globals.css:583`), as are `.works__detail-title` (`globals.css:662`), `.works__back` (`globals.css:608`), `.works__detail-link` (`globals.css:682`), `.works__link` (`globals.css:830`), and `.contact__label` (`globals.css:927`) — five separate call-sites where the author left a comment specifically to stop mono from creeping onto a title. A release title is not data and never gets mono.

**The Prose Exception Rule.** `.about__lead` (`globals.css:378`) and `.contact__primary-value` (`globals.css:889`) are marked in comments as deliberately taking the body voice even though they read as stylized display lead-ins, because they hold prose/a contact value, not a title, label, or tab.

## Layout

The shell is a fixed-viewport desktop metaphor: `html, body, #root` are locked to `height: 100%` with `overflow: hidden` (`globals.css:108-111`) — the page itself never scrolls; only `.window__body` scrolls (`overflow-y: auto`, `globals.css:356-362`). Windows are absolutely positioned (`position: absolute`, draggable/resizable via pointer events in `Window.jsx`) with a shared minimum size of 320×240 (`Window.jsx:4-5`) and z-index stacking driven by focus order. The title bar (`globals.css:167-183`) and dock (`globals.css:253-261`) are fixed chrome at top and bottom respectively; the dock is centered via `left: 50%; transform: translateX(-50%)`.

Spacing runs on a single 4px-rooted scale, `--s-1` through `--s-7` (4/8/12/16/24/32/48px, `globals.css:42-48`), used for every padding, gap, and margin in the system — there is no second spacing scale.

**The Single Breakpoint Rule.** There is exactly one responsive breakpoint, 767px, defined identically in two places that must stay in sync: the CSS media query `@media (max-width: 767px)` (`globals.css:1119`) and the JS media-query hook `export const COMPACT = '(max-width: 767px)'` (`src/hooks/useMediaQuery.js:33`). Below it, the desktop metaphor collapses to one-app-at-a-time: windows become fixed full-bleed sheets (`inset: 34px 0 62px 0 !important`, `globals.css:1124-1133`), the dock becomes a bottom tab bar, and window drag/resize handles are hidden (`Window.jsx:11, 88-91, 113-123` gates all of this on the same `COMPACT` query). Do not reintroduce a second breakpoint; the mobile layout is a single collapse, not a tiered responsive scale.

## Elevation & Depth

The system has no card-style drop shadows for ambient use — depth is conveyed almost entirely through backdrop blur (glass) and soft, colored bloom-glow rather than gray box-shadows keyed to a light source. Two vocabularies coexist:

1. **Structural elevation** for floating chrome: windows cast a real directional shadow to read as physically above the field — `0 30px 70px rgba(0,0,0,0.5)` at rest, deepening on focus (`.window--focused`, `globals.css:302-306`).
2. **Glow-as-state**, not glow-as-elevation: focus/hover/active states add a soft colored glow using the `--glow-warm`, `--glow-warm-soft`, and `--glow-signal` tokens (`globals.css:18-20`) — e.g. `.hero__cta:hover` (`globals.css:236-239`), `.dock__item--active` (`globals.css:280`), `.game__submit:hover` (`globals.css:1064`). This glow is explicitly the world's own vocabulary, not a highlight ring: the `.window--focused` comment states focus "reads as more light — the world's own vocabulary, not a highlight ring" (`globals.css:301`).

### Shadow Vocabulary
- **Window rest** (`box-shadow: 0 30px 70px rgba(0,0,0,0.5)`, `globals.css:294`): default elevation for every floating window and the player widget.
- **Window focused** (`box-shadow: 0 30px 70px rgba(0,0,0,0.55), 0 0 60px -12px var(--glow-warm-soft)`, `globals.css:304-305`): adds a warm bloom-glow on top of the structural shadow.
- **Signal glow** (`box-shadow: 0 0 24px -6px var(--glow-signal)` / `0 0 8px var(--glow-signal)`): the hover/active feedback for signal-colored affordances (dock active item, works tab underline, game submit hover).

### Shadow blacks are a convention, not palette drift

Structural shadows use plain `rgba(0, 0, 0, α)` at 0.3–0.6 rather than a tinted token, and this is deliberate. A shadow is the *absence* of the field's light, not a colour in the palette; tinting it violet would make windows read as glowing from underneath. Every occurrence of a bare black in this stylesheet is one of exactly two things:

- **A structural shadow** — `globals.css:337, 356, 669, 1090, 1204`. Always `rgba(0, 0, 0, α)` with an offset and a soft blur, never a zero-offset halo.
- **The boot overlay's ground** — `#000` at `globals.css:1337`. The boot sequence opens from true black by design; it is named in the direction contract in `index.html` ("Pure black → a point of light dilating"). `--void` (#08070b) would be wrong here, because the aperture's whole effect depends on starting from nothing.

A design-system detector will flag these as undocumented colours. They are documented here instead of tokenised, because tokenising them would invite someone to tint them. Translucent *surfaces* are a different case and do use a token: `--void-rgb` (`globals.css:11`) is the channel form of `--void`, used for scrims like the "Latest" badge and the grid play affordance.

### Named Rules

**The Light-Not-Highlight Rule.** Focus and hover states are expressed as glow (more light, matching the field's own vocabulary) rather than as a conventional highlight ring or fill change, except for the one explicit `:focus-visible` outline reserved for keyboard accessibility (`globals.css:88-91`).

## Shapes

Corner radii are small and uniform across the whole system: **2px** for nearly all interactive chrome (dock items, buttons, CTA, input fields, artwork, works items) and **3px** for the two "floating pane" surfaces — windows (`.window`, `globals.css:289`) and the player (`.player`, `globals.css:1087`). There is no larger radius anywhere; nothing in the system reads as "rounded" in a soft-UI sense. Borders are uniformly 1px hairlines (`--hairline` / `--hairline-focus`), never heavier, and panes are glass (`backdrop-filter: blur(...)`) rather than opaque fills. Mobile sheets deliberately drop the radius to 0 and lose their side borders (`globals.css:1129-1131`), reinforcing that the rounded-glass-pane language is a desktop-metaphor device, not a universal brand shape.

## Components

### Windows (signature component)
The floating window is the system's signature primitive (`src/components/Window.jsx`, styles at `globals.css:285-373`). Glass pane (`--pane` fill, `--pane-blur` = 20px backdrop blur), 3px radius, 1px hairline border, structural drop shadow deepening to a warm glow on focus. The title bar is a 34px drag handle (`cursor: grab`/`grabbing`) with an uppercase Anybody title, dimmed until focused. Minimize/maximize/close render as 22×22px icon buttons whose only feedback is a color shift to `--signal` on hover (`.window__btn:hover`, `globals.css:354`) — see Open Questions. Opening animates `opacity`/`transform` only (`@keyframes window-open`, `globals.css:308-311`); resize/drag are driven by direct style writes in `Window.jsx`, not CSS transitions, so they never fight the transform-only motion rule. On mobile (`≤767px`), windows lose their float entirely and become full-bleed fixed sheets with no drag bar and no resize grip (`Window.jsx:11,88-91,113-123`; `globals.css:1124-1141`).

### Dock
Fixed, centered pill row of four items (`Dock.jsx`; `globals.css:253-282`) labelled About / Works / Game / Say hi (`Dock.jsx:3`). Rest state is a hairline-bordered glass chip in `--text-dim`; active state turns the label `--signal` with a signal-glow border and shadow; a minimized window's dock item switches to a dashed border and `--text-faint`. On mobile the dock becomes a full-width bottom tab bar with 44px minimum touch targets and no active-state glow (`globals.css:1142-1165`).

### Hero
The single first-viewport surface (`Hero.jsx`; `globals.css:198-250`): centered wordmark, tagline, a 120px hairline-gradient rule, then one CTA button. The CTA is deliberately quiet — its own code comment calls it "the surface's single call to action... a shout would break the field" (`Hero.jsx:13-14`) — plain transparent chip at rest, gaining a hairline-focus border and warm glow on hover, with only its trailing arrow (`.hero__cta-go`) rendered in signal cyan per the Signal Discipline Rule.

### Boot sequence
A pre-app splash (`Boot.jsx`; `globals.css:1198-1234`) rendered over solid black, not the light field. A radial "aperture" bloom dilates from a pinpoint to 1.6× scale over 2600ms (`@keyframes aperture`, `globals.css:1214-1218`) — its own comment frames it as "Turrell's opening, not a spinner" (`globals.css:1206`). A mono boot log types out four lines in signal cyan; any keypress or pointerdown skips straight to completion. **`prefers-reduced-motion` and a same-session `sessionStorage` flag both skip the boot sequence entirely** (`Boot.jsx:32-37`), not just shorten it.

### Player (now-playing widget)
A fixed 300px glass panel (`Player.jsx`; `globals.css:1079-1112`) that embeds a Bandcamp iframe. Shares the window's glass/blur/shadow language but is not draggable or resizable — a lighter-weight sibling of `.window`, not a variant of it. Its title renders in `--signal` as the system's live "now playing" readout, consistent with the Signal Discipline live-data bucket.

### Forms (Game window)
`.game__input` (`globals.css:1041-1051`) is a plain hairline-bordered glass field with no distinct focus treatment beyond the global `:focus-visible` outline — there is no bespoke input-focus glow. `.game__submit` (`globals.css:1053-1064`) is transparent with a `--hairline-focus` border and `--signal` text at rest (one of the three named primary affordances), gaining a signal glow on hover. Disabled state is a flat `opacity: 0.45` with `cursor: not-allowed` (`globals.css:1052`) on both input and submit.

### Works grid & tabs
Two-tab nav (`.works__tabs`/`.works__tab`, `globals.css:420-463`) using the same dim → text → signal ladder as the dock's active state, with an underline (not a background) marking the active tab. The release grid (`.works__grid`, `globals.css:500-509`) is `auto-fill, minmax(140px, 1fr)`; a "featured" variant spans a 2×2 cell for the newest Drift release when there are more than two Drift releases (`Works.jsx:189`). Releases without artwork render a deterministic, title-seeded two-tone gradient placeholder with the title's first letter as a glyph (`ArtworkPlaceholder`, `Works.jsx:10-22`) rather than a generic gray box — an explicit "honest, not a grey box" stance shared with the game art slot (`globals.css:1008`).

## Do's and Don'ts

### Do:
- **Do** treat `--signal` (#dff4ff) as reserved for exactly four roles — focus, active state, live data, primary interactive affordance — per the Signal Discipline Rule.
- **Do** restrict transitions/animations to `transform` and `opacity` only. No rule in `globals.css` animates `width`, `height`, `padding`, `margin`, `top`, `left`, `right`, `bottom`, or `gap` — confirmed by scanning every `transition:`/`animation:`/`@keyframes` block in the file (e.g. `.window` `globals.css:296-298`, `.hero__cta` `globals.css:234`, mobile `sheet-up` `globals.css:1134-1137`). Direct JS style writes during window drag/resize (`Window.jsx:57-63`) are the sanctioned way to move geometry instead.
- **Do** use Anybody only for titles, section labels, and tab labels — uppercase, letter-spacing ≥ 0.12em, weight ≤ 300, font-stretch 118%+.
- **Do** use Martian Mono only for years, durations, track numbers, status readouts, and the boot log.
- **Do** keep the three text-alpha steps (`--text` 0.95, `--text-dim` 0.80, `--text-faint` 0.66) exactly as specified — they were raised during the build specifically to clear WCAG AA 4.5:1 against the light field's brightest measured phase, `rgb(90,64,103)` (`globals.css:22-25`). Lowering any of them silently breaks accessibility against a moving background, not just against a static swatch.
- **Do** respect `prefers-reduced-motion`: it freezes the light field's shader motion (`uMotion` uniform → 0, `LightField.jsx:97,119`), skips the boot sequence outright (`Boot.jsx:33-34`), and zeroes all CSS animation/transition durations globally (`globals.css:93-99`).
- **Do** keep the single 767px breakpoint in sync between `globals.css:1119` and `useMediaQuery.js:33` if it ever changes; don't let the two drift or add a second breakpoint.

### Don't:
- **Don't** reintroduce a second responsive breakpoint. There is exactly one, at 767px.
- **Don't** give a release title (`.works__title`, `.works__detail-title`, etc.) the mono/data font — five separate inline comments in `globals.css` exist specifically to stop this drift.
- **Don't** use `--signal` decoratively to make an element "pop." It has four sanctioned uses and no others.
- **Don't** replace the glow-based focus/hover language with a conventional highlight fill or a heavier shadow — depth here reads as light, not as a gray drop shadow.

## Open Questions

These are genuine inconsistencies found in the code, not smoothed over:

1. **~~`--bloom-warm-2` and `--bloom-deep` are not real CSS tokens.~~ Resolved.** All three bloom colours are now real custom properties mirroring the shader constants one-for-one (`globals.css:12-14` ↔ `LightField.jsx:26-29`): `--bloom-warm: #ff4d6d` (ROSE), `--bloom-warm-2: #ffa878` (PEACH), `--bloom-deep: #7a2f43` (DEEP). The palette also moved from violet to ember in the same pass, so the hexes this question originally named are gone.
2. **A fourth, untokenized warm accent color is used throughout Works and Contact.** `rgba(232, 149, 120, …)` (`#e89578`) appears 15 times across `.about__text a`, `.works__item--featured::after`, `.works__item:hover`, `.works__detail-link`, `.contact__primary`, and others — but this hex matches neither `--bloom-warm` (#c48aff, violet) nor the shader's `AMBER` (#ffa878) constant. It reads as a third, hand-picked warm color that doesn't correspond to anything the shader actually renders. Partly stale as written: the colour *is* tokenized now, as `--accent-warm-rgb: 232, 149, 120` (`globals.css:21`) — but it is still a fourth warm the shader never emits, and against the ember field it now sits very close to `--bloom-warm-2` (#ffa878), so the case for keeping it as a separate colour is weaker than it was against violet.
3. **Two hover states use `--signal` outside the four sanctioned Signal Discipline buckets.** `.window__btn:hover` (`globals.css:354`) and `.player__close:hover` (`globals.css:1111`) turn plain chrome icon buttons (minimize/maximize/close, player-close) signal-cyan on hover. These are not focus, not a persisted active state, not live data, and not one of the three named primary affordances (`.hero__cta-go`, `.game__submit`, `.game__store`). Similarly, `.works__play` (`globals.css:1053,1064`) shares its entire rule with `.game__submit` — including resting `--signal` text — but is not named in the `index.html` thesis's list of three. Whether these are meant to fall under "primary interactive affordance" by extension, or are drift from the stated rule, is unresolved in the code as written. **Partly settled since:** the visualiser was the largest offender — its colour ramp ran rose through *signal cyan* (`#dff4ff`) as the bright end of every mode, i.e. `--signal` as pure decoration across the whole panel. That end is now a warm white (`BONE #ffe9de`), so the remaining question is only about the three hover states.
4. **The recorded light-field peak and the shader's actual peak disagree.** `globals.css:33` and the `index.html` thesis both record the field's brightest phase as `rgb(90,64,103)`, citing `task-8-report.md` for the arithmetic. Evaluating the fragment shader numerically over two full cycles of its longest period (787s), sampling the whole viewport, puts the old violet peak at `rgb(130,90,117)` and the new ember peak at `rgb(152,79,79)` — both materially brighter than the recorded figure. At the recorded value all three text steps clear AA 4.5:1; at the computed peak only `--text` does, with `--text-dim` at 4.42:1 and `--text-faint` at 3.55:1 clearing the 3:1 large-text threshold instead. The ember palette is not the cause — it is marginally *better* than violet at every step, because a red-dominant peak carries less luminance than a violet one of the same apparent brightness. Unresolved: whether the original measurement sampled a smaller region, a shorter time window, or the composited page rather than the raw field. Until that is settled, do not lower any text alpha. The check that produced these numbers is `test/fieldContrast.test.js`.

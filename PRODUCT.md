# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three audiences, in priority order:

1. **Prospective game players** — people who have seen the game teased and want to know what it is, when it ships, and how to get it. They arrive curious and leave either wishlisted/subscribed or gone.
2. **Listeners** — people discovering the ambient music, often looking for something to work, sleep, or drift to. Success is a click through to Bandcamp and a listen.
3. **Collaborators and studio clients** — game developers, filmmakers, and labels evaluating whether Hailen Jackson can score or build something for them. Success is an email.

The site is one surface serving all three. Games convert, music hooks, collaboration is the tail.

## Product Purpose

heartsaglow.io is the public face of Hearts Aglow, a small studio making games, software, and music. It exists to sell the games, drive listens to the music catalog, and field collaboration inquiries — in that order of commercial priority, though music is currently the only catalog with public work in it.

## Positioning

Hearts Aglow is a one-person studio whose music is made from unusual physical sources — bio-MIDI sonification of friends, family, and plants — and whose digital work is built on the belief that digital spaces can feel alive. The music is not "ambient in the style of"; several records are literally the sonified biological signals of specific named people and a dying willow tree. That provenance is the position no neighboring studio can truthfully copy.

## Operating Context

- Visitors arrive from social posts (Bluesky, Twitter, TikTok), Bandcamp, and game-teaser channels.
- Music listening happens off-site on Bandcamp; the site's job is to make the click worth making, not to be a player of record.
- The game has been publicly teased but has no live Steam page yet. An itch.io page may be stood up sooner.
- Static hosting on GitHub Pages with the custom domain `heartsaglow.io`. No server, no backend.

## Capabilities and Constraints

- **Stack (incumbent):** React 19 + Vite SPA. Content from Sanity (`projectId: lmi10j91`, dataset `production`) via `useSanityData`, with `src/data/fallback.js` as the offline default. Sanity stays — it is the editing surface.
- **Static-only:** no server-side code. Anything requiring a backend (email capture) must use a hosted third-party endpoint.
- **Music catalog:** 10 releases across three types — Drift series (ambient/sleep), albums, soundtracks. Bandcamp is the destination for all of them. Only 3 releases carry a `bandcampId`; the other 7 would need IDs before any embedded playback covers the catalog.
- **Games catalog:** one title in development, teased publicly, not yet named in site data. No store URL yet; Steam is planned, itch.io possible sooner. Title, key art, and logline are **undecided/not yet supplied**.
- **Software catalog:** empty. Status undecided.
- **Conversion:** email capture for launch news is wanted now, with a store link slotting in beside it later without a redesign. No email provider chosen yet — **undecided**; requires a hosted form endpoint.

## Brand Commitments

- Name: **Hearts Aglow**. Founder credited as **Hailen Jackson**.
- Existing logo at `public/logo.png`; custom domain `heartsaglow.io`.
- Voice is quiet, first-person-plural, unhurried, slightly mystical without being precious — "Some things glow from within." / "We make things that breathe. Come drift with us."
- Binding visual references supplied by the user: James Turrell, Jordan Belson, Ghost in the Shell, .hack//Altimit OS, Evangelion, Cyberpunk Edgerunners, and dreamy shoegaze. The desktop-OS interface metaphor is deliberate and is being pushed further, not removed.

## Evidence on Hand

- 10 real music releases with real cover art, track listings, descriptions, and Bandcamp URLs (`src/data/fallback.js`).
- Real social presence: Bandcamp, Bluesky, Twitter, TikTok, and a real contact address.
- **Absent — must not be fabricated:** game title, key art, screenshots, trailer, release date, store URLs, press quotes, review scores, player counts, sales figures, client list, or any named past scoring credit. The current about copy claims the music "has soundtracked games, films, and late-night radio across the world" — this is existing copy, not verified evidence, and should not be expanded into specific named claims.

## Product Principles

1. **Games convert, music hooks.** The music catalog is the deepest real content on the site and earns attention; the game is what the site is trying to sell. Neither may bury the other.
2. **Never fabricate a catalog.** Empty sections stay honestly empty and look deliberate. No placeholder game titles, fake screenshots, or invented ship dates.
3. **The provenance is the pitch.** Bio-MIDI from named people and plants is the most interesting true fact here. Surface it rather than describing the music generically.
4. **Static-first.** No feature that requires a server. Third-party endpoints only where a job genuinely cannot be done client-side.
5. **The interface is part of the work.** This is a studio that claims digital spaces can feel alive; the site must be evidence of that claim, not merely assert it.

## Accessibility & Inclusion

No user-specific requirement was established. Standard obligations apply and are non-negotiable given the design direction: the light-field background and any boot sequence must respect `prefers-reduced-motion`, all text must clear WCAG AA against the moving background, and the desktop metaphor must remain fully keyboard-operable and usable on touch where dragging is not available.

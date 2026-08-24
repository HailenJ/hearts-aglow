# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # Production build to /dist
npm run preview    # Preview production build locally
npm run lint       # ESLint (v9 flat config)
npm test           # node:test, no framework
```

There is no `npm run deploy`. Deploying is `git push origin main` — GitHub
Actions builds once and publishes to both Pages and the Namecheap host.

## Architecture

This is a personal portfolio site (heartsaglow.io) built as a **single-page React 19 app** with Vite. It simulates a desktop OS interface with floating windows, inspired by .hack//THE WORLD's Altimit OS, James Turrell light installations, and Jordan Belson cosmic visuals.

**Layout is split by role.** `src/App.jsx` holds window state, routing and the takeover; `src/components/` holds the shell (LightField, TitleBar, Window, Dock, Hero, Boot, Player, Visualizer, Takeover, ErrorBoundary, SocialIcon); `src/windows/` holds the four window bodies (About, Works, Game, Connect — Works is the shared catalogue pane the dock's MUSIC/GAMES/SOFTWARE items switch between); `src/lib/` holds the window reducer, route resolution and site constants. There is no external state management: window state is a `useReducer` over `windowsReducer` (`src/lib/windows.js`), and routing is the URL hash — `useHashRoute` plus `resolveRoute` (`src/lib/route.js`), with window state as the source of truth and the hash as a projection of it. Content is fetched from Sanity via `useSanityData`, with `src/data/fallback.js` as the offline default; conversion paths (contact, Bandcamp, newsletter) live in `src/lib/config.js` so a CMS edit cannot delete them.

**All styling is in a single file** — `src/styles/globals.css` uses CSS custom properties for the design system (color palette, typography with Anybody/Archivo/Martian Mono, spacing tokens). The visual style uses subtle backdrop-filter, CSS animations (aperture breathing, window opening), film grain overlay, and a dark Turrell-inspired theme. The ground is one WebGL fragment shader in `src/components/LightField.jsx`; its four GLSL palette constants are mirrored into the `--bloom-*` tokens, and `test/fieldContrast.test.js` fails if the two drift apart.

## Deployment

`git push origin main` is the whole deploy. `.github/workflows/deploy.yml` builds once and publishes to both GitHub Pages and the Namecheap host — a cutover still in progress, so the live site never depends on the new path. Custom domain `heartsaglow.io` (see CNAME); the Vite base path is `/` because the domain serves from root. Never commit `dist/`.

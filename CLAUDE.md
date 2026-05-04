# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # Production build to /dist
npm run preview    # Preview production build locally
npm run lint       # ESLint (v9 flat config)
npm run deploy     # Build + deploy to GitHub Pages (gh-pages)
```

## Architecture

This is a personal portfolio site (heartsaglow.io) built as a **single-page React 19 app** with Vite. It simulates a desktop OS interface with floating windows, inspired by .hack//THE WORLD's Altimit OS, James Turrell light installations, and Jordan Belson cosmic visuals.

**Most layout lives in one file** — `src/App.jsx` contains the App component and most sub-components (DesktopBackground, TitleBar, Hero, Window, Dock, AboutContent, WorksContent, ContactContent, etc.). Reusable visual primitives are split out into `src/components/` (Particles, ErrorBoundary, SocialIcon). There is no routing or external state management; window state is managed via `useState` hooks in the top-level App component (`openWindows` array and `focusedWindow` ID). Content is fetched from Sanity via `useSanityData`, with `src/data/fallback.js` as the offline default.

**All styling is in a single file** — `src/styles/globals.css` uses CSS custom properties for the design system (color palette, typography with Cormorant Garamond/Outfit/Space Mono, spacing tokens). The visual style uses subtle backdrop-filter, CSS animations (aperture breathing, window opening), film grain overlay, and a dark Turrell-inspired theme.

## Deployment

Hosted on GitHub Pages with custom domain `heartsaglow.io` (see CNAME). The Vite base path is `/` in `vite.config.js` because the custom domain serves from root.

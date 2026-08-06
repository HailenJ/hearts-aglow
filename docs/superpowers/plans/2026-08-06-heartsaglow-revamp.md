# heartsaglow.io "Signal in the Bloom" Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace heartsaglow.io's visual world with a Turrell-Ganzfeld light field carrying a desktop-OS interface, add real window chrome, a boot sequence, hash deep-links, and a persistent Bandcamp player, and reorder the site so the in-development game is the primary call to action.

**Architecture:** The full-viewport background becomes a WebGL fragment shader (via the already-installed `ogl`) rendering three gaussian light blooms on independently-phased slow cycles — gaussian falloff means the field has no boundary anywhere, which is the Ganzfeld requirement expressed in math. Window state consolidates from three parallel `useState`s into one pure reducer that can express minimize/maximize/z-order. A `useHashRoute` hook maps `#/works/drift-6` to window state using native `hashchange`. `App.jsx` splits from 584 lines into focused files under `components/` and `windows/`.

**Tech Stack:** React 19, Vite 7, `ogl` 1.0 (already installed), `@sanity/client` 7 (retained), CSS custom properties in a single `globals.css`, Google Fonts (Anybody, Archivo, Martian Mono). Tests run on Node's built-in `node --test` — no test framework dependency.

**Spec:** `docs/superpowers/specs/2026-08-06-heartsaglow-revamp-design.md`
**Product truth:** `PRODUCT.md`

## Global Constraints

- **No new runtime dependencies.** `ogl` and `@sanity/client` are already installed and both are retained. Anything else must be built from stdlib, native platform features, or existing deps.
- **Static hosting only.** GitHub Pages, no server. Nothing may require server-side code.
- **Never fabricate catalog content.** No placeholder game title, fake key art, invented release date, store URL, press quote, or review score. Absent data renders as an honest reduced state.
- **Palette is fixed.** Void `#08070b`; bloom warm `#c48aff` → `#ffa878`; bloom deep `#483478`; signal `#dff4ff`. Signal cyan appears **only** on focus, active state, and live data readouts — nowhere else.
- **Type has three jobs.** `Anybody` = display; `Archivo` = body; `Martian Mono` = data only (clocks, durations, paths, boot log). A string that is not a number, path, or machine utterance does not get mono.
- **`prefers-reduced-motion` is honoured everywhere.** Light field freezes to a static frame; boot sequence is skipped entirely.
- **Text clears WCAG AA against the field at its brightest phase**, not its dark trough.
- **Sanity's `useSanityData` public interface does not change.** The offline fallback path must keep working.
- **Commit after every task.** Never commit `dist/`.

---

### Task 1: Light field shader

Replaces the dust-particle background with the Ganzfeld light field. This is the foundation of the whole visual world — everything else sits on it.

**Files:**
- Create: `src/components/LightField.jsx`
- Delete: `src/components/Particles.jsx`
- Modify: `src/App.jsx` (swap the `Particles` import and usage inside `DesktopBackground`)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export default function LightField()` — takes no props, renders a single `<div className="lightfield" aria-hidden="true">` containing a WebGL canvas that fills its parent. Reads `prefers-reduced-motion` itself.

- [ ] **Step 1: Write the shader component**

Create `src/components/LightField.jsx`:

```jsx
import { useEffect, useRef } from 'react'
import { Renderer, Program, Mesh, Triangle } from 'ogl'

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform float uMotion;

  varying vec2 vUv;

  const vec3 VOID   = vec3(0.031, 0.027, 0.043);
  const vec3 VIOLET = vec3(0.769, 0.541, 1.000);
  const vec3 AMBER  = vec3(1.000, 0.659, 0.471);
  const vec3 DEEP   = vec3(0.282, 0.204, 0.471);

  const float TAU = 6.28318530718;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // Gaussian falloff never reaches zero, so the field has no boundary
  // anywhere. That absence of edge is the whole Ganzfeld requirement.
  float bloom(vec2 uv, vec2 c, float r) {
    vec2 d = (uv - c) * vec2(uResolution.x / uResolution.y, 1.0);
    return exp(-dot(d, d) / (r * r));
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * uMotion;

    // Periods 431 / 619 / 787 seconds share no common multiple inside any
    // plausible visit, so the field never visibly repeats.
    float a = t / 431.0 * TAU;
    float b = t / 619.0 * TAU;
    float c = t / 787.0 * TAU;

    vec2 p1 = vec2(0.32 + 0.10 * sin(a),       0.28 + 0.08 * cos(a * 1.3));
    vec2 p2 = vec2(0.74 + 0.09 * cos(b),       0.68 + 0.07 * sin(b * 0.9));
    vec2 p3 = vec2(0.50 + 0.14 * sin(c * 0.7), 1.02 + 0.06 * cos(c));

    float f1 = bloom(uv, p1, 0.46);
    float f2 = bloom(uv, p2, 0.52);
    float f3 = bloom(uv, p3, 0.70);

    vec3 warm = mix(VIOLET, AMBER,  0.5 + 0.5 * sin(a * 0.5));
    vec3 cool = mix(DEEP,   VIOLET, 0.5 + 0.5 * cos(b * 0.5));

    vec3 col = VOID;
    col += warm * f1 * 0.34;
    col += cool * f2 * 0.26;
    col += DEEP * f3 * 0.40;

    // Belson's centric aperture, breathing on a 23s cycle.
    float ap = bloom(uv, vec2(0.5), 0.30 + 0.02 * sin(t / 23.0 * TAU));
    col += VIOLET * ap * 0.05;

    // Per-pixel dither: the second half of the anti-banding strategy.
    col += (hash(gl_FragCoord.xy) - 0.5) / 255.0 * 1.6;

    gl_FragColor = vec4(col, 1.0);
  }
`

export default function LightField() {
  const hostRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    const renderer = new Renderer({ depth: false, alpha: false, dpr: Math.min(window.devicePixelRatio, 2) })
    const gl = renderer.gl
    host.appendChild(gl.canvas)

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uMotion: { value: reduced.matches ? 0 : 1 },
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight)
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height]
    }
    resize()
    window.addEventListener('resize', resize)

    const onMotionChange = () => {
      program.uniforms.uMotion.value = reduced.matches ? 0 : 1
      renderer.render({ scene: mesh })
    }
    reduced.addEventListener('change', onMotionChange)

    let raf = 0
    const start = performance.now()
    const loop = () => {
      raf = requestAnimationFrame(loop)
      program.uniforms.uTime.value = (performance.now() - start) / 1000
      renderer.render({ scene: mesh })
    }

    if (reduced.matches) {
      renderer.render({ scene: mesh })
    } else {
      loop()
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      reduced.removeEventListener('change', onMotionChange)
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return <div ref={hostRef} className="lightfield" aria-hidden="true" />
}
```

Note: the old `Particles.jsx` imports `Camera` and `Geometry`; this component needs neither.

- [ ] **Step 2: Swap it into the app**

In `src/App.jsx`, change the import on line 3 from `import Particles from './components/Particles'` to `import LightField from './components/LightField'`, and replace the whole `<Particles ... />` element inside `DesktopBackground` (lines 476–486) with `<LightField />`. Leave the `ErrorBoundary` wrapper and the `desktop__mesh` div in place for now — Task 2 rewrites that CSS.

- [ ] **Step 3: Delete the old component**

```bash
rm src/components/Particles.jsx
```

- [ ] **Step 4: Verify it renders**

Run: `npm run dev`, open the printed URL.
Expected: a slowly drifting violet-and-amber field filling the viewport with **no visible banding rings** and no hard-edged blobs. Confirm the old grey dust particles are gone.

Then run: `npm run lint`
Expected: no errors. (`Camera`/`Geometry` unused-import errors here mean Step 1 was copied incorrectly.)

- [ ] **Step 5: Verify reduced motion**

In Chrome DevTools: Rendering panel → "Emulate CSS media feature prefers-reduced-motion" → `reduce`, then reload.
Expected: the field renders once as a static frame and never animates. CPU usage drops to idle.

- [ ] **Step 6: Commit**

```bash
git add src/components/LightField.jsx src/App.jsx
git rm src/components/Particles.jsx
git commit -m "feat: replace particle background with Ganzfeld light field shader"
```

---

### Task 2: Design tokens and typography

Establishes the CSS custom properties and font stack every later task depends on. Nothing after this may hard-code a colour.

**Files:**
- Modify: `index.html` (Google Fonts link)
- Modify: `src/styles/globals.css` (token block at the top of the file)

**Interfaces:**
- Produces: CSS custom properties on `:root` — `--void`, `--bloom-warm`, `--bloom-warm-2`, `--bloom-deep`, `--signal`, `--text`, `--text-dim`, `--hairline`, `--hairline-focus`, `--font-display`, `--font-body`, `--font-data`, and the `--s-*` spacing scale. Every later task consumes these by name.

- [ ] **Step 1: Replace the font link**

In `index.html`, replace the existing Google Fonts `<link href="...Cormorant+Garamond...">` line with:

```html
    <link href="https://fonts.googleapis.com/css2?family=Anybody:wght@100..900&family=Archivo:wght@300..700&family=Martian+Mono:wght@300..600&display=swap" rel="stylesheet">
```

Keep the two `preconnect` lines above it unchanged.

- [ ] **Step 2: Write the token block**

Replace the existing `:root` block at the top of `src/styles/globals.css` with:

```css
:root {
  /* Ground */
  --void: #08070b;

  /* Bloom — the field's own colours, mirrored from the shader constants */
  --bloom-warm: #c48aff;
  --bloom-warm-2: #ffa878;
  --bloom-deep: #483478;

  /* Signal — focus, active state, live data. Nowhere else. */
  --signal: #dff4ff;

  /* Text */
  --text: rgba(255, 255, 255, 0.92);
  --text-dim: rgba(255, 255, 255, 0.62);
  --text-faint: rgba(255, 255, 255, 0.42);

  /* Chrome */
  --hairline: rgba(255, 255, 255, 0.11);
  --hairline-focus: rgba(223, 244, 255, 0.34);
  --pane: rgba(255, 255, 255, 0.045);
  --pane-blur: 20px;

  /* Type */
  --font-display: 'Anybody', system-ui, sans-serif;
  --font-body: 'Archivo', system-ui, sans-serif;
  --font-data: 'Martian Mono', ui-monospace, monospace;

  /* Spacing — one rhythm for the whole surface */
  --s-1: 4px;
  --s-2: 8px;
  --s-3: 12px;
  --s-4: 16px;
  --s-5: 24px;
  --s-6: 32px;
  --s-7: 48px;
  --s-8: 72px;

  /* Motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 180ms;
  --dur-mid: 240ms;
  --dur-slow: 380ms;
}

html, body, #root { height: 100%; }

body {
  margin: 0;
  background: var(--void);
  color: var(--text);
  font-family: var(--font-body);
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
}

.lightfield {
  position: fixed;
  inset: 0;
  z-index: 0;
}

.lightfield canvas { display: block; width: 100%; height: 100%; }

/* Film grain — anti-banding and the shoegaze texture, doing one job each. */
.grain {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.16;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence baseFrequency='.9' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)'/></svg>");
}

/* Focus is visible against the bloom, which a default outline is not. */
:focus-visible {
  outline: 1px solid var(--signal);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Leave the rest of `globals.css` in place for now — later tasks rewrite each section as they touch it. Delete the old `--` custom properties that the block above replaces, so there is exactly one definition of each token.

- [ ] **Step 3: Add the grain element**

In `src/App.jsx`, inside `DesktopBackground`, replace `<div className="desktop__mesh" aria-hidden="true" />` with `<div className="grain" aria-hidden="true" />`. Remove the now-dead `.desktop__mesh` rules from `globals.css`.

- [ ] **Step 4: Verify**

Run: `npm run dev`
Expected: the field renders with a fine grain over it. Text still reads (it will be unstyled-ish until later tasks — that is expected). Open DevTools → Network → filter "font" and confirm three font families load with status 200 and that no request for Cormorant, Outfit, or Space Mono remains.

- [ ] **Step 5: Commit**

```bash
git add index.html src/styles/globals.css src/App.jsx
git commit -m "feat: establish Signal in the Bloom tokens and type stack"
```

---

### Task 3: Window state reducer

Replaces three parallel `useState`s with one pure reducer that can express minimize, maximize, and z-order. This is pure logic and gets a real test.

**Files:**
- Create: `src/lib/windows.js`
- Create: `test/windows.test.js`
- Modify: `eslint.config.js` (allow Node globals in `test/`)

**Interfaces:**
- Produces:
  - `export const WINDOW_IDS = ['about', 'works', 'game', 'connect']`
  - `export const initialWindows` — object keyed by id, each `{ open, minimized, maximized, x, y, w, h, z }` where `x`/`y`/`w`/`h` are `null` until the window is first moved or resized (meaning "use the CSS default").
  - `export function windowsReducer(state, action)` — actions `{type:'OPEN'|'CLOSE'|'TOGGLE'|'FOCUS'|'MINIMIZE'|'MAXIMIZE', id}` and `{type:'MOVE', id, x, y}`, `{type:'RESIZE', id, w, h}`.
  - `export function focusedId(state)` — id of the open, non-minimized window with the highest `z`, or `null`.
  - `export function openIds(state)` — ids where `open` is true, in ascending `z` order.

- [ ] **Step 1: Write the failing test**

Create `test/windows.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { windowsReducer, initialWindows, focusedId, openIds } from '../src/lib/windows.js'

const run = (actions, start = initialWindows) => actions.reduce(windowsReducer, start)

test('starts with nothing open', () => {
  assert.equal(focusedId(initialWindows), null)
  assert.deepEqual(openIds(initialWindows), [])
})

test('OPEN opens and focuses', () => {
  const s = run([{ type: 'OPEN', id: 'works' }])
  assert.equal(s.works.open, true)
  assert.equal(focusedId(s), 'works')
})

test('opening a second window focuses it and raises it above the first', () => {
  const s = run([{ type: 'OPEN', id: 'about' }, { type: 'OPEN', id: 'works' }])
  assert.equal(focusedId(s), 'works')
  assert.ok(s.works.z > s.about.z)
  assert.deepEqual(openIds(s), ['about', 'works'])
})

test('FOCUS raises an already-open window above the others', () => {
  const s = run([
    { type: 'OPEN', id: 'about' },
    { type: 'OPEN', id: 'works' },
    { type: 'FOCUS', id: 'about' },
  ])
  assert.equal(focusedId(s), 'about')
  assert.ok(s.about.z > s.works.z)
})

test('TOGGLE opens a closed window and closes an open one', () => {
  const opened = run([{ type: 'TOGGLE', id: 'game' }])
  assert.equal(opened.game.open, true)
  const closed = windowsReducer(opened, { type: 'TOGGLE', id: 'game' })
  assert.equal(closed.game.open, false)
})

test('TOGGLE on a minimized window restores it rather than closing it', () => {
  const s = run([
    { type: 'OPEN', id: 'works' },
    { type: 'MINIMIZE', id: 'works' },
    { type: 'TOGGLE', id: 'works' },
  ])
  assert.equal(s.works.open, true)
  assert.equal(s.works.minimized, false)
  assert.equal(focusedId(s), 'works')
})

test('MINIMIZE keeps the window open but removes it from focus', () => {
  const s = run([{ type: 'OPEN', id: 'works' }, { type: 'MINIMIZE', id: 'works' }])
  assert.equal(s.works.open, true)
  assert.equal(s.works.minimized, true)
  assert.equal(focusedId(s), null)
})

test('closing the focused window falls back to the next-highest open window', () => {
  const s = run([
    { type: 'OPEN', id: 'about' },
    { type: 'OPEN', id: 'works' },
    { type: 'CLOSE', id: 'works' },
  ])
  assert.equal(focusedId(s), 'about')
})

test('CLOSE forgets maximize but keeps geometry for reopening', () => {
  const s = run([
    { type: 'OPEN', id: 'about' },
    { type: 'MOVE', id: 'about', x: 120, y: 90 },
    { type: 'MAXIMIZE', id: 'about' },
    { type: 'CLOSE', id: 'about' },
  ])
  assert.equal(s.about.maximized, false)
  assert.equal(s.about.x, 120)
  assert.equal(s.about.y, 90)
})

test('MAXIMIZE toggles', () => {
  const s = run([{ type: 'OPEN', id: 'works' }, { type: 'MAXIMIZE', id: 'works' }])
  assert.equal(s.works.maximized, true)
  assert.equal(windowsReducer(s, { type: 'MAXIMIZE', id: 'works' }).works.maximized, false)
})

test('MOVE and RESIZE record geometry', () => {
  const s = run([
    { type: 'OPEN', id: 'connect' },
    { type: 'MOVE', id: 'connect', x: 40, y: 60 },
    { type: 'RESIZE', id: 'connect', w: 500, h: 400 },
  ])
  assert.equal(s.connect.x, 40)
  assert.equal(s.connect.y, 60)
  assert.equal(s.connect.w, 500)
  assert.equal(s.connect.h, 400)
})

test('an unknown id is ignored rather than throwing', () => {
  const s = windowsReducer(initialWindows, { type: 'OPEN', id: 'nope' })
  assert.equal(s, initialWindows)
})

test('an unknown action type is ignored', () => {
  const s = windowsReducer(initialWindows, { type: 'WAT', id: 'about' })
  assert.equal(s, initialWindows)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/windows.test.js`
Expected: FAIL — `Cannot find module '.../src/lib/windows.js'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/windows.js`:

```js
export const WINDOW_IDS = ['about', 'works', 'game', 'connect']

const blank = { open: false, minimized: false, maximized: false, x: null, y: null, w: null, h: null, z: 0 }

export const initialWindows = Object.fromEntries(WINDOW_IDS.map(id => [id, { ...blank }]))

const topZ = state => Math.max(0, ...Object.values(state).map(w => w.z))

const patch = (state, id, next) => ({ ...state, [id]: { ...state[id], ...next } })

const raise = (state, id) => patch(state, id, { z: topZ(state) + 1 })

export function windowsReducer(state, action) {
  const { type, id } = action
  if (!Object.prototype.hasOwnProperty.call(state, id)) return state

  switch (type) {
    case 'OPEN':
      return raise(patch(state, id, { open: true, minimized: false }), id)

    case 'TOGGLE':
      // A minimized window restores rather than closing — the dock item is
      // the same control for both, and closing it would lose the user's place.
      if (state[id].open && state[id].minimized) {
        return raise(patch(state, id, { minimized: false }), id)
      }
      if (state[id].open) return patch(state, id, { open: false, maximized: false })
      return raise(patch(state, id, { open: true, minimized: false }), id)

    case 'CLOSE':
      return patch(state, id, { open: false, maximized: false })

    case 'FOCUS':
      if (!state[id].open || state[id].minimized) return state
      return raise(state, id)

    case 'MINIMIZE':
      return patch(state, id, { minimized: true })

    case 'MAXIMIZE':
      return patch(state, id, { maximized: !state[id].maximized })

    case 'MOVE':
      return patch(state, id, { x: action.x, y: action.y, maximized: false })

    case 'RESIZE':
      return patch(state, id, { w: action.w, h: action.h, maximized: false })

    default:
      return state
  }
}

export function focusedId(state) {
  const live = Object.entries(state).filter(([, w]) => w.open && !w.minimized)
  if (live.length === 0) return null
  return live.reduce((a, b) => (b[1].z > a[1].z ? b : a))[0]
}

export function openIds(state) {
  return Object.entries(state)
    .filter(([, w]) => w.open)
    .sort((a, b) => a[1].z - b[1].z)
    .map(([id]) => id)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/windows.test.js`
Expected: PASS — 13 tests.

- [ ] **Step 5: Teach eslint about the test directory**

In `eslint.config.js`, add this object to the array returned by `defineConfig`, after the existing `{ files: ['**/*.{js,jsx}'], ... }` block:

```js
  {
    files: ['test/**/*.js'],
    languageOptions: { globals: globals.node },
  },
```

- [ ] **Step 6: Add a test script**

In `package.json`, add to `"scripts"`:

```json
    "test": "node --test 'test/**/*.js'",
```

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/windows.js test/windows.test.js eslint.config.js package.json
git commit -m "feat: add window state reducer with minimize, maximize, and z-order"
```

---

### Task 4: Hash routing

Makes releases shareable and gives the browser back button meaning. Pure parsing logic, tested; the React binding is thin.

**Files:**
- Create: `src/lib/route.js`
- Create: `test/route.test.js`
- Create: `src/hooks/useHashRoute.js`

**Interfaces:**
- Consumes: `WINDOW_IDS` from `src/lib/windows.js` (Task 3).
- Produces:
  - `export function slugify(title)` → lowercase, non-alphanumerics collapsed to single hyphens, trimmed.
  - `export function parseHash(hash)` → `{ id, detail }` or `null`. `detail` is `null` when absent.
  - `export function buildHash(id, detail)` → `'#/works/drift-6'` style string.
  - `export function useHashRoute(onRoute)` from `src/hooks/useHashRoute.js` — calls `onRoute(route)` on mount and on every `hashchange`, where `route` is `parseHash`'s return.

- [ ] **Step 1: Write the failing test**

Create `test/route.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { slugify, parseHash, buildHash } from '../src/lib/route.js'

test('slugify lowercases and hyphenates', () => {
  assert.equal(slugify('Drift 6'), 'drift-6')
  assert.equal(slugify('The Secrets We Keep'), 'the-secrets-we-keep')
})

test('slugify collapses runs of punctuation into one hyphen', () => {
  assert.equal(slugify("We Don't Talk Anymore"), 'we-don-t-talk-anymore')
  assert.equal(slugify('Drift  —  4'), 'drift-4')
})

test('slugify trims leading and trailing hyphens', () => {
  assert.equal(slugify('  Coda  '), 'coda')
  assert.equal(slugify('!Exalt!'), 'exalt')
})

test('parseHash reads a bare window route', () => {
  assert.deepEqual(parseHash('#/about'), { id: 'about', detail: null })
})

test('parseHash reads a detail route', () => {
  assert.deepEqual(parseHash('#/works/drift-6'), { id: 'works', detail: 'drift-6' })
})

test('parseHash tolerates a trailing slash and a missing leading slash', () => {
  assert.deepEqual(parseHash('#/works/'), { id: 'works', detail: null })
  assert.deepEqual(parseHash('#works'), { id: 'works', detail: null })
})

test('parseHash returns null for empty, bare, and unknown hashes', () => {
  assert.equal(parseHash(''), null)
  assert.equal(parseHash('#'), null)
  assert.equal(parseHash('#/'), null)
  assert.equal(parseHash('#/bogus'), null)
  assert.equal(parseHash('#/bogus/thing'), null)
})

test('parseHash ignores extra path segments rather than failing', () => {
  assert.deepEqual(parseHash('#/works/drift-6/extra'), { id: 'works', detail: 'drift-6' })
})

test('buildHash round-trips through parseHash', () => {
  assert.equal(buildHash('works', 'drift-6'), '#/works/drift-6')
  assert.equal(buildHash('about', null), '#/about')
  assert.deepEqual(parseHash(buildHash('works', 'coda')), { id: 'works', detail: 'coda' })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/route.test.js`
Expected: FAIL — `Cannot find module '.../src/lib/route.js'`

- [ ] **Step 3: Write the implementation**

Create `src/lib/route.js`:

```js
import { WINDOW_IDS } from './windows.js'

export function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseHash(hash) {
  const path = String(hash).replace(/^#\/?/, '').replace(/\/+$/, '')
  if (!path) return null
  const [id, detail] = path.split('/')
  if (!WINDOW_IDS.includes(id)) return null
  return { id, detail: detail || null }
}

export function buildHash(id, detail) {
  return detail ? `#/${id}/${detail}` : `#/${id}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all tests across both files.

- [ ] **Step 5: Write the React binding**

Create `src/hooks/useHashRoute.js`:

```js
import { useEffect, useRef } from 'react'
import { parseHash } from '../lib/route'

// Fires onRoute on mount and on every hashchange. Deliberately no router
// dependency — the native event is the whole mechanism.
export function useHashRoute(onRoute) {
  const handler = useRef(onRoute)
  handler.current = onRoute

  useEffect(() => {
    const fire = () => handler.current(parseHash(window.location.hash))
    fire()
    window.addEventListener('hashchange', fire)
    return () => window.removeEventListener('hashchange', fire)
  }, [])
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/route.js test/route.test.js src/hooks/useHashRoute.js
git commit -m "feat: add hash routing for deep-linkable window state"
```

---

### Task 5: Window chrome

The `Window` component gains minimize, maximize, resize, and focus-as-light. This is the largest single visual deliverable.

**Files:**
- Create: `src/components/Window.jsx`
- Modify: `src/styles/globals.css` (window section)
- Modify: `src/App.jsx` (remove the inline `Window` function, import the new one)

**Interfaces:**
- Consumes: tokens from Task 2; reducer action shapes from Task 3.
- Produces: `export default function Window({ id, title, state, isFocused, defaultGeom, onFocus, onClose, onMinimize, onMaximize, onMove, onResize, children })` where `state` is one window's slice from `windowsReducer` and `defaultGeom` is `{ top, left, width, height }` CSS strings.

- [ ] **Step 1: Write the component**

Create `src/components/Window.jsx`:

```jsx
import { useRef } from 'react'

const MIN_W = 320
const MIN_H = 240

export default function Window({
  id, title, state, isFocused, defaultGeom,
  onFocus, onClose, onMinimize, onMaximize, onMove, onResize, children,
}) {
  const winRef = useRef(null)
  const drag = useRef(null)

  if (!state.open || state.minimized) return null

  const style = state.maximized
    ? { inset: '4%', width: 'auto', height: 'auto' }
    : {
        top: state.y != null ? `${state.y}px` : defaultGeom.top,
        left: state.x != null ? `${state.x}px` : defaultGeom.left,
        width: state.w != null ? `${state.w}px` : defaultGeom.width,
        height: state.h != null ? `${state.h}px` : defaultGeom.height,
      }

  const beginDrag = (mode) => (e) => {
    if (e.target.closest('.window__btn')) return
    const r = winRef.current.getBoundingClientRect()
    drag.current = { mode, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, x0: e.clientX, y0: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    onFocus()
  }

  const move = (e) => {
    const d = drag.current
    if (!d) return
    if (d.mode === 'move') {
      const x = Math.max(-(d.w - 120), Math.min(window.innerWidth - 120, e.clientX - d.dx))
      const y = Math.max(36, Math.min(window.innerHeight - 80, e.clientY - d.dy))
      winRef.current.style.left = `${x}px`
      winRef.current.style.top = `${y}px`
    } else {
      const w = Math.max(MIN_W, Math.min(window.innerWidth - 24, d.w + (e.clientX - d.x0)))
      const h = Math.max(MIN_H, Math.min(window.innerHeight - 80, d.h + (e.clientY - d.y0)))
      winRef.current.style.width = `${w}px`
      winRef.current.style.height = `${h}px`
    }
  }

  const end = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    const r = winRef.current.getBoundingClientRect()
    if (d.mode === 'move') onMove(Math.round(r.left), Math.round(r.top))
    else onResize(Math.round(r.width), Math.round(r.height))
  }

  return (
    <section
      ref={winRef}
      className={`window ${isFocused ? 'window--focused' : ''} ${state.maximized ? 'window--max' : ''}`}
      style={{ ...style, zIndex: 10 + state.z }}
      aria-label={title}
      onPointerDown={onFocus}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <header
        className="window__bar"
        onPointerDown={beginDrag('move')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <h2 className="window__title">{title}</h2>
        <div className="window__btns">
          <button className="window__btn" onClick={onMinimize} aria-label={`Minimize ${title}`} title="Minimize">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
          <button className="window__btn" onClick={onMaximize} aria-label={`${state.maximized ? 'Restore' : 'Maximize'} ${title}`} aria-pressed={state.maximized} title="Maximize">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><rect x="2" y="2" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
          <button className="window__btn" onClick={onClose} aria-label={`Close ${title}`} title="Close">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2 8 8M8 2 2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
        </div>
      </header>

      <div className="window__body" id={`window-${id}`}>{children}</div>

      {!state.maximized && (
        <div
          className="window__grip"
          role="separator"
          aria-label={`Resize ${title}`}
          onPointerDown={beginDrag('resize')}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      )}
    </section>
  )
}
```

- [ ] **Step 2: Write the window CSS**

Replace the existing `.window*` rules in `src/styles/globals.css` with:

```css
.window {
  position: absolute;
  display: flex;
  flex-direction: column;
  border-radius: 3px;
  background: var(--pane);
  backdrop-filter: blur(var(--pane-blur));
  -webkit-backdrop-filter: blur(var(--pane-blur));
  border: 1px solid var(--hairline);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  transition: border-color var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-mid) var(--ease-out),
              inset var(--dur-slow) var(--ease-out);
  animation: window-open var(--dur-mid) var(--ease-out);
}

/* Focus reads as more light — the world's own vocabulary, not a highlight ring. */
.window--focused {
  border-color: var(--hairline-focus);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.55),
              0 0 60px -12px rgba(196, 138, 255, 0.35);
}

@keyframes window-open {
  from { opacity: 0; transform: translateY(6px) scale(0.985); }
  to   { opacity: 1; transform: none; }
}

.window__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  height: 34px;
  padding: 0 var(--s-3) 0 var(--s-4);
  border-bottom: 1px solid var(--hairline);
  cursor: grab;
  touch-action: none;
  flex: none;
}
.window__bar:active { cursor: grabbing; }

.window__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 400;
  font-stretch: 125%;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--text-dim);
}
.window--focused .window__title { color: var(--text); }

.window__btns { display: flex; gap: var(--s-1); }

.window__btn {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  transition: color var(--dur-fast), background var(--dur-fast);
}
.window__btn:hover { color: var(--signal); background: rgba(255, 255, 255, 0.07); }

.window__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--s-5);
  overscroll-behavior: contain;
}

.window__grip {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  touch-action: none;
  background: linear-gradient(135deg, transparent 50%, var(--hairline) 50%, var(--hairline) 62%, transparent 62%);
}
```

- [ ] **Step 3: Wire it into App**

In `src/App.jsx`: delete the inline `function Window(...)` (lines 82–158), add `import Window from './components/Window'` at the top, and replace the three `useState`s (`openWindows`, `focusedWindow`, `dragPositions`) with:

```jsx
const [windows, dispatch] = useReducer(windowsReducer, initialWindows)
const focused = focusedId(windows)
```

importing `useReducer` from React and `windowsReducer, initialWindows, focusedId, WINDOW_IDS` from `./lib/windows`. Render each window from `WINDOW_IDS`, passing `state={windows[id]}`, `isFocused={focused === id}`, and dispatch-bound handlers. Update `Dock` and `Hero` to read `openIds(windows).length` instead of `openWindows.length`.

- [ ] **Step 3b: Keyboard entry into an opened window**

The spec called for a focus trap. **That is wrong here and is not implemented.** These windows are non-modal — a real OS lets you tab between windows, and trapping focus inside one would strand keyboard users. The correct behaviour is to move focus *into* a window when it opens, and let Tab leave it freely.

In `src/components/Window.jsx`, add:

```jsx
import { useEffect, useRef } from 'react'
```

and inside the component, after the refs:

```jsx
const opened = state.open && !state.minimized
useEffect(() => {
  // Move focus into a newly-opened window so keyboard users land inside it.
  // Deliberately no trap: Tab must be able to leave for the dock and the
  // other windows, exactly as a real desktop behaves.
  if (opened) winRef.current?.focus()
}, [opened])
```

and add `tabIndex={-1}` to the `<section>` so it can receive programmatic focus without entering the tab order itself.

- [ ] **Step 4: Verify every chrome behaviour by hand**

Run: `npm run dev`. Confirm each of:
- Clicking a background window raises it above the others.
- The focused window's border is cyan-tinted and it carries a soft violet halo; unfocused windows do not.
- Minimize hides the window; its dock item shows a distinct minimized state; clicking that dock item restores it focused.
- Maximize fills the field inset 4%; clicking again restores the previous size and position.
- Dragging the bottom-right grip resizes; the window will not go below 320×240.
- Dragging the title bar moves the window and it stays reachable at the viewport edges.
- `Escape` closes the focused window.
- Opening a window from the dock by keyboard lands focus inside it, and Tab can leave it again for the dock.

Then run: `npm run lint` — expected clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/Window.jsx src/App.jsx src/styles/globals.css
git commit -m "feat: add real window chrome — minimize, maximize, resize, z-order"
```

---

### Task 6: Split App.jsx into components and windows

`App.jsx` is 584 lines holding nine components. Every remaining task touches it. Split it now so later edits stay reliable.

**Files:**
- Create: `src/components/TitleBar.jsx`, `src/components/Dock.jsx`, `src/components/Hero.jsx`
- Create: `src/windows/About.jsx`, `src/windows/Works.jsx`, `src/windows/Connect.jsx`
- Modify: `src/App.jsx` (reduced to state and composition)

**Interfaces:**
- Produces:
  - `TitleBar({ nowPlaying })` — `nowPlaying` is a string or `null`; renders brand, an optional mono now-playing readout, and the clock.
  - `Dock({ windows, onToggle })` — `windows` is the full reducer state; renders one button per `WINDOW_IDS` entry with `--active` and `--min` modifiers.
  - `Hero({ visible, heroSubtitle, game, onOpenGame })`
  - `About({ aboutParagraphs })`, `Works({ musicReleases, software, selected, onSelect, onBack })`, `Connect({ socialLinks })`

- [ ] **Step 1: Move the components**

Move each function from `App.jsx` into its own file verbatim, adding the imports it needs and a default export:
- `TitleBar` (lines 27–54) → `src/components/TitleBar.jsx`
- `Dock` (56–80) → `src/components/Dock.jsx`
- `Hero` (460–469) → `src/components/Hero.jsx`
- `AboutContent` (160–187) → `src/windows/About.jsx`, renamed `About`
- `ArtworkPlaceholder` (189–201), `ProjectGrid` (203–285), `WorksContent` (287–408) → `src/windows/Works.jsx`; `WorksContent` renamed `Works` and default-exported, the other two kept module-private
- `ContactContent` (410–458) → `src/windows/Connect.jsx`, renamed `Connect`

`src/App.jsx` keeps only `App`, `DesktopBackground`, the imports, and the composition.

- [ ] **Step 2: Verify nothing broke**

Run: `npm run lint && npm test && npm run build`
Expected: all clean. Then `npm run dev` and confirm the site behaves exactly as it did before the split — this step changes no behaviour.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/components src/windows
git commit -m "refactor: split App.jsx into components and windows"
```

---

### Task 7: Data shape — game, slugs, and Sanity fields

Adds the game document and release slugs. No visual change; later tasks depend on this shape.

**Files:**
- Modify: `src/data/fallback.js`
- Modify: `src/lib/queries.js`
- Modify: `src/hooks/useSanityData.js`

**Interfaces:**
- Consumes: `slugify` from Task 4.
- Produces:
  - `export const game` in `fallback.js` — `{ title, year, status, logline, keyArt, storeUrl }`, all strings, empty where unknown.
  - Every entry in `musicReleases`, `games`, and `software` gains a `slug` derived from its title.
  - `useSanityData().data.game` exists, derived from the newest Sanity `game` entry, falling back to the local `game`.

No Sanity Studio schema change is needed anywhere in this plan. The existing `game` document type already carries every field the Game window renders.

- [ ] **Step 1: Add the game record**

In `src/data/fallback.js`, add:

```js
// Real product truth: one title, in development, publicly teased, not yet
// named in site data. Every field stays empty until the real value arrives —
// a placeholder title here would ship as a claim.
export const game = {
  title: '',
  year: '',
  status: 'in development',
  logline: '',
  keyArt: '',
  storeUrl: '',
}
```

- [ ] **Step 2: Derive slugs**

At the bottom of `src/data/fallback.js`, after the arrays are defined, add the import at the top of the file:

```js
import { slugify } from '../lib/route.js'
```

and wrap each exported array so every entry carries a slug. Replace `export const musicReleases = [` with `const rawMusicReleases = [`, then after the array's closing bracket add:

```js
// `slugify` returns '' for a title made entirely of punctuation, and an empty
// slug silently degrades a deep link to the bare window route. `id` is always
// present and unique, so it is the fallback that keeps every release linkable.
export const musicReleases = rawMusicReleases.map(r => ({ ...r, slug: slugify(r.title) || String(r.id) }))
```

Do the same for `games` and `software` (both currently empty arrays — the map is a no-op today and correct tomorrow).

- [ ] **Step 3: Derive the featured game from the existing Sanity type**

`src/lib/queries.js` already fetches `*[_type == "game"]` with `title, year, description, status, url, "image": artwork.asset->url`. Those are exactly the fields the Game window needs, so **no Sanity schema change and no new query are required.** The featured game is the newest entry in `games`.

In `src/hooks/useSanityData.js`, import `slugify` from `../lib/route`, add `game: fallback.game` to `initialData`, and add these two helpers above the hook:

```js
const withSlugs = list => (list ?? []).map(item => ({ ...item, slug: item.slug || slugify(item.title) || String(item.id) }))

// The featured game is simply the newest one. Sanity's `game` type already
// carries every field the Game window needs, so there is nothing to add there.
const featured = (games) => {
  const g = games?.[0]
  if (!g) return fallback.game
  return {
    title: g.title ?? '',
    year: g.year ?? '',
    status: g.status ?? 'in development',
    logline: g.description ?? '',
    keyArt: g.image ?? '',
    storeUrl: g.url ?? '',
  }
}
```

In the `.then` handler, before `setData`, normalise the payload:

```js
const next = { ...sanityData }
if (next.musicReleases) next.musicReleases = withSlugs(next.musicReleases)
if (next.games) { next.games = withSlugs(next.games); next.game = featured(next.games) }
if (next.software) next.software = withSlugs(next.software)
setData(prev => ({ ...prev, ...next }))
```

- [ ] **Step 3b: Fix the pre-existing lint error in this file**

`src/hooks/useSanityData.js:38` has a pre-existing `react-hooks/set-state-in-effect` error: `setIsLoaded(true)` is called synchronously inside the effect's `catch` block. Since you are rewriting this effect anyway, fix it properly.

`fetchAllContent()` is already `async`, so it cannot throw synchronously — the outer `try`/`catch` and the `console.log`/`console.error` debugging noise around it are all dead weight. Replace the whole effect body with:

```js
useEffect(() => {
  let live = true
  fetchAllContent()
    .then(sanityData => {
      if (!live || !Object.keys(sanityData).length) return
      const next = { ...sanityData }
      if (next.musicReleases) next.musicReleases = withSlugs(next.musicReleases)
      if (next.games) { next.games = withSlugs(next.games); next.game = featured(next.games) }
      if (next.software) next.software = withSlugs(next.software)
      setData(prev => ({ ...prev, ...next }))
    })
    .catch(err => console.error('[Sanity] fetch failed:', err))
    .finally(() => { if (live) setIsLoaded(true) })
  return () => { live = false }
}, [])
```

The `live` flag prevents a setState after unmount; every setState now happens in a callback rather than synchronously in the effect body, which is what the rule asks for.

- [ ] **Step 4: Verify**

Run: `npm test && npm run lint && npm run dev`
Expected: all clean — including lint, which should now report **zero** problems repo-wide.

Confirm slugs exist by adding a temporary `console.log(data.musicReleases[0].slug)` in `App`, checking it prints `drift-6`, then removing the log before committing.

- [ ] **Step 5: Commit**

```bash
git add src/data/fallback.js src/lib/queries.js src/hooks/useSanityData.js
git commit -m "feat: add game record and release slugs to data layer"
```

---

### Task 8: Hero, dock, and title bar in the new world

Restyles the shell and puts the game CTA in the first viewport — the surface's one primary action.

**Files:**
- Modify: `src/components/Hero.jsx`, `src/components/Dock.jsx`, `src/components/TitleBar.jsx`
- Modify: `src/styles/globals.css`
- Modify: `src/App.jsx`

- [ ] **Step 1: Rewrite Hero**

`src/components/Hero.jsx`:

```jsx
export default function Hero({ visible, heroSubtitle, game, onOpenGame }) {
  if (!visible) return null

  const named = Boolean(game?.title)

  return (
    <div className="hero">
      <img src="/logo.png" alt="Hearts Aglow" className="hero__logo" />
      <p className="hero__tagline">{heroSubtitle}</p>

      <div className="hero__rule" aria-hidden="true" />

      {/* The surface's single call to action. Quiet by design — a shout
          would break the field, and the dock carries the game everywhere. */}
      <button className="hero__cta" onClick={onOpenGame}>
        <span className="hero__cta-name">{named ? game.title : 'A game'}</span>
        <span className="hero__cta-meta">
          {game?.year ? `${game.year} · ` : ''}{game?.status || 'in development'}
        </span>
        <span className="hero__cta-go" aria-hidden="true">→</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite Dock**

`src/components/Dock.jsx`:

```jsx
import { WINDOW_IDS } from '../lib/windows'

const LABELS = { about: 'About', works: 'Works', game: 'Game', connect: 'Say hi' }

export default function Dock({ windows, onToggle }) {
  return (
    <nav className="dock" aria-label="Primary">
      {WINDOW_IDS.map(id => {
        const w = windows[id]
        const active = w.open && !w.minimized
        return (
          <button
            key={id}
            className={`dock__item ${active ? 'dock__item--active' : ''} ${w.minimized ? 'dock__item--min' : ''}`}
            onClick={() => onToggle(id)}
            aria-pressed={w.open}
          >
            {LABELS[id]}
          </button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 3: Add the now-playing readout to TitleBar**

In `src/components/TitleBar.jsx`, accept a `nowPlaying` prop and render, between brand and clock:

```jsx
{nowPlaying && <span className="titlebar__np">♪ {nowPlaying}</span>}
```

Keep the existing clock `useEffect` unchanged.

- [ ] **Step 4: Write the shell CSS**

Replace the existing `.hero*`, `.dock*`, and `.titlebar*` rules in `globals.css` with:

```css
.desktop { position: relative; height: 100%; z-index: 2; }
.desktop__content { position: absolute; inset: 0; }

.titlebar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  height: 34px;
  padding: 0 var(--s-5);
  font-family: var(--font-data);
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-faint);
}
.titlebar__brand { display: flex; align-items: center; gap: var(--s-2); }
.titlebar__dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--signal);
  box-shadow: 0 0 10px var(--signal);
}
.titlebar__np { color: var(--signal); }

.hero {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--s-4);
  text-align: center;
  padding: var(--s-6);
}
.hero__logo { width: min(340px, 62vw); height: auto; }
.hero__tagline {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(13px, 1.5vw, 16px);
  font-weight: 200;
  font-stretch: 125%;
  letter-spacing: 0.18em;
  color: var(--text-dim);
}
.hero__rule {
  width: 120px; height: 1px; margin: var(--s-5) 0 var(--s-2);
  background: linear-gradient(90deg, transparent, var(--hairline-focus), transparent);
}
.hero__cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-1);
  padding: var(--s-3) var(--s-6);
  border: 1px solid var(--hairline);
  border-radius: 2px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: border-color var(--dur-fast), box-shadow var(--dur-mid) var(--ease-out);
}
.hero__cta:hover {
  border-color: var(--hairline-focus);
  box-shadow: 0 0 40px -8px rgba(196, 138, 255, 0.4);
}
.hero__cta-name {
  font-family: var(--font-display);
  font-size: 15px; font-weight: 300; font-stretch: 125%;
  letter-spacing: 0.2em; text-transform: uppercase;
}
.hero__cta-meta {
  font-family: var(--font-data);
  font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--text-faint);
}
.hero__cta-go { color: var(--signal); font-size: 12px; }

.dock {
  position: fixed;
  bottom: var(--s-5);
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  gap: var(--s-2);
}
.dock__item {
  padding: var(--s-2) var(--s-5);
  border: 1px solid var(--hairline);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-family: var(--font-display);
  font-size: 10px; font-weight: 300; font-stretch: 118%;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--text-dim);
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast), box-shadow var(--dur-mid) var(--ease-out);
}
.dock__item:hover { color: var(--text); border-color: var(--hairline-focus); }
.dock__item--active {
  color: var(--signal);
  border-color: var(--hairline-focus);
  box-shadow: 0 0 24px -6px rgba(223, 244, 255, 0.4);
}
.dock__item--min { color: var(--text-faint); border-style: dashed; }
```

- [ ] **Step 5: Wire in App**

In `src/App.jsx`, pass `visible={openIds(windows).length === 0}`, `game={data.game}`, and `onOpenGame={() => dispatch({ type: 'OPEN', id: 'game' })}` to `Hero`; pass `windows` and the toggle dispatcher to `Dock`.

- [ ] **Step 6: Verify**

Run: `npm run dev`.
Expected: hero centred over the field with wordmark, tagline, hairline rule, and the game CTA reading "A game / in development →" (the honest unnamed state). Dock shows four items; the active one glows cyan; a minimized one is dashed and dim. Title bar shows brand dot, no now-playing yet, and the clock in mono.

Check contrast: DevTools → inspect `.hero__tagline` → Accessibility → contrast ratio must be ≥4.5:1. If it fails at the bloom's brightest phase, raise `--text-dim` rather than changing the field.

- [ ] **Step 7: Commit**

```bash
git add src/components src/styles/globals.css src/App.jsx
git commit -m "feat: restyle shell and put the game CTA in the first viewport"
```

---

### Task 9: Window content in the new world

Tasks 2, 5, and 8 rewrote the tokens, the window chrome, and the shell. The **content inside** About, Works, and Connect was never rewritten, so those rules still reference roughly 130 custom properties that no longer exist (`--bg`, `--surface`, `--border`, `--warm`, `--font-sans`, `--font-serif`, `--font-mono`, `--radius-*`, `--transition*`, `--space-xs/sm/md`). An undefined `var()` silently resolves to nothing, so without this task those three windows ship visibly broken.

**Files:**
- Modify: `src/styles/globals.css` (the `.about*`, `.works*`, and `.contact*` sections)

**Interfaces:**
- Consumes: every token from Task 2. Introduces none.

- [ ] **Step 1: Inventory what is dead**

```bash
grep -oE '\-\-[a-z0-9-]+' src/styles/globals.css | sort -u > /tmp/used.txt
grep -oE '^\s+\-\-[a-z0-9-]+' src/styles/globals.css | tr -d ' ' | sort -u > /tmp/defined.txt
comm -23 /tmp/used.txt /tmp/defined.txt
```

Every token this prints is referenced but never defined. That list is your work queue; it must be empty when you finish.

- [ ] **Step 2: Repoint every dead token**

Work through the `.about*`, `.works*`, and `.contact*` rules and map each dead token to its replacement. Use this mapping exactly — do not invent new values, and do not add new custom properties:

| Dead token | Replacement |
|---|---|
| `--bg` | `var(--void)` |
| `--surface` | `var(--pane)` |
| `--border` | `var(--hairline)` |
| `--warm` | `var(--bloom-warm)` |
| `--font-sans` | `var(--font-body)` |
| `--font-serif` | `var(--font-display)` |
| `--font-mono` | `var(--font-data)` |
| `--space-xs` | `var(--s-1)` |
| `--space-sm` | `var(--s-2)` |
| `--space-md` | `var(--s-4)` |
| `--radius-sm` | `2px` |
| `--radius-md` | `3px` |
| `--transition` | `var(--dur-mid) var(--ease-out)` |
| `--transition-fast` | `var(--dur-fast) var(--ease-out)` |

Any dead token not in this table: replace it with the nearest equivalent from the Task 2 token block and note the substitution in your report.

- [ ] **Step 3: Fix the hover that animates layout**

`.contact__item` currently declares `transition: padding var(--transition)` with `.contact__item:hover { padding-left: 6px }`. Animating padding forces layout on every frame of the hover. Replace both rules with a transform, which does not:

```css
.contact__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-3) 0;
  border-bottom: 1px solid var(--hairline);
  transition: transform var(--dur-fast) var(--ease-out);
}

.contact__item:hover {
  transform: translateX(4px);
}
```

Then scan the `.about*`, `.works*`, and `.contact*` rules for any other transition or animation targeting `width`, `height`, `padding`, `margin`, `top`, `left`, `right`, or `bottom`, and convert each to `transform` or `opacity`. Report each one you changed.

- [ ] **Step 4: Bring the type into the three-voice system**

Within these sections only, enforce the rule that governs the whole site:
- `var(--font-display)` for release titles, section labels, and tab labels — uppercase, letter-spacing at or above `0.12em`, weight 300 or lighter, `font-stretch: 118%`.
- `var(--font-body)` for descriptions and paragraphs — set `max-width: 68ch` on any paragraph block so the measure stays readable.
- `var(--font-data)` **only** for years, track durations, track numbers, and status readouts. A release *title* is not data and does not get mono.

- [ ] **Step 5: Verify nothing is dead**

Re-run the Step 1 command.
Expected: **no output.** Every referenced token now resolves.

Then run `npm run lint && npm run build` — expect lint to report exactly one pre-existing error in `src/hooks/useSanityData.js:38` (assigned to Task 7; if Task 7 has already run, expect zero) and the build to be clean.

Finally, in `npm run dev`, open About, Works, and Connect in turn and confirm each renders as deliberate design rather than unstyled text: readable body copy, correct fonts, hairline borders visible, no element sitting flush against a window edge.

- [ ] **Step 6: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat: restyle window content onto the new token system"
```

---

### Task 10: Game window and email capture

**Files:**
- Create: `src/windows/Game.jsx`
- Create: `src/lib/config.js`
- Modify: `src/App.jsx`, `src/styles/globals.css`

**Interfaces:**
- Produces: `export const EMAIL_ENDPOINT = ''` in `src/lib/config.js`; `Game({ game })`.

- [ ] **Step 1: Add the config constant**

Create `src/lib/config.js`:

```js
// Hosted form endpoint for launch-news signup. Static hosting means no
// server of our own. Buttondown's embed URL looks like:
//   https://buttondown.email/api/emails/embed-subscribe/<username>
// Empty until the account exists; the form renders disabled rather than
// silently posting nowhere.
export const EMAIL_ENDPOINT = ''
```

- [ ] **Step 2: Write the Game window**

Create `src/windows/Game.jsx`:

```jsx
import { EMAIL_ENDPOINT } from '../lib/config'

export default function Game({ game }) {
  const named = Boolean(game?.title)
  const canSubscribe = Boolean(EMAIL_ENDPOINT)

  return (
    <div className="game">
      <div className="game__art">
        {game?.keyArt
          ? <img src={game.keyArt} alt={named ? game.title : 'Key art'} />
          : <p className="game__art-empty">Key art in progress</p>}
      </div>

      <h3 className="game__title">{named ? game.title : 'Untitled'}</h3>
      <p className="game__meta">
        {game?.year ? `${game.year} · ` : ''}{game?.status || 'in development'}
      </p>

      {game?.logline && <p className="game__logline">{game.logline}</p>}

      <form
        className="game__form"
        action={EMAIL_ENDPOINT || undefined}
        method="post"
        target="_blank"
      >
        <label className="game__label" htmlFor="game-email">
          Hear when it ships
        </label>
        <div className="game__row">
          <input
            id="game-email"
            className="game__input"
            type="email"
            name="email"
            placeholder="you@somewhere"
            required
            disabled={!canSubscribe}
          />
          <button className="game__submit" type="submit" disabled={!canSubscribe}>
            Notify me
          </button>
        </div>
        {!canSubscribe && (
          <p className="game__note">Signup opens shortly — the list is not live yet.</p>
        )}
      </form>

      {game?.storeUrl && (
        <a className="game__store" href={game.storeUrl} target="_blank" rel="noopener noreferrer">
          Get it →
        </a>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Style it**

Add to `globals.css`, reusing the existing tokens (no new colours):

```css
.game { display: flex; flex-direction: column; gap: var(--s-4); }

.game__art {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--hairline);
  border-radius: 2px;
  /* The field shows through where the art will go — honest, not a grey box. */
  background: transparent;
}
.game__art img { width: 100%; height: 100%; object-fit: cover; border-radius: 2px; }
.game__art-empty {
  margin: 0;
  font-family: var(--font-data);
  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--text-faint);
}

.game__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 22px; font-weight: 300; font-stretch: 118%;
  letter-spacing: 0.12em; text-transform: uppercase;
}
.game__meta {
  margin: 0;
  font-family: var(--font-data);
  font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--text-faint);
}
.game__logline { margin: 0; max-width: 68ch; line-height: 1.7; color: var(--text-dim); }

.game__form { display: flex; flex-direction: column; gap: var(--s-2); margin-top: var(--s-3); }
.game__label {
  font-family: var(--font-display);
  font-size: 10px; font-weight: 300; font-stretch: 118%;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--text-dim);
}
.game__row { display: flex; gap: var(--s-2); flex-wrap: wrap; }
.game__input {
  flex: 1 1 200px;
  padding: var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 13px;
}
.game__input::placeholder { color: var(--text-faint); }
.game__input:disabled, .game__submit:disabled { opacity: 0.45; cursor: not-allowed; }
.game__submit {
  padding: var(--s-3) var(--s-5);
  border: 1px solid var(--hairline-focus);
  border-radius: 2px;
  background: transparent;
  color: var(--signal);
  font-family: var(--font-display);
  font-size: 10px; font-stretch: 118%;
  letter-spacing: 0.2em; text-transform: uppercase;
  cursor: pointer;
}
.game__submit:hover:not(:disabled) { box-shadow: 0 0 24px -6px rgba(223, 244, 255, 0.4); }
.game__note {
  margin: 0;
  font-family: var(--font-data);
  font-size: 9px; letter-spacing: 0.12em;
  color: var(--text-faint);
}
.game__store {
  align-self: flex-start;
  color: var(--signal);
  font-family: var(--font-display);
  font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
  text-decoration: none;
}
```

- [ ] **Step 4: Register the window**

In `src/App.jsx`, add `game: { title: 'Game', position: { top: '12%', left: '22%', width: '560px', height: 'min(620px, 78vh)' } }` to `windowConfigs` and `game: <Game game={data.game} />` to `windowContent`.

- [ ] **Step 5: Verify**

Run: `npm run dev`, click the hero CTA.
Expected: the Game window opens showing the field through the empty key-art frame, "Untitled / in development", a disabled email form, and the honest "Signup opens shortly" note. No fake title, no grey placeholder box, no store button.

- [ ] **Step 6: Commit**

```bash
git add src/windows/Game.jsx src/lib/config.js src/App.jsx src/styles/globals.css
git commit -m "feat: add game window with email capture and store-link slot"
```

---

### Task 11: Persistent player

Wraps Bandcamp's unstylable iframe in chrome we control, living outside the window map so it survives other windows opening and closing.

**Files:**
- Create: `src/components/Player.jsx`
- Modify: `src/App.jsx`, `src/windows/Works.jsx`, `src/styles/globals.css`

**Interfaces:**
- Produces: `Player({ release, onClose })` — renders `null` when `release` is falsy.
- `Works` gains an `onPlay` prop, called with a release when its play control is used. `Works` only renders that control for releases with a truthy `bandcampId`.

- [ ] **Step 1: Write the Player**

Create `src/components/Player.jsx`:

```jsx
export default function Player({ release, onClose }) {
  if (!release) return null

  const src = `https://bandcamp.com/EmbeddedPlayer/album=${release.bandcampId}/size=large/bgcol=181a1b/linkcol=dff4ff/artwork=small/transparent=true/`

  return (
    <aside className="player" aria-label={`Player — ${release.title}`}>
      <header className="player__bar">
        <span className="player__title">{release.title}</span>
        <button className="player__close" onClick={onClose} aria-label="Close player">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2 2 8 8M8 2 2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      <iframe
        className="player__frame"
        title={`${release.title} on Bandcamp`}
        src={src}
        seamless
      />
    </aside>
  )
}
```

- [ ] **Step 2: Style it**

```css
.player {
  position: fixed;
  right: var(--s-5);
  bottom: 84px;
  z-index: 45;
  width: 300px;
  border: 1px solid var(--hairline-focus);
  border-radius: 3px;
  background: var(--pane);
  backdrop-filter: blur(var(--pane-blur));
  -webkit-backdrop-filter: blur(var(--pane-blur));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  overflow: hidden;
  animation: window-open var(--dur-mid) var(--ease-out);
}
.player__bar {
  display: flex; align-items: center; justify-content: space-between;
  height: 30px; padding: 0 var(--s-2) 0 var(--s-3);
  border-bottom: 1px solid var(--hairline);
}
.player__title {
  font-family: var(--font-display);
  font-size: 10px; font-stretch: 118%;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--signal);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.player__close {
  display: grid; place-items: center;
  width: 22px; height: 22px; padding: 0;
  border: 0; background: transparent; color: var(--text-faint); cursor: pointer;
}
.player__close:hover { color: var(--signal); }
.player__frame { display: block; width: 100%; height: 340px; border: 0; }
```

- [ ] **Step 3: Add the play control to Works**

In `src/windows/Works.jsx`, in the release detail view, render a play button **only** when the release has a `bandcampId`:

```jsx
{selectedRelease.bandcampId
  ? <button className="works__play" onClick={() => onPlay(selectedRelease)}>▶ Play here</button>
  : null}
```

The existing `Listen on Bandcamp →` link stays in both cases. A release without an ID therefore shows the link alone — no broken player, no disabled control implying one exists.

Style `.works__play` with the same rules as `.game__submit` (add it to that selector list rather than duplicating the block).

- [ ] **Step 4: Wire in App**

In `src/App.jsx` add `const [playing, setPlaying] = useState(null)`, pass `onPlay={setPlaying}` down to `Works`, render `<Player release={playing} onClose={() => setPlaying(null)} />` as a sibling of the windows, and pass `nowPlaying={playing?.title ?? null}` to `TitleBar`.

- [ ] **Step 5: Verify**

Run: `npm run dev` → Works → Drift 6 → "Play here".
Expected: the player docks bottom-right with Hearts Aglow chrome around the Bandcamp embed; the title bar shows `♪ Drift 6` in cyan mono; opening and closing other windows leaves the player playing. Then open Exalt (no `bandcampId`) and confirm **no** play button appears, only the Bandcamp link.

- [ ] **Step 6: Commit**

```bash
git add src/components/Player.jsx src/App.jsx src/windows/Works.jsx src/styles/globals.css
git commit -m "feat: add persistent player wrapping the Bandcamp embed"
```

---

### Task 12: Boot sequence

An aperture opening. Theatre, but gated correctly.

**Files:**
- Create: `src/components/Boot.jsx`
- Modify: `src/App.jsx`, `src/styles/globals.css`

**Interfaces:**
- Produces: `Boot({ onDone })` — renders `null` and calls `onDone()` immediately when `prefers-reduced-motion` is set or `sessionStorage.getItem('aglow.booted')` is truthy.

- [ ] **Step 1: Write it**

Create `src/components/Boot.jsx`:

```jsx
import { useEffect, useState } from 'react'

const LINES = [
  'aglow.os',
  'mounting /works ......... ok',
  'mounting /connect ....... ok',
  'field ................... live',
]

const KEY = 'aglow.booted'

export default function Boot({ onDone }) {
  const skip = typeof window === 'undefined'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || sessionStorage.getItem(KEY)

  const [shown, setShown] = useState(skip ? LINES.length : 0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (skip) { onDone(); return }

    const timers = LINES.map((_, i) => setTimeout(() => setShown(i + 1), 380 + i * 420))
    const out = setTimeout(() => setLeaving(true), 380 + LINES.length * 420 + 300)
    const done = setTimeout(() => { sessionStorage.setItem(KEY, '1'); onDone() }, 380 + LINES.length * 420 + 700)

    const bail = () => {
      timers.forEach(clearTimeout); clearTimeout(out); clearTimeout(done)
      sessionStorage.setItem(KEY, '1')
      onDone()
    }
    window.addEventListener('keydown', bail)
    window.addEventListener('pointerdown', bail)

    return () => {
      timers.forEach(clearTimeout); clearTimeout(out); clearTimeout(done)
      window.removeEventListener('keydown', bail)
      window.removeEventListener('pointerdown', bail)
    }
  }, [skip, onDone])

  if (skip) return null

  return (
    <div className={`boot ${leaving ? 'boot--leaving' : ''}`} role="status" aria-live="polite">
      <div className="boot__aperture" aria-hidden="true" />
      <pre className="boot__log">{LINES.slice(0, shown).join('\n')}</pre>
      <p className="boot__skip">press any key to skip</p>
    </div>
  )
}
```

- [ ] **Step 2: Style it**

```css
.boot {
  position: fixed; inset: 0; z-index: 90;
  display: grid; place-items: center;
  background: #000;
  transition: opacity var(--dur-slow) var(--ease-out);
}
.boot--leaving { opacity: 0; pointer-events: none; }

/* The aperture dilating — Turrell's opening, not a spinner. */
.boot__aperture {
  position: absolute;
  width: 40vmax; height: 40vmax; border-radius: 50%;
  background: radial-gradient(circle, rgba(196,138,255,.5), transparent 62%);
  filter: blur(40px);
  animation: aperture 2600ms var(--ease-out) forwards;
}
@keyframes aperture {
  from { transform: scale(0.02); opacity: 0; }
  60%  { opacity: 1; }
  to   { transform: scale(1.6); opacity: 0.65; }
}

.boot__log {
  position: relative;
  margin: 0;
  font-family: var(--font-data);
  font-size: 11px; line-height: 2; letter-spacing: 0.1em;
  color: var(--signal);
  text-align: left;
}
.boot__skip {
  position: absolute; bottom: var(--s-7);
  margin: 0;
  font-family: var(--font-data);
  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--text-faint);
}
```

- [ ] **Step 3: Wire in App**

In `src/App.jsx`: `const [booted, setBooted] = useState(false)`, render `<Boot onDone={() => setBooted(true)} />`, and gate the `Hero`'s `visible` prop on `booted` so the hero does not flash behind the boot overlay.

- [ ] **Step 4: Verify all three paths**

- Fresh tab: boot plays once, ~2.5s, then the desktop resolves.
- Reload the same tab: no boot (sessionStorage).
- New tab with `prefers-reduced-motion: reduce` emulated: no boot at all, desktop renders immediately.
- During boot, press a key: it skips immediately and does not replay on reload.

- [ ] **Step 5: Commit**

```bash
git add src/components/Boot.jsx src/App.jsx src/styles/globals.css
git commit -m "feat: add aperture boot sequence"
```

---

### Task 13: Connect hash routing to window state

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Lift the Works selection into App**

`Works` currently owns `selectedRelease` in local state, which the URL cannot reach. Change `Works` to take `selectedSlug` and `onSelect(slugOrNull)` as props and resolve the release itself:

```jsx
const selectedRelease = selectedSlug
  ? [...musicReleases, ...software].find(r => r.slug === selectedSlug) ?? null
  : null
```

Its existing "Back" control calls `onSelect(null)`; a grid item calls `onSelect(item.slug)`. Delete the internal `useState` for `selectedRelease`.

- [ ] **Step 2: Wire the hook in App**

In `src/App.jsx`:

```jsx
import { useHashRoute } from './hooks/useHashRoute'
import { buildHash } from './lib/route'

const [worksSlug, setWorksSlug] = useState(null)

// The URL is the source of truth for what is open. Handlers below write the
// hash; this listener is the only thing that reads it back into state, so a
// pasted link and a click take exactly the same path.
useHashRoute((route) => {
  if (!route) return
  dispatch({ type: 'OPEN', id: route.id })
  setWorksSlug(route.id === 'works' ? route.detail : null)
})

const openWindow = (id) => {
  const isOpen = windows[id].open && !windows[id].minimized
  if (isOpen) {
    dispatch({ type: 'CLOSE', id })
    if (openIds(windows).filter(w => w !== id).length === 0) {
      history.replaceState(null, '', window.location.pathname)
    }
  } else {
    window.location.hash = buildHash(id, null)
  }
}

const selectRelease = (slug) => {
  window.location.hash = buildHash('works', slug)
  if (!slug) setWorksSlug(null)
}
```

Pass `onToggle={openWindow}` to `Dock`, and `selectedSlug={worksSlug} onSelect={selectRelease}` to `Works`. `replaceState` is used for the clear so closing a window does not push a history entry the back button then has to walk through.

Note that `buildHash('works', null)` returns `'#/works'`, so `selectRelease(null)` correctly navigates back to the release list and the back button steps through detail views.

- [ ] **Step 3: Verify**

- Load `http://localhost:5173/#/works/drift-6` directly → Works opens on the Drift 6 detail view.
- Load `#/game` → Game window opens.
- Load `#/nonsense` → bare desktop, no error in console.
- Open Works, click a release, press browser Back → returns to the release list.
- Close every window → the hash clears from the address bar.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/windows/Works.jsx
git commit -m "feat: bind hash routes to window and release state"
```

---

### Task 14: Mobile

Below 768px the desktop metaphor becomes one-app-at-a-time.

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src/components/Window.jsx`

- [ ] **Step 1: Add a reactive media-query hook**

A bare `window.matchMedia(...).matches` read inside a component is stale: nothing re-renders when the viewport crosses the breakpoint, so rotating a phone or dragging a desktop window across 768px leaves the wrong affordances mounted. Subscribe instead.

Create `src/hooks/useMediaQuery.js`:

```js
import { useSyncExternalStore } from 'react'

export function useMediaQuery(query) {
  const mql = typeof window === 'undefined' ? null : window.matchMedia(query)
  return useSyncExternalStore(
    (cb) => {
      if (!mql) return () => {}
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => (mql ? mql.matches : false),
    () => false,
  )
}

export const COMPACT = '(max-width: 767px)'
```

- [ ] **Step 1b: Suppress desktop-only affordances**

In `src/components/Window.jsx`, add at the top of the component:

```jsx
const compact = useMediaQuery(COMPACT)
```

importing `useMediaQuery, COMPACT` from `../hooks/useMediaQuery`.

Guard the drag handlers (`onPointerDown={compact ? onFocus : beginDrag('move')}` and `onPointerMove`/`onPointerUp` set to `undefined` when compact), and render the grip and the minimize/maximize buttons only when `!compact`. Close remains in every case.

- [ ] **Step 2: Write the sheet CSS**

```css
@media (max-width: 767px) {
  .window {
    position: fixed;
    inset: 34px 0 62px 0 !important;
    width: auto !important;
    height: auto !important;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    animation: sheet-up var(--dur-mid) var(--ease-out);
  }
  @keyframes sheet-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: none; }
  }

  .window__bar { cursor: default; }
  .window__body { padding: var(--s-4); }

  .dock {
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    justify-content: space-around;
    padding: var(--s-2) var(--s-2) calc(var(--s-2) + env(safe-area-inset-bottom));
    background: rgba(8, 7, 11, 0.6);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid var(--hairline);
  }
  .dock__item { flex: 1; padding: var(--s-3) var(--s-1); text-align: center; border: 0; background: transparent; }
  .dock__item--active { box-shadow: none; }

  .player { left: var(--s-3); right: var(--s-3); bottom: 70px; width: auto; }
  .hero__logo { width: 74vw; }
}
```

- [ ] **Step 2b: Only one window at a time on mobile**

In `src/App.jsx`, use the same hook — `const compact = useMediaQuery(COMPACT)` — and close the others before opening, inside the `openWindow` handler defined in Task 13:

```jsx
const openWindow = (id) => {
  const isOpen = windows[id].open && !windows[id].minimized
  if (isOpen) {
    dispatch({ type: 'CLOSE', id })
    if (openIds(windows).filter(w => w !== id).length === 0) {
      history.replaceState(null, '', window.location.pathname)
    }
    return
  }
  if (compact) {
    openIds(windows).filter(w => w !== id).forEach(w => dispatch({ type: 'CLOSE', id: w }))
  }
  window.location.hash = buildHash(id, null)
}
```

This replaces the Task 13 version of `openWindow` rather than sitting beside it — there is exactly one such handler in the finished file.

- [ ] **Step 3: Verify**

In DevTools device toolbar at iPhone 14 (390×844):
- Windows fill the space between title bar and dock, no drag, no resize grip, no minimize/maximize.
- The dock is a fixed bottom bar with four evenly spread items.
- Opening a second window closes the first.
- The light field still animates smoothly — check the FPS meter stays near 60.
- No horizontal scroll anywhere.

- [ ] **Step 4: Commit**

```bash
git add src/components/Window.jsx src/styles/globals.css src/App.jsx
git commit -m "feat: adapt the desktop metaphor to mobile sheets"
```

---

### Task 15: Direction contract, final sweep, and build

**Files:**
- Modify: `index.html`
- Modify: `src/styles/globals.css` (remove dead rules)

- [ ] **Step 1: Record the direction contract**

In `index.html`, as the first child of `<body>`, add:

```html
    <!--
      THESIS: A Turrell Ganzfeld with an operating system floating in it. Refuses
      the studio-portfolio default of a dark page with a neon accent over a grid
      of album cards; the ground itself is the primary visual event.
      OWN-WORLD: Void #08070b under three gaussian light blooms cycling violet
      #c48aff to amber #ffa878 over ~12 minutes, dithered so no edge ever forms.
      Signal cyan #dff4ff on focus and live data only. Anybody (display),
      Archivo (body), Martian Mono (data). Hairline glass panes, 3px radii,
      film grain over everything.
      STORY: The visitor arrives inside a slow light field, finds a quiet OS in
      it, follows one line to the game, and stays for the music.
      FIRST VIEWPORT: Centred wordmark over the field, tagline beneath, hairline
      rule, then the single game CTA. Dock of four fixed at the bottom.
      FORM: desktop-OS-in-a-light-field; user-pinned direction; seed key 155321e4.
      FINISH: unreviewed and undocumented is unfinished; this build ends with the
      finish review, the verdict, and DESIGN.md
    -->
```

- [ ] **Step 2: Remove dead CSS**

Search `globals.css` for rules referencing classes no longer emitted (`.desktop__mesh`, `.particles`, old `.works__tab` states if changed, any leftover `--` tokens replaced in Task 2). Delete them. Verify by grepping each class name across `src/` before removing it.

- [ ] **Step 3: Full verification**

```bash
npm test && npm run lint && npm run build
```

Expected: tests pass, lint clean, build succeeds.

Then confirm the contract survived the build:

```bash
grep -c "155321e4" dist/index.html
```

Expected: `1`. A contract the build erased is a contract nobody can audit.

- [ ] **Step 4: Commit**

```bash
git add index.html src/styles/globals.css
git commit -m "chore: record direction contract and remove dead styles"
```

---

## Post-plan: finish review

After Task 15, the run is not complete. Per the impeccable skill's finish protocol:

1. Capture desktop and mobile screenshots in one batched round.
2. Spawn `impeccable-finish-reviewer` fresh (no inherited context) with the request, the artifact paths, the screenshots, the direction contract above, and the craft-floor reference path.
3. Apply material fixes in one batch, recapture, and send back for a verdict.
4. Spawn `impeccable-documenter` to write `DESIGN.md` from the built world.

## Still blocked on the user

None of these block the plan; all of them block shipping the site as finished. None may be invented:

1. **Game:** title, key art, logline, year. Store URL when it exists. Until supplied, Task 10's honest unnamed state ships.
2. **Bandcamp IDs** for Drift 4, Drift 3, Exalt, Drift 2, Drift, and Rebuild. Until supplied, those six show the Bandcamp link with no player.
3. **Email endpoint** — fill `EMAIL_ENDPOINT` in `src/lib/config.js`. Until supplied, the form renders disabled with honest copy.

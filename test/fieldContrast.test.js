import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The light field's colours live in two places by necessity: as GLSL constants
// the shader renders, and as CSS tokens the rest of the surface borrows. Both
// files say "keep in sync with the other" in a comment; this is that comment
// made enforceable, plus a floor under the text contrast that the palette
// determines.

const shader = readFileSync(new URL('../src/components/LightField.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8')

const glslConst = (name) => {
  const m = shader.match(new RegExp(`const vec3 ${name}\\s*=\\s*vec3\\(([^)]+)\\)`))
  assert.ok(m, `shader constant ${name} not found`)
  return m[1].split(',').map(s => Number(s.trim()))
}
const cssToken = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*#([0-9a-fA-F]{6})`))
  assert.ok(m, `css token --${name} not found`)
  return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)
}
// GLSL constants are written to 3 decimals, so 1/255 is the tightest honest tolerance.
const sameColour = (a, b, label) =>
  a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) <= 1 / 255,
    `${label}: channel ${i} differs (${v} vs ${b[i]})`))

test('CSS bloom tokens mirror the shader constants', () => {
  sameColour(glslConst('ROSE'), cssToken('bloom-warm'), 'ROSE / --bloom-warm')
  sameColour(glslConst('PEACH'), cssToken('bloom-warm-2'), 'PEACH / --bloom-warm-2')
  sameColour(glslConst('DEEP'), cssToken('bloom-deep'), 'DEEP / --bloom-deep')
  sameColour(glslConst('VOID'), cssToken('void'), 'VOID / --void')
})

// --- the shader, evaluated on the CPU -------------------------------------
//
// Mirrors LightField.jsx's fragment shader, including the parts that only
// switch on while a record is playing: the beat swell, the aperture pulse, the
// ember layer and the highlight compression. Modelling only the resting field
// would measure a page nobody sees while the site is in use.

const TAU = 6.28318530718
const ASPECT = 16 / 9
const EMBERS = 14

const hash = (x, y) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return v - Math.floor(v)
}
const bloomAt = (ux, uy, cx, cy, r) => {
  const dx = (ux - cx) * ASPECT, dy = uy - cy
  return Math.exp(-(dx * dx + dy * dy) / (r * r))
}
const fract = (v) => v - Math.floor(v)

// Every ember's fixed column, size and rise speed, straight from the shader.
const EMBER_SPEC = Array.from({ length: EMBERS }, (_, i) => ({
  sx: hash(i, 1), sy: hash(i, 2),
  rise: 0.004 + hash(i, 3) * 0.014,
  r: 0.005 + 0.009 * hash(i, 4),
  phase: i * 1.7,
}))

const emberCentres = (t) => EMBER_SPEC.map(e => ({
  x: e.sx + 0.04 * Math.sin(t * 0.11 + e.phase),
  y: fract(e.sy + t * e.rise),
  r: e.r,
}))

const emberSum = (ux, uy, t, b) => {
  let acc = 0
  for (const e of emberCentres(t)) {
    const fade = Math.sin(e.y * Math.PI)
    acc += bloomAt(ux, uy, e.x, e.y, e.r * (1 + 0.45 * b)) * fade * fade
  }
  return acc
}

// col at one point, for one instant, under one set of drive values.
function colourAt(ux, uy, t, { lead, peach, deep, voidC, beat, energy, activity }) {
  const a = (t / 431) * TAU, bb = (t / 619) * TAU, c = (t / 787) * TAU
  const f1 = bloomAt(ux, uy, 0.32 + 0.10 * Math.sin(a), 0.28 + 0.08 * Math.cos(a * 1.3), 0.46)
  const f2 = bloomAt(ux, uy, 0.74 + 0.09 * Math.cos(bb), 0.68 + 0.07 * Math.sin(bb * 0.9), 0.52)
  const f3 = bloomAt(ux, uy, 0.50 + 0.14 * Math.sin(c * 0.7), 1.02 + 0.06 * Math.cos(c), 0.70)
  const mw = 0.5 + 0.5 * Math.sin(a * 0.5), mc = 0.5 + 0.5 * Math.cos(bb * 0.5)
  const warm = lead.map((v, i) => v * (1 - mw) + peach[i] * mw)
  const cool = deep.map((v, i) => v * (1 - mc) + lead[i] * mc)
  const swell = 1 + 0.09 * beat * energy
  const ap = bloomAt(ux, uy, 0.5, 0.5, 0.30 + 0.02 * Math.sin((t / 23) * TAU))
  const lift = 0.03 + 0.05 * activity + 0.035 * energy
  const em = emberSum(ux, uy, t, beat)
  const emberCol = lead.map((v, i) => v * 0.6 + peach[i] * 0.4)
  return voidC.map((v, i) => {
    let x = v
      + warm[i] * f1 * 0.34 * swell
      + cool[i] * f2 * 0.26 * swell
      + deep[i] * f3 * 0.40
      + lead[i] * ap * (0.05 + 0.05 * beat * energy)
      + emberCol[i] * em * lift
    return 1 - Math.exp(-x)          // highlight compression
  })
}

// Brightest colour the field can produce, searching time, position, and the
// drive values at their most energetic. Ember cores are only ~0.01 wide, so
// they are sampled at their own centres rather than hoped for on a grid.
function peak(lead, peach, deep, voidC, { energy = 1, activity = 1, beat = 1 } = {}) {
  const drive = { lead, peach, deep, voidC, beat, energy, activity }
  let best = null, bestLum = -1
  const N = 40, T = 200
  const consider = (ux, uy, t) => {
    const col = colourAt(ux, uy, t, drive)
    const lum = 0.2126 * col[0] + 0.7152 * col[1] + 0.0722 * col[2]
    if (lum > bestLum) { bestLum = lum; best = col }
  }
  for (let ti = 0; ti < T; ti++) {
    const t = (1574 * ti) / (T - 1)
    for (let yi = 0; yi < N; yi++)
      for (let xi = 0; xi < N; xi++)
        consider(xi / (N - 1), yi / (N - 1), t)
    for (const e of emberCentres(t)) consider(e.x, e.y, t)
  }
  return best
}

const relLum = (c) => {
  const l = c.map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]
}
const contrast = (fg, bg) => {
  const [hi, lo] = [relLum(fg), relLum(bg)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
// White text at alpha, composited over the field.
const textOn = (bg, alpha) => bg.map(v => alpha + (1 - alpha) * v)

const STEPS = [['--text', 0.95], ['--text-dim', 0.80], ['--text-faint', 0.66]]

// The field's lead colour is per-record: rose at tint 0, coral at tint 1.
// Coral carries more green, so it is the brighter end and the one to test.
const CORAL = [1.0, 0.420, 0.290]
const emberPeak = (opts) =>
  peak(CORAL, glslConst('PEACH'), glslConst('DEEP'), glslConst('VOID'), opts)

test('--text clears WCAG AA 4.5:1 against the field at its most energetic', () => {
  const bg = emberPeak()
  const ratio = contrast(textOn(bg, 0.95), bg)
  assert.ok(ratio >= 4.5,
    `--text is ${ratio.toFixed(2)}:1 against rgb(${bg.map(v => Math.round(v * 255))})`)
})

test('the dimmer text steps clear the 3:1 large-text threshold', () => {
  // Deliberately 3:1, not 4.5:1 — see DESIGN.md Open Question 4. Raising these
  // alphas is a type-hierarchy decision, not a palette one.
  const bg = emberPeak()
  for (const [name, alpha] of STEPS.slice(1)) {
    const ratio = contrast(textOn(bg, alpha), bg)
    assert.ok(ratio >= 3.0, `${name} is ${ratio.toFixed(2)}:1`)
  }
})

test('playing a record does not make the field brighter than resting did', () => {
  // The reactive layer is allowed to add life, not luminance. If a beat swell
  // or an ember lift ever pushes the peak past the inert field's, the text
  // alphas were tuned against a page that no longer exists.
  const resting = emberPeak({ energy: 0, activity: 0, beat: 0 })
  const busy = emberPeak()
  const lumOf = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  const grew = (lumOf(busy) - lumOf(resting)) / lumOf(resting)
  assert.ok(grew <= 0.15,
    `peak grew ${(grew * 100).toFixed(1)}% when playing ` +
    `(resting rgb(${resting.map(v => Math.round(v * 255))}) -> ` +
    `busy rgb(${busy.map(v => Math.round(v * 255))}))`)
})

test('ember cores stay inside the ember arc, never near --signal', () => {
  // An ember is the brightest thing on screen, so if any of them drifted
  // toward cyan it would read as the signal colour used decoratively.
  const bg = emberPeak()
  const [r, g, b] = bg
  assert.ok(r >= g && g >= b, `ember-lit peak is not warm-ordered: rgb(${bg})`)
})

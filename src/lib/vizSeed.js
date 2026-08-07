// The deterministic half of the visualizer, kept out of Visualizer.jsx so that
// file exports only its component (React Fast Refresh) — and because this is
// the one part of the visual that is pure, so it is the part worth testing.
//
// Counts are exported because the fragment shader interpolates them into its
// array declarations and loop bounds. GLSL ES 1.0 requires both to be compile
// time constants, so they cannot be allowed to drift apart from these.

export const WAVES = 6
export const RINGS = 12
export const SPOKES = 7
export const TRAIL = 5

const hash = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}

/**
 * A portrait of one record, as uniform data. Every frequency, phase, angle and
 * hue derives from the release's own id and the shape of its tracklist, so
 * Drift 6 looks unlike Coda and each looks identical every time you open it.
 */
export function vizSeed(release) {
  const durations = (release.tracks ?? []).map(t => (typeof t === 'object' ? t.duration : 0) || 0)
  const rand = rng(hash(`${release.bandcampId || release.slug || release.title}:${durations.join(',')}`))

  // Longer records move slower. A 35-minute ambient piece should not shimmer
  // like a two-minute one.
  const mean = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 240
  const tempo = 1 - Math.min(1, mean / 900) * 0.6

  // vec4(freq, phase, speed, amp), with hue alongside — a vec4 is full.
  const waves = [], waveHue = []
  for (let i = 0; i < WAVES; i++) {
    waves.push([0.6 + rand() * 2.4 * tempo, rand() * Math.PI * 2, (0.06 + rand() * 0.22) * tempo, 0.18 + rand() * 0.5])
    waveHue.push(rand())
  }

  // One ring per track, five at minimum so a single is still a mandala.
  // Unused slots are switched off rather than skipped: the loop bound is fixed.
  const ringCount = Math.max(5, Math.min(durations.length, RINGS))
  const rings = [], ringOn = []
  for (let i = 0; i < RINGS; i++) {
    rings.push([0.06 + i * 0.045, 0.4 + rand() * 0.9, (0.05 + rand() * 0.13) * tempo, rand()])
    ringOn.push(i < ringCount ? 1 : 0)
  }

  const arms = 5 + Math.floor(rand() * 4)
  const spokes = []
  for (let i = 0; i < SPOKES; i++) {
    spokes.push([rand() * Math.PI * 2, (rand() - 0.5) * 1.1 * tempo, 0.35 + rand() * 0.6, rand()])
  }

  return { waves, waveHue, rings, ringOn, spokes, arms, tempo }
}

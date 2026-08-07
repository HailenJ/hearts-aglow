import test from 'node:test'
import assert from 'node:assert/strict'
import { vizSeed, trackBpm, DEFAULT_BPM, WAVES, RINGS, SPOKES } from '../src/lib/vizSeed.js'

const rel = (over = {}) => ({
  bandcampId: '1234567890',
  tracks: [{ duration: 180 }, { duration: 240 }, { duration: 300 }],
  ...over,
})

test('the same record always yields the same figure', () => {
  assert.deepEqual(vizSeed(rel()), vizSeed(rel()))
})

test('a different record yields a different figure', () => {
  assert.notDeepEqual(vizSeed(rel()), vizSeed(rel({ bandcampId: '9876543210' })))
})

test('changing the tracklist changes the figure, even at the same id', () => {
  assert.notDeepEqual(vizSeed(rel()), vizSeed(rel({ tracks: [{ duration: 181 }] })))
})

test('every uniform array is exactly the length the shader declares', () => {
  const s = vizSeed(rel())
  assert.equal(s.waves.length, WAVES)
  assert.equal(s.waveHue.length, WAVES)
  assert.equal(s.rings.length, RINGS)
  assert.equal(s.ringOn.length, RINGS)
  assert.equal(s.spokes.length, SPOKES)
  for (const v of [...s.waves, ...s.rings, ...s.spokes]) assert.equal(v.length, 4)
})

test('one ring per track, floored at five and capped at the array length', () => {
  const on = (n) => vizSeed(rel({ tracks: Array.from({ length: n }, () => ({ duration: 200 })) }))
    .ringOn.reduce((a, b) => a + b, 0)
  assert.equal(on(1), 5, 'a single still reads as a mandala')
  assert.equal(on(8), 8)
  assert.equal(on(40), RINGS, 'a long record cannot overrun the loop bound')
})

test('longer records move slower, and tempo never inverts', () => {
  const t = (d) => vizSeed(rel({ tracks: [{ duration: d }] })).tempo
  assert.ok(t(2100) < t(120), 'a 35-minute piece should not shimmer like a two-minute one')
  assert.ok(t(99999) >= 0.4, 'tempo bottoms out rather than stopping or reversing')
  assert.ok(t(0) <= 1)
})

test('bpm falls back track → release → resting pulse', () => {
  assert.equal(trackBpm({ bpm: 90 }, { bpm: 128 }), 128, "the track's own value wins")
  assert.equal(trackBpm({ bpm: 90 }, { title: 'no bpm' }), 90, 'else the release covers it')
  assert.equal(trackBpm({}, {}), DEFAULT_BPM)
  assert.equal(trackBpm(undefined, undefined), DEFAULT_BPM, 'nothing loaded yet still draws')
})

test('bpm is clamped, so bad data cannot strobe or stall the pulse', () => {
  assert.equal(trackBpm({}, { bpm: 6000 }), 220, 'a typo must not become a 100Hz strobe')
  assert.equal(trackBpm({}, { bpm: 3 }), 20)
  assert.equal(trackBpm({}, { bpm: 0 }), DEFAULT_BPM, 'zero is missing data, not a stopped heart')
  assert.equal(trackBpm({}, { bpm: -60 }), DEFAULT_BPM)
  assert.equal(trackBpm({}, { bpm: 'fast' }), DEFAULT_BPM)
  assert.equal(trackBpm({}, { bpm: null }), DEFAULT_BPM, 'the Sanity merge writes null when absent')
})

test('bpm survives as a string, since CMS number fields often arrive as text', () => {
  assert.equal(trackBpm({}, { bpm: '128' }), 128)
})

test('a record with no tracks still produces a drawable figure', () => {
  const s = vizSeed({ title: 'Untitled' })
  assert.equal(s.ringOn.reduce((a, b) => a + b, 0), 5)
  assert.ok(Number.isFinite(s.tempo))
  assert.ok(s.arms >= 5 && s.arms <= 8)
  for (const v of s.waves) for (const n of v) assert.ok(Number.isFinite(n))
})

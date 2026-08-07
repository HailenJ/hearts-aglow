import test from 'node:test'
import assert from 'node:assert/strict'
import { vizSeed, WAVES, RINGS, SPOKES } from '../src/lib/vizSeed.js'

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

test('a record with no tracks still produces a drawable figure', () => {
  const s = vizSeed({ title: 'Untitled' })
  assert.equal(s.ringOn.reduce((a, b) => a + b, 0), 5)
  assert.ok(Number.isFinite(s.tempo))
  assert.ok(s.arms >= 5 && s.arms <= 8)
  for (const v of s.waves) for (const n of v) assert.ok(Number.isFinite(n))
})

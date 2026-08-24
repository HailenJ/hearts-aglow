import test from 'node:test'
import assert from 'node:assert/strict'
import { asGame, statusLabel } from '../src/lib/game.js'

// The bug this guards: the Games grid handed the takeover a raw Sanity
// document, whose art lives on `image`, and the takeover read `keyArt` — so
// real key art rendered as "Key art in progress".
test('a games-grid card maps onto the shape the takeover reads', () => {
  const card = {
    id: 'abc',
    title: 'OTO',
    year: '2026',
    status: 'development',
    description: 'A visual music creation game.',
    image: 'https://cdn.sanity.io/images/x/y-1920x1080.png',
    slug: 'oto',
  }
  assert.deepEqual(asGame(card), {
    title: 'OTO',
    year: '2026',
    status: 'development',
    logline: 'A visual music creation game.',
    keyArt: 'https://cdn.sanity.io/images/x/y-1920x1080.png',
    storeUrl: '',
  })
})

test('asGame fills every field, so no consumer reads undefined', () => {
  const g = asGame(undefined)
  assert.deepEqual(Object.keys(g).sort(), ['keyArt', 'logline', 'status', 'storeUrl', 'title', 'year'])
  assert.equal(g.status, 'in development')
  assert.equal(g.keyArt, '')
})

test('statusLabel spells out the raw Sanity value', () => {
  assert.equal(statusLabel('development'), 'In development')
  assert.equal(statusLabel('released'), 'Released')
  assert.equal(statusLabel(''), 'In development')
  assert.equal(statusLabel(undefined), 'In development')
})

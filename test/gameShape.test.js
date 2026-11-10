import test from 'node:test'
import assert from 'node:assert/strict'
import { asGame, isWishlist, statusLabel, youtubeId } from '../src/lib/game.js'

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
    trailer: '',
    links: [],
  })
})

test('asGame fills every field, so no consumer reads undefined', () => {
  const g = asGame(undefined)
  assert.deepEqual(Object.keys(g).sort(), ['keyArt', 'links', 'logline', 'status', 'storeUrl', 'title', 'trailer', 'year'])
  assert.equal(g.status, 'in development')
  assert.equal(g.keyArt, '')
})

test('statusLabel spells out the raw Sanity value', () => {
  assert.equal(statusLabel('development'), 'In development')
  assert.equal(statusLabel('released'), 'Released')
  assert.equal(statusLabel(''), 'In development')
  assert.equal(statusLabel(undefined), 'In development')
})

// A blocked or failed Sanity fetch used to leave Games and Software announcing
// "in development" over a game that exists and a tool that has shipped.
test('the offline fallback carries the real game and software', async () => {
  const fb = await import('../src/data/fallback.js')
  assert.ok(fb.games.length && fb.software.length)
  assert.equal(fb.game.title, fb.games[0].title)
  assert.equal(statusLabel(fb.game.status), 'In development')
})

// The Steam link carries a UTM tag so store visits from the site are
// attributable. The tagged store link must still dedupe against the Steam
// button, so no second Steam entry reaches the takeover.
test('OTO links to Steam with a UTM tag, and no second Steam button', async () => {
  const fb = await import('../src/data/fallback.js')
  const g = asGame(fb.games[0])
  assert.match(g.storeUrl, /utm_source=heartsaglow/)
  assert.ok(!g.links.some(l => /store\.steampowered\.com/.test(l.url)))
})

test('youtubeId reads every link shape the Video URL field might hold', () => {
  for (const u of ['https://youtu.be/ihJS3HBN5DI', 'https://www.youtube.com/watch?v=ihJS3HBN5DI&t=3', 'https://www.youtube.com/embed/ihJS3HBN5DI', 'https://youtube.com/shorts/ihJS3HBN5DI'])
    assert.equal(youtubeId(u), 'ihJS3HBN5DI', u)
  assert.equal(youtubeId('https://vimeo.com/123'), '')
  assert.equal(youtubeId(null), '')
  assert.equal(asGame({ videoUrl: 'https://youtu.be/ihJS3HBN5DI' }).trailer, 'ihJS3HBN5DI')
})

test('a Steam link is a wishlist until the game is released', () => {
  const steam = 'https://store.steampowered.com/app/4433980/OTO/'
  assert.equal(isWishlist(asGame({ url: steam, status: 'development' })), true)
  assert.equal(isWishlist(asGame({ url: steam, status: 'released' })), false)
  assert.equal(isWishlist(asGame({ url: 'https://heartsaglow.itch.io/x' })), false)
})

test('Additional Buttons pass through, minus a repeat of the store link', () => {
  const steam = 'https://store.steampowered.com/app/4433980/OTO/'
  const g = asGame({ url: steam, buttons: [{ label: 'Steam', url: steam }, { label: 'Itch.io', url: 'https://heartsaglow.itch.io/oto' }, { label: 'Empty' }] })
  assert.deepEqual(g.links, [{ label: 'Itch.io', url: 'https://heartsaglow.itch.io/oto' }])
})

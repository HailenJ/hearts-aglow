import test from 'node:test'
import assert from 'node:assert/strict'
import { slugify, parseHash, buildHash, resolveRoute, WORKS_TABS } from '../src/lib/route.js'

const collections = {
  musicReleases: [{ slug: 'drift-6' }, { slug: 'coda' }],
  games: [{ slug: 'orbit' }],
  software: [{ slug: 'lantern' }],
}

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

test('parseHash accepts the three catalogue views as routes of their own', () => {
  assert.deepEqual(parseHash('#/music'), { id: 'music', detail: null })
  assert.deepEqual(parseHash('#/games'), { id: 'games', detail: null })
  assert.deepEqual(parseHash('#/software/lantern'), { id: 'software', detail: 'lantern' })
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

test('slugify returns empty string for punctuation-only input', () => {
  assert.equal(slugify('!!!'), '')
})

test('slugify returns empty string for empty input', () => {
  assert.equal(slugify(''), '')
})

test('buildHash treats empty detail as falsy, degrading to bare route', () => {
  assert.equal(buildHash('works', ''), '#/works')
})

test('resolveRoute closes everything for a null route', () => {
  assert.deepEqual(resolveRoute(null, collections), { windowToOpen: null, slug: null, activeTab: null })
})

test('resolveRoute opens a bare window with no slug or tab', () => {
  assert.deepEqual(
    resolveRoute({ id: 'about', detail: null }, collections),
    { windowToOpen: 'about', slug: null, activeTab: null }
  )
})

test('resolveRoute points all three catalogue views at the one shared pane', () => {
  for (const view of WORKS_TABS) {
    assert.deepEqual(
      resolveRoute({ id: view, detail: null }, collections),
      { windowToOpen: 'works', slug: null, activeTab: view }
    )
  }
})

// The pane was called Works until 2026-08. Links shared under that name must
// not land on a blank desktop, so the old route still resolves.
test('resolveRoute keeps the legacy works route alive, landing on music', () => {
  assert.deepEqual(
    resolveRoute({ id: 'works', detail: null }, collections),
    { windowToOpen: 'works', slug: null, activeTab: 'music' }
  )
  assert.deepEqual(
    resolveRoute({ id: 'works', detail: 'drift-6' }, collections),
    { windowToOpen: 'works', slug: 'drift-6', activeTab: 'music' }
  )
})

test('resolveRoute resolves a music detail route to the music view', () => {
  assert.deepEqual(
    resolveRoute({ id: 'music', detail: 'drift-6' }, collections),
    { windowToOpen: 'works', slug: 'drift-6', activeTab: 'music' }
  )
})

// A slug outranks the view the URL names, or a software link pasted under
// #/music would render a software record through music-only fields.
test('resolveRoute lets a matching slug override the view the route names', () => {
  assert.deepEqual(
    resolveRoute({ id: 'music', detail: 'lantern' }, collections),
    { windowToOpen: 'works', slug: 'lantern', activeTab: 'software' }
  )
  assert.deepEqual(
    resolveRoute({ id: 'works', detail: 'lantern' }, collections),
    { windowToOpen: 'works', slug: 'lantern', activeTab: 'software' }
  )
})

test('resolveRoute does not resolve a games slug — a games card opens the takeover, not a detail pane', () => {
  assert.deepEqual(
    resolveRoute({ id: 'games', detail: 'orbit' }, collections),
    { windowToOpen: 'works', slug: null, activeTab: 'games' }
  )
})

test('resolveRoute falls back to the bare grid when the detail slug matches nothing', () => {
  assert.deepEqual(
    resolveRoute({ id: 'music', detail: 'does-not-exist' }, collections),
    { windowToOpen: 'works', slug: null, activeTab: 'music' }
  )
  assert.deepEqual(
    resolveRoute({ id: 'software', detail: 'does-not-exist' }, collections),
    { windowToOpen: 'works', slug: null, activeTab: 'software' }
  )
})

// The hash is a projection of state, so every route the dock can produce has
// to survive the round trip or the address bar drifts from what is on screen.
test('every catalogue view round-trips through buildHash and parseHash', () => {
  for (const view of WORKS_TABS) {
    assert.deepEqual(parseHash(buildHash(view, null)), { id: view, detail: null })
  }
  assert.equal(buildHash('music', 'drift-6'), '#/music/drift-6')
  assert.equal(buildHash('software', 'lantern'), '#/software/lantern')
})

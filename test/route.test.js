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

test('slugify returns empty string for punctuation-only input', () => {
  assert.equal(slugify('!!!'), '')
})

test('slugify returns empty string for empty input', () => {
  assert.equal(slugify(''), '')
})

test('buildHash treats empty detail as falsy, degrading to bare route', () => {
  assert.equal(buildHash('works', ''), '#/works')
})

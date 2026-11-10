import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { openTestDb } from './d1.js'
import { getSetting } from '../src/db.js'
import worker from '../src/index.js'

// The Access gate has its own tests; these open it to reach the routes behind it.
const env = () => ({ ENVIRONMENT: 'dev', DEV_SKIP_ACCESS: '1', DB: openTestDb() })
const post = (path, { site, type, body } = {}) => new Request('https://stats.heartsaglow.io' + path, {
  method: 'POST',
  headers: { ...(site && { 'Sec-Fetch-Site': site }), ...(type && { 'Content-Type': type }) },
  body,
})
const entry = JSON.stringify({ source: 'tiktok', date: '2026-11-09', values: { followers: 5 } })

test('a POST from another site is refused before it reaches a route', async () => {
  for (const site of ['cross-site', 'same-site', 'none']) {
    const e = env()
    assert.equal((await worker.fetch(post('/api/seen', { site }), e)).status, 403)
    assert.equal(await getSetting(e.DB, 'last_seen'), null)
  }
  for (const site of ['same-origin', undefined]) {
    assert.equal((await worker.fetch(post('/api/seen', { site }), env())).status, 204)
  }
})

test('a POST with a body must say it is JSON', async () => {
  for (const type of [undefined, 'text/plain', 'application/x-www-form-urlencoded']) {
    assert.equal((await worker.fetch(post('/api/manual', { type, body: entry }), env())).status, 415)
  }
  assert.equal((await worker.fetch(post('/api/manual', { type: 'application/json; charset=utf-8', body: entry }), env())).status, 204)
})

test('POST /api/sync runs the sync and returns each source\'s result', async (t) => {
  const games = readFileSync(new URL('./fixtures/itch-my-games.json', import.meta.url), 'utf8')
  t.mock.method(globalThis, 'fetch', async () => new Response(games))
  const e = { ...env(), ITCH_API_KEY: 'k' }
  const res = await worker.fetch(post('/api/sync', { site: 'same-origin' }), e)
  assert.equal(res.status, 200)
  // Bluesky needs no secret, so it runs too
  assert.deepEqual((await res.json()).map((r) => r.source).sort(), ['bluesky', 'itch'])
  assert.equal((await e.DB.prepare("SELECT COUNT(*) AS n FROM readings WHERE source = 'itch'").first()).n > 0, true)
  assert.equal((await worker.fetch(post('/api/sync', { site: 'cross-site' }), env())).status, 403)
  assert.equal((await worker.fetch(new Request('https://stats.heartsaglow.io/api/sync'), env())).status, 404)
})

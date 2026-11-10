import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { openTestDb } from './d1.js'
import { upsertReadings, series } from '../src/db.js'
import { steam } from '../src/connectors/steam.js'
import { itch, parseItchGames } from '../src/connectors/itch.js'

const fixture = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'))
const steamDay = fixture('steam-wishlist.json')
const respond = (body, status = 200) => new Response(JSON.stringify(body), { status })

test('steam pulls the last 3 GMT days, one call per day, and emits four metrics per day', async () => {
  const urls = []
  const fetch = async (u) => { urls.push(new URL(u)); return respond(steamDay) }
  const { readings } = await steam.pull({ STEAM_PUBLISHER_KEY: 'k' }, { fetch, today: '2026-11-10' })
  assert.equal(urls.length, 3)
  assert.deepEqual(urls.map((u) => u.searchParams.get('date')).sort(), ['2026-11-08', '2026-11-09', '2026-11-10'])
  for (const u of urls) {
    assert.equal(u.searchParams.get('appid'), '4433980')
    assert.equal(u.searchParams.get('key'), 'k')
  }
  assert.equal(readings.length, 12)
  const d = readings.filter((r) => r.date === '2026-11-09')
  assert.deepEqual(d.map((r) => [r.metric, r.value]).sort(), [
    ['wishlist_adds', 30], ['wishlist_deletes', 15], ['wishlist_gifts', 2], ['wishlist_purchases', 10],
  ])
  assert.ok(readings.every((r) => r.source === 'steam' && r.dim === ''))
})

test('steam with no STEAM_PUBLISHER_KEY throws a configuration error naming the key', async () => {
  await assert.rejects(steam.pull({}, { fetch: async () => respond(steamDay), today: '2026-11-10' }), /STEAM_PUBLISHER_KEY/)
})

test('steam non-2xx throws HTTP status', async () => {
  await assert.rejects(steam.pull({ STEAM_PUBLISHER_KEY: 'k' }, { fetch: async () => respond({}, 403), today: '2026-11-10' }), /^Error: Steam: HTTP 403$/)
})

test('steam re-pulled days overwrite, not add', async () => {
  const db = openTestDb()
  const pull = async (adds) => {
    const fetch = async () => respond({ ...steamDay, wishlist_summary: { ...steamDay.wishlist_summary, wishlist_adds: adds } })
    await upsertReadings(db, (await steam.pull({ STEAM_PUBLISHER_KEY: 'k' }, { fetch, today: '2026-11-10' })).readings)
  }
  await pull(30)
  await pull(35)
  const s = await series(db, { source: 'steam', metric: 'wishlist_adds', from: '2026-11-08', to: '2026-11-10' })
  assert.deepEqual(s.map((r) => r.value), [35, 35, 35])
})

test('itch emits lifetime snapshots per game, earnings per currency in cents', async () => {
  const fetch = async (u) => { assert.ok(String(u).includes('ITCHKEY')); return respond(fixture('itch-my-games.json')) }
  const { readings } = await itch.pull({ ITCH_API_KEY: 'ITCHKEY' }, { fetch, today: '2026-11-10' })
  const get = (metric, dim = '1234567') => readings.find((r) => r.metric === metric && r.dim === dim)?.value
  assert.equal(get('views'), 2682)
  assert.equal(get('downloads'), 109)
  assert.equal(get('purchases'), 4)
  assert.equal(get('earnings_cents_USD'), 5047)
  assert.equal(get('earnings_cents_EUR'), 300)
  assert.equal(get('views', '7654321'), 10)
  assert.equal(get('earnings_cents_USD', '7654321'), undefined)
  assert.ok(readings.every((r) => r.source === 'itch' && r.date === '2026-11-10'))
})

test('itch with an empty games list returns no readings', () => {
  assert.deepEqual(parseItchGames({ games: [] }, '2026-11-10'), [])
})

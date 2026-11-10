import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { openTestDb } from './d1.js'
import { upsertReadings, series } from '../src/db.js'
import { steam, parseWishlistDay } from '../src/connectors/steam.js'
import { itch, parseItchGames } from '../src/connectors/itch.js'

const fixture = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'))
const steamDay = fixture('steam-wishlist.json')
const respond = (body, status = 200) => new Response(JSON.stringify(body), { status })

const dateOf = (u) => new URL(u).searchParams.get('date')
const next = (d) => new Date(Date.parse(d) + 864e5).toISOString().slice(0, 10)

test('steam with nothing stored backfills from the first day Steam has data (2026-11-10), one call per day, four metrics per day', async () => {
  const urls = []
  const fetch = async (u) => { urls.push(new URL(u)); return respond(steamDay) }
  const { readings, error } = await steam.pull({ STEAM_PUBLISHER_KEY: 'k' }, { fetch, today: '2026-11-14', db: openTestDb() })
  assert.equal(error, undefined)
  assert.deepEqual(urls.map((u) => u.searchParams.get('date')).sort(), ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'])
  for (const u of urls) {
    assert.equal(u.searchParams.get('appid'), '4433980')
    assert.equal(u.searchParams.get('key'), 'k')
  }
  assert.equal(readings.length, 20)
  const d = readings.filter((r) => r.date === '2026-11-13')
  assert.deepEqual(d.map((r) => [r.metric, r.value]).sort(), [
    ['wishlist_adds', 30], ['wishlist_deletes', 15], ['wishlist_gifts', 2], ['wishlist_purchases', 10],
  ])
  assert.ok(readings.every((r) => r.source === 'steam' && r.dim === ''))
})

test('steam with rows stored up to D re-pulls D−2 through today', async () => {
  const db = openTestDb()
  const stored = []
  for (let d = '2026-11-06'; d <= '2026-11-20'; d = next(d)) stored.push({ source: 'steam', metric: 'wishlist_adds', dim: '', date: d, value: 1 })
  await upsertReadings(db, stored)
  const dates = []
  await steam.pull({ STEAM_PUBLISHER_KEY: 'k' }, { fetch: async (u) => { dates.push(dateOf(u)); return respond(steamDay) }, today: '2026-11-24', db })
  assert.deepEqual(dates.sort(), ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24'])
})

test('steam backfill runs at most 7 days at once', async () => {
  let inFlight = 0, peak = 0
  const fetch = async () => {
    peak = Math.max(peak, ++inFlight)
    await new Promise((r) => setTimeout(r, 1))
    inFlight--
    return respond(steamDay)
  }
  const { readings } = await steam.pull({ STEAM_PUBLISHER_KEY: 'k' }, { fetch, today: '2026-11-30', db: openTestDb() })
  assert.equal(readings.length, 14 * 4) // capped at 14 days a run
  assert.equal(peak, 7)
})

test('steam re-fetches a day that failed mid-range on the next pull', async () => {
  const db = openTestDb()
  const env = { STEAM_PUBLISHER_KEY: 'k' }
  const first = await steam.pull(env, { fetch: async (u) => (dateOf(u) === '2026-11-12' ? respond({}, 500) : respond(steamDay)), today: '2026-11-22', db })
  await upsertReadings(db, first.readings)
  const dates = []
  await steam.pull(env, { fetch: async (u) => { dates.push(dateOf(u)); return respond(steamDay) }, today: '2026-11-23', db })
  assert.ok(dates.includes('2026-11-12'), dates.join())
})

test('steam: a 40-day gap fetches 14 days a run (the recent 3 included) and continues from the next missing day', async () => {
  const db = openTestDb()
  const env = { STEAM_PUBLISHER_KEY: 'k' }
  const stored = []
  for (let d = '2026-11-10'; d <= '2026-11-14'; d = next(d)) stored.push({ source: 'steam', metric: 'wishlist_adds', dim: '', date: d, value: 1 })
  await upsertReadings(db, stored)
  const run = async () => {
    const dates = []
    const { readings } = await steam.pull(env, { fetch: async (u) => { dates.push(dateOf(u)); return respond(steamDay) }, today: '2026-12-24', db })
    await upsertReadings(db, readings)
    return dates.sort()
  }
  const one = await run()
  assert.equal(one.length, 14)
  assert.deepEqual([one[0], one.at(-4), one.at(-3), one.at(-1)], ['2026-11-12', '2026-11-22', '2026-12-22', '2026-12-24'])
  const two = await run()
  assert.equal(two.length, 14)
  assert.deepEqual([two[0], two.at(-4)], ['2026-11-23', '2026-12-03'])
})

test('steam: one day failing keeps the other days and reports the error', async () => {
  const fetch = async (u) => (dateOf(u) === '2026-11-12' ? respond({}, 500) : respond(steamDay))
  const { readings, error } = await steam.pull({ STEAM_PUBLISHER_KEY: 'k' }, { fetch, today: '2026-11-14', db: openTestDb() })
  assert.equal(error, 'Steam: HTTP 500')
  assert.deepEqual([...new Set(readings.map((r) => r.date))].sort(), ['2026-11-10', '2026-11-11', '2026-11-13', '2026-11-14'])
})

test('steam: a reply with no wishlist_summary is an error, not zero readings', async () => {
  const { readings, error } = await steam.pull({ STEAM_PUBLISHER_KEY: 'k' }, { fetch: async () => respond({ response: {} }), today: '2026-11-10', db: openTestDb() })
  assert.deepEqual(readings, [])
  assert.equal(error, 'Steam: reply had no wishlist_summary')
})

test('steam: a day before app_min_date is no data, not an error (the real reply shape)', () => {
  assert.deepEqual(parseWishlistDay({ response: { app_min_date: '2026-11-10' } }, '2026-11-08'), [])
  assert.throws(() => parseWishlistDay({ response: { app_min_date: '2026-11-10' } }, '2026-11-12'), /no wishlist_summary/)
})

test('steam with no STEAM_PUBLISHER_KEY throws a configuration error naming the key', async () => {
  await assert.rejects(steam.pull({}, { fetch: async () => respond(steamDay), today: '2026-11-10' }), /STEAM_PUBLISHER_KEY/)
})

test('steam non-2xx reports the HTTP status', async () => {
  const { error } = await steam.pull({ STEAM_PUBLISHER_KEY: 'k' }, { fetch: async () => respond({}, 403), today: '2026-11-10', db: openTestDb() })
  assert.match(error, /^Steam: HTTP 403/)
})

test('steam re-pulled days overwrite, not add', async () => {
  const db = openTestDb()
  const pull = async (adds) => {
    const fetch = async () => respond({ ...steamDay, wishlist_summary: { ...steamDay.wishlist_summary, wishlist_adds: adds } })
    await upsertReadings(db, (await steam.pull({ STEAM_PUBLISHER_KEY: 'k' }, { fetch, today: '2026-11-14', db })).readings)
  }
  await pull(30)
  await pull(35)
  const s = await series(db, { source: 'steam', metric: 'wishlist_adds', from: '2026-11-12', to: '2026-11-14' })
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

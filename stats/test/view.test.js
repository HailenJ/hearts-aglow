import test from 'node:test'
import assert from 'node:assert/strict'
import { openTestDb } from './d1.js'
import { upsertReadings, recordSync, setSetting, getSetting } from '../src/db.js'
import { buildView, dashboardRoute, seenRoute } from '../src/view.js'

const now = new Date('2026-11-10T12:00:00Z') // a Tuesday; last full week is Nov 2–8
const r = (source, metric, date, value, dim = '') => ({ source, metric, dim, date, value })
const ok = (source, at = now.toISOString()) => ({ source, ok: true, at })

// JSON.stringify silently turns NaN/Infinity into null, so walk the object instead
function assertFinite(v, path = 'view') {
  if (typeof v === 'number') assert.ok(Number.isFinite(v), `${path} is ${v}`)
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) assertFinite(x, `${path}.${k}`)
}

test('an empty database builds a view with nulls and empty series, and JSON.stringify contains no NaN or Infinity', async () => {
  const v = await buildView(openTestDb(), { now, env: {} })
  assertFinite(v)
  assert.doesNotMatch(JSON.stringify(v), /NaN|Infinity/)
  assert.equal(v.lastSeen, null)
  assert.deepEqual(v.game.total, { value: null, delta: null, stale: false })
  assert.equal(v.game.deleteRate.value, null)
  assert.deepEqual(v.game.pace, { reachDate: null, onTrack: null, launchDate: null })
  assert.deepEqual([v.overview.weekly, v.game.daily, v.game.utm, v.news.weekly, v.site.visits], [[], [], [], [], []])
  assert.deepEqual(v.site.funnel.map((s) => s.value), [null, null, null, null])
  assert.deepEqual(v.overview.since, { wishlists: null, subscribers: null, stale: false })
  assert.equal(v.overview.anomaly.wishlists, false)
  assert.equal(v.music.listeners.value, null)
  assert.deepEqual(v.earnings.total, {})
  assert.ok(v.health.some((h) => h.source === 'steam' && h.state === 'off'))
})

test('since-last-visit sums only readings after lastSeen, separate from week-over-week', async () => {
  const db = openTestDb()
  await setSetting(db, 'last_seen', '2026-11-07T12:00:00.000Z')
  await upsertReadings(db, [
    r('steam', 'wishlist_adds', '2026-11-05', 5),
    r('steam', 'wishlist_adds', '2026-11-08', 3),
    r('steam', 'wishlist_adds', '2026-11-09', 4),
    r('steam', 'wishlist_deletes', '2026-11-09', 1),
    r('beehiiv', 'subscribers', '2026-11-06', 100),
    r('beehiiv', 'subscribers', '2026-11-09', 112),
  ])
  const v = await buildView(db, { now, env: {} })
  assert.equal(v.lastSeen, '2026-11-07T12:00:00.000Z')
  assert.deepEqual(v.overview.since, { wishlists: 6, subscribers: 12, stale: false })
  assert.equal(v.overview.tiles.wishlists.value, 8) // last full week, Nov 2–8
  assert.equal(v.game.total.value, 11)
})

test('a stale or broken source marks its tiles stale', async () => {
  const db = openTestDb()
  await recordSync(db, ok('steam', '2026-11-07T12:00:00.000Z')) // 72h old on a 24h cadence
  await recordSync(db, ok('beehiiv', '2026-11-10T06:00:00.000Z'))
  await recordSync(db, ok('goatcounter', '2026-11-09T06:00:00.000Z'))
  await recordSync(db, { source: 'goatcounter', ok: false, error: 'GoatCounter: HTTP 401', at: '2026-11-10T06:00:00.000Z' })
  const v = await buildView(db, { now, env: {} })
  assert.equal(v.overview.tiles.wishlists.stale, true)
  assert.equal(v.game.total.stale, true)
  assert.equal(v.game.deleteRate.stale, true)
  assert.equal(v.social.clicks.stale, true)
  assert.equal(v.news.subscribers.stale, false)
  assert.equal(v.overview.tiles.newsletter.stale, false)
})

test('the funnel joins GoatCounter look-inside and out/store.steampowered.com with the heartsaglow UTM row', async () => {
  const db = openTestDb()
  await upsertReadings(db, [
    r('goatcounter', 'visits', '2026-11-01', 600),
    r('goatcounter', 'visits', '2026-11-09', 400),
    r('goatcounter', 'event', '2026-11-09', 200, 'look-inside'),
    r('goatcounter', 'event', '2026-11-09', 100, 'out/store.steampowered.com'),
    r('goatcounter', 'event', '2026-11-09', 40, 'out/bandcamp.com'),
    r('goatcounter', 'event', '2026-11-09', 30, 'play/drift-6'),
    r('goatcounter', 'event', '2026-11-09', 5, 'play/coda'),
    r('goatcounter', 'referrer_visits', '2026-11-09', 9, 'bsky.app'),
    r('steam_traffic', 'visits', '2026-11-08', 120, 'heartsaglow'),
    r('steam_traffic', 'wishlists', '2026-11-08', 15, 'heartsaglow'),
    r('steam_traffic', 'visits', '2026-11-08', 50, 'youtube'),
    r('steam_traffic', 'wishlists', '2026-11-08', 5, 'youtube'),
  ])
  const v = await buildView(db, { now, env: {} })
  assert.deepEqual(v.site.funnel, [
    { step: 'visits', value: 1000, rate: null },
    { step: 'look_inside', value: 200, rate: 0.2 },
    { step: 'steam_clicks', value: 100, rate: 0.5 },
    { step: 'wishlists', value: 15, rate: 0.15 },
  ])
  assert.deepEqual(v.site.outbound, [{ to: 'store.steampowered.com', value: 100 }, { to: 'bandcamp.com', value: 40 }])
  assert.deepEqual(v.site.actions.find((a) => a.action === 'play'), { action: 'play', value: 35 })
  assert.equal(v.game.conversion.value, 20 / 170)
  assert.deepEqual(v.social.platforms.find((p) => p.platform === 'bluesky').clicks, 9)
  assert.equal(v.social.platforms.find((p) => p.platform === 'youtube').clicks, 0)
})

test('the anomaly flag is set when the last full week is > 2× the 4-week median', async () => {
  const weeks = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02']
  const build = async (last) => {
    const db = openTestDb()
    await upsertReadings(db, weeks.map((w, i) => r('steam', 'wishlist_adds', w, i === 4 ? last : 10)))
    // the current partial week must not count as the last full week
    await upsertReadings(db, [r('steam', 'wishlist_adds', '2026-11-10', 500)])
    return buildView(db, { now, env: {} })
  }
  assert.equal((await build(21)).overview.anomaly.wishlists, true)
  assert.equal((await build(20)).overview.anomaly.wishlists, false)
})

test('itch earnings this month are the latest snapshot minus the last one before the month; a game with no earlier snapshot is absent', async () => {
  const db = openTestDb()
  await upsertReadings(db, [
    r('itch', 'earnings_cents_USD', '2026-10-28', 1000, 'g1'),
    r('itch', 'earnings_cents_USD', '2026-11-09', 1500, 'g1'),
    r('itch', 'earnings_cents_USD', '2026-11-09', 700, 'g2'),
  ])
  const v = await buildView(db, { now, env: {} })
  assert.deepEqual(v.earnings.total, { USD: 500 })
  assert.deepEqual(v.earnings.bySource, { itch: { USD: 500 } })
})

test('POST /api/seen stores last_seen; GET /api/dashboard returns the view and never writes', async () => {
  const env = { DB: openTestDb() }
  const res = await dashboardRoute(new Request('https://x/api/dashboard'), env, {}, undefined, now)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).asOf, now.toISOString())
  assert.equal(await getSetting(env.DB, 'last_seen'), null)
  const seen = await seenRoute(new Request('https://x/api/seen', { method: 'POST' }), env, {}, undefined, now)
  assert.equal(seen.status, 204)
  assert.equal(await getSetting(env.DB, 'last_seen'), now.toISOString())
})

test('Apple listeners feed the listeners tiles with Δ since the previous typed reading, kept out of streams', async () => {
  const db = openTestDb()
  await upsertReadings(db, [
    r('apple', 'listeners_28d', '2026-11-01', 300),
    r('apple', 'listeners_28d', '2026-11-08', 320),
    r('apple', 'plays_28d', '2026-11-08', 900),
  ])
  const v = await buildView(db, { now, env: {} })
  assert.deepEqual(v.music.listeners, { value: 320, delta: 20, stale: false })
  assert.deepEqual(v.overview.tiles.listeners, v.music.listeners)
  assert.deepEqual(v.music.applePlays, { value: 900, delta: null, stale: false })
  assert.deepEqual(v.music.streams, [])
})

test('typed TikTok followers show Δ since the previous reading, not a 30-day baseline', async () => {
  const db = openTestDb()
  await upsertReadings(db, [
    r('tiktok', 'followers', '2026-09-01', 50),
    r('tiktok', 'followers', '2026-10-30', 100),
    r('tiktok', 'followers', '2026-11-09', 112),
  ])
  const v = await buildView(db, { now, env: {} })
  assert.equal(v.social.platforms.find((p) => p.platform === 'tiktok').delta, 12)
})

test('Instagram is typed in: Δ since the previous reading, and engagement ÷ followers', async () => {
  const db = openTestDb()
  await upsertReadings(db, [
    r('instagram', 'followers', '2026-10-30', 400),
    r('instagram', 'followers', '2026-11-09', 420),
    r('instagram', 'engagement_28d', '2026-11-09', 21),
  ])
  const v = await buildView(db, { now, env: {} })
  const ig = v.social.platforms.find((p) => p.platform === 'instagram')
  assert.equal(ig.followers, 420)
  assert.equal(ig.delta, 20)
  assert.equal(ig.engagement, 0.05)
})

test('a stale source marks its strip entry stale', async () => {
  const db = openTestDb()
  await recordSync(db, ok('steam', '2026-11-07T12:00:00.000Z'))
  await recordSync(db, ok('goatcounter'))
  const { strip } = (await buildView(db, { now, env: {} })).overview
  assert.equal(strip.wishlists.stale, true)
  assert.equal(strip.siteVisits30d.stale, false)
})

test('the followers tile sums deltas only for platforms with a follower count', async () => {
  const db = openTestDb()
  await upsertReadings(db, [
    r('youtube', 'subs_gained', '2026-11-05', 5),
    r('bluesky', 'followers', '2026-10-01', 90),
    r('bluesky', 'followers', '2026-11-09', 100),
  ])
  const v = await buildView(db, { now, env: {} })
  assert.deepEqual(v.social.followers, { value: 100, delta: 10, stale: false })
})

test('since-last-visit counts a reading dated the same UTC day as lastSeen, which is written after it', async () => {
  const db = openTestDb()
  // the cron writes day D's flow on D+1 and the morning's snapshot before a daytime visit
  await setSetting(db, 'last_seen', '2026-11-08T18:00:00.000Z')
  await upsertReadings(db, [
    r('steam', 'wishlist_adds', '2026-11-07', 9),
    r('steam', 'wishlist_adds', '2026-11-08', 4),
    r('beehiiv', 'subscribers', '2026-11-08', 50),
    r('beehiiv', 'subscribers', '2026-11-09', 55),
  ])
  const v = await buildView(db, { now, env: {} })
  assert.deepEqual(v.overview.since, { wishlists: 4, subscribers: 5, stale: false })
})

test('since-last-visit is null, not 0, when nothing arrived after the visit', async () => {
  const db = openTestDb()
  await setSetting(db, 'last_seen', '2026-11-09T18:00:00.000Z')
  await upsertReadings(db, [r('steam', 'wishlist_adds', '2026-11-05', 5)])
  assert.equal((await buildView(db, { now, env: {} })).overview.since.wishlists, null)
})

test('since-last-visit is null and marked stale when its source is stale or broken', async () => {
  const db = openTestDb()
  await setSetting(db, 'last_seen', '2026-11-07T12:00:00.000Z')
  await upsertReadings(db, [
    r('steam', 'wishlist_adds', '2026-11-09', 4),
    r('beehiiv', 'subscribers', '2026-11-06', 100),
    r('beehiiv', 'subscribers', '2026-11-09', 112),
  ])
  await recordSync(db, ok('steam', '2026-11-07T12:00:00.000Z'))
  await recordSync(db, ok('beehiiv'))
  assert.deepEqual((await buildView(db, { now, env: {} })).overview.since, { wishlists: null, subscribers: 12, stale: true })
})

test('a typed number older than 7 days goes stale', async () => {
  const db = openTestDb()
  await upsertReadings(db, [
    r('apple', 'listeners_28d', '2026-11-01', 300),
    r('tiktok', 'followers', '2026-11-02', 80),
    r('x', 'followers', '2026-11-09', 40),
  ])
  const v = await buildView(db, { now, env: {} })
  assert.equal(v.music.listeners.stale, true)
  assert.equal(v.overview.tiles.listeners.stale, true)
  assert.equal(v.overview.strip.tiktokFollowers.stale, true)
  assert.equal(v.social.followers.stale, true)
  const tiktok = v.health.find((h) => h.source === 'tiktok')
  assert.deepEqual([tiktok.state, tiktok.message], ['waiting', 'typed in until TikTok approves · update'])
})

test('the weekly series ends at the last full week; the partial week is left out', async () => {
  const db = openTestDb()
  await upsertReadings(db, [
    r('steam', 'wishlist_adds', '2026-11-03', 10),
    r('steam', 'wishlist_adds', '2026-11-10', 1),
    r('beehiiv', 'subscribers', '2026-11-03', 100),
    r('beehiiv', 'subscribers', '2026-11-04', 105),
    r('beehiiv', 'subscribers', '2026-11-10', 106),
  ])
  const v = await buildView(db, { now, env: {} })
  assert.deepEqual(v.overview.weekly, [{ week: '2026-11-02', value: 10 }])
  assert.deepEqual(v.news.weekly, [{ week: '2026-11-02', value: 5 }])
})

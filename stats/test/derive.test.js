import test from 'node:test'
import assert from 'node:assert/strict'
import {
  weekly, netWishlists, deleteRate4w, isAnomaly, pace,
  saveRate, streamsPerListener, engagementRate, funnel, sinceLast, earningsThisMonth,
} from '../src/derive.js'

test('pace: 1,240 wishlists at +118/week reaches 5,000 in 32 weeks', () => {
  assert.equal(pace({ total: 1240, weeklyNet: 118, today: '2026-11-10' }).reachDate, '2027-06-22')
})

test('pace is null for zero or negative weekly net', () => {
  for (const weeklyNet of [0, -5, null]) {
    assert.deepEqual(pace({ total: 1240, weeklyNet, today: '2026-11-10', launchDate: '2027-12-01' }), { reachDate: null, onTrack: null })
  }
})

test('pace onTrack compares reachDate with launchDate', () => {
  const base = { total: 1240, weeklyNet: 118, today: '2026-11-10' }
  assert.equal(pace({ ...base, launchDate: '2027-06-22' }).onTrack, true)
  assert.equal(pace({ ...base, launchDate: '2027-06-21' }).onTrack, false)
  assert.equal(pace(base).onTrack, null)
})

test('pace: already at target reaches today', () => {
  assert.equal(pace({ total: 5200, weeklyNet: 10, today: '2026-11-10' }).reachDate, '2026-11-10')
})

test('isAnomaly: [40,44,39,52,118] true; [40,44,39,52,80] false; 4 weeks → false', () => {
  assert.equal(isAnomaly([40, 44, 39, 52, 118]), true)
  assert.equal(isAnomaly([40, 44, 39, 52, 80]), false)
  assert.equal(isAnomaly([40, 44, 39, 118]), false)
})

test('deleteRate4w: 30 deletes over 400 adds = 0.075; no adds → null', () => {
  const adds = [{ date: '2026-11-10', value: 400 }]
  assert.equal(deleteRate4w(adds, [{ date: '2026-11-09', value: 30 }], '2026-11-10'), 0.075)
  assert.equal(deleteRate4w([], [{ date: '2026-11-09', value: 30 }], '2026-11-10'), null)
})

test('deleteRate4w window is the 28 days ending today inclusive', () => {
  const adds = [{ date: '2026-10-14', value: 100 }, { date: '2026-10-13', value: 900 }]
  const dels = [{ date: '2026-10-14', value: 10 }, { date: '2026-10-13', value: 90 }]
  assert.equal(deleteRate4w(adds, dels, '2026-11-10'), 0.1)
})

test('saveRate never divides by zero', () => {
  assert.equal(saveRate(5, 0), null)
  assert.equal(saveRate(5, null), null)
  assert.equal(saveRate(4, 100), 0.04)
  assert.equal(streamsPerListener(300, 100), 3)
  assert.equal(streamsPerListener(300, 0), null)
  assert.equal(engagementRate(10, 200), 0.05)
  assert.equal(engagementRate(10, 0), null)
})

test('weekly leaves a week with no rows out rather than reporting 0', () => {
  const out = weekly([
    { date: '2026-11-02', value: 5 }, { date: '2026-11-08', value: 7 }, // Mon..Sun, one week
    { date: '2026-11-10', value: 3 },
    { date: '2026-10-20', value: 9 }, // week of 10-19; 10-26 has no rows
  ], '2026-11-10')
  assert.deepEqual(out, [
    { week: '2026-10-19', value: 9 },
    { week: '2026-11-02', value: 12 },
    { week: '2026-11-09', value: 3 },
  ])
})

test('weekly keeps at most 12 weeks ending with endDate week', () => {
  const daily = []
  for (let i = 0; i < 15; i++) {
    const d = new Date(Date.UTC(2026, 6, 6 + i * 7)) // Mondays from 2026-07-06
    daily.push({ date: d.toISOString().slice(0, 10), value: 1 })
  }
  const out = weekly(daily, '2026-10-14') // week of 2026-10-12
  assert.equal(out.length, 12)
  assert.equal(out.at(-1).week, '2026-10-12')
  assert.equal(out[0].week, '2026-07-27')
})

test('netWishlists subtracts per date, missing side counts 0 only if the other has the date', () => {
  assert.deepEqual(
    netWishlists(
      [{ date: '2026-11-02', value: 10 }, { date: '2026-11-03', value: 8 }],
      [{ date: '2026-11-03', value: 3 }, { date: '2026-11-01', value: 2 }],
    ),
    [{ date: '2026-11-01', value: -2 }, { date: '2026-11-02', value: 10 }, { date: '2026-11-03', value: 5 }],
  )
})

test('funnel rates chain off the previous step, null on zero or missing', () => {
  assert.deepEqual(funnel({ visits: 1000, lookInside: 200, steamClicks: 0, utmWishlists: 5 }), [
    { step: 'visits', value: 1000, rate: null },
    { step: 'look_inside', value: 200, rate: 0.2 },
    { step: 'steam_clicks', value: 0, rate: 0 },
    { step: 'wishlists', value: 5, rate: null },
  ])
})

test('sinceLast: flow sums newer points, snapshot diffs against last seen, null lastSeen → null', () => {
  const series = [
    { source: 'ga', metric: 'visits', kind: 'flow', points: [{ date: '2026-11-01', value: 5 }, { date: '2026-11-02', value: 6 }, { date: '2026-11-03', value: 7 }] },
    { source: 'steam', metric: 'wishlists', kind: 'snapshot', points: [{ date: '2026-11-01', value: 100 }, { date: '2026-11-03', value: 130 }] },
    { source: 'x', metric: 'followers', kind: 'snapshot', points: [{ date: '2026-11-03', value: 9 }] },
  ]
  assert.deepEqual(sinceLast(series, '2026-11-02'), [
    { source: 'ga', metric: 'visits', delta: 7 },
    { source: 'steam', metric: 'wishlists', delta: 30 },
    { source: 'x', metric: 'followers', delta: null },
  ])
  assert.ok(sinceLast(series, null).every((r) => r.delta === null))
})

test('sinceLast: a flow with no points after lastSeen is null, not 0', () => {
  const [r] = sinceLast([{ source: 'steam', metric: 'net', kind: 'flow', points: [{ date: '2026-11-01', value: 5 }] }], '2026-11-02')
  assert.equal(r.delta, null)
})

test('earnings keep currencies apart', () => {
  assert.deepEqual(earningsThisMonth([
    { source: 'bandcamp', currency: 'USD', cents: 500 },
    { source: 'bandcamp', currency: 'EUR', cents: 300 },
    { source: 'steam', currency: 'USD', cents: 250 },
  ]), {
    total: { USD: 750, EUR: 300 },
    bySource: { bandcamp: { USD: 500, EUR: 300 }, steam: { USD: 250 } },
  })
})

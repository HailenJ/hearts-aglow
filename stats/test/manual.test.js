import test from 'node:test'
import assert from 'node:assert/strict'
import { openTestDb } from './d1.js'
import { getSetting, setSetting, series, events } from '../src/db.js'
import { manualRoute, logRoute, settingsRoute } from '../src/manual.js'

const now = new Date('2026-11-10T09:00:00Z')
const post = (body) => new Request('https://x/api', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body),
})
const call = (route, db, body) => route(post(body), { DB: db }, null, undefined, now)
const count = async (db, t) => (await db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n

test('rejects negative, non-numeric, future-dated, unknown source and unknown metric with a message', async () => {
  const db = openTestDb()
  const base = { source: 'tiktok', date: '2026-11-09', values: { followers: 10 } }
  const cases = [
    [{ ...base, values: { followers: -1 } }, 'followers must be a number of 0 or more'],
    [{ ...base, values: { followers: '12' } }, 'followers must be a number of 0 or more'],
    [{ ...base, date: '2026-11-11' }, "date can't be in the future"],
    [{ ...base, source: 'myspace' }, 'unknown source'],
    [{ ...base, source: 'constructor' }, 'unknown source'],
    [{ ...base, source: '__proto__' }, 'unknown source'],
    [{ ...base, values: { followers: 5, likes: 3 } }, 'unknown metric likes for tiktok'],
  ]
  for (const [body, error] of cases) {
    const res = await call(manualRoute, db, body)
    assert.equal(res.status, 400)
    assert.deepEqual(await res.json(), { error })
  }
  assert.equal((await call(manualRoute, db, '{nope')).status, 400)
  assert.equal(await count(db, 'readings'), 0)
})

test('accepts a dated tiktok follower reading and stores it as a snapshot', async () => {
  const db = openTestDb()
  const res = await call(manualRoute, db, {
    source: 'tiktok', date: '2026-11-09', values: { followers: 120, engagement_28d: 0 },
  })
  assert.equal(res.status, 204)
  assert.equal(res.body, null)
  const rows = await series(db, { source: 'tiktok', metric: 'followers', from: '2026-11-01', to: '2026-11-10' })
  assert.deepEqual(rows, [{ date: '2026-11-09', value: 120 }])
  assert.equal(await count(db, 'readings'), 2)
})

test('accepts typed Instagram followers and 28-day engagement', async () => {
  const db = openTestDb()
  const res = await call(manualRoute, db, { source: 'instagram', date: '2026-11-09', values: { followers: 420, engagement_28d: 21 } })
  assert.equal(res.status, 204)
  assert.equal(await count(db, 'readings'), 2)
})

test('an event needs a known kind, a date and 1–140 chars of text', async () => {
  const db = openTestDb()
  const ok = { date: '2026-11-10', kind: 'trailer', text: '  Trailer 2 out  ' }
  for (const [body, error] of [
    [{ ...ok, kind: 'party' }, 'unknown kind'],
    [{ ...ok, date: '2026-13-01' }, 'date must be YYYY-MM-DD'],
    [{ ...ok, date: '2026-11-11' }, "date can't be in the future"],
    [{ ...ok, text: '   ' }, 'text must be 1 to 140 characters'],
    [{ ...ok, text: 'x'.repeat(141) }, 'text must be 1 to 140 characters'],
  ]) {
    const res = await call(logRoute, db, body)
    assert.equal(res.status, 400)
    assert.deepEqual(await res.json(), { error })
  }
  assert.equal((await call(logRoute, db, '[')).status, 400)
  assert.equal(await count(db, 'events'), 0)
  assert.equal((await call(logRoute, db, ok)).status, 204)
  assert.deepEqual(await events(db, { from: '2026-11-01', to: '2026-11-30' }), [
    { id: 1, date: '2026-11-10', kind: 'trailer', text: 'Trailer 2 out' },
  ])
})

test('launch_date must be a valid future date or empty to clear it', async () => {
  const db = openTestDb()
  for (const [body, error] of [
    [{ key: 'theme', value: 'x' }, 'unknown setting'],
    [{ key: 'launch_date', value: '2026-11-10' }, 'launch_date must be after today'],
    [{ key: 'launch_date', value: '2026-02-30' }, 'launch_date must be YYYY-MM-DD'],
    [{ key: 'launch_date', value: 5 }, 'launch_date must be YYYY-MM-DD'],
  ]) {
    const res = await call(settingsRoute, db, body)
    assert.equal(res.status, 400)
    assert.deepEqual(await res.json(), { error })
  }
  assert.equal((await call(settingsRoute, db, { key: 'launch_date', value: '2027-03-01' })).status, 204)
  assert.equal(await getSetting(db, 'launch_date'), '2027-03-01')
  assert.equal((await call(settingsRoute, db, { key: 'launch_date', value: '' })).status, 204)
  assert.equal(await getSetting(db, 'launch_date'), null)
  await setSetting(db, 'launch_date', '2027-03-01')
  assert.equal((await call(settingsRoute, db, { key: 'launch_date', value: null })).status, 204)
  assert.equal(await getSetting(db, 'launch_date'), null)
})

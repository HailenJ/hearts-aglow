import test from 'node:test'
import assert from 'node:assert/strict'
import { openTestDb } from './d1.js'
import { runSync } from '../src/sync.js'
import { series, syncStatus } from '../src/db.js'

const now = new Date('2026-11-10T09:00:00Z')

test('one connector throwing does not stop the others, and its error is recorded', async () => {
  const db = openTestDb()
  const connectors = [
    { source: 'youtube', cadenceHours: 24, pull: async () => { throw new Error('YouTube: login expired, reconnect') } },
    { source: 'bluesky', cadenceHours: 24, pull: async (_e, { today }) => ({ readings: [{ source: 'bluesky', metric: 'followers', date: today, value: 5 }] }) },
  ]
  const res = await runSync({ DB: db }, { now, connectors })
  assert.deepEqual(res, [
    { source: 'youtube', ok: false, error: 'YouTube: login expired, reconnect' },
    { source: 'bluesky', ok: true },
  ])
  assert.deepEqual(await series(db, { source: 'bluesky', metric: 'followers', from: '2026-11-10', to: '2026-11-10' }), [{ date: '2026-11-10', value: 5 }])
  const st = await syncStatus(db)
  assert.equal(st.find((s) => s.source === 'youtube').error, 'YouTube: login expired, reconnect')
  assert.equal(st.find((s) => s.source === 'bluesky').last_ok, now.toISOString())
})

test('a connector returning no readings is ok and writes nothing', async () => {
  const db = openTestDb()
  const res = await runSync({ DB: db }, { now, connectors: [{ source: 'steam', cadenceHours: 24, pull: async () => ({ readings: [] }) }] })
  assert.deepEqual(res, [{ source: 'steam', ok: true }])
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM readings').first()).n, 0)
})

test('a connector missing its required secret is skipped and not recorded', async () => {
  const db = openTestDb()
  const c = { source: 'youtube', cadenceHours: 24, requires: ['YT_KEY'], pull: async () => assert.fail('should not run') }
  assert.deepEqual(await runSync({ DB: db }, { now, connectors: [c] }), [])
  assert.deepEqual(await syncStatus(db), [])
})

test('a connector returning readings with an error writes the readings and is recorded broken', async () => {
  const db = openTestDb()
  const pull = async (_e, deps) => {
    assert.equal(deps.db, db)
    return { readings: [{ source: 'steam', metric: 'wishlist_adds', date: '2026-11-09', value: 4 }], error: 'Steam: HTTP 500' }
  }
  const res = await runSync({ DB: db }, { now, connectors: [{ source: 'steam', cadenceHours: 24, pull }] })
  assert.deepEqual(res, [{ source: 'steam', ok: false, error: 'Steam: HTTP 500' }])
  assert.deepEqual(await series(db, { source: 'steam', metric: 'wishlist_adds', from: '2026-11-09', to: '2026-11-09' }), [{ date: '2026-11-09', value: 4 }])
  const st = (await syncStatus(db)).find((s) => s.source === 'steam')
  assert.equal(st.error, 'Steam: HTTP 500')
  assert.equal(st.last_ok, null)
})

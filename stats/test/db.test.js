import test from 'node:test'
import assert from 'node:assert/strict'
import { openTestDb } from './d1.js'
import {
  upsertReadings, series, latest, getSetting, setSetting, recordSync, syncStatus,
} from '../src/db.js'

test('upserting the same reading twice keeps one row with the newer value', async () => {
  const db = openTestDb()
  await upsertReadings(db, [{ source: 'steam', metric: 'wishlist_adds', dim: '', date: '2026-11-08', value: 10 }])
  await upsertReadings(db, [{ source: 'steam', metric: 'wishlist_adds', dim: '', date: '2026-11-08', value: 12 }])
  assert.deepEqual(await series(db, { source: 'steam', metric: 'wishlist_adds', from: '2026-11-01', to: '2026-11-30' }), [{ date: '2026-11-08', value: 12 }])
})

test('latest returns null on an empty database', async () => {
  assert.equal(await latest(openTestDb(), { source: 'bluesky', metric: 'followers' }), null)
})

test('settings round-trip and recordSync keeps last_ok when a later try fails', async () => {
  const db = openTestDb()
  assert.equal(await getSetting(db, 'k'), null)
  await setSetting(db, 'k', 'a')
  await setSetting(db, 'k', 'b')
  assert.equal(await getSetting(db, 'k'), 'b')

  await recordSync(db, { source: 'steam', ok: true, at: 'T1' })
  await recordSync(db, { source: 'steam', ok: false, error: 'boom', at: 'T2' })
  assert.deepEqual(await syncStatus(db), [{ source: 'steam', last_ok: 'T1', last_try: 'T2', error: 'boom' }])
})

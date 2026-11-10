import test from 'node:test'
import assert from 'node:assert/strict'
import { sourceHealth } from '../src/health.js'

const now = Date.parse('2026-11-10T12:00:00Z')
const c = [{ source: 'steam', cadenceHours: 24 }]
const get = (args, source = 'steam') => sourceHealth({ manualLatest: {}, connectors: c, now, configured: {}, ...args }).find((h) => h.source === source)
const iso = (hoursAgo) => new Date(now - hoursAgo * 3600e3).toISOString()

test('health: ok within 1.5× cadence, stale after, broken when last_try > last_ok with an error', () => {
  assert.equal(get({ status: [{ source: 'steam', last_ok: iso(35), last_try: iso(35), error: null }] }).state, 'ok')
  assert.equal(get({ status: [{ source: 'steam', last_ok: iso(37), last_try: iso(37), error: null }] }).state, 'stale')
  const b = get({ status: [{ source: 'steam', last_ok: iso(30), last_try: iso(1), error: 'Steam: key rejected' }] })
  assert.deepEqual([b.state, b.message, b.since], ['broken', 'Steam: key rejected', iso(30)])
  assert.equal(get({ status: [{ source: 'steam', last_ok: null, last_try: iso(1), error: 'x' }] }).state, 'broken')
})

test('health: tiktok is waiting until TIKTOK_CLIENT_KEY is configured; a manual source older than 7 days carries a nudge message', () => {
  const waiting = get({ status: [], manualLatest: { tiktok: '2026-11-08' } }, 'tiktok')
  assert.deepEqual([waiting.state, waiting.message], ['waiting', 'typed in until TikTok approves'])
  assert.equal(get({ status: [], manualLatest: { tiktok: '2026-11-01' } }, 'tiktok').message, 'typed in until TikTok approves · update')
  assert.equal(get({ status: [], configured: { tiktok: true } }, 'tiktok').state, 'manual')
  const old = get({ status: [], manualLatest: { apple: '2026-11-01' } }, 'apple')
  assert.deepEqual([old.state, old.message], ['manual', 'update'])
  assert.equal(get({ status: [], manualLatest: { apple: '2026-11-08' } }, 'apple').message, null)
})

test('health: a connector never run and not configured is off, not broken', () => {
  assert.equal(get({ status: [] }).state, 'off')
  assert.equal(get({ status: [], configured: { steam: true } }).state, 'waiting')
})

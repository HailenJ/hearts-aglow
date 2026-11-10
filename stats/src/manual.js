// POST endpoints behind the page's forms. Messages are shown under the form, so keep them human.
import { upsertReadings, addEvent, setSetting } from './db.js'

export const MANUAL_METRICS = {
  apple: ['listeners_28d', 'plays_28d'],
  tiktok: ['followers', 'engagement_28d'],
  x: ['followers', 'engagement_28d'],
}
export const EVENT_KINDS = ['trailer', 'release', 'newsletter', 'post', 'festival', 'other']
export const SETTINGS = ['launch_date']

export const json = (body, status) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// Round-trip rejects 2026-02-30, which Date would otherwise roll into March
const validDate = (s) =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s)
const bad = (error) => ({ ok: false, error })

function checkDate(date, today) {
  if (!validDate(date)) return 'date must be YYYY-MM-DD'
  if (date > today) return "date can't be in the future"
}

export function validateManual(body, today) {
  // hasOwn: user-supplied source must not hit inherited keys like constructor
  if (!Object.hasOwn(MANUAL_METRICS, body?.source)) return bad('unknown source')
  const metrics = MANUAL_METRICS[body.source]
  const dateError = checkDate(body.date, today)
  if (dateError) return bad(dateError)
  const entries = Object.entries(body.values ?? {})
  if (!entries.length) return bad('add at least one value')
  const readings = []
  for (const [metric, value] of entries) {
    if (!metrics.includes(metric)) return bad(`unknown metric ${metric} for ${body.source}`)
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return bad(`${metric} must be a number of 0 or more`)
    readings.push({ source: body.source, metric, dim: '', date: body.date, value })
  }
  return { ok: true, readings }
}

export function validateEvent(body, today) {
  if (!EVENT_KINDS.includes(body?.kind)) return bad('unknown kind')
  const dateError = checkDate(body.date, today)
  if (dateError) return bad(dateError)
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (text.length < 1 || text.length > 140) return bad('text must be 1 to 140 characters')
  return { ok: true, event: { date: body.date, kind: body.kind, text } }
}

function validateSetting(body, today) {
  if (!SETTINGS.includes(body?.key)) return bad('unknown setting')
  const { value } = body
  if (value === '' || value == null) return { ok: true, key: body.key, value: null }
  if (!validDate(value)) return bad(`${body.key} must be YYYY-MM-DD`)
  if (value <= today) return bad(`${body.key} must be after today`)
  return { ok: true, key: body.key, value }
}

// now is injectable so tests don't depend on the clock
const handle = (validate, store) => async (request, env, ctx, param, now = new Date()) => {
  const body = await request.json().catch(() => undefined)
  if (body === undefined) return json({ error: 'body must be valid JSON' }, 400)
  const v = validate(body, now.toISOString().slice(0, 10))
  if (!v.ok) return json({ error: v.error }, 400)
  await store(env.DB, v)
  return new Response(null, { status: 204 })
}

export const manualRoute = handle(validateManual, (db, v) => upsertReadings(db, v.readings))
export const logRoute = handle(validateEvent, (db, v) => addEvent(db, v.event))
export const settingsRoute = handle(validateSetting, (db, v) => setSetting(db, v.key, v.value))

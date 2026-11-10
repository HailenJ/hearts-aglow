import { latestRows } from '../db.js'

const BASE = 'https://partner.steam-api.com/IPartnerFinancialsService/GetAppWishlistReporting/v1/'
const APPID = 4433980
const METRICS = ['wishlist_adds', 'wishlist_deletes', 'wishlist_purchases', 'wishlist_gifts']
const LAUNCH = '2026-11-06' // the Steam page went up; nothing exists before it
const REVISED = 2 // Steam revises recent days, so re-pull them; upsert makes it idempotent
const BATCH = 7

// A metric Steam omits is no reading, never 0; a reply with no summary at all is an error.
export function parseWishlistDay(json, date) {
  const s = (json.response ?? json).wishlist_summary
  if (!s) throw new Error('Steam: reply had no wishlist_summary')
  return METRICS.filter((m) => Number.isFinite(s[m])).map((metric) => ({ source: 'steam', metric, dim: '', date, value: s[metric] }))
}

const addDays = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10)

// Every day from the newest stored one (less the revision window) through today, so
// launch week and outage gaps get filled and the all-time total stays whole.
async function startDate(db) {
  const newest = db ? (await latestRows(db, { source: 'steam', metric: '*' })).reduce((d, r) => (r.date > d ? r.date : d), '') : ''
  const from = newest ? addDays(newest, -REVISED) : LAUNCH
  return from > LAUNCH ? from : LAUNCH
}

export const steam = {
  source: 'steam',
  cadenceHours: 24,
  requires: ['STEAM_PUBLISHER_KEY'],
  // One failed day must not discard the rest: successes come back with the first error.
  async pull(env, { fetch, today, db }) {
    if (!env.STEAM_PUBLISHER_KEY) throw new Error('Steam: STEAM_PUBLISHER_KEY is not configured')
    const dates = []
    for (let d = await startDate(db); d <= today; d = addDays(d, 1)) dates.push(d)
    const day = async (date) => {
      const url = `${BASE}?${new URLSearchParams({ key: env.STEAM_PUBLISHER_KEY, appid: APPID, date })}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Steam: HTTP ${res.status}`)
      return parseWishlistDay(await res.json(), date)
    }
    const settled = []
    for (let i = 0; i < dates.length; i += BATCH) settled.push(...(await Promise.allSettled(dates.slice(i, i + BATCH).map(day))))
    const failed = settled.filter((s) => s.status === 'rejected').map((s) => s.reason?.message ?? String(s.reason))
    const readings = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []))
    if (!failed.length) return { readings }
    return { readings, error: failed.length > 1 ? `${failed[0]} (${failed.length} days)` : failed[0] }
  },
}

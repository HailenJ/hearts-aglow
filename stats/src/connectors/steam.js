import { readingDates } from '../db.js'

const BASE = 'https://partner.steam-api.com/IPartnerFinancialsService/GetAppWishlistReporting/v1/'
const APPID = 4433980
const METRICS = ['wishlist_adds', 'wishlist_deletes', 'wishlist_purchases', 'wishlist_gifts']
const LAUNCH = '2026-11-10' // Steam's app_min_date for OTO: its wishlist data starts here
const REVISED = 2 // Steam revises recent days, so re-pull them; upsert makes it idempotent
const BATCH = 7
const MAX_DAYS = 14 // per run, so a long catch-up can't eat the Worker's subrequest budget

// A metric Steam omits is no reading, never 0; a reply with no summary at all is an error,
// unless the day is before app_min_date, where Steam has no data to give.
export function parseWishlistDay(json, date) {
  const r = json.response ?? json
  const s = r.wishlist_summary
  if (!s && r.app_min_date > date) return []
  if (!s) throw new Error('Steam: reply had no wishlist_summary')
  return METRICS.filter((m) => Number.isFinite(s[m])).map((metric) => ({ source: 'steam', metric, dim: '', date, value: s[metric] }))
}

const addDays = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10)

// The days to fetch: from the earliest day with nothing stored (a launch-week or outage gap,
// or a day that failed mid-run), else the revision window; always ending with the recent days.
// The rest of a long gap is picked up by the next run, which starts at the next missing day.
// ponytail: a day Steam answers with no metrics at all stays "missing" and is re-fetched each
// run; if 11+ such days pile up the catch-up stalls. Store a fetched-days marker if that happens.
async function plan(db, today) {
  const stored = new Set(db ? await readingDates(db, { source: 'steam', from: LAUNCH, to: today }) : [])
  const newest = [...stored].at(-1)
  let start = newest ? addDays(newest, -REVISED) : LAUNCH
  for (let d = LAUNCH; d < start; d = addDays(d, 1)) if (!stored.has(d)) { start = d; break }
  if (start < LAUNCH) start = LAUNCH
  const recentFrom = start > addDays(today, -REVISED) ? start : addDays(today, -REVISED)
  const dates = []
  for (let d = recentFrom; d <= today; d = addDays(d, 1)) dates.push(d)
  const catchUp = []
  for (let d = start; d < recentFrom && catchUp.length < MAX_DAYS - dates.length; d = addDays(d, 1)) catchUp.push(d)
  return [...catchUp, ...dates]
}

export const steam = {
  source: 'steam',
  cadenceHours: 24,
  requires: ['STEAM_PUBLISHER_KEY'],
  // One failed day must not discard the rest: successes come back with the first error.
  async pull(env, { fetch, today, db }) {
    if (!env.STEAM_PUBLISHER_KEY) throw new Error('Steam: STEAM_PUBLISHER_KEY is not configured')
    const dates = await plan(db, today)
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

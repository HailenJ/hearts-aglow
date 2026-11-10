const BASE = 'https://partner.steam-api.com/IPartnerFinancialsService/GetAppWishlistReporting/v1/'
const APPID = 4433980
const METRICS = ['wishlist_adds', 'wishlist_deletes', 'wishlist_purchases', 'wishlist_gifts']
const DAYS = 3 // Steam revises recent days, so re-pull them; upsert makes it idempotent

// A metric Steam omits is no reading, never 0.
export function parseWishlistDay(json, date) {
  const s = (json.response ?? json).wishlist_summary ?? {}
  return METRICS.filter((m) => Number.isFinite(s[m])).map((metric) => ({ source: 'steam', metric, dim: '', date, value: s[metric] }))
}

const daysBack = (today, n) => new Date(Date.parse(today) - n * 864e5).toISOString().slice(0, 10)

export const steam = {
  source: 'steam',
  cadenceHours: 24,
  requires: ['STEAM_PUBLISHER_KEY'],
  async pull(env, { fetch, today }) {
    if (!env.STEAM_PUBLISHER_KEY) throw new Error('Steam: STEAM_PUBLISHER_KEY is not configured')
    const dates = Array.from({ length: DAYS }, (_, i) => daysBack(today, i))
    const days = await Promise.all(dates.map(async (date) => {
      const url = `${BASE}?${new URLSearchParams({ key: env.STEAM_PUBLISHER_KEY, appid: APPID, date })}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Steam: HTTP ${res.status}`)
      return parseWishlistDay(await res.json(), date)
    }))
    return { readings: days.flat() }
  },
}

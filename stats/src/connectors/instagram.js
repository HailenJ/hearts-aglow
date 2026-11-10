import { accessToken } from '../oauth.js'

const GRAPH = 'https://graph.instagram.com'

const daysBack = (today, n) => new Date(Date.parse(today) - n * 864e5).toISOString().slice(0, 10)

// Missing counts are no reading, never 0.
export function parseInstagram(profile, insights, media, today, yesterday) {
  const readings = []
  const add = (metric, dim, date, value) => Number.isFinite(value) && readings.push({ source: 'instagram', metric, dim, date, value })
  add('followers', '', today, profile.followers_count)
  for (const m of insights.data ?? []) {
    if (m.name === 'reach' || m.name === 'views') add(m.name, '', yesterday, m.total_value?.value)
  }
  const items = []
  for (const m of media.data ?? []) {
    if (Number.isFinite(m.like_count) && Number.isFinite(m.comments_count)) add('engagement', m.id, today, m.like_count + m.comments_count)
    const date = m.timestamp?.slice(0, 10) ?? null
    // caption is Facebook-Login-only per the IG Media reference, so posts are titled by date
    items.push({ source: 'instagram', id: m.id, title: `Post ${date}`, url: m.permalink ?? null, date })
  }
  return { readings, items }
}

export const instagram = {
  source: 'instagram',
  cadenceHours: 24,
  requires: ['IG_APP_ID', 'IG_APP_SECRET'],
  async pull(env, { fetch, today, now = new Date() }) {
    const token = await accessToken('instagram', env, { fetch, now })
    const get = async (path, params) => {
      const res = await fetch(`${GRAPH}${path}?${new URLSearchParams({ ...params, access_token: token })}`)
      if (!res.ok) throw new Error(`Instagram: HTTP ${res.status}`)
      return res.json()
    }
    const profile = await get('/me', { fields: 'id,followers_count' })
    const yesterday = daysBack(today, 1)
    // One whole UTC day; Instagram buckets days in the account's time zone, so edges may shift a little.
    const [insights, media] = await Promise.all([
      get(`/${profile.id}/insights`, {
        metric: 'reach,views', period: 'day', metric_type: 'total_value',
        since: Date.parse(yesterday) / 1000, until: Date.parse(today) / 1000,
      }),
      get(`/${profile.id}/media`, { fields: 'id,permalink,timestamp,like_count,comments_count', limit: 20 }),
    ])
    return parseInstagram(profile, insights, media, today, yesterday)
  },
}

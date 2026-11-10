import { accessToken } from '../oauth.js'

const REPORTS = 'https://youtubeanalytics.googleapis.com/v2/reports'
const VIDEOS = 'https://www.googleapis.com/youtube/v3/videos'
// Analytics column -> our metric name
const METRICS = { views: 'views', estimatedMinutesWatched: 'minutes_watched', subscribersGained: 'subs_gained', subscribersLost: 'subs_lost' }
const DAYS = 7 // YouTube backfills the last few days, so re-pull a week; upsert makes it idempotent

const daysBack = (today, n) => new Date(Date.parse(today) - n * 864e5).toISOString().slice(0, 10)

// Rows are arrays in columnHeaders order; a missing column is no reading, never 0.
export function parseReport(json, dimOf, date) {
  const cols = (json.columnHeaders ?? []).map((h) => h.name)
  return (json.rows ?? []).flatMap((row) => {
    const r = Object.fromEntries(cols.map((c, i) => [c, row[i]]))
    return Object.entries(METRICS)
      .filter(([col]) => Number.isFinite(r[col]))
      .map(([col, metric]) => ({ source: 'youtube', metric, dim: dimOf(r), date: date ?? r.day, value: r[col] }))
  })
}

export const youtube = {
  source: 'youtube',
  cadenceHours: 24,
  requires: ['YT_CLIENT_ID', 'YT_CLIENT_SECRET'],
  async pull(env, { fetch, today, now = new Date() }) {
    const token = await accessToken('youtube', env, { fetch, now })
    const get = async (url, params) => {
      const res = await fetch(`${url}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`YouTube: HTTP ${res.status}`)
      return res.json()
    }
    const report = (params) => get(REPORTS, { ids: 'channel==MINE', ...params })
    const end = daysBack(today, 1)
    const daily = report({ dimensions: 'day', startDate: daysBack(today, DAYS), endDate: end, metrics: Object.keys(METRICS).join(',') })
    // One top-10 query per day so per-video readings stay daily flows that sum correctly.
    const dates = Array.from({ length: DAYS }, (_, i) => daysBack(today, i + 1))
    const perVideo = dates.map((date) =>
      report({ dimensions: 'video', startDate: date, endDate: date, metrics: 'views,estimatedMinutesWatched', sort: '-views', maxResults: 10 })
        .then((json) => parseReport(json, (r) => r.video, date)))
    const [day, ...videos] = await Promise.all([daily, ...perVideo])
    const readings = [...parseReport(day, () => ''), ...videos.flat()]

    const ids = [...new Set(readings.filter((r) => r.dim).map((r) => r.dim))]
    if (!ids.length) return { readings, items: [] }
    // videos.list takes at most 50 ids and 7 days x top 10 can reach 70, so batch.
    const batches = []
    for (let i = 0; i < ids.length; i += 50) batches.push(ids.slice(i, i + 50))
    const lists = await Promise.all(batches.map((b) => get(VIDEOS, { part: 'snippet', id: b.join(',') })))
    const items = lists.flatMap((l) => l.items ?? [])
    return {
      readings,
      items: items.map((v) => ({
        source: 'youtube',
        id: v.id,
        title: v.snippet.title,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        date: v.snippet.publishedAt?.slice(0, 10) ?? null,
      })),
    }
  },
}

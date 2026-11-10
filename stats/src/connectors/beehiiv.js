const BASE = 'https://api.beehiiv.com/v2/publications/'
const POSTS = 10
const realSleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function parsePostStats(json, id, today) {
  const e = json.data?.stats?.email ?? {}
  // unique_verified_clicks excludes bot clicks; fall back when the account lacks it.
  const clicks = e.unique_verified_clicks ?? e.unique_clicks
  const vals = { recipients: e.recipients, unique_clicks: clicks, unsubscribes: e.unsubscribes, open_rate: e.open_rate }
  return Object.entries(vals)
    .filter(([, v]) => Number.isFinite(v))
    .map(([metric, value]) => ({ source: 'beehiiv', metric, dim: id, date: today, value }))
}

export const beehiiv = {
  source: 'beehiiv',
  cadenceHours: 24,
  requires: ['BEEHIIV_API_KEY', 'BEEHIIV_PUBLICATION_ID'],
  async pull(env, { fetch, today, sleep = realSleep }) {
    const { BEEHIIV_API_KEY: key, BEEHIIV_PUBLICATION_ID: pub } = env
    if (!key || !pub) throw new Error('beehiiv: BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID are required')
    const get = (path, params) =>
      fetch(`${BASE}${pub}${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${key}` } })
    const ok = async (res) => {
      if (!res.ok) throw new Error(`beehiiv: HTTP ${res.status}`)
      return res
    }

    const publication = await (await ok(await get('', { expand: '["stats"]' }))).json()
    const posts = (await (await ok(await get('/posts', { limit: POSTS, order_by: 'publish_date', direction: 'desc', status: 'confirmed' }))).json()).data ?? []

    const readings = []
    const subs = publication.data?.stats?.active_subscriptions
    if (Number.isFinite(subs)) readings.push({ source: 'beehiiv', metric: 'subscribers', dim: '', date: today, value: subs })

    // Stats render in the background: 202 means wait Retry-After and ask once more, then skip.
    const postStats = async (id) => {
      let res = await get(`/posts/${id}`, { expand: '["stats"]' })
      if (res.status === 202) {
        await sleep((Number(res.headers.get('Retry-After')) || 1) * 1000)
        res = await get(`/posts/${id}`, { expand: '["stats"]' })
        if (res.status === 202) return []
      }
      return parsePostStats(await (await ok(res)).json(), id, today)
    }
    for (const p of posts) readings.push(...(await postStats(p.id)))

    const items = posts.map((p) => ({
      source: 'beehiiv',
      id: p.id,
      title: p.title,
      url: p.web_url,
      date: new Date((p.displayed_date ?? p.publish_date) * 1000).toISOString().slice(0, 10),
    }))
    return { readings, items }
  },
}

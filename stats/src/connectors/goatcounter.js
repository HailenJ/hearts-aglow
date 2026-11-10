const day = (ms) => new Date(ms).toISOString().slice(0, 10)

// Referrer names come as host or full URL; fold www./case so one site is one dim.
const refHost = (name) => name.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/[/?#].*$/, '').replace(/^www\./, '')

export function parseGoatCounter({ total, hits, refs }, date) {
  const r = (metric, dim, value) => ({ source: 'goatcounter', metric, dim, date, value })
  const out = []
  // total counts events too; subtract so visits is page visitors only.
  if (Number.isFinite(total.total) && Number.isFinite(total.total_events)) out.push(r('visits', '', total.total - total.total_events))
  for (const h of hits.hits ?? []) if (h.event && Number.isFinite(h.count)) out.push(r('event', h.path, h.count))
  const byHost = new Map()
  for (const s of refs.stats ?? []) {
    const host = refHost(s.name ?? '')
    if (host && Number.isFinite(s.count)) byHost.set(host, (byHost.get(host) ?? 0) + s.count)
  }
  for (const [host, count] of byHost) out.push(r('referrer_visits', host, count))
  return out
}

export const goatcounter = {
  source: 'goatcounter',
  cadenceHours: 24,
  requires: ['GOATCOUNTER_TOKEN'],
  async pull(env, { fetch, today }) {
    if (!env.GOATCOUNTER_TOKEN) throw new Error('GoatCounter: GOATCOUNTER_TOKEN is not configured')
    const date = day(Date.parse(today) - 864e5)
    const range = { start: `${date}T00:00:00Z`, end: `${today}T00:00:00Z` }
    const base = `https://${env.GOATCOUNTER_SITE}.goatcounter.com/api/v0/stats/`
    const get = async (path, params = {}) => {
      const res = await fetch(`${base}${path}?${new URLSearchParams({ ...range, ...params })}`, {
        headers: { Authorization: `Bearer ${env.GOATCOUNTER_TOKEN}` },
      })
      if (!res.ok) throw new Error(`GoatCounter: HTTP ${res.status}`)
      return res.json()
    }
    // ponytail: first 100 paths/referrers only; paginate (`more`) if the site outgrows it.
    const [total, hits, refs] = await Promise.all([get('total'), get('hits', { limit: 100 }), get('toprefs', { limit: 100 })])
    return { readings: parseGoatCounter({ total, hits, refs }, date) }
  },
}

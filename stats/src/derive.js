// Pure derived metrics. Dates are UTC YYYY-MM-DD; every ratio is null, never NaN/Infinity.
const DAY = 864e5
const ms = (d) => Date.parse(d)
const iso = (t) => new Date(t).toISOString().slice(0, 10)
const addDays = (d, n) => iso(ms(d) + n * DAY)
const mondayOf = (d) => addDays(d, -((new Date(ms(d)).getUTCDay() + 6) % 7))
const sum = (rows) => rows.reduce((s, r) => s + r.value, 0)
const ratio = (a, b) => (a == null || !b ? null : a / b)

export function weekly(daily, endDate) {
  const last = mondayOf(endDate)
  const first = addDays(last, -77)
  const buckets = {}
  for (const { date, value } of daily) {
    const w = mondayOf(date)
    if (w >= first && w <= last) buckets[w] = (buckets[w] ?? 0) + value
  }
  return Object.keys(buckets).sort().map((week) => ({ week, value: buckets[week] }))
}

export function netWishlists(adds, deletes) {
  const a = new Map(adds.map((r) => [r.date, r.value]))
  const d = new Map(deletes.map((r) => [r.date, r.value]))
  return [...new Set([...a.keys(), ...d.keys()])].sort()
    .map((date) => ({ date, value: (a.get(date) ?? 0) - (d.get(date) ?? 0) }))
}

export function deleteRate4w(adds, deletes, today) {
  const from = addDays(today, -27)
  const inWindow = (r) => r.date >= from && r.date <= today
  return ratio(sum(deletes.filter(inWindow)), sum(adds.filter(inWindow)))
}

export function isAnomaly(weeks) {
  if (weeks.length < 5) return false
  const prev = weeks.slice(-5, -1).sort((x, y) => x - y)
  const median = (prev[1] + prev[2]) / 2
  return weeks.at(-1) > 2 * median
}

export function pace({ total, weeklyNet, target = 5000, today, launchDate }) {
  if (total == null || !(weeklyNet > 0)) return { reachDate: null, onTrack: null }
  const weeks = Math.max(0, Math.ceil((target - total) / weeklyNet))
  const reachDate = addDays(today, weeks * 7)
  return { reachDate, onTrack: launchDate ? reachDate <= launchDate : null }
}

export const saveRate = ratio
export const streamsPerListener = ratio
export const engagementRate = ratio

export function funnel({ visits, lookInside, steamClicks, utmWishlists }) {
  const steps = [['visits', visits], ['look_inside', lookInside], ['steam_clicks', steamClicks], ['wishlists', utmWishlists]]
  return steps.map(([step, value], i) => ({ step, value, rate: i ? ratio(value, steps[i - 1][1]) : null }))
}

export function sinceLast(seriesBySource, lastSeen) {
  return seriesBySource.map(({ source, metric, kind, points }) => {
    let delta = null
    if (lastSeen) {
      if (kind === 'flow') delta = sum(points.filter((p) => p.date > lastSeen))
      else {
        const byDate = [...points].sort((x, y) => (x.date < y.date ? 1 : -1))
        const now = byDate[0]
        const then = byDate.find((p) => p.date <= lastSeen)
        if (now && then) delta = now.value - then.value
      }
    }
    return { source, metric, delta }
  })
}

export function earningsThisMonth(rows) {
  const total = {}
  const bySource = {}
  for (const { source, currency, cents } of rows) {
    total[currency] = (total[currency] ?? 0) + cents
    const s = (bySource[source] ??= {})
    s[currency] = (s[currency] ?? 0) + cents
  }
  return { total, bySource }
}

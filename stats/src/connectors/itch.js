// Legacy v1 my-games; earnings[].amount is an integer in minor units (the doc's
// sample: 5047 for "$50.47"), so it is already cents.
export function parseItchGames(json, today) {
  return (json.games ?? []).flatMap((g) => {
    const dim = String(g.id)
    const r = (metric, value) => (Number.isFinite(value) ? [{ source: 'itch', metric, dim, date: today, value }] : [])
    return [
      ...r('views', g.views_count),
      ...r('downloads', g.downloads_count),
      ...r('purchases', g.purchases_count),
      ...(g.earnings ?? []).flatMap((e) => r(`earnings_cents_${e.currency}`, e.amount)),
    ]
  })
}

export const itch = {
  source: 'itch',
  cadenceHours: 24,
  requires: ['ITCH_API_KEY'],
  async pull(env, { fetch, today }) {
    if (!env.ITCH_API_KEY) throw new Error('itch: ITCH_API_KEY is not configured')
    const res = await fetch(`https://itch.io/api/1/${env.ITCH_API_KEY}/my-games`)
    if (!res.ok) throw new Error(`itch: HTTP ${res.status}`)
    return { readings: parseItchGames(await res.json(), today) }
  },
}

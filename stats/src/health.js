import { MANUAL_SOURCES } from './sync.js'

const HOUR = 3600e3
const DAY = 24 * HOUR

// since = when the source last worked (or its newest manual reading).
export function sourceHealth({ status, manualLatest = {}, connectors, now, configured = {} }) {
  const byName = Object.fromEntries(status.map((s) => [s.source, s]))
  const out = connectors.map((c) => {
    const s = byName[c.source]
    const h = (state, message = null) => ({ source: c.source, state, since: s?.last_ok ?? null, message })
    if (!s) return configured[c.source] ? h('waiting') : h('off')
    if (s.error && (!s.last_ok || s.last_try > s.last_ok)) return h('broken', s.error)
    if (now - Date.parse(s.last_ok) > 1.5 * c.cadenceHours * HOUR) return h('stale')
    return h('ok')
  })
  for (const source of MANUAL_SOURCES) {
    const latest = manualLatest[source] ?? null
    if (source === 'tiktok' && !configured.tiktok) {
      out.push({ source, state: 'waiting', since: latest, message: 'waiting for TIKTOK_CLIENT_KEY' })
      continue
    }
    const old = !latest || now - Date.parse(latest) > 7 * DAY
    out.push({ source, state: 'manual', since: latest, message: old ? 'update' : null })
  }
  return out
}

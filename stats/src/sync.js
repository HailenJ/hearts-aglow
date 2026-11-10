import { steam } from './connectors/steam.js'
import { itch } from './connectors/itch.js'
import { bluesky } from './connectors/bluesky.js'
import { beehiiv } from './connectors/beehiiv.js'
import { goatcounter } from './connectors/goatcounter.js'
import { youtube } from './connectors/youtube.js'
import { instagram } from './connectors/instagram.js'
import { upsertReadings, upsertItems, recordSync } from './db.js'

export const MANUAL_SOURCES = ['apple', 'tiktok', 'x', 'spotify', 'bandcamp', 'steam_traffic']

// Connector: { source, cadenceHours, requires?: ['SECRET'], pull(env, { fetch, today, now }) -> { readings, items? } }
export const CONNECTORS = [steam, itch, bluesky, beehiiv, goatcounter, youtube, instagram]

// One connector failing must not stop the others; each outcome is recorded.
export async function runSync(env, { now, connectors = CONNECTORS, fetch = globalThis.fetch }) {
  const at = now.toISOString()
  const today = at.slice(0, 10)
  // Unconfigured sources are skipped unrecorded so health shows them off, not broken.
  const active = connectors.filter((c) => (c.requires ?? []).every((k) => env[k]))
  const settled = await Promise.allSettled(
    active.map(async (c) => {
      try {
        const { readings, items = [] } = await c.pull(env, { fetch, today, now })
        await upsertReadings(env.DB, readings)
        await upsertItems(env.DB, items)
        await recordSync(env.DB, { source: c.source, ok: true, at })
        return { source: c.source, ok: true }
      } catch (e) {
        const error = e?.message || String(e)
        await recordSync(env.DB, { source: c.source, ok: false, error, at })
        return { source: c.source, ok: false, error }
      }
    }),
  )
  return settled.map((s, i) =>
    s.status === 'fulfilled' ? s.value : { source: active[i].source, ok: false, error: String(s.reason?.message ?? s.reason) },
  )
}

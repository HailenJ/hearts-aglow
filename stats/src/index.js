import { verifyAccess } from './auth.js'
import { runSync } from './sync.js'
import { connectRoute, callbackRoute } from './oauth.js'
import { manualRoute, logRoute, settingsRoute, json } from './manual.js'
import { dashboardRoute, seenRoute } from './view.js'

// Runs every connector now, for first-sync checks without waiting for the cron.
const syncRoute = async (request, env) => json(await runSync(env, { now: new Date() }), 200)

// 'METHOD /path' -> handler(request, env, ctx, param?)
const routes = {
  'GET /api/dashboard': dashboardRoute,
  'POST /api/seen': seenRoute,
  'GET /api/connect/:param': connectRoute,
  'GET /api/callback/:param': callbackRoute,
  'POST /api/manual': manualRoute,
  'POST /api/log': logRoute,
  'POST /api/settings': settingsRoute,
  'POST /api/sync': syncRoute,
}
const parametric = ['GET /api/connect/', 'GET /api/callback/', 'POST /api/import/']

export default {
  async fetch(request, env, ctx) {
    if (!(await verifyAccess(request, env))) return new Response('Forbidden', { status: 403 })

    // Access cookies ride along on cross-site requests, so writes must come from this page:
    // browsers send Sec-Fetch-Site, and a plain form can't post application/json.
    if (!['GET', 'HEAD'].includes(request.method)) {
      const site = request.headers.get('Sec-Fetch-Site')
      if (site && site !== 'same-origin') return new Response('Forbidden', { status: 403 })
      if (request.body && !request.headers.get('Content-Type')?.startsWith('application/json')) {
        return json({ error: 'body must be application/json' }, 415)
      }
    }

    const { pathname } = new URL(request.url)
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request)

    const key = `${request.method} ${pathname}`
    let handler = routes[key]
    let param
    if (!handler) {
      const prefix = parametric.find((p) => key.startsWith(p))
      param = prefix && key.slice(prefix.length)
      handler = param && !param.includes('/') ? routes[prefix + ':param'] : undefined
    }
    return handler ? handler(request, env, ctx, param) : json({ error: 'not found' }, 404)
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runSync(env, { now: new Date(event.scheduledTime) }))
  },
}

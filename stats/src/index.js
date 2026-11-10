import { verifyAccess } from './auth.js'
import { runSync } from './sync.js'
import { connectRoute, callbackRoute } from './oauth.js'
import { manualRoute, logRoute, settingsRoute, json } from './manual.js'
import { dashboardRoute, seenRoute } from './view.js'

// Later tasks fill these in: 'METHOD /path' -> handler(request, env, ctx, param?)
const routes = {
  'GET /api/dashboard': dashboardRoute,
  'POST /api/seen': seenRoute,
  'GET /api/connect/:param': connectRoute,
  'GET /api/callback/:param': callbackRoute,
  'POST /api/manual': manualRoute,
  'POST /api/log': logRoute,
  'POST /api/settings': settingsRoute,
}
const parametric = ['GET /api/connect/', 'GET /api/callback/', 'POST /api/import/']

export default {
  async fetch(request, env, ctx) {
    if (!(await verifyAccess(request, env))) return new Response('Forbidden', { status: 403 })

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

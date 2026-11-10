import { verifyAccess } from './auth.js'

// Later tasks fill these in: 'METHOD /path' -> handler(request, env, ctx, param?)
const routes = {}
const parametric = ['GET /api/connect/', 'GET /api/callback/', 'POST /api/import/']

const json = (body, status) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

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

  // Task 3 fills this in.
  async scheduled() {},
}

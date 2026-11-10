import { getToken, putToken, getSetting, setSetting } from './db.js'

export const PROVIDERS = {
  youtube: {
    name: 'YouTube',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/yt-analytics.readonly', 'https://www.googleapis.com/auth/youtube.readonly'],
    clientIdVar: 'YT_CLIENT_ID',
    secretVar: 'YT_CLIENT_SECRET',
  },
  instagram: {
    name: 'Instagram',
    authUrl: 'https://www.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scopes: ['instagram_business_basic', 'instagram_business_manage_insights'],
    clientIdVar: 'IG_APP_ID',
    secretVar: 'IG_APP_SECRET',
  },
}

const IG_GRAPH = 'https://graph.instagram.com'
const MIN = 60e3
const DAY = 24 * 60 * MIN

export const redirectUri = (source) => `https://stats.heartsaglow.io/api/callback/${source}`
const stateKey = (source) => `oauth_state_${source}`
const expiresAt = (now, seconds) => new Date(now.getTime() + seconds * 1000).toISOString()
const expired = (name) => new Error(`${name}: login expired, reconnect`)

export function newState() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function connectUrl(source, env, state) {
  const p = PROVIDERS[source]
  const params = { client_id: env[p.clientIdVar], redirect_uri: redirectUri(source), response_type: 'code', state }
  if (source === 'youtube') {
    Object.assign(params, { scope: p.scopes.join(' '), access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' })
  } else {
    params.scope = p.scopes.join(',')
  }
  return `${p.authUrl}?${new URLSearchParams(params)}`
}

export async function startConnect(source, env) {
  const state = newState()
  await setSetting(env.DB, stateKey(source), state)
  return connectUrl(source, env, state)
}

async function call(fetch, url, init) {
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

const form = (params) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(params).toString(),
})

// Throws on any failure; the caller turns that into a 400 and nothing is stored.
export async function handleCallback(source, url, env, { fetch, now }) {
  const p = PROVIDERS[source]
  const expected = await getSetting(env.DB, stateKey(source))
  await setSetting(env.DB, stateKey(source), null) // single-use, whatever happens next
  const state = url.searchParams.get('state')
  if (!expected || state !== expected) throw new Error(`${p.name}: state mismatch, try connecting again`)
  const code = url.searchParams.get('code')
  if (!code) throw new Error(`${p.name}: ${url.searchParams.get('error') ?? 'no code returned'}`)

  const exchange = await call(fetch, p.tokenUrl, form({
    code,
    client_id: env[p.clientIdVar],
    client_secret: env[p.secretVar],
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(source),
  }))
  if (!exchange.ok) throw new Error(`${p.name}: HTTP ${exchange.status}`)

  if (source === 'youtube') {
    const t = exchange.body
    // Without a refresh token the cron could never renew, so fail now rather than in an hour.
    if (!t.refresh_token) throw new Error('YouTube: no refresh token returned, try connecting again')
    await putToken(env.DB, source, { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: expiresAt(now, t.expires_in) })
    return
  }

  // The docs show the short-lived token wrapped in data[]; older responses were flat.
  const short = exchange.body.data?.[0] ?? exchange.body
  const qs = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: env[p.secretVar], access_token: short.access_token })
  const long = await call(fetch, `${IG_GRAPH}/access_token?${qs}`)
  if (!long.ok) throw new Error(`${p.name}: HTTP ${long.status}`)
  await saveInstagram(env, long.body, now)
}

const saveInstagram = (env, t, now) =>
  putToken(env.DB, 'instagram', { access_token: t.access_token, expires_at: expiresAt(now, t.expires_in), meta: { issued_at: now.toISOString() } })

export async function accessToken(source, env, { fetch, now }) {
  const p = PROVIDERS[source]
  const tok = await getToken(env.DB, source)
  if (!tok?.access_token) throw new Error(`${p.name}: not connected, connect`)

  if (source === 'youtube') {
    if (Date.parse(tok.expires_at) - now.getTime() > 5 * MIN) return tok.access_token
    const r = await call(fetch, p.tokenUrl, form({
      client_id: env[p.clientIdVar],
      client_secret: env[p.secretVar],
      refresh_token: tok.refresh_token,
      grant_type: 'refresh_token',
    }))
    if (r.body.error === 'invalid_grant') throw expired(p.name)
    if (!r.ok) throw new Error(`${p.name}: HTTP ${r.status}`)
    await putToken(env.DB, source, {
      access_token: r.body.access_token,
      refresh_token: r.body.refresh_token ?? tok.refresh_token,
      expires_at: expiresAt(now, r.body.expires_in),
    })
    return r.body.access_token
  }

  // Instagram long-lived tokens (60 days) cannot be refreshed once expired, only reconnected.
  if (Date.parse(tok.expires_at) <= now.getTime()) throw expired(p.name)
  const issued = Date.parse(tok.meta?.issued_at) || 0
  if (now.getTime() - issued <= 30 * DAY) return tok.access_token
  const qs = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: tok.access_token })
  const r = await call(fetch, `${IG_GRAPH}/refresh_access_token?${qs}`)
  // Meta rejects a revoked or invalid token with 400 (OAuthException code 190).
  if (r.status === 400 || r.status === 401) throw expired(p.name)
  if (!r.ok) throw new Error(`${p.name}: HTTP ${r.status}`)
  await saveInstagram(env, r.body, now)
  return r.body.access_token
}

const text = (body, status) => new Response(body, { status, headers: { 'Content-Type': 'text/plain' } })

// GET /api/connect/:source — the browser leaves for the provider's consent page.
export async function connectRoute(_request, env, _ctx, source) {
  const p = PROVIDERS[source]
  if (!p) return text('unknown source', 404)
  if (!env[p.clientIdVar] || !env[p.secretVar]) return text(`${p.name}: ${p.clientIdVar} and ${p.secretVar} are not configured`, 400)
  return Response.redirect(await startConnect(source, env), 302)
}

// GET /api/callback/:source — arrives behind Access with the user's session.
export async function callbackRoute(request, env, _ctx, source, deps = { fetch: globalThis.fetch, now: new Date() }) {
  if (!PROVIDERS[source]) return text('unknown source', 404)
  try {
    await handleCallback(source, new URL(request.url), env, deps)
  } catch (e) {
    return text(e.message, 400)
  }
  return new Response(null, { status: 302, headers: { Location: '/' } })
}

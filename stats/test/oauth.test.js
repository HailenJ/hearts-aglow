import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { openTestDb } from './d1.js'
import { getToken, putToken, getSetting, setSetting } from '../src/db.js'
import { connectUrl, handleCallback, accessToken, connectRoute, callbackRoute } from '../src/oauth.js'
import { youtube } from '../src/connectors/youtube.js'
import { instagram } from '../src/connectors/instagram.js'

const fixture = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'))
const respond = (body, status = 200) => new Response(JSON.stringify(body), { status })
const now = new Date('2026-11-10T09:00:00Z')
const today = '2026-11-10'
const ytEnv = (db) => ({ DB: db, YT_CLIENT_ID: 'cid', YT_CLIENT_SECRET: 'csec' })
const igEnv = (db) => ({ DB: db, IG_APP_ID: 'aid', IG_APP_SECRET: 'asec' })
const fresh = (db, source, extra = {}) =>
  putToken(db, source, { access_token: 'AT', refresh_token: 'RT', expires_at: '2026-11-10T10:00:00.000Z', ...extra })

test('youtube connectUrl asks Google for offline access with a refresh token', () => {
  const u = new URL(connectUrl('youtube', ytEnv(), 'abc'))
  assert.equal(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth')
  const p = Object.fromEntries(u.searchParams)
  assert.deepEqual(p, {
    client_id: 'cid', redirect_uri: 'https://stats.heartsaglow.io/api/callback/youtube', response_type: 'code',
    scope: 'https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.readonly',
    state: 'abc', access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true',
  })
})

test('callback with a mismatched state is rejected and stores nothing', async () => {
  const db = openTestDb()
  await setSetting(db, 'oauth_state_youtube', 'good')
  const fetch = async () => assert.fail('must not exchange the code')
  const url = new URL('https://stats.heartsaglow.io/api/callback/youtube?code=c&state=evil')
  await assert.rejects(handleCallback('youtube', url, ytEnv(db), { fetch, now }), /state/)
  assert.equal(await getToken(db, 'youtube'), null)
  assert.equal(await getSetting(db, 'oauth_state_youtube'), null) // single-use, even on failure
})

test('youtube callback exchanges the code and stores both tokens with an ISO expiry', async () => {
  const db = openTestDb()
  await setSetting(db, 'oauth_state_youtube', 's1')
  let body
  const fetch = async (u, init) => {
    assert.equal(u, 'https://oauth2.googleapis.com/token')
    body = Object.fromEntries(new URLSearchParams(init.body))
    return respond({ access_token: 'AT1', refresh_token: 'RT1', expires_in: 3599 })
  }
  await handleCallback('youtube', new URL('https://x/api/callback/youtube?code=c1&state=s1'), ytEnv(db), { fetch, now })
  assert.deepEqual(body, {
    code: 'c1', client_id: 'cid', client_secret: 'csec', grant_type: 'authorization_code',
    redirect_uri: 'https://stats.heartsaglow.io/api/callback/youtube',
  })
  const t = await getToken(db, 'youtube')
  assert.deepEqual([t.access_token, t.refresh_token, t.expires_at], ['AT1', 'RT1', '2026-11-10T09:59:59.000Z'])
  assert.equal(await getSetting(db, 'oauth_state_youtube'), null)
  // the same state cannot be replayed
  await assert.rejects(handleCallback('youtube', new URL('https://x/?code=c1&state=s1'), ytEnv(db), { fetch, now }), /state/)
})

test('instagram callback trades the code for a long-lived token and records when it was issued', async () => {
  const db = openTestDb()
  await setSetting(db, 'oauth_state_instagram', 's2')
  const calls = []
  const fetch = async (u, init) => {
    calls.push({ u: new URL(u), init })
    if (String(u).startsWith('https://api.instagram.com/oauth/access_token')) return respond({ data: [{ access_token: 'SHORT', user_id: 1 }] })
    return respond({ access_token: 'LONG', token_type: 'bearer', expires_in: 5184000 })
  }
  await handleCallback('instagram', new URL('https://x/?code=c2&state=s2'), igEnv(db), { fetch, now })
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(new URLSearchParams(calls[0].init.body).get('grant_type'), 'authorization_code')
  assert.equal(calls[1].u.origin + calls[1].u.pathname, 'https://graph.instagram.com/access_token')
  assert.deepEqual(Object.fromEntries(calls[1].u.searchParams), { grant_type: 'ig_exchange_token', client_secret: 'asec', access_token: 'SHORT' })
  const t = await getToken(db, 'instagram')
  assert.deepEqual([t.access_token, t.expires_at, t.meta.issued_at], ['LONG', '2027-01-09T09:00:00.000Z', now.toISOString()])
})

test('accessToken returns a token that is not near expiry without calling Google', async () => {
  const db = openTestDb()
  await fresh(db, 'youtube')
  assert.equal(await accessToken('youtube', ytEnv(db), { fetch: async () => assert.fail('no refresh'), now }), 'AT')
})

test('accessToken refreshes an expiring YouTube token and saves the new expiry', async () => {
  const db = openTestDb()
  await fresh(db, 'youtube', { expires_at: '2026-11-10T09:04:00.000Z' }) // inside the 5-minute window
  let body
  const fetch = async (u, init) => {
    body = Object.fromEntries(new URLSearchParams(init.body))
    return respond({ access_token: 'AT2', expires_in: 3600 }) // Google omits refresh_token on refresh
  }
  assert.equal(await accessToken('youtube', ytEnv(db), { fetch, now }), 'AT2')
  assert.deepEqual(body, { client_id: 'cid', client_secret: 'csec', refresh_token: 'RT', grant_type: 'refresh_token' })
  const t = await getToken(db, 'youtube')
  assert.deepEqual([t.access_token, t.refresh_token, t.expires_at], ['AT2', 'RT', '2026-11-10T10:00:00.000Z'])
})

test('a refresh rejected with invalid_grant throws "YouTube: login expired, reconnect"', async () => {
  const db = openTestDb()
  await fresh(db, 'youtube', { expires_at: '2026-11-10T08:00:00.000Z' })
  const fetch = async () => respond({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }, 400)
  await assert.rejects(accessToken('youtube', ytEnv(db), { fetch, now }), /^Error: YouTube: login expired, reconnect$/)
  assert.equal((await getToken(db, 'youtube')).access_token, 'AT') // nothing overwritten
})

test('a source with secrets but no stored token fails as not connected', async () => {
  const db = openTestDb()
  await assert.rejects(youtube.pull(ytEnv(db), { fetch: async () => assert.fail(), today, now }), /^Error: YouTube: not connected, connect$/)
  await assert.rejects(instagram.pull(igEnv(db), { fetch: async () => assert.fail(), today, now }), /^Error: Instagram: not connected, connect$/)
})

test('instagram tokens older than 30 days are refreshed with refresh_access_token', async () => {
  const db = openTestDb()
  await putToken(db, 'instagram', { access_token: 'OLD', expires_at: '2026-11-25T00:00:00.000Z', meta: { issued_at: '2026-10-01T00:00:00.000Z' } })
  let url
  const fetch = async (u) => { url = new URL(u); return respond({ access_token: 'NEW', token_type: 'bearer', expires_in: 5184000 }) }
  assert.equal(await accessToken('instagram', igEnv(db), { fetch, now }), 'NEW')
  assert.equal(url.origin + url.pathname, 'https://graph.instagram.com/refresh_access_token')
  assert.deepEqual(Object.fromEntries(url.searchParams), { grant_type: 'ig_refresh_token', access_token: 'OLD' })
  const t = await getToken(db, 'instagram')
  assert.deepEqual([t.expires_at, t.meta.issued_at], ['2027-01-09T09:00:00.000Z', now.toISOString()])
})

test('youtube pull asks reports.query for the last 7 days of views, estimatedMinutesWatched, subscribersGained, subscribersLost by day', async () => {
  const db = openTestDb()
  await fresh(db, 'youtube')
  const calls = []
  const fetch = async (u, init) => {
    const url = new URL(u)
    calls.push({ url, init })
    if (url.hostname === 'www.googleapis.com') return respond(fixture('youtube-videos.json'))
    return respond(fixture(url.searchParams.get('dimensions') === 'day' ? 'youtube-report-day.json' : 'youtube-report-video.json'))
  }
  const { readings, items } = await youtube.pull(ytEnv(db), { fetch, today, now })
  assert.ok(calls.every((c) => c.init.headers.Authorization === 'Bearer AT'))
  const day = calls.find((c) => c.url.searchParams.get('dimensions') === 'day').url
  assert.equal(day.origin + day.pathname, 'https://youtubeanalytics.googleapis.com/v2/reports')
  assert.deepEqual(Object.fromEntries(day.searchParams), {
    ids: 'channel==MINE', dimensions: 'day', startDate: '2026-11-03', endDate: '2026-11-09',
    metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost',
  })
  const d3 = readings.filter((r) => r.dim === '' && r.date === '2026-11-03').map((r) => [r.metric, r.value])
  assert.deepEqual(d3, [['views', 120], ['minutes_watched', 340], ['subs_gained', 4], ['subs_lost', 1]])

  // top 10 videos per day, so per-video readings stay daily flows
  const vids = calls.filter((c) => c.url.searchParams.get('dimensions') === 'video').map((c) => c.url)
  assert.equal(vids.length, 7)
  for (const v of vids) {
    assert.equal(v.searchParams.get('sort'), '-views')
    assert.equal(v.searchParams.get('maxResults'), '10')
    assert.equal(v.searchParams.get('startDate'), v.searchParams.get('endDate'))
  }
  const a = readings.filter((r) => r.dim === 'vid_a' && r.date === '2026-11-09').map((r) => [r.metric, r.value])
  assert.deepEqual(a, [['views', 80], ['minutes_watched', 200]])
  const data = calls.find((c) => c.url.hostname === 'www.googleapis.com').url
  assert.equal(data.pathname, '/youtube/v3/videos')
  assert.deepEqual(Object.fromEntries(data.searchParams), { part: 'snippet', id: 'vid_a,vid_b' })
  assert.deepEqual(items[0], { source: 'youtube', id: 'vid_a', title: 'OTO trailer', url: 'https://www.youtube.com/watch?v=vid_a', date: '2026-10-01' })
  assert.ok(readings.every((r) => r.source === 'youtube'))
})

test('youtube non-2xx throws HTTP status', async () => {
  const db = openTestDb()
  await fresh(db, 'youtube')
  await assert.rejects(youtube.pull(ytEnv(db), { fetch: async () => respond({}, 403), today, now }), /^Error: YouTube: HTTP 403$/)
})

function igFetch(insights, calls = []) {
  return async (u) => {
    const url = new URL(u)
    calls.push(url)
    if (url.pathname.endsWith('/insights')) return respond(insights)
    if (url.pathname.endsWith('/media')) return respond(fixture('instagram-media.json'))
    return respond(fixture('instagram-profile.json'))
  }
}

test('instagram pull records followers, yesterday\'s reach and views, and engagement per media', async () => {
  const db = openTestDb()
  await putToken(db, 'instagram', { access_token: 'IGT', expires_at: '2027-01-01T00:00:00.000Z', meta: { issued_at: '2026-11-01T00:00:00.000Z' } })
  const calls = []
  const { readings, items } = await instagram.pull(igEnv(db), { fetch: igFetch(fixture('instagram-insights.json'), calls), today, now })
  assert.ok(calls.every((u) => u.origin === 'https://graph.instagram.com' && u.searchParams.get('access_token') === 'IGT'))
  const ins = calls.find((u) => u.pathname.endsWith('/insights'))
  assert.equal(ins.pathname, '/17841400000000001/insights')
  assert.deepEqual(Object.fromEntries([...ins.searchParams].filter(([k]) => k !== 'access_token')), {
    metric: 'reach,views', period: 'day', metric_type: 'total_value',
    since: String(Date.parse('2026-11-09') / 1000), until: String(Date.parse('2026-11-10') / 1000),
  })
  assert.equal(calls.find((u) => u.pathname.endsWith('/media')).searchParams.get('limit'), '20')
  const by = (m, dim = '') => readings.find((r) => r.metric === m && r.dim === dim)
  assert.deepEqual([by('followers').value, by('followers').date], [312, today])
  assert.deepEqual([by('reach').value, by('reach').date], [140, '2026-11-09'])
  assert.deepEqual([by('views').value, by('views').date], [410, '2026-11-09'])
  assert.equal(by('engagement', '18000000000000001').value, 24)
  assert.equal(by('engagement', '18000000000000002').value, 9)
  assert.deepEqual(items[0], { source: 'instagram', id: '18000000000000001', title: 'Post 2026-11-05', url: 'https://www.instagram.com/p/AAA/', date: '2026-11-05' })
})

test('instagram pull with an empty insights data array writes no readings', async () => {
  const db = openTestDb()
  await putToken(db, 'instagram', { access_token: 'IGT', expires_at: '2027-01-01T00:00:00.000Z', meta: { issued_at: '2026-11-01T00:00:00.000Z' } })
  const { readings } = await instagram.pull(igEnv(db), { fetch: igFetch({ data: [] }), today, now })
  // no insight readings at all, and never a 0 standing in for them
  assert.deepEqual(readings.filter((r) => r.metric === 'reach' || r.metric === 'views'), [])
  assert.ok(readings.every((r) => r.metric === 'followers' || r.metric === 'engagement'))
})

test('connect route stores a fresh 64-hex state and redirects to the provider with it', async () => {
  const db = openTestDb()
  const res = await connectRoute(new Request('https://x/api/connect/instagram'), igEnv(db), {}, 'instagram')
  assert.equal(res.status, 302)
  const loc = new URL(res.headers.get('Location'))
  assert.equal(loc.origin + loc.pathname, 'https://www.instagram.com/oauth/authorize')
  assert.equal(loc.searchParams.get('scope'), 'instagram_business_basic,instagram_business_manage_insights')
  const state = await getSetting(db, 'oauth_state_instagram')
  assert.match(state, /^[0-9a-f]{64}$/)
  assert.equal(loc.searchParams.get('state'), state)
  assert.equal((await connectRoute(null, { DB: db }, {}, 'youtube')).status, 400) // no client secrets
  assert.equal((await connectRoute(null, { DB: db }, {}, 'myspace')).status, 404)
})

test('callback route redirects home on success and answers 400 in plain text on failure', async () => {
  const db = openTestDb()
  await setSetting(db, 'oauth_state_youtube', 'ok')
  const fetch = async () => respond({ access_token: 'A', refresh_token: 'R', expires_in: 3600 })
  const good = await callbackRoute(new Request('https://x/api/callback/youtube?code=c&state=ok'), ytEnv(db), {}, 'youtube', { fetch, now })
  assert.deepEqual([good.status, good.headers.get('Location')], [302, '/'])
  const bad = await callbackRoute(new Request('https://x/api/callback/youtube?code=c&state=ok'), ytEnv(db), {}, 'youtube', { fetch, now })
  assert.equal(bad.status, 400)
  assert.match(await bad.text(), /^YouTube: state mismatch/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { bluesky } from '../src/connectors/bluesky.js'
import { beehiiv } from '../src/connectors/beehiiv.js'
import { goatcounter } from '../src/connectors/goatcounter.js'

const fixture = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'))
const respond = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers })
const today = '2026-11-10'

test('bluesky emits followers and one engagement reading per post with an item carrying the post text', async () => {
  const urls = []
  const fetch = async (u) => {
    urls.push(String(u))
    return respond(String(u).includes('getProfile') ? fixture('bluesky-profile.json') : fixture('bluesky-feed.json'))
  }
  const { readings, items } = await bluesky.pull({ BSKY_HANDLE: 'heartsaglow.io' }, { fetch, today })
  assert.ok(urls.some((u) => u.includes('getProfile?actor=heartsaglow.io')))
  assert.ok(urls.some((u) => u.includes('getAuthorFeed') && u.includes('limit=30')))
  assert.equal(readings.find((r) => r.metric === 'followers').value, 24)
  const e = readings.filter((r) => r.metric === 'engagement')
  assert.equal(e.length, 3)
  const uri = 'at://did:plc:dwfupigypmqul4rdpt6wfaee/app.bsky.feed.post/3mvdwx7cwuc2l'
  assert.equal(e.find((r) => r.dim === uri).value, 0 + 6 + 18 + 1)
  assert.ok(readings.every((r) => r.source === 'bluesky' && r.date === today))
  assert.deepEqual(items[0], {
    source: 'bluesky', id: uri,
    title: 'OTO - music playground game #screenshotsaturday #indiedev #gamedev',
    url: 'https://bsky.app/profile/heartsaglow.io/post/3mvdwx7cwuc2l', date: '2026-09-12',
  })
})

test('bluesky non-2xx throws HTTP status', async () => {
  await assert.rejects(bluesky.pull({ BSKY_HANDLE: 'h' }, { fetch: async () => respond({}, 500), today }), /^Error: Bluesky: HTTP 500$/)
})

function beehiivFetch({ statsFor }) {
  const calls = []
  const fetch = async (u, init) => {
    const url = new URL(u)
    calls.push({ url, init })
    if (url.pathname.endsWith('/posts')) return respond(fixture('beehiiv-posts.json'))
    if (url.pathname.includes('/posts/')) return statsFor(url.pathname.split('/').pop(), calls)
    return respond(fixture('beehiiv-publication.json'))
  }
  return { fetch, calls }
}
const env = { BEEHIIV_API_KEY: 'bk', BEEHIIV_PUBLICATION_ID: 'pub_1' }

test('beehiiv records subscribers and per-post recipients, unique (verified) clicks, unsubscribes, open_rate', async () => {
  const { fetch, calls } = beehiivFetch({ statsFor: () => respond(fixture('beehiiv-post-stats.json')) })
  const { readings, items } = await beehiiv.pull(env, { fetch, today, sleep: async () => {} })
  assert.equal(calls[0].init.headers.Authorization, 'Bearer bk')
  assert.ok(calls.every((c) => c.url.pathname.startsWith('/v2/publications/pub_1')))
  const expands = calls.filter((c) => !c.url.pathname.endsWith('/posts')).map((c) => c.url.search.match(/expand=[^&]*/)[0])
  assert.equal(expands.length, 3)
  assert.ok(expands.every((e) => e === 'expand=%5B%22stats%22%5D'))
  assert.equal(readings.find((r) => r.metric === 'subscribers').value, 57)
  const a = Object.fromEntries(readings.filter((r) => r.dim === 'post_aaa').map((r) => [r.metric, r.value]))
  assert.deepEqual(a, { recipients: 50, unique_clicks: 6, unsubscribes: 1, open_rate: 45.5 })
  assert.deepEqual(items[0], { source: 'beehiiv', id: 'post_aaa', title: 'OTO devlog 1', url: 'https://heartsaglow.beehiiv.com/p/oto-devlog-1', date: '2026-11-06' })
  assert.equal(items.length, 2)
})

test('beehiiv HTTP 202 on post stats retries once after Retry-After then skips that post without writing zeros', async () => {
  const slept = []
  const hits = {}
  const { fetch } = beehiivFetch({
    statsFor: (id) => {
      hits[id] = (hits[id] ?? 0) + 1
      if (id === 'post_bbb') return respond({ status: 202 }, 202, { 'Retry-After': '3' })
      return hits[id] === 1 ? respond({}, 202, { 'Retry-After': '2' }) : respond(fixture('beehiiv-post-stats.json'))
    },
  })
  const { readings } = await beehiiv.pull(env, { fetch, today, sleep: async (ms) => { slept.push(ms) } })
  assert.deepEqual(slept.sort(), [2000, 3000])
  assert.equal(hits.post_bbb, 2)
  assert.equal(readings.filter((r) => r.dim === 'post_aaa').length, 4)
  assert.equal(readings.filter((r) => r.dim === 'post_bbb').length, 0)
})

test('beehiiv non-2xx throws HTTP status', async () => {
  await assert.rejects(beehiiv.pull(env, { fetch: async () => respond({}, 401), today, sleep: async () => {} }), /^Error: beehiiv: HTTP 401$/)
})

function gcFetch(calls = []) {
  return async (u, init) => {
    const url = new URL(u)
    calls.push({ url, init })
    if (url.pathname.endsWith('/stats/total')) return respond(fixture('goatcounter-total.json'))
    if (url.pathname.endsWith('/stats/hits')) return respond(fixture('goatcounter-hits.json'))
    return respond(fixture('goatcounter-toprefs.json'))
  }
}
const gcEnv = { GOATCOUNTER_TOKEN: 't', GOATCOUNTER_SITE: 'heartsaglow' }

test('goatcounter keeps event paths as dims, e.g. out/store.steampowered.com and look-inside', async () => {
  const calls = []
  const { readings } = await goatcounter.pull(gcEnv, { fetch: gcFetch(calls), today })
  assert.equal(calls[0].url.origin, 'https://heartsaglow.goatcounter.com')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer t')
  assert.equal(calls[0].url.searchParams.get('start'), '2026-11-09T00:00:00Z')
  assert.equal(calls[0].url.searchParams.get('end'), '2026-11-10T00:00:00Z')
  const ev = Object.fromEntries(readings.filter((r) => r.metric === 'event').map((r) => [r.dim, r.value]))
  assert.deepEqual(ev, { 'look-inside': 5, 'out/store.steampowered.com': 4, 'play/some-release': 3 })
  const v = readings.find((r) => r.metric === 'visits')
  assert.deepEqual([v.dim, v.value, v.date], ['', 28, '2026-11-09'])
})

test('goatcounter strips www. and lowercases referrer hosts', async () => {
  const { readings } = await goatcounter.pull(gcEnv, { fetch: gcFetch(), today })
  const refs = Object.fromEntries(readings.filter((r) => r.metric === 'referrer_visits').map((r) => [r.dim, r.value]))
  assert.deepEqual(refs, { 'bsky.app': 9, 'news.example.com': 3 })
})

test('bluesky skips reposts but keeps the account\'s own pinned post', async () => {
  const post = (id, likes) => ({ uri: `at://did:plc:x/app.bsky.feed.post/${id}`, record: { text: id, createdAt: '2026-09-01T00:00:00Z' }, likeCount: likes, repostCount: 0, replyCount: 0, quoteCount: 0 })
  const feed = { feed: [
    { post: post('rep', 5), reason: { $type: 'app.bsky.feed.defs#reasonRepost' } },
    { post: post('pin', 7), reason: { $type: 'app.bsky.feed.defs#reasonPin' } },
  ] }
  const fetch = async (u) => respond(String(u).includes('getProfile') ? fixture('bluesky-profile.json') : feed)
  const { readings, items } = await bluesky.pull({ BSKY_HANDLE: 'h' }, { fetch, today })
  assert.deepEqual(items.map((i) => i.title), ['pin'])
  assert.deepEqual(readings.filter((r) => r.metric === 'engagement').map((r) => r.value), [7])
})

// The dashboard's view model: stored readings in, one JSON object out. Reads only.
import { series, latest, dims, events, getSetting, setSetting, syncStatus, latestRows, items } from './db.js'
import { weekly, netWishlists, deleteRate4w, isAnomaly, pace, funnel, sinceLast, earningsThisMonth, engagementRate } from './derive.js'
import { sourceHealth } from './health.js'
import { CONNECTORS, MANUAL_SOURCES } from './sync.js'
import { json } from './manual.js'

/**
 * Every number is number|null (null = no data, never 0 stood in); rates are fractions 0..1.
 * @typedef {{value:number|null, delta:number|null, stale:boolean}} Tile
 * @typedef {{date:string, value:number}} Point
 * @typedef {{week:string, value:number}} Week   week = Monday, UTC
 * @typedef {{
 *   asOf:string, lastSeen:string|null,
 *   health:{source:string, state:'ok'|'stale'|'broken'|'waiting'|'off'|'manual', since:string|null, message:string|null}[],
 *   events:{id:number, date:string, kind:string, text:string}[],
 *   overview:{
 *     since:{wishlists:number|null, subscribers:number|null},
 *     anomaly:{wishlists:boolean, deleteRate:boolean},
 *     tiles:{wishlists:Tile, newsletter:Tile, listeners:Tile},  // wishlists: last full week, delta = change vs the week before as a fraction; newsletter delta = subscribers gained in 7 days
 *     strip:{wishlists:number|null, itchViews:number|null, bandcampSales30d:number|null, youtubeViews28d:number|null,
 *            blueskyFollowers:number|null, instagramEngagement:number|null, tiktokFollowers:number|null, siteVisits30d:number|null},
 *     weekly:Week[]  // net wishlists, 12 weeks, the last one partial
 *   },
 *   game:{total:Tile, deleteRate:Tile, conversion:Tile, pace:{reachDate:string|null, onTrack:boolean|null, launchDate:string|null},
 *         daily:Point[], utm:{source:string, visits:number|null, wishlists:number|null, conversion:number|null}[]},
 *   music:{listeners:Tile, saveRate:Tile, streamsPerListener:Tile, streams:Week[], releases:object[]},
 *   social:{clicks:Tile, engagement:Tile, followers:Tile,
 *           platforms:{platform:string, followers:number|null, delta30:number|null, engagement:number|null, clicks:number|null}[],
 *           posts:{platform:string, title:string|null, url:string|null, metric:'views'|'engagement', value:number}[]},
 *   news:{subscribers:Tile, clickRate:Tile, openRate:Tile, weekly:Week[],
 *         sends:{id:string, title:string|null, url:string|null, date:string|null, clickRate:number|null, unsubscribes:number|null}[]},
 *   site:{funnel:{step:string, value:number|null, rate:number|null}[], visits:Point[],
 *         outbound:{to:string, value:number}[], referrers:{host:string, value:number}[], actions:{action:string, value:number}[]},
 *   earnings:{total:Object<string,number>, bySource:Object<string,Object<string,number>>, stale:boolean}  // cents per currency
 * }} View
 */

const DAY = 864e5
const EPOCH = '0000-01-01'
const addDays = (d, n) => new Date(Date.parse(d) + n * DAY).toISOString().slice(0, 10)
const mondayOf = (d) => addDays(d, -((new Date(d).getUTCDay() + 6) % 7))
const sum = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) : null)
const total = (rows) => sum(rows.map((r) => r.value))
const mean = (xs) => (xs.length ? sum(xs) / xs.length : null)
const ratio = (a, b) => (a == null || !b ? null : a / b)
const growth = (now, then) => (now == null || !then ? null : (now - then) / Math.abs(then))
const tile = (value, delta, stale) => ({ value, delta, stale })
const SOCIAL_HOSTS = { 'youtube.com': 'youtube', 'bsky.app': 'bluesky', 'instagram.com': 'instagram', 'l.instagram.com': 'instagram', 'tiktok.com': 'tiktok', 't.co': 'x', 'x.com': 'x' }

// A snapshot's value now and its change since a date (null when there is no reading before it).
async function snapshot(db, source, metric, since) {
  const [now, then] = await Promise.all([latest(db, { source, metric }), latest(db, { source, metric, before: since })])
  return { value: now?.value ?? null, delta: now && then ? now.value - then.value : null }
}

// Snapshots become flows by differencing, so weekly() can bucket them.
const diffs = (points) => points.slice(1).map((p, i) => ({ date: p.date, value: p.value - points[i].value }))

async function buildHealth(db, env, now) {
  const configured = Object.fromEntries(CONNECTORS.map((c) => [c.source, (c.requires ?? []).every((k) => env[k])]))
  configured.tiktok = Boolean(env.TIKTOK_CLIENT_KEY)
  const manualLatest = {}
  for (const source of MANUAL_SOURCES) {
    const newest = (await latestRows(db, { source, metric: '*' })).reduce((d, r) => (r.date > d ? r.date : d), '')
    if (newest) manualLatest[source] = newest
  }
  return sourceHealth({ status: await syncStatus(db), manualLatest, connectors: CONNECTORS, now: now.getTime(), configured })
}

async function gameTab(c) {
  const { db, today } = c
  const [adds, deletes, launchDate] = await Promise.all([
    series(db, { source: 'steam', metric: 'wishlist_adds', from: EPOCH, to: today }),
    series(db, { source: 'steam', metric: 'wishlist_deletes', from: EPOCH, to: today }),
    getSetting(db, 'launch_date'),
  ])
  const net = netWishlists(adds, deletes)
  const totalNet = total(net)
  const stale = c.stale('steam')

  // Full weeks end on the Sunday before this week; a missing week stays null, never 0.
  const lastFull = addDays(mondayOf(today), -1)
  const byWeek = new Map(weekly(net, lastFull).map((w) => [w.week, w.value]))
  const fullWeeks = Array.from({ length: 5 }, (_, i) => byWeek.get(addDays(mondayOf(lastFull), (i - 4) * 7)) ?? null)
  const last4 = net.filter((p) => p.date > addDays(lastFull, -28) && p.date <= lastFull)
  const weeklyNet = last4.length ? total(last4) / 4 : null

  const rate = deleteRate4w(adds, deletes, today)
  const prevRate = deleteRate4w(adds, deletes, addDays(today, -28))
  const recent = net.filter((p) => p.date > addDays(today, -90))
  const daily = recent.map((p) => {
    const week = net.filter((q) => q.date > addDays(p.date, -7) && q.date <= p.date)
    return { date: p.date, value: total(week) / week.length } // 7-day average of the days that have data
  })

  const [visits, wishlists] = await Promise.all(
    ['visits', 'wishlists'].map((metric) => dims(db, { source: 'steam_traffic', metric, from: c.from30, to: today })),
  )
  const sources = [...new Set([...visits, ...wishlists].map((r) => r.dim))]
  const utm = sources.map((source) => {
    const v = visits.find((r) => r.dim === source)?.value ?? null
    const w = wishlists.find((r) => r.dim === source)?.value ?? null
    return { source, visits: v, wishlists: w, conversion: ratio(w, v) }
  })

  return {
    net,
    lastWeeks: fullWeeks,
    anomaly: { wishlists: fullWeeks.every((v) => v != null) && isAnomaly(fullWeeks), deleteRate: rate != null && rate > 0.15 },
    weekly: weekly(net, today),
    tab: {
      total: tile(totalNet, total(net.filter((p) => p.date > addDays(today, -7))), stale),
      deleteRate: tile(rate, rate != null && prevRate != null ? rate - prevRate : null, stale),
      conversion: tile(ratio(total(wishlists), total(visits)), null, false),
      pace: { ...pace({ total: totalNet, weeklyNet, today, launchDate }), launchDate },
      daily,
      utm,
    },
  }
}

// Spotify and Bandcamp arrive by CSV (Task 13); until then the tab is all empty.
function musicTab() {
  return { listeners: tile(null, null, false), saveRate: tile(null, null, false), streamsPerListener: tile(null, null, false), streams: [], releases: [] }
}

// Mean engagement per post across the newest snapshot of the feed.
async function postEngagement(db, source) {
  const rows = await latestRows(db, { source, metric: 'engagement' })
  const newest = rows.reduce((d, r) => (r.date > d ? r.date : d), '')
  return rows.filter((r) => r.date === newest)
}

async function platform(c, name) {
  const { db, today, from30 } = c
  if (name === 'youtube') {
    // The connector pulls no subscriber count or likes, only daily gains and losses.
    const [gained, lost] = await Promise.all(['subs_gained', 'subs_lost'].map((metric) => series(db, { source: 'youtube', metric, from: from30, to: today })))
    const delta30 = gained.length || lost.length ? (total(gained) ?? 0) - (total(lost) ?? 0) : null
    return { followers: null, delta30, engagement: null }
  }
  const f = await snapshot(db, name, 'followers', from30)
  let engagement = null
  if (name === 'bluesky') {
    // Bluesky gives no reach, so the rate is per-post engagement ÷ followers.
    engagement = engagementRate(mean((await postEngagement(db, 'bluesky')).map((r) => r.value)), f.value)
  } else if (name === 'instagram') {
    const reach = await series(db, { source: 'instagram', metric: 'reach', from: from30, to: today })
    engagement = engagementRate(mean((await postEngagement(db, 'instagram')).map((r) => r.value)), mean(reach.map((r) => r.value)))
  } else {
    // Typed-in TikTok/X give no reach either: 28-day engagement ÷ followers.
    engagement = engagementRate((await latest(db, { source: name, metric: 'engagement_28d' }))?.value ?? null, f.value)
  }
  return { followers: f.value, delta30: f.delta, engagement }
}

async function topPost(db, platformName, metric, rows) {
  const best = rows.reduce((b, r) => (!b || r.value > b.value ? r : b), null)
  if (!best) return null
  const item = (await items(db, platformName)).find((i) => i.id === best.dim)
  return { platform: platformName, title: item?.title ?? null, url: item?.url ?? null, metric, value: best.value }
}

async function socialTab(c) {
  const { db, today, from30 } = c
  const clicksBy = (rows) => {
    const out = {}
    for (const r of rows) if (SOCIAL_HOSTS[r.dim]) out[SOCIAL_HOSTS[r.dim]] = (out[SOCIAL_HOSTS[r.dim]] ?? 0) + r.value
    return out
  }
  const [refs, prevRefs] = await Promise.all([
    dims(db, { source: 'goatcounter', metric: 'referrer_visits', from: from30, to: today }),
    dims(db, { source: 'goatcounter', metric: 'referrer_visits', from: addDays(from30, -30), to: addDays(from30, -1) }),
  ])
  const clicks = clicksBy(refs)
  const sumClicks = (rows, by) => (rows.length ? sum(Object.values(by)) ?? 0 : null)
  const platforms = await Promise.all(['youtube', 'bluesky', 'instagram', 'tiktok', 'x'].map(async (p) => ({
    platform: p,
    ...(await platform(c, p)),
    // GoatCounter lists only hosts that sent visits, so once it has data an absent host is 0
    clicks: refs.length ? clicks[p] ?? 0 : null,
  })))
  const present = (k) => platforms.map((p) => p[k]).filter((v) => v != null)
  const autoStale = c.stale('youtube', 'bluesky', 'instagram')

  const videos = (await dims(db, { source: 'youtube', metric: 'views', from: from30, to: today })).filter((r) => r.dim)
  const posts = await Promise.all([
    topPost(db, 'youtube', 'views', videos),
    postEngagement(db, 'bluesky').then((rows) => topPost(db, 'bluesky', 'engagement', rows)),
    postEngagement(db, 'instagram').then((rows) => topPost(db, 'instagram', 'engagement', rows)),
  ])
  return {
    clicks: tile(sumClicks(refs, clicks), growth(sumClicks(refs, clicks), sumClicks(prevRefs, clicksBy(prevRefs))), c.stale('goatcounter')),
    engagement: tile(mean(present('engagement')), null, autoStale),
    followers: tile(sum(present('followers')), sum(present('delta30')), autoStale),
    platforms,
    posts: posts.filter(Boolean),
  }
}

async function newsTab(c) {
  const { db, today } = c
  const stale = c.stale('beehiiv')
  const [subs, week, posts, stats] = await Promise.all([
    series(db, { source: 'beehiiv', metric: 'subscribers', from: EPOCH, to: today }),
    snapshot(db, 'beehiiv', 'subscribers', addDays(today, -6)),
    items(db, 'beehiiv'),
    latestRows(db, { source: 'beehiiv', metric: '*' }),
  ])
  const stat = (metric, id) => stats.find((s) => s.metric === metric && s.dim === id)?.value ?? null
  const last5 = posts.slice(0, 5)
  const sent = last5.filter((p) => stat('recipients', p.id) && stat('unique_clicks', p.id) != null)
  // beehiiv reports open_rate as a percent; every rate here is a fraction
  const opens = last5.map((p) => stat('open_rate', p.id)).filter((v) => v != null).map((v) => v / 100)
  return {
    subs,
    tab: {
      subscribers: tile(week.value, week.delta, stale),
      clickRate: tile(ratio(sum(sent.map((p) => stat('unique_clicks', p.id))), sum(sent.map((p) => stat('recipients', p.id)))), null, stale),
      openRate: tile(mean(opens), null, stale),
      weekly: weekly(diffs(subs), today),
      sends: last5.map((p) => ({
        id: p.id, title: p.title, url: p.url, date: p.date,
        clickRate: ratio(stat('unique_clicks', p.id), stat('recipients', p.id)),
        unsubscribes: stat('unsubscribes', p.id),
      })),
    },
  }
}

async function siteTab(c) {
  const { db, today, from30 } = c
  const range = { from: from30, to: today }
  const [visits, evs, referrers, utm] = await Promise.all([
    series(db, { source: 'goatcounter', metric: 'visits', ...range }),
    dims(db, { source: 'goatcounter', metric: 'event', ...range }),
    dims(db, { source: 'goatcounter', metric: 'referrer_visits', ...range }),
    series(db, { source: 'steam_traffic', metric: 'wishlists', dim: 'heartsaglow', ...range }),
  ])
  const ev = (path) => (evs.length ? evs.find((e) => e.dim === path)?.value ?? 0 : null)
  const actions = {}
  for (const e of evs) if (!e.dim.startsWith('out/')) actions[e.dim.split('/')[0]] = (actions[e.dim.split('/')[0]] ?? 0) + e.value
  return {
    funnel: funnel({ visits: total(visits), lookInside: ev('look-inside'), steamClicks: ev('out/store.steampowered.com'), utmWishlists: total(utm) }),
    visits,
    outbound: evs.filter((e) => e.dim.startsWith('out/')).map((e) => ({ to: e.dim.slice(4), value: e.value })),
    referrers: referrers.map((r) => ({ host: r.dim, value: r.value })),
    actions: Object.entries(actions).map(([action, value]) => ({ action, value })).sort((a, b) => b.value - a.value),
  }
}

// itch earnings are lifetime snapshots: this month = latest − last snapshot before the 1st.
// Bandcamp and Steam revenue come by CSV later and stay absent until then.
async function earningsTab(c) {
  const metric = 'earnings_cents_*'
  const [nowRows, startRows] = await Promise.all([
    latestRows(c.db, { source: 'itch', metric }),
    latestRows(c.db, { source: 'itch', metric, before: c.today.slice(0, 8) + '01' }),
  ])
  const start = new Map(startRows.map((r) => [`${r.metric}|${r.dim}`, r.value]))
  const rows = nowRows
    .filter((r) => start.has(`${r.metric}|${r.dim}`))
    .map((r) => ({ source: 'itch', currency: r.metric.slice('earnings_cents_'.length), cents: r.value - start.get(`${r.metric}|${r.dim}`) }))
  return { ...earningsThisMonth(rows), stale: c.stale('itch') }
}

/** @returns {Promise<View>} */
export async function buildView(db, { now, env }) {
  const today = now.toISOString().slice(0, 10)
  const [lastSeen, health, allEvents] = await Promise.all([getSetting(db, 'last_seen'), buildHealth(db, env, now), events(db, { from: EPOCH, to: today })])
  const bad = new Set(health.filter((h) => h.state === 'stale' || h.state === 'broken').map((h) => h.source))
  const c = { db, today, from30: addDays(today, -29), stale: (...sources) => sources.some((s) => bad.has(s)) }

  const [game, social, news, site, earnings, itchViews, ytViews] = await Promise.all([
    gameTab(c), socialTab(c), newsTab(c), siteTab(c), earningsTab(c),
    latestRows(db, { source: 'itch', metric: 'views' }),
    series(db, { source: 'youtube', metric: 'views', from: addDays(today, -27), to: today }),
  ])
  const [wish, subs] = sinceLast([
    { source: 'steam', metric: 'net_wishlists', kind: 'flow', points: game.net },
    { source: 'beehiiv', metric: 'subscribers', kind: 'snapshot', points: news.subs },
  ], lastSeen)
  const byPlatform = Object.fromEntries(social.platforms.map((p) => [p.platform, p]))
  const [prevWeek, lastWeek] = game.lastWeeks.slice(-2)

  return {
    asOf: now.toISOString(),
    lastSeen,
    health,
    events: allEvents,
    overview: {
      since: { wishlists: wish.delta, subscribers: subs.delta },
      anomaly: game.anomaly,
      tiles: { wishlists: tile(lastWeek, growth(lastWeek, prevWeek), c.stale('steam')), newsletter: news.tab.subscribers, listeners: musicTab().listeners },
      strip: {
        wishlists: game.tab.total.value,
        itchViews: total(itchViews),
        bandcampSales30d: null,
        youtubeViews28d: total(ytViews),
        blueskyFollowers: byPlatform.bluesky.followers,
        instagramEngagement: byPlatform.instagram.engagement,
        tiktokFollowers: byPlatform.tiktok.followers,
        siteVisits30d: site.funnel[0].value,
      },
      weekly: game.weekly,
    },
    game: game.tab,
    music: musicTab(),
    social,
    news: news.tab,
    site,
    earnings,
  }
}

export const dashboardRoute = async (request, env, ctx, param, now = new Date()) => json(await buildView(env.DB, { now, env }), 200)

export const seenRoute = async (request, env, ctx, param, now = new Date()) => {
  await setSetting(env.DB, 'last_seen', now.toISOString())
  return new Response(null, { status: 204 })
}

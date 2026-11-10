// The dashboard page: fetch the View (stats/src/view.js), render the approved mockup's tabs from it, wire the forms.
const TZ = 'America/Denver'
const BRONZE = 5000
const DAY = 864e5
const DASH = '—'
const NAMES = {
  steam: 'Steam', itch: 'itch.io', bluesky: 'Bluesky', beehiiv: 'beehiiv', goatcounter: 'GoatCounter', youtube: 'YouTube',
  instagram: 'Instagram', apple: 'Apple Music', tiktok: 'TikTok', x: 'X', spotify: 'Spotify', bandcamp: 'Bandcamp', steam_traffic: 'Steam traffic',
}
const OAUTH = ['youtube', 'instagram']
// Mirrors MANUAL_METRICS and EVENT_KINDS in src/manual.js; the server rejects anything else.
const METRICS = { apple: ['listeners_28d', 'plays_28d'], tiktok: ['followers', 'engagement_28d'], x: ['followers', 'engagement_28d'] }
const METRIC_LABELS = { listeners_28d: 'Listeners · 28d', plays_28d: 'Plays · 28d', followers: 'Followers', engagement_28d: 'Engagements · 28d' }
const KINDS = [['trailer', 'Trailer / video'], ['release', 'Release'], ['newsletter', 'Newsletter send'], ['post', 'Post'], ['festival', 'Festival / sale'], ['other', 'Other']]

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
const num = (v, d = 0) => (v == null ? DASH : v.toLocaleString('en-US', { maximumFractionDigits: d }))
const pct = (f, d = 1) => (f == null ? DASH : (f * 100).toLocaleString('en-US', { maximumFractionDigits: d }) + '%')
const signed = (v, f = num) => (v == null ? DASH : (v > 0 ? '+' : v < 0 ? '−' : '') + f(Math.abs(v)))
// A bare YYYY-MM-DD is a calendar date, so it stays in UTC; a timestamp is shown in Denver time.
const day = (s, opts = { month: 'short', day: 'numeric' }) =>
  s == null ? DASH : new Intl.DateTimeFormat('en-US', { ...opts, timeZone: s.length === 10 ? 'UTC' : TZ }).format(new Date(s))
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const money = (cents, cur) => {
  try { return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: cur }) } catch { return `${num(cents / 100, 2)} ${esc(cur)}` }
}

let view = null
let charts = {}
let sparks = {}
const drawn = new Set()
const $views = document.getElementById('views')

// ---- pieces ----

// A context line that follows a delta gets a separator; alone it reads as a sentence.
const after = (t, text) => (t.delta == null ? text : '· ' + text)
const staleMark = (t) => (t.stale ? '<span class="src warn">stale</span>' : '')

// One tile: a null value reads —, a stale source is marked, the arrow shows only when there is a delta.
function tile(label, t, { fmt = num, delta = num, ctx = '', spark, src = '', cls = '', extra = '' } = {}) {
  const d = t.delta == null ? '' : `<i>${t.delta > 0 ? '▲' : t.delta < 0 ? '▼' : ''} ${delta(Math.abs(t.delta))}</i> `
  return `<div class="pane tile${t.stale ? ' stale' : ''} ${cls}">
    <div class="lbl">${label}${src}${staleMark(t)}</div>
    <div class="v">${t.value == null ? DASH : fmt(t.value)}</div>
    <div class="delta${t.delta < 0 ? ' down' : ''}">${d}${ctx}</div>${extra}
    ${spark && sparks[spark]?.length > 1 ? `<svg data-spark="${spark}"></svg>` : ''}</div>`
}

const head = (title, right = '') => `<div class="chart-head"><span class="lbl">${title}</span>${right && `<span class="lbl">${right}</span>`}</div>`

const chartPane = (key, title, right) =>
  `<div class="pane chart">${head(title, right)}<svg data-chart="${key}"></svg>${charts[key].points.length ? '' : '<div class="empty">No data yet</div>'}<div class="tip"></div></div>`

const none = '<p class="none">No data yet</p>'
function table(cols, rows) {
  if (!rows.length) return none
  return `<table><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`
}
const bar = (v, max) => (v > 0 && max > 0 ? `<span class="bar" style="width:${Math.round((v / max) * 60)}px"></span>` : '')
const maxOf = (xs) => Math.max(0, ...xs.filter((x) => x != null))
const link = (text, url) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text))

// Inert until the CSV importers land.
const drop = (what) => `<div class="pane drop"><span class="glyph">↥</span><span>${what}</span><span class="lbl">CSV import coming soon</span></div>`

const lastEntry = (source) => view.health.find((h) => h.source === source)?.since ?? null

function entryForm(source) {
  return `<div class="pane chart">${head(`Type in ${NAMES[source]} numbers`, `last · ${day(lastEntry(source))}`)}
    <form class="entry" data-source="${source}">
      <label><span class="lbl">Date</span><input type="date" name="date" required value="${today()}" max="${today()}"></label>
      ${METRICS[source].map((m) => `<label><span class="lbl">${METRIC_LABELS[m]}</span><input type="number" name="${m}" min="0" step="any" inputmode="decimal"></label>`).join('')}
      <button class="go">Save</button>
    </form><p class="err" role="alert"></p></div>`
}

function chip(h) {
  const label = NAMES[h.source] ?? h.source
  const name = `<b>${esc(label)}</b>`
  const since = h.since ? day(h.since) : 'never'
  switch (h.state) {
    case 'ok': return `<span class="chip">${name}${since}</span>`
    case 'stale': return `<span class="chip warn">${name}stale · last ${since}</span>`
    case 'broken': {
      // Connector errors lead with the source name, which the chip already shows.
      const m = String(h.message ?? 'error')
      const msg = esc(m.toLowerCase().startsWith(label.toLowerCase() + ':') ? m.slice(label.length + 1).trim() : m)
      return `<span class="chip warn">${name}${OAUTH.includes(h.source) ? `<a href="/api/connect/${h.source}">${msg}</a>` : msg}</span>`
    }
    case 'waiting': return `<span class="chip">${name}${esc(h.message ?? 'waiting')}</span>`
    case 'manual': return `<span class="chip${h.message ? ' warn' : ''}">${name}${[h.since && since, h.message && esc(h.message)].filter(Boolean).join(' · ')}</span>`
    default: return `<span class="chip">${name}off</span>`
  }
}

// ---- chart data ----

const weekSeries = (weeks, what) => ({
  step: 7 * DAY,
  points: weeks.map((w) => ({ t: Date.parse(w.week), v: w.value, date: w.week })),
  tip: (p) => `Week of ${day(p.date)}<b>${signed(p.v)} ${what}</b>`,
})
const daySeries = (points, tip) => ({ step: DAY, points: points.map((p) => ({ t: Date.parse(p.date), v: p.value, date: p.date })), tip })

// ---- tabs ----

function overview(v) {
  const o = v.overview
  const flags = []
  if (o.anomaly.wishlists) flags.push('Wishlists ran over 2× a normal week.')
  if (o.anomaly.deleteRate) flags.push('Delete rate is above 15% over 4 weeks.')
  const seen = v.lastSeen ? day(v.lastSeen, { weekday: 'long', month: 'short', day: 'numeric' }) : 'first visit'
  const e = v.earnings
  const list = (byCur) => Object.entries(byCur).map(([cur, c]) => money(c, cur)).join(' · ')
  const s = o.strip
  const cell = (label, t, f = num) => `<div${t.stale ? ' class="stale"' : ''}><span class="lbl">${label}${t.stale ? ' · stale' : ''}</span><b>${t.value == null ? DASH : f(t.value)}</b></div>`
  return `
    <div class="pane since">
      <span class="lbl">Since you last looked · ${seen}</span>
      <span class="big">${signed(o.since.wishlists)} wishlists</span>
      <span class="rest">${signed(o.since.subscribers)} subscribers</span>
      ${flags.map((f) => `<div class="flag">⚑ ${f} <a href="#log">What happened?</a></div>`).join('')}
    </div>
    <div class="tiles four">
      ${tile('Net wishlists / week', o.tiles.wishlists, { fmt: (x) => signed(x), delta: (x) => pct(x, 0), ctx: 'vs the week before', spark: 'wish' })}
      ${tile('Newsletter', o.tiles.newsletter, { ctx: 'this week', spark: 'news' })}
      ${tile('Apple Music listeners', o.tiles.listeners, { ctx: o.tiles.listeners.delta == null ? 'Apple Music · 28 days' : 'since last entry' })}
      <div class="pane tile earn${e.stale ? ' stale' : ''}">
        <div class="lbl">Earned this month${staleMark(e)}</div>
        <div class="v">${list(e.total) || DASH}</div>
        <ul>${Object.entries(e.bySource).map(([src, byCur]) => `<li><span>${esc(NAMES[src] ?? src)}</span><span>${list(byCur)}</span></li>`).join('')}</ul>
        <div class="delta">Bandcamp · Steam: CSV import coming soon</div>
      </div>
    </div>
    <div class="pane strip">
      ${cell('Wishlists', s.wishlists)}
      ${cell('itch views', s.itchViews)}
      ${cell('Bandcamp · 30d', s.bandcampSales30d, (x) => `${num(x)} sales`)}
      ${cell('YouTube · 28d', s.youtubeViews28d, (x) => `${num(x)} views`)}
      ${cell('Bluesky', s.blueskyFollowers)}
      ${cell('Instagram', s.instagramEngagement, (x) => `${pct(x)} eng.`)}
      ${cell('TikTok', s.tiktokFollowers)}
      ${cell('Site visits · 30d', s.siteVisits30d)}
    </div>
    ${chartPane('weekly', 'Net wishlists · 12 weeks', 'hover for detail')}`
}

function game(v) {
  const g = v.game
  const share = g.total.value == null ? null : g.total.value / BRONZE
  const p = g.pace
  const track = p.onTrack == null ? '' : p.onTrack
    ? ` · <i>on track</i> for ${day(p.launchDate)}`
    : ` · <span class="warn">behind</span> for ${day(p.launchDate)}`
  const pace = p.reachDate ? `<div class="delta pace">At this pace, 5k by ${day(p.reachDate, { month: 'long', year: 'numeric' })}${track}</div>` : ''
  const bench = `<div class="bench"><span style="width:${Math.min(100, Math.max(0, (share ?? 0) * 100))}%"></span></div>`
  const rate = g.deleteRate.value
  const rateCtx = rate == null ? 'median is 7.75%'
    : rate > 0.15 ? '<span class="warn">above 15%, worth a look</span>'
      : rate <= 0.0775 ? 'median is 7.75%, <i>healthy</i>' : 'median is 7.75%'
  const rateDelta = g.deleteRate.delta == null ? '' : ` · ${signed(g.deleteRate.delta * 100, (x) => num(x, 1))} pts vs prior 4 wk`
  const conv = g.conversion.value
  const maxConv = maxOf(g.utm.map((u) => u.conversion))
  return `
    <div class="tiles">
      ${tile('Wishlists', { ...g.total, delta: null }, { ctx: share == null ? 'bronze is 5k' : `${pct(share, 0)} of the way to <i>5k · bronze</i>`, extra: bench + pace })}
      ${tile('Delete rate · 4 wk', { ...g.deleteRate, delta: null }, { fmt: pct, ctx: rateCtx + rateDelta })}
      ${tile('Visit → wishlist', g.conversion, { fmt: pct, ctx: conv == null ? 'from the Steam traffic CSV' : conv >= 0.08 ? 'floor is 8%, <i>above it</i>' : 'floor is 8%' })}
    </div>
    ${chartPane('daily', 'Daily adds − deletes · 7-day average', '90 days')}
    <div class="two">
      <div class="pane chart">${head('Where wishlists come from · UTM')}
        ${table(['Source', 'Visits', 'Wishlists', 'Conv.'], g.utm.map((u) => [esc(u.source), num(u.visits), num(u.wishlists), pct(u.conversion) + bar(u.conversion, maxConv)]))}
      </div>
      ${drop("Drop this week's Steam traffic CSV")}
    </div>`
}

function music(v) {
  const m = v.music
  const typed = '<span class="src">typed</span>'
  return `
    <div class="tiles four">
      ${tile('Listeners · 28d', m.listeners, { src: typed, ctx: after(m.listeners, 'Apple Music') })}
      ${tile('Plays · 28d', m.applePlays, { src: typed, ctx: after(m.applePlays, 'Apple Music') })}
      ${tile('Save rate · 28d', m.saveRate, { fmt: pct, ctx: 'saves ÷ streams · <i>3–5% is good</i>' })}
      ${tile('Streams per listener', m.streamsPerListener, { fmt: (x) => num(x, 1), ctx: 'ambient runs high' })}
    </div>
    ${chartPane('streams', 'Streams per week', 'Spotify · YouTube')}
    <div class="two">
      <div class="pane chart">${head('By release · 28 days', 'ranked by save rate')}
        ${none /* ponytail: release rows arrive with the CSV importers, which define their shape */}
        <p class="note">Compared release against release, not against pop benchmarks.</p>
      </div>
      <div class="stack">
        ${drop('Drop Spotify for Artists or Bandcamp CSV')}
        ${entryForm('apple')}
      </div>
    </div>`
}

function social(v) {
  const s = v.social
  const maxClicks = maxOf(s.platforms.map((p) => p.clicks))
  const kind = { tiktok: 'typed · until approved', x: 'typed' }
  return `
    <div class="tiles">
      ${tile('Clicks to the site · 30d', s.clicks, { delta: (x) => pct(x, 0), ctx: after(s.clicks, 'the one that matters') })}
      ${tile('Engagement · 30d avg', s.engagement, { fmt: pct, ctx: 'likes + replies + shares ÷ reach' })}
      ${tile('Followers · all', s.followers, { ctx: after(s.followers, 'shown, not chased') })}
    </div>
    <div class="pane chart">${head('By platform · 30 days')}
      ${table(['Platform', 'Followers', 'Change', 'Engagement', 'Clicks to site'], s.platforms.map((p) => [
        `${NAMES[p.platform]} <span class="src${kind[p.platform] ? '' : ' auto'}">${kind[p.platform] ?? 'auto'}</span>`,
        num(p.followers), signed(p.delta), pct(p.engagement), num(p.clicks) + bar(p.clicks, maxClicks),
      ]))}
      <p class="note">Change is over 30 days for auto platforms, since the previous entry for typed ones.</p>
    </div>
    <div class="pane chart mt">${head('Top posts · 30 days', 'by views or engagement')}
      ${s.posts.length ? s.posts.map((p) => `<div class="post"><span class="kind">${NAMES[p.platform]}</span><p>${link(p.title ?? 'Untitled', p.url)}</p><span>${num(p.value)} ${p.metric === 'views' ? 'views' : 'engagements'}</span></div>`).join('') : none}
    </div>
    <div class="two">${entryForm('tiktok')}${entryForm('x')}</div>`
}

function news(v) {
  const n = v.news
  const maxRate = maxOf(n.sends.map((x) => x.clickRate))
  return `
    <div class="tiles">
      ${tile('Subscribers', n.subscribers, { src: '<span class="src auto">beehiiv</span>', ctx: 'this week', spark: 'news' })}
      ${tile('Click rate · last 5', n.clickRate, { fmt: pct, ctx: 'bot-filtered clicks' })}
      ${tile('Open rate', n.openRate, { fmt: (x) => pct(x, 0), ctx: 'inflated by Apple Mail · shown small on purpose', cls: 'muted' })}
    </div>
    ${chartPane('subs', 'Net subscribers per week', 'events marked')}
    <div class="pane chart mt">${head('Recent sends')}
      ${table(['Issue', 'Sent', 'Clicks', 'Unsubs'], n.sends.map((x) => [link(x.title ?? 'Untitled', x.url), day(x.date?.slice(0, 10)), pct(x.clickRate) + bar(x.clickRate, maxRate), num(x.unsubscribes)]))}
    </div>`
}

function site(v) {
  const s = v.site
  const label = { visits: 'Visits', look_inside: 'Looked inside OTO', steam_clicks: 'Clicked to Steam', wishlists: 'Wishlisted' }
  const next = ['open OTO', 'click Steam', 'wishlist']
  const list = (cols, rows) => {
    const max = maxOf(rows.map((r) => r[1]))
    return table(cols, rows.map(([k, val]) => [esc(k), num(val) + bar(val, max)]))
  }
  return `
    <div class="pane chart mb">${head('From the site to a wishlist · 30 days', 'GoatCounter → Steam UTM')}
      <div class="funnel">${s.funnel.map((f, i) => `<div><span class="lbl">${label[f.step] ?? esc(f.step)}</span><b>${num(f.value)}</b>${
        i < s.funnel.length - 1 ? `<span class="arrow">→ ${pct(s.funnel[i + 1].rate, 0)} ${next[i]}</span>` : '<span class="lbl">utm_source=heartsaglow</span>'}</div>`).join('')}
      </div>
    </div>
    ${chartPane('visits', 'Visits per day · 30 days')}
    <div class="three">
      <div class="pane chart">${head('Outbound clicks')}${list(['To', 'Clicks'], s.outbound.map((o) => [o.to, o.value]))}</div>
      <div class="pane chart">${head('Referrers')}${list(['From', 'Visits'], s.referrers.map((r) => [r.host || 'direct', r.value]))}</div>
      <div class="pane chart">${head('On the site')}${list(['Action', 'Count'], s.actions.map((a) => [a.action, a.value]))}</div>
    </div>`
}

function log(v) {
  const kindLabel = Object.fromEntries(KINDS)
  const tomorrow = new Date(Date.parse(today()) + DAY).toISOString().slice(0, 10)
  return `
    <div class="pane chart mb">${head('Mark something that happened', 'appears on every chart')}
      <form class="logf" data-post="log">
        <label><span class="lbl">Date</span><input type="date" name="date" required value="${today()}" max="${today()}"></label>
        <label><span class="lbl">Kind</span><select name="kind">${KINDS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
        <label><span class="lbl">What</span><input name="text" required maxlength="140" placeholder="e.g. OTO devlog #1 on YouTube"></label>
        <button class="go">Add</button>
      </form><p class="err" role="alert"></p>
    </div>
    <div class="pane chart mb">${head('Launch date', 'turns pace into on track / behind')}
      <form class="entry" data-post="settings">
        <label><span class="lbl">Date</span><input type="date" name="value" value="${esc(v.game.pace.launchDate ?? '')}" min="${tomorrow}"></label>
        <button class="go">Save</button>
      </form><p class="err" role="alert"></p>
      <p class="note">Save it empty to clear it.</p>
    </div>
    <div class="pane chart">${head('Timeline')}
      ${v.events.length ? [...v.events].reverse().map((e) => `<div class="post"><span class="kind">${esc(kindLabel[e.kind]?.split(' /')[0] ?? e.kind)}</span><p>${esc(e.text)}</p><span>${day(e.date)}</span></div>`).join('') : none}
    </div>`
}

const TABS = { overview, game, music, social, news, site, log }

// ---- svg, ported from the mockup ----

const NS = 'http://www.w3.org/2000/svg'
const el = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); p && p.appendChild(e); return e }
const smooth = (pts) => pts.map((p, i) => { if (!i) return `M${p[0]},${p[1]}`; const q = pts[i - 1], c = (p[0] - q[0]) / 2; return `C${q[0] + c},${q[1]} ${p[0] - c},${p[1]} ${p[0]},${p[1]}` }).join('')
let gid = 0
const fill = (svg, op) => { const id = 'g' + gid++, g = el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, el('defs', {}, svg)); el('stop', { offset: 0, 'stop-color': '#dff4ff', 'stop-opacity': op }, g); el('stop', { offset: 1, 'stop-color': '#dff4ff', 'stop-opacity': 0 }, g); return `url(#${id})` }
const axisLabel = (v) => (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(+v.toFixed(2)))

function spark(svg, data) {
  const w = svg.clientWidth, h = 44, lo = Math.min(...data), hi = Math.max(...data)
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 4 - ((v - lo) / (hi - lo || 1)) * (h - 10)])
  el('path', { d: smooth(pts) + `L${w},${h}L0,${h}Z`, fill: fill(svg, 0.22) }, svg)
  const line = el('path', { d: smooth(pts), fill: 'none', stroke: '#dff4ff', 'stroke-width': 1.5, 'stroke-linecap': 'round', class: 'draw' }, svg)
  line.style.setProperty('--len', line.getTotalLength())
  const [x, y] = pts.at(-1); el('circle', { cx: x, cy: y, r: 3, fill: '#dff4ff' }, svg)
}

// x is time, not index, so gaps in the data stay gaps and Log events land on their date.
function chart(svg, cfg) {
  const W = svg.clientWidth, H = 220, L = 40, R = 8, T = 22, B = 24
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  const data = cfg.points
  if (!data.length) return
  const vals = data.map((p) => p.v)
  const top = Math.max(0, ...vals), bot = Math.min(0, ...vals)
  // Four gridlines on a 1/2/2.5/5 step, so the axis reads 0 · 1k · 2k, never 875.
  const raw4 = (top - bot) / 4 || 1, mag = Math.pow(10, Math.floor(Math.log10(raw4)))
  const step = mag * [1, 2, 2.5, 5, 10].find((m) => m * mag >= raw4)
  const lo = Math.floor(bot / step) * step, hi = Math.max(lo + 4 * step, Math.ceil(top / step) * step)
  const t0 = data[0].t, span = data.at(-1).t - t0 || 1
  const X = (t) => L + ((t - t0) / span) * (W - L - R), Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const grid = el('g', { class: 'grid axis' }, svg)
  for (let v = lo; v <= hi + step / 2; v += step) { el('line', { x1: L, x2: W - R, y1: Y(v), y2: Y(v) }, grid); el('text', { x: L - 8, y: Y(v) + 3, 'text-anchor': 'end' }, grid).textContent = axisLabel(v) }
  const ax = el('g', { class: 'axis' }, svg)
  const ticks = data.length < 2 ? 1 : W < 500 ? 3 : 4 // three on a phone, so dates don't run together
  for (let k = 0; k < ticks; k++) {
    const t = t0 + (ticks > 1 ? (k / (ticks - 1)) * span : 0)
    el('text', { x: X(t), y: H - 4, 'text-anchor': k ? (k === ticks - 1 ? 'end' : 'middle') : 'start' }, ax).textContent = day(new Date(t).toISOString().slice(0, 10))
  }
  // Every Log entry is a marker; a label that would collide with the previous one is dropped, its line stays.
  const inPoint = (e, p) => e.t >= p.t && e.t < p.t + cfg.step
  const evs = view.events.map((e) => ({ ...e, t: Date.parse(e.date) })).filter((e) => e.t >= t0 && e.t < data.at(-1).t + cfg.step)
  const ev = el('g', { class: 'ev' }, svg)
  let lastLabel = -Infinity
  for (const e of evs) {
    const x = Math.min(X(e.t), W - R)
    el('line', { x1: x, x2: x, y1: T - 8, y2: H - B }, ev)
    if (x - lastLabel < 90) continue
    lastLabel = x
    const right = x > W - 90
    el('text', { x: right ? x - 5 : x + 5, y: T - 2, 'text-anchor': right ? 'end' : 'start' }, ev).textContent = e.kind
  }
  const pts = data.map((p) => [X(p.t), Y(p.v)])
  el('path', { d: smooth(pts) + `L${pts.at(-1)[0]},${H - B}L${pts[0][0]},${H - B}Z`, fill: fill(svg, 0.25) }, svg)
  const line = el('path', { d: smooth(pts), fill: 'none', stroke: '#dff4ff', 'stroke-width': 2, 'stroke-linecap': 'round', class: 'draw' }, svg)
  line.style.setProperty('--len', line.getTotalLength())
  // Crosshair + tooltip; the hit area is the whole plot, not the 2px line.
  const cross = el('line', { y1: T, y2: H - B, stroke: 'rgba(223,244,255,.35)', opacity: 0 }, svg)
  const dot = el('circle', { r: 4, fill: '#08070b', stroke: '#dff4ff', 'stroke-width': 2, opacity: 0 }, svg)
  const tip = svg.parentNode.querySelector('.tip')
  const hit = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' }, svg)
  hit.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect(), t = t0 + ((e.clientX - r.left - L) / (W - L - R)) * span
    const i = data.reduce((best, p, k) => (Math.abs(p.t - t) < Math.abs(data[best].t - t) ? k : best), 0)
    const p = data[i], [x, y] = pts[i]
    const hitEv = evs.filter((e) => inPoint(e, p)).map((e) => esc(e.text)).join(' · ')
    cross.setAttribute('x1', x); cross.setAttribute('x2', x); dot.setAttribute('cx', x); dot.setAttribute('cy', y)
    cross.setAttribute('opacity', 1); dot.setAttribute('opacity', 1)
    tip.innerHTML = cfg.tip(p).replace('<b>', hitEv ? ` · ${hitEv}<b>` : '<b>')
    tip.style.opacity = 1
    tip.style.left = (x > W - 200 ? x - 150 : x + 32) + 'px'; tip.style.top = (y + 20) + 'px'
  })
  hit.addEventListener('pointerleave', () => { cross.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); tip.style.opacity = 0 })
}

// ---- page ----

// Charts measure their width, so a tab draws the first time it is shown.
function draw(name) {
  if (!view || drawn.has(name)) return
  drawn.add(name)
  document.querySelectorAll(`#v-${name} [data-spark]`).forEach((s) => spark(s, sparks[s.dataset.spark]))
  document.querySelectorAll(`#v-${name} [data-chart]`).forEach((s) => chart(s, charts[s.dataset.chart]))
}

function show(name) {
  if (!TABS[name]) name = 'overview'
  document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.v === name))
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('on', v.id === 'v-' + name))
  draw(name)
}

function render(v) {
  view = v
  charts = {
    weekly: weekSeries(v.overview.weekly, 'wishlists'),
    daily: daySeries(v.game.daily, (p) => `${day(p.date)}<b>${num(p.v, 1)} net / day · 7-day avg</b>`),
    streams: weekSeries(v.music.streams, 'streams'),
    subs: weekSeries(v.news.weekly, 'subscribers'),
    visits: daySeries(v.site.visits, (p) => `${day(p.date)}<b>${num(p.v)} visits</b>`),
  }
  sparks = { wish: v.overview.weekly.map((w) => w.value), news: v.news.weekly.map((w) => w.value) }
  const synced = v.health.map((h) => h.since).filter((s) => s?.length > 10).sort().at(-1)
  document.getElementById('stamp').textContent = synced ? `Synced ${day(synced, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}` : 'Not synced yet'
  // Problems first, so the chips that need a hand are the first ones read.
  const rank = (h) => ({ broken: 0, stale: 1, waiting: 2, manual: h.message ? 3 : 4, ok: 4, off: 5 })[h.state] ?? 5
  document.getElementById('health').innerHTML = [...v.health].sort((a, b) => rank(a) - rank(b)).map(chip).join('')
  $views.innerHTML = Object.entries(TABS).map(([name, f]) => `<section class="view" id="v-${name}">${f(v)}</section>`).join('')
  drawn.clear()
  show(location.hash.slice(1))
}

// Resolves to the server's error text, or null on success.
async function post(path, body) {
  try {
    const res = await fetch(path, { method: 'POST', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body && JSON.stringify(body) })
    if (res.ok) return null
    return (await res.json().catch(() => null))?.error ?? `${res.status} ${res.statusText}`
  } catch {
    return 'could not reach the server'
  }
}

let seen = false
async function load() {
  let v
  try {
    const res = await fetch('/api/dashboard')
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    v = await res.json()
  } catch (e) {
    $views.innerHTML = `<p class="pane load">Couldn't load the dashboard: ${esc(e.message)}</p>`
    return
  }
  render(v)
  // Marked only after the page has shown the "since you last looked" numbers.
  if (!seen) { seen = true; post('/api/seen') }
}

$views.addEventListener('submit', async (e) => {
  e.preventDefault()
  const f = e.target, data = Object.fromEntries(new FormData(f)), out = f.nextElementSibling, btn = f.querySelector('button')
  let path, body
  if (f.dataset.source) {
    const values = {}
    for (const [k, val] of Object.entries(data)) if (k !== 'date' && val !== '') values[k] = Number(val)
    path = '/api/manual'
    body = { source: f.dataset.source, date: data.date, values }
  } else if (f.dataset.post === 'log') {
    path = '/api/log'
    body = data
  } else {
    path = '/api/settings'
    body = { key: 'launch_date', value: data.value }
  }
  btn.disabled = true
  const error = await post(path, body)
  btn.disabled = false
  out.textContent = error ?? ''
  if (!error) load()
})

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { location.hash = t.dataset.v }))
addEventListener('hashchange', () => show(location.hash.slice(1)))
load()

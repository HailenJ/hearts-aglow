# Stats Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A private dashboard at `stats.heartsaglow.io` that pulls Hailen's game, music, social, newsletter and site stats daily, takes the rest by typed entry or CSV, and shows snapshot, trend and since-last-visit views.

**Architecture:** One Cloudflare Worker in `stats/` (its own `package.json`, isolated from the public site). It serves a static page from `stats/public/`, a JSON API under `/api/*`, and a daily Cron Trigger that runs independent connectors and writes dated readings to D1. Cloudflare Access guards the hostname; the Worker re-verifies the Access JWT on every request. All derived numbers are pure functions over readings, computed server-side into one view model.

**Tech Stack:** Cloudflare Workers + D1 + Cron Triggers + Static Assets, Wrangler, `jose` (Access JWT, per Cloudflare's own example), plain HTML/CSS/JS page (no build step), `node:test` with a `node:sqlite` stand-in for D1.

**Spec:** `docs/superpowers/specs/2026-11-10-stats-dashboard-design.md`. Visual reference: `.superpowers/brainstorm/92854-1794337032/content/layout-b4.html` (gitignored, local only).

## Global Constraints

- No API key, token or secret ever reaches the browser or the repo; secrets via `wrangler secret put`, OAuth tokens in D1.
- Every request (page, assets, API) requires a valid Access JWT: `assets.run_worker_first: true`, `workers_dev: false`.
- The public site (`src/`, root `package.json`, `.github/workflows/deploy.yml`) is not modified, except Task 12's UTM link change to content.
- Dates are stored as UTC `YYYY-MM-DD`; displayed in `America/Denver`.
- A missing value is stored as no row, never as `0`.
- Benchmarks (verbatim from spec): bronze = 5,000 wishlists; delete-rate median 7.75%, flag above 15% (4-week); visit → wishlist floor 8%; save rate 3–5%; anomaly = week > 2× trailing 4-week median.
- Steam app id `4433980`; UTM link `https://store.steampowered.com/app/4433980/OTO/?utm_source=heartsaglow&utm_medium=website`.
- Tests: `node:test`, no framework, run with `npm --prefix stats test`. No new dependencies beyond `wrangler` (dev) and `jose`.
- Visual: DESIGN.md tokens, signal cyan `#dff4ff` only for live data lines / selected tab / positive deltas, peach for markers and flags, no chromatic glow shadows, reduced-motion respected, one column under 767px, fonts self-hosted.

## Review Focus

1. **A source returns nothing or "not ready"** (Instagram empty set, beehiiv HTTP 202, itch with no games): no readings written, sync marked ok-with-no-data or retried, never zeros. → tests in Tasks 5, 6, 7.
2. **Sync runs twice in a day / re-fetches the last 3 Steam days**: readings upsert, nothing double-counts. → test in Task 1 (`upsertReadings` idempotent) and Task 5.
3. **Empty database (first deploy) or a source never connected**: dashboard returns a view model with `null`s and the page shows "no data yet", never `NaN`/`Infinity`; pace with zero or negative weekly net is `null`. → tests in Tasks 4 and 9.
4. **Missing, expired or wrong-audience Access JWT** on any path including `/` and `/style.css`: 403. → test in Task 2.
5. **Typed entry with a bad value** (negative, non-numeric, future date, unknown source/metric): 400 with a message, nothing stored. → test in Task 8.

---

## File Structure

```
stats/
  package.json              scripts: test, dev, deploy; deps: jose; devDeps: wrangler
  wrangler.jsonc            assets, D1 binding DB, cron, workers_dev false, custom domain
  migrations/0001_init.sql  schema
  src/index.js              fetch + scheduled entry; routes; auth gate
  src/auth.js               verifyAccess
  src/db.js                 all SQL lives here
  src/sync.js               runSync + connector registry
  src/health.js             sourceHealth
  src/derive.js             pure metrics
  src/view.js               buildView (the /api/dashboard model)
  src/manual.js             validate + store typed entries and log events
  src/oauth.js              connect/callback/refresh for youtube + instagram
  src/connectors/{steam,itch,bluesky,beehiiv,goatcounter,youtube,instagram}.js
  src/import/               CSV importers (Task 13, blocked on samples)
  public/index.html, app.js, style.css, fonts/
  test/d1.js                D1-compatible wrapper over node:sqlite
  test/*.test.js, test/fixtures/*.json
.github/workflows/stats.yml
docs/stats-setup.md
```

## Shared shapes (every task uses these)

```js
// A reading. dim is '' when the metric has no breakdown.
/** @typedef {{source:string, metric:string, dim:string, date:string, value:number}} Reading */
// An item gives a dim a human title (a post, a video, a newsletter issue, a release).
/** @typedef {{source:string, id:string, title:string, url:string|null, date:string|null}} Item */
// A connector. pull never writes; runSync does.
/** @typedef {{source:string, cadenceHours:number, pull:(env, deps:{fetch, today:string}) => Promise<{readings:Reading[], items?:Item[]}>}} Connector */
```

Metric names (exact; the view model and page key off them):

| source | metric | dim | kind |
|---|---|---|---|
| steam | `wishlist_adds`, `wishlist_deletes`, `wishlist_purchases`, `wishlist_gifts` | '' | daily flow |
| steam_traffic | `visits`, `wishlists` | utm source | period total (CSV) |
| itch | `views`, `downloads`, `purchases`, `earnings_cents_<CUR>` | game id | lifetime snapshot |
| youtube | `views`, `minutes_watched`, `subs_gained`, `subs_lost` | '' or video id | daily flow |
| bluesky | `followers` | '' | snapshot |
| bluesky | `engagement` (likes+reposts+replies+quotes) | post uri | snapshot |
| instagram | `followers`, `reach`, `views` | '' | snapshot / daily |
| instagram | `engagement` | media id | snapshot |
| beehiiv | `subscribers` | '' | snapshot |
| beehiiv | `recipients`, `unique_clicks`, `unsubscribes`, `open_rate` | post id | snapshot |
| goatcounter | `visits` | '' | daily flow |
| goatcounter | `referrer_visits` | host | daily flow |
| goatcounter | `event` | event path (e.g. `look-inside`, `out/store.steampowered.com`) | daily flow |
| apple, tiktok, x | `followers`, `listeners_28d`, `plays_28d`, `engagement_28d` | '' | typed snapshot |
| spotify, bandcamp | per Task 13 | release | CSV |

---

### Task 1: Scaffold, schema, data layer

**Files:**
- Create: `stats/package.json`, `stats/wrangler.jsonc`, `stats/migrations/0001_init.sql`, `stats/src/db.js`, `stats/test/d1.js`, `stats/test/db.test.js`
- Modify: `eslint.config.js` (add a `stats/**` block with `globals.worker` + `globals.node`), `.gitignore` (`stats/.wrangler/`, `stats/node_modules/`)

**Interfaces:**
- Produces: `upsertReadings(db, Reading[]) -> Promise<void>`, `upsertItems(db, Item[])`, `series(db, {source, metric, dim?, from, to}) -> Promise<{date,value}[]>` (ascending), `latest(db, {source, metric, dim?, before?}) -> Promise<{date,value}|null>`, `dims(db, {source, metric, from, to}) -> Promise<{dim, value}[]>` (summed over range), `getSetting(db, key) -> Promise<string|null>`, `setSetting(db, key, value)`, `recordSync(db, {source, ok, error?, at})`, `syncStatus(db) -> Promise<{source,last_ok,last_try,error}[]>`, `addEvent(db, {date, kind, text})`, `events(db, {from, to})`, `getToken/putToken(db, source, {access_token, refresh_token, expires_at, meta})`. `openTestDb() -> D1-like` from `test/d1.js` that applies `migrations/*.sql`.

- [ ] **Step 1: Write `stats/package.json`** with `"type": "module"`, scripts `test: "node --test 'test/**/*.test.js'"`, `dev: "wrangler dev"`, `deploy: "wrangler d1 migrations apply stats --remote && wrangler deploy"`; dependency `jose`; devDependency `wrangler`. Run `npm --prefix stats install`.
- [ ] **Step 2: Write `wrangler.jsonc`**: `name: "heartsaglow-stats"`, `main: "src/index.js"`, `compatibility_date: "2026-11-01"`, `workers_dev: false`, `routes: [{ "pattern": "stats.heartsaglow.io", "custom_domain": true }]`, `assets: { directory: "./public/", binding: "ASSETS", run_worker_first: true }`, `d1_databases: [{ binding: "DB", database_name: "stats", database_id: "<from wrangler d1 create>", migrations_dir: "migrations" }]`, `triggers: { crons: ["0 12 * * *"] }` (05:00 MST / 06:00 MDT), `vars: { TEAM_DOMAIN: "", POLICY_AUD: "" }`.
- [ ] **Step 3: Write `0001_init.sql`**: `readings(source, metric, dim DEFAULT '', date, value REAL, PRIMARY KEY(source, metric, dim, date))`; `items(source, id, title, url, date, PRIMARY KEY(source, id))`; `syncs(source PRIMARY KEY, last_ok, last_try, error)`; `events(id INTEGER PRIMARY KEY, date, kind, text)`; `settings(key PRIMARY KEY, value)`; `tokens(source PRIMARY KEY, access_token, refresh_token, expires_at, meta)`; `release_map(source, item, release, PRIMARY KEY(source, item))`.
- [ ] **Step 4: Write `test/d1.js`**: wraps `DatabaseSync(':memory:')` with D1's surface used here — `prepare(sql).bind(...args)` returning `{ all() -> {results}, first(), run() }` and `db.batch(stmts)`; all methods async.
- [ ] **Step 5: Write failing tests in `test/db.test.js`**:

```js
test('upserting the same reading twice keeps one row with the newer value', async () => {
  const db = openTestDb()
  await upsertReadings(db, [{ source:'steam', metric:'wishlist_adds', dim:'', date:'2026-11-08', value:10 }])
  await upsertReadings(db, [{ source:'steam', metric:'wishlist_adds', dim:'', date:'2026-11-08', value:12 }])
  assert.deepEqual(await series(db, { source:'steam', metric:'wishlist_adds', from:'2026-11-01', to:'2026-11-30' }), [{ date:'2026-11-08', value:12 }])
})
test('latest returns null on an empty database', async () => {
  assert.equal(await latest(openTestDb(), { source:'bluesky', metric:'followers' }), null)
})
test('settings round-trip and recordSync keeps last_ok when a later try fails', async () => { /* ok at T1, fail at T2 → last_ok=T1, last_try=T2, error set */ })
```

- [ ] **Step 6:** `npm --prefix stats test` → FAIL (module not found).
- [ ] **Step 7: Implement `src/db.js`.** `upsertReadings` uses `INSERT ... ON CONFLICT(source,metric,dim,date) DO UPDATE SET value=excluded.value` in one `db.batch`. `recordSync` with `ok:false` updates only `last_try` and `error`.
- [ ] **Step 8:** `npm --prefix stats test` → PASS; `npm run lint` → clean.
- [ ] **Step 9: Commit** `feat(stats): worker scaffold, D1 schema and data layer`.

### Task 2: Access gate and routing

**Files:**
- Create: `stats/src/auth.js`, `stats/src/index.js`, `stats/test/auth.test.js`

**Interfaces:**
- Consumes: Task 1 db.
- Produces: `verifyAccess(request, env, jwks?) -> Promise<boolean>` (jwks injectable for tests; default `createRemoteJWKSet(new URL(env.TEAM_DOMAIN + '/cdn-cgi/access/certs'))`, cached at module scope). `export default { fetch(request, env, ctx), scheduled(event, env, ctx) }`. Route table: `GET /api/dashboard`, `POST /api/seen`, `POST /api/manual`, `POST /api/log`, `POST /api/settings`, `GET /api/connect/:source`, `GET /api/callback/:source`, `POST /api/import/:kind`; anything else → `env.ASSETS.fetch(request)`. Route handlers are added by later tasks; unknown `/api/*` → 404 JSON.

- [ ] **Step 1: Failing tests** using `generateKeyPair('RS256')`, `SignJWT`, `exportJWK`, `createLocalJWKSet`:

```js
test('a valid token for the right audience and issuer passes', ...)          // true
test('no header, expired token, wrong aud, wrong iss each fail', ...)       // false ×4
test('fetch returns 403 for / and /style.css without a valid token', ...)   // status 403, ASSETS.fetch not called
test('fetch returns 403 when TEAM_DOMAIN or POLICY_AUD is unset', ...)      // fail closed
```

- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement.** `jwtVerify(token, jwks, { issuer: env.TEAM_DOMAIN, audience: env.POLICY_AUD, algorithms: ['RS256'] })`; any throw → `false`. `fetch` checks auth before anything else; the 403 body is plain text `Forbidden`.
- [ ] **Step 4:** run → PASS; lint clean.
- [ ] **Step 5: Commit** `feat(stats): Cloudflare Access gate on every request`.

### Task 3: Sync runner and source health

**Files:**
- Create: `stats/src/sync.js`, `stats/src/health.js`, `stats/test/sync.test.js`, `stats/test/health.test.js`
- Modify: `stats/src/index.js` (`scheduled` → `ctx.waitUntil(runSync(env, { now: new Date(event.scheduledTime) }))`)

**Interfaces:**
- Consumes: `upsertReadings`, `upsertItems`, `recordSync`, `syncStatus`, `getSetting`.
- Produces: `CONNECTORS: Connector[]` (filled by Tasks 5–7), `runSync(env, {now, connectors = CONNECTORS, fetch = globalThis.fetch}) -> Promise<{source, ok, error?}[]>`. `MANUAL_SOURCES = ['apple','tiktok','x','spotify','bandcamp','steam_traffic']`. `sourceHealth({status, manualLatest: {source: date|null}, connectors, now, configured: {source: boolean}}) -> {source, state:'ok'|'stale'|'broken'|'waiting'|'manual'|'off', since:string|null, message:string|null}[]`.

- [ ] **Step 1: Failing tests:**

```js
test('one connector throwing does not stop the others, and its error is recorded', ...)
test('a connector returning no readings is ok and writes nothing', ...)
test('health: ok within 1.5× cadence, stale after, broken when last_try > last_ok with an error', ...)
test('health: tiktok is waiting until TIKTOK_CLIENT_KEY is configured; a manual source older than 7 days carries a nudge message', ...)
test('health: a connector never run and not configured is off, not broken', ...)
```

- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement.** Connectors run with `Promise.allSettled`; each result → `recordSync`. Today = `now.toISOString().slice(0,10)`. Broken-state message passes the connector's error text through (connectors throw `Error('YouTube: login expired, reconnect')`-style messages).
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(stats): daily sync runner and per-source health`.

### Task 4: Derived metrics

**Files:**
- Create: `stats/src/derive.js`, `stats/test/derive.test.js`

**Interfaces:**
- Produces (all pure, all return `null` when inputs are insufficient):
  - `weekly(daily:{date,value}[], endDate) -> {week:string, value:number}[]` (12 ISO-week buckets ending at `endDate`'s week, missing days contribute nothing)
  - `netWishlists(adds, deletes) -> {date,value}[]`
  - `deleteRate4w(adds, deletes, today) -> number|null` (sum deletes ÷ sum adds over last 28 days)
  - `isAnomaly(weeks:number[]) -> boolean` (last > 2 × median of the 4 before; false with < 5 weeks)
  - `pace({total, weeklyNet, target = 5000, today, launchDate?}) -> {reachDate:string|null, onTrack:boolean|null}`
  - `saveRate(saves, streams)`, `streamsPerListener(streams, listeners)`, `engagementRate(engagement, reach)`
  - `funnel({visits, lookInside, steamClicks, utmWishlists}) -> {step, value, rate}[]`
  - `sinceLast(seriesBySource, lastSeen) -> {source, metric, delta}[]`
  - `earningsThisMonth(rows:{source, currency, cents}[]) -> {total:{USD:number, ...}, bySource}`

- [ ] **Step 1: Failing tests** with exact values:

```js
test('pace: 1,240 wishlists at +118/week reaches 5,000 in 32 weeks', () => {
  assert.equal(pace({ total:1240, weeklyNet:118, today:'2026-11-10' }).reachDate, '2027-06-22')
})
test('pace is null for zero or negative weekly net', ...)
test('pace onTrack compares reachDate with launchDate', ...)
test('isAnomaly: [40,44,39,52,118] true; [40,44,39,52,80] false; 4 weeks → false', ...)
test('deleteRate4w: 30 deletes over 400 adds = 0.075; no adds → null', ...)
test('saveRate never divides by zero', ...)          // saveRate(5, 0) === null
test('weekly leaves a week with no rows out rather than reporting 0', ...)
test('earnings keep currencies apart', ...)          // USD and EUR summed separately
```

(Pace: weeks = ceil((target − total) / weeklyNet), reachDate = today + weeks×7 days.)

- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(stats): derived metrics, pace and anomaly rule`.

### Task 5: Connectors — Steam and itch.io

**Files:**
- Create: `stats/src/connectors/steam.js`, `stats/src/connectors/itch.js`, `stats/test/fixtures/steam-wishlist.json`, `stats/test/fixtures/itch-my-games.json`, `stats/test/connectors-a.test.js`
- Modify: `stats/src/sync.js` (register both)

**Interfaces:**
- Consumes: `Connector` shape, `Reading`.
- Produces: `steam: Connector` (secret `STEAM_PUBLISHER_KEY`, `cadenceHours: 24`); `itch: Connector` (secret `ITCH_API_KEY`, `cadenceHours: 24`). Each also exports its pure parser: `parseWishlistDay(json, date) -> Reading[]`, `parseItchGames(json, today) -> Reading[]`.

- [ ] **Step 1: Build fixtures** from the documented response shapes: `https://partner.steamgames.com/doc/webapi/IPartnerFinancialsService` (`GetAppWishlistReporting`) and `https://itch.io/docs/api/serverside-legacy` (`my-games`). Note at the top of each fixture file which doc it came from.
- [ ] **Step 2: Failing tests:**

```js
test('steam pulls the last 3 GMT days, one call per day, and emits four metrics per day', ...) // fake fetch records 3 URLs with appid=4433980
test('steam with no STEAM_PUBLISHER_KEY throws a configuration error naming the key', ...)
test('steam re-pulled days overwrite, not add', ...)                   // via upsertReadings + series
test('itch emits lifetime snapshots per game, earnings per currency in cents', ...)
test('itch with an empty games list returns no readings', ...)
```

- [ ] **Step 3:** run → FAIL. **Step 4:** implement; base URL `https://partner.steam-api.com/IPartnerFinancialsService/GetAppWishlistReporting/v1/`. A non-2xx throws `Error('<Source>: HTTP <status>')`. **Step 5:** run → PASS.
- [ ] **Step 6: Commit** `feat(stats): Steam wishlist and itch.io connectors`.

### Task 6: Connectors — Bluesky, beehiiv, GoatCounter

**Files:**
- Create: `stats/src/connectors/{bluesky,beehiiv,goatcounter}.js`, fixtures, `stats/test/connectors-b.test.js`
- Modify: `stats/src/sync.js`

**Interfaces:**
- Produces: `bluesky` (no secret; var `BSKY_HANDLE = "heartsaglow.io"`; `getProfile` + `getAuthorFeed?limit=30` on `https://public.api.bsky.app/xrpc/`), `beehiiv` (secrets `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID`; `expand=stats` on publication and on the last 10 posts), `goatcounter` (secret `GOATCOUNTER_TOKEN`, var `GOATCOUNTER_SITE = "heartsaglow"`; yesterday's visits, referrers and event paths). Each with items for posts/issues.

- [ ] **Step 1: Fixtures.** Bluesky: capture real responses (`curl` the two endpoints for `heartsaglow.io`). beehiiv and GoatCounter: from `https://developers.beehiiv.com/api-reference` and `https://www.goatcounter.com/help/api`; confirm the GoatCounter endpoints for per-day totals, referrers and per-path counts there before writing the parser.
- [ ] **Step 2: Failing tests:**

```js
test('bluesky emits followers and one engagement reading per post with an item carrying the post text', ...)
test('beehiiv HTTP 202 on post stats retries once after Retry-After then skips that post without writing zeros', ...)
test('beehiiv records subscribers and per-post recipients, unique (verified) clicks, unsubscribes, open_rate', ...)
test('goatcounter keeps event paths as dims, e.g. out/store.steampowered.com and look-inside', ...)
test('goatcounter strips www. and lowercases referrer hosts', ...)
```

- [ ] **Step 3:** run → FAIL. **Step 4:** implement (inject `sleep` for the retry so the test does not wait). **Step 5:** run → PASS.
- [ ] **Step 6: Commit** `feat(stats): Bluesky, beehiiv and GoatCounter connectors`.

### Task 7: OAuth connectors — YouTube and Instagram

**Files:**
- Create: `stats/src/oauth.js`, `stats/src/connectors/{youtube,instagram}.js`, fixtures, `stats/test/oauth.test.js`
- Modify: `stats/src/index.js` (connect/callback routes), `stats/src/sync.js`

**Interfaces:**
- Consumes: `getToken/putToken`, `getSetting/setSetting`.
- Produces: `PROVIDERS = { youtube: {authUrl, tokenUrl, scopes:['https://www.googleapis.com/auth/yt-analytics.readonly','https://www.googleapis.com/auth/youtube.readonly'], clientIdVar:'YT_CLIENT_ID', secretVar:'YT_CLIENT_SECRET'}, instagram: {... scopes:['instagram_business_basic','instagram_business_manage_insights'], clientIdVar:'IG_APP_ID', secretVar:'IG_APP_SECRET'} }`. `connectUrl(source, env, state) -> string`, `handleCallback(source, url, env, deps) -> Promise<void>`, `accessToken(source, env, deps) -> Promise<string>` (refreshes when `expires_at` is within 5 minutes; Instagram long-lived tokens refreshed via `refresh_access_token` when older than 30 days). Redirect URI: `https://stats.heartsaglow.io/api/callback/<source>`. A random `state` stored in `settings` (`oauth_state_<source>`) and checked on callback.

- [ ] **Step 1: Failing tests:**

```js
test('callback with a mismatched state is rejected and stores nothing', ...)
test('accessToken refreshes an expiring YouTube token and saves the new expiry', ...)
test('a refresh rejected with invalid_grant throws "YouTube: login expired, reconnect"', ...)   // surfaces as broken in health
test('youtube pull asks reports.query for the last 7 days of views, estimatedMinutesWatched, subscribersGained, subscribersLost by day', ...)
test('instagram pull with an empty insights data array writes no readings', ...)
```

- [ ] **Step 2:** run → FAIL. **Step 3:** implement. YouTube: `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&dimensions=day`, plus a `dimensions=video` call sorted by views (top 10) with items titled via the Data API. Instagram: Instagram API with Instagram Login (`graph.instagram.com`), account `followers_count`, insights `reach`, `views`, and the last 20 media with like/comment counts. Confirm metric names against `https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights/` at build time. **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(stats): YouTube and Instagram connectors with reconnectable OAuth`.

### Task 8: Typed entry, event log, settings

**Files:**
- Create: `stats/src/manual.js`, `stats/test/manual.test.js`
- Modify: `stats/src/index.js` (`POST /api/manual`, `POST /api/log`, `POST /api/settings`)

**Interfaces:**
- Produces: `MANUAL_METRICS = { apple:['listeners_28d','plays_28d'], tiktok:['followers','engagement_28d'], x:['followers','engagement_28d'] }`; `EVENT_KINDS = ['trailer','release','newsletter','post','festival','other']`; `SETTINGS = ['launch_date']`. `validateManual(body, today) -> {ok:true, readings} | {ok:false, error}`; `validateEvent(body, today)`; handlers return 400 `{error}` or 204.

- [ ] **Step 1: Failing tests:**

```js
test('rejects negative, non-numeric, future-dated, unknown source and unknown metric with a message', ...) // 5 cases, nothing stored
test('accepts a dated tiktok follower reading and stores it as a snapshot', ...)
test('an event needs a known kind, a date and 1–140 chars of text', ...)
test('launch_date must be a valid future date or empty to clear it', ...)
```

- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(stats): typed entries, event log and launch date`.

### Task 9: The dashboard view model

**Files:**
- Create: `stats/src/view.js`, `stats/test/view.test.js`
- Modify: `stats/src/index.js` (`GET /api/dashboard`, `POST /api/seen` sets `last_seen` to now)

**Interfaces:**
- Consumes: db reads (Task 1), `sourceHealth` (Task 3), derive (Task 4).
- Produces: `buildView(db, {now, env}) -> Promise<View>` where `View = { asOf, lastSeen, health:[...], events:[...], overview:{since, anomaly, tiles, strip, weekly}, game:{total, deleteRate, conversion, pace, daily, utm}, music:{...}, social:{...}, news:{...}, site:{funnel, visits, outbound, referrers, actions}, earnings }`. Every number is `number|null`; every series is `{date|week, value}[]`; each tile carries `{value, delta, stale:boolean}`. Social "clicks to site" per platform maps GoatCounter referrer hosts: `youtube.com`→youtube, `bsky.app`→bluesky, `instagram.com`/`l.instagram.com`→instagram, `tiktok.com`→tiktok, `t.co`/`x.com`→x.

- [ ] **Step 1: Failing tests:**

```js
test('an empty database builds a view with nulls and empty series, and JSON.stringify contains no NaN or Infinity', ...)
test('since-last-visit sums only readings after lastSeen, separate from week-over-week', ...)
test('a stale or broken source marks its tiles stale', ...)
test('the funnel joins GoatCounter look-inside and out/store.steampowered.com with the heartsaglow UTM row', ...)
test('the anomaly flag is set when the last full week is > 2× the 4-week median', ...)
```

- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(stats): dashboard view model`.

### Task 10: The page

**Files:**
- Create: `stats/public/index.html`, `stats/public/app.js`, `stats/public/style.css`, `stats/public/fonts/*.woff2`
- Copy fonts from the root `node_modules/@fontsource-variable/{anybody,archivo,martian-mono}/files/` (latin, wght/wdth variable files only).

**Interfaces:**
- Consumes: `GET /api/dashboard` (`View`), `POST /api/seen`, `POST /api/manual`, `POST /api/log`, `POST /api/settings`, `GET /api/connect/:source`.

- [ ] **Step 1: Port the mockup** (`layout-b4.html`) into the three files: same tabs, layout, tokens, chart and sparkline code, hover crosshair, reduced-motion rule, 767px collapse. Replace fake arrays with `View` fields. Fonts via `@font-face` on `/fonts/…`; no Google Fonts link.
- [ ] **Step 2: Add the spec's three additions:** the health strip above the tabs (one chip per source; `broken` and `waiting` show their message; `broken` OAuth sources link to `/api/connect/<source>`; `manual` older than 7 days shows "update"); launch pace beside the bronze bar ("At this pace, 5k by June 2027"; "on track / behind" when `launch_date` is set; hidden when `pace.reachDate` is null); the earnings tile on Overview with a per-source breakdown.
- [ ] **Step 3: Wire the forms:** Log tab form → `/api/log`; a typed-entry form per manual source (in the Music tab for Apple, Social tab for TikTok and X) → `/api/manual`; server errors shown inline under the form. After first render, `POST /api/seen`.
- [ ] **Step 4: Null rendering:** any `null` value renders `—` with the tile's label; an empty series renders the chart frame with "No data yet".
- [ ] **Step 5: Verify:** `npm --prefix stats run dev`, seed the local D1 with `wrangler d1 execute stats --local --file test/fixtures/seed.sql` (write the seed: 90 days of Steam adds/deletes, a few readings per source, two events), then with `TEAM_DOMAIN`/`POLICY_AUD` overridden by a dev-only `.dev.vars` flag `DEV_SKIP_ACCESS=1` — honoured only when `env.ENVIRONMENT === 'dev'`, add a test in `auth.test.js` that it is ignored otherwise. Screenshot each tab at 1280 and 390 wide; check: no overflow, no `NaN`, labels not colliding, reduced-motion stops the field.
- [ ] **Step 6: Commit** `feat(stats): dashboard page`.

### Task 11: Deploy workflow and setup guide

**Files:**
- Create: `.github/workflows/stats.yml`, `docs/stats-setup.md`
- Modify: `CLAUDE.md` (one paragraph: what `stats/` is, how it deploys, that it never touches the public build)

- [ ] **Step 1: Workflow:** on push to `main` with `paths: ['stats/**', '.github/workflows/stats.yml']`; Node 24; `npm ci` and `npm test` in `stats/`; then `npm run deploy` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. Same action versions as `deploy.yml`.
- [ ] **Step 2: Setup guide**, one numbered section per one-time step from the spec's "Setup Hailen does once", each ending with the exact `wrangler secret put <NAME>` or the dashboard button to press: D1 create + id into `wrangler.jsonc`; Access app (self-hosted, `stats.heartsaglow.io`, one-time PIN, allow Hailen's email) and copying its AUD tag and team domain into `vars`; deploy API token + account id as GitHub secrets; Steamworks financial API group + key (note: check whether it requires an IP allowlist — if so, wishlists fall back to CSV); Google Cloud OAuth client published to Production, redirect URI, then visit `/api/connect/youtube`; Instagram Creator account + Meta app with Instagram Login, redirect URI, then `/api/connect/instagram`; itch, beehiiv (key + publication id), GoatCounter tokens; TikTok app review submitted (stays typed-in).
- [ ] **Step 3: Verify** with `actionlint` if installed, else `npx --yes @action-validator/cli .github/workflows/stats.yml`.
- [ ] **Step 4: Commit** `ci(stats): deploy on push, and the one-time setup guide`.

### Task 12: UTM-tagged Steam links on the site

**Files:**
- Modify: `src/data/fallback.js` (OTO `url` and the Steam entry in `buttons`), Sanity record `fe105441-78cc-497c-81f2-ea6e2989f19f` (`url` and the Steam `buttons[]` item, via the mutate API as done on 2026-11-10)
- Test: `test/gameShape.test.js`

- [ ] **Step 1: Failing test:** `asGame` on the fallback OTO record has `storeUrl` containing `utm_source=heartsaglow` and `links` without a Steam entry (dedupe still matches).
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** change both fallback URLs to the global UTM link. **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Patch both Sanity fields to the same URL in one mutation (confirm with Hailen first; it changes the live site). Read the record back to verify.
- [ ] **Step 6: Commit** `content: OTO's Steam links carry a UTM tag`.

### Task 13: CSV importers (blocked until Hailen supplies sample exports)

**Files:**
- Create per sample: `stats/src/import/{spotify,steam-traffic,bandcamp}.js`, `stats/test/fixtures/<sample>.csv` (real file, personal data trimmed), `stats/test/import.test.js`
- Modify: `stats/src/index.js` (`POST /api/import/:kind`), `stats/public/app.js` (drop zones)

**Interfaces:**
- Produces: `parse<Kind>(text, {period?}) -> {ok:true, readings, items, period:{from,to}} | {ok:false, error}`. If the export carries no dates, the drop zone asks for the period and passes it in. Release matching: titles normalised (lowercase, strip punctuation and "(… mix)"), matched to Sanity releases fetched from the public CDN API, then `release_map` overrides; unmatched rows reported back, not dropped silently.

- [ ] **Step 1 (per importer):** failing tests on the real sample — expected row count, one exact reading, a malformed file (missing header) → `{ok:false}` with the header name, nothing stored.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Commit** per importer `feat(stats): <kind> CSV import`.

## Not in this plan (spec non-goals or follow-ups)

Weekly email digest · X API · TikTok Display API connector (add as a Task-7-style connector after review passes) · YouTube monetary scope (add if the channel earns) · wishlists by country.

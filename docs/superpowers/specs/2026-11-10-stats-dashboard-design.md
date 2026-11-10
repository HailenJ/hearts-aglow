# Stats dashboard — design

**Date:** 2026-11-10 · **Status:** approved 2026-11-10
**Mockup:** `.superpowers/brainstorm/92854-1794337032/content/layout-b4.html` (open with `#game`, `#music`, `#social`, `#news`, `#site`, `#log` to see each tab). The mockup is the visual and content reference; its numbers are fake.

## Why

Hailen runs a one-person game studio and ambient music label: OTO (unreleased, Steam wishlist page and announcement trailer live since 2026-11-06, also on itch.io), ~10 albums on Bandcamp / Spotify / Apple Music / YouTube, socials on YouTube, Bluesky, Instagram, TikTok and X, a beehiiv newsletter, and heartsaglow.io (GoatCounter analytics). Today, answering "is this working?" means logging into a dozen backends. The dashboard puts it on one private page, in three time frames at once: **today's snapshot, trends over weeks and months, and what changed since the last visit.**

The north star is **OTO net wishlist adds per week** (adds − deletes). Everything else exists to explain movements in it. The newsletter is second: the one audience Hailen owns, serving both game and label.

## Goals

- One private page at `stats.heartsaglow.io`, only Hailen can open it.
- Pulls every source that has an API once a day, unattended; keeps its own history so totals-only sources (itch, beehiiv, follower counts) become trends.
- Takes the rest by CSV upload or typed numbers, with minimal friction.
- Connects channels: a hand-kept event log draws markers on every chart, and the site → Steam → wishlist path is shown as a funnel.
- Looks like it belongs to heartsaglow.io (see Visual).

## Non-goals (v1)

- Weekly email digest (agreed: later).
- X API (Hailen declined paying for now): X numbers are typed in.
- Wishlists by country, per-post detail on every platform, follower breakdowns — the research flagged these as tiles nobody acts on.
- Multiple users, sharing, public access.
- Real-time data. Daily is the cadence.

## Anti-goals (would make it a failure even if it works)

- **Any API key or token reaching the browser**, or any way into the data that bypasses the login.
- **Stale numbers shown as fresh.** A broken connector must be loud (see Health strip), never silently frozen.
- **Touching the public site's bundle, performance or deploy.** The dashboard is separate; heartsaglow.io must not get heavier or depend on it.
- **Scraping logged-in dashboards** (Spotify for Artists, Steam partner site, Apple Music for Artists). Against ToS; manual import instead.
- Vanity first: follower counts never lead a view.

## How it's built (decided)

- **Separate Cloudflare Worker** in this repo under `stats/`, deployed to the custom domain `stats.heartsaglow.io` (the zone is already on Cloudflare). The Worker serves the page as static assets, serves a small JSON API to it, and runs the daily sync on a **Cron Trigger**. Its `workers.dev` route is disabled.
- **Storage: Cloudflare D1** (SQLite). Daily snapshots, imports, the event log, sync status.
- **Login: Cloudflare Access** on `stats.heartsaglow.io`, one-time PIN to Hailen's email only. Defense in depth: the Worker also verifies the `Cf-Access-Jwt-Assertion` JWT on every request and rejects anything without a valid one.
- **Secrets** live in Worker secrets (`wrangler secret put`), never in the repo or the page.
- **Cost:** Cloudflare free tier covers it. No paid APIs in v1.
- **Deploy** follows the repo's rule that pushing `main` is the deploy: a GitHub Actions workflow runs `wrangler deploy` (and D1 migrations) when `stats/**` changes, using a `CLOUDFLARE_API_TOKEN` repo secret. The public-site workflow is untouched.

## Sources

| Area | Source | How | What's kept daily |
|---|---|---|---|
| Game | Steam wishlists | `IPartnerFinancialsService/GetAppWishlistReporting`, publisher financial Web API key | adds, deletes, purchases, gifts per day for app 4433980. Days are GMT with no settlement delay: re-fetch the last 3 days each run. |
| Game | Steam store traffic + UTM | **CSV upload** from the Steamworks partner site | visits, wishlists by UTM source; impressions/visits |
| Game | itch.io | `/api/1/KEY/my-games` (or `api.itch.io/profile/games`) | views, downloads, purchases, earnings (lifetime totals → daily snapshot, diffed) |
| Music | Spotify for Artists | **CSV upload** (audience timeline, songs) | listeners, streams, saves per release |
| Music | Apple Music for Artists | **typed in** | listeners, plays |
| Music | YouTube (music + channel) | YouTube Analytics API, OAuth refresh token | views, watch time, subscribers gained/lost per day and per video |
| Music | Bandcamp | **CSV upload** (sales report) | sales, revenue, per release |
| Social | Bluesky | public AppView, no auth (`getProfile`, `getAuthorFeed`) | followers; likes/reposts/replies per recent post |
| Social | Instagram | Instagram API with Instagram Login, `instagram_business_manage_insights` (Creator/Business account; no Page, no review for own account) | followers, reach, views, engagement per post (up to 48 h lag) |
| Social | TikTok | **typed in for v1.** The Display API connector (`user.info.stats`, `video.list`) is a follow-up once review passes; the health strip shows *waiting* until then | followers, likes, per-video views/likes/comments/shares |
| Social | X | **typed in** | followers, engagement |
| News | beehiiv | API v2 on the free plan (`expand=stats` on publication and posts) | subscribers (snapshot), per-post recipients, unique clicks (bot-filtered), unsubscribes, open rate |
| Site | GoatCounter | API with token | visits per day, referrers, the existing events: `look-inside`, `trailer`, plays, and outbound clicks recorded as `out/<host>` (e.g. `out/store.steampowered.com`) |

**Resolving the mockup against what the sources can give** (Claude's calls; the mockup is reference, this list wins where they differ):

- *Social → clicks to site per platform* comes from GoatCounter referrers (`youtube.com`, `bsky.app`, `instagram.com`, `tiktok.com`, `t.co`/`x.com`), not from the platforms.
- *Top posts* is ranked by engagement, not clicks: no platform here reports per-post link clicks. The clicks column is dropped from that list.
- *News → where signups come from* uses beehiiv's per-subscription acquisition fields (UTM / referring site) if the free-plan API returns them; verify at build time, and drop the tile if it doesn't.
- *Music → streams per week* sums the services that report at weekly or finer grain (Spotify timeline CSV, YouTube); Apple Music, typed monthly, is shown as its own figure, not summed into the weekly line.
- *Typed-in numbers* (Apple Music, TikTok, X) are dated point-in-time readings: follower totals, plus any "last 28 days" figure exactly as the app shows it, labelled with that window. They feed snapshots and Δ since the previous reading, never summed into weekly series.
- *Releases*: the canonical list is the Sanity catalogue the site already reads (public, read-only API, no token). Spotify tracks, YouTube videos and Bandcamp items are matched to releases by title, with a small hand-edited override table for anything that doesn't match.
- *YouTube* (open question, defaulted): one channel, read-only analytics scopes, no monetary scope. The connector stores tokens per channel so a second channel (Topic / Official Artist Channel) can be connected later; the monetary scope is added only if Hailen confirms the channel earns.
- *CSV importers* are sequenced last and built against real sample exports Hailen provides (Spotify audience timeline + songs, Steamworks UTM/traffic, Bandcamp sales). Until a sample exists, that importer is not built.
- *Steam key*: if Steamworks requires an IP allowlist for the financial key, Workers have no fixed egress IP — check at setup; the fallback is Steamworks' wishlist CSV through the same upload flow.

Each connector is independent: one failing never stops the others, and each writes its own row to the sync status.

## What the page shows

Layout is **Overview + tabs** (option B), as in the mockup: Overview · Game · Music · Social · News · Site, and **+ Log** on the right. Content of every tab follows the mockup. Additions agreed after the mockup:

1. **Health strip** (top of every tab, compact): every source with its last successful sync / import date and a state — *ok*, *stale* (older than expected for its cadence), *broken* (with the error, e.g. "YouTube: login expired, reconnect"), *waiting* (TikTok approval), *manual* (age of last typed/CSV entry, nudging when over ~7 days). Stale or broken sources also mark their numbers on the page as stale.
2. **Launch pace** on the Game tab, next to the bronze progress bar: "at this pace, 5k by <month>", from the trailing 4-week average net adds. If a launch date is set (a field in the Log/settings), also "on track / behind" for that date.
3. **Earnings**: one tile on Overview, "earned this month" across Bandcamp, itch.io and (once released) Steam, plus YouTube revenue if the channel is monetized; a per-source breakdown on hover or in the tab where it belongs.

Behaviours that hold everywhere:

- **Since last visit**: the server records when the page was last opened; the Overview banner shows deltas since then, kept separate from week-over-week deltas.
- **Anomaly flag**: a week more than ~2× its trailing 4-week median (or a 4-week delete rate above ~15%) gets a flag that links to the Log.
- **Event markers**: every Log entry appears as a dated marker on every time chart.
- **Derived metrics** are computed, not imported: net wishlists, 4-week delete rate, visit → wishlist by UTM source, save rate (saves ÷ streams), streams per listener, engagement rate, site → Steam → wishlist funnel (GoatCounter `steam` clicks against the `utm_source=heartsaglow` row of the UTM CSV).
- **Benchmarks** shown as quiet context only: 5k wishlists = bronze; delete-rate median ~7.75%; visit → wishlist ~8% floor; save rate 3–5%. Music is compared release against release.
- **Open rate** is shown small with the Apple Mail caveat; click rate leads.

## Visual

Matches heartsaglow.io's design system (`DESIGN.md`): void ground with the drifting rose/peach/wine bloom field and film grain, hairline glass panes (3px), Anybody for display numbers, Martian Mono for data and labels, Archivo for prose, signal cyan `#dff4ff` only for live data lines, the selected tab and positive deltas; peach for event markers and flags. No chromatic glow shadows. Charts are single-series line/area with a crosshair tooltip; motion is off under `prefers-reduced-motion`. Works at phone width (one column). The mockup's CSS and chart code are a valid starting point.

## Setup Hailen does once (the plan should include a guided step for each)

- Cloudflare: create the Access application + policy for `stats.heartsaglow.io`; create an API token for the deploy workflow.
- Steamworks: create a financial API group and publisher key.
- Google Cloud: OAuth client for YouTube Analytics, **published to Production** (Testing-mode refresh tokens die after 7 days); authorize once.
- Instagram: switch to a Creator account if needed; Meta app with Instagram Login; authorize once.
- TikTok: submit the app for review (manual entry until then).
- Copy API keys: itch.io, beehiiv, GoatCounter.
- Change OTO's Steam links to the UTM-tagged URL (`?utm_source=heartsaglow&utm_medium=website`) in **both** Sanity's Store URL and the Additional Buttons Steam entry, plus `src/data/fallback.js`, so the site's dedupe still matches; tag links in social bios and the newsletter with their own `utm_source`.

## Left to the builder

- Code structure inside `stats/`, the D1 schema, and whether the page is plain HTML/JS (as the mockup is) or uses a small build step.
- How OAuth connect/reconnect flows are exposed (a "reconnect" link from the health strip is the expectation).
- Exact CSV parsing per export format — build against real sample exports Hailen provides; reject a malformed file with a clear message rather than importing partial data.
- Sync time of day (early morning Mountain time is the expectation) and retry policy.
- Self-hosting the fonts (no third-party font requests; the public site moved off Google Fonts deliberately).
- Tests in the repo's style (`node:test`, no framework) for the derived metrics, the anomaly rule, the pace projection and the CSV parsers.

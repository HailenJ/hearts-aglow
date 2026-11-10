# Stats dashboard: one-time setup

The dashboard lives at `https://stats.heartsaglow.io`. It is a small program on Cloudflare (a "Worker") that collects your numbers once a day and shows them on a private page. You do the steps below once. After that, every push to `main` that touches `stats/` redeploys it.

Two words you will see a lot:

- **Secret**: a password-like value. Never paste it into a file in the repo. Set it with `npx wrangler secret put NAME` and paste the value when asked. Run that from the `stats/` folder.
- **Redirect URI**: the address a service sends you back to after you approve access. Copy it exactly.

You can do the steps in any order, and you can skip a source. A source without its secrets is simply shown as not connected. Do 1 to 3 first, because nothing deploys without them.

Run all `npx wrangler` commands from the `stats/` folder: `cd stats`. The first one will ask you to log in to Cloudflare in the browser (`npx wrangler login`).

## 1. Create the database

The database (Cloudflare D1) holds every daily number.

1. In a terminal: `cd stats && npx wrangler d1 create stats`
2. It prints a `database_id` (a long string of letters, numbers and dashes). Copy it.
3. Open `stats/wrangler.jsonc` and replace `REPLACE_WITH_ID_FROM_WRANGLER_D1_CREATE` with that id. Keep the quotes.
4. Commit that change.

The id is not a secret. It is fine in the repo.

## 2. Put the login in front of the site (Cloudflare Access)

Access is the front door. Without a valid login nobody can open the page, and the Worker double-checks it.

1. Go to the Cloudflare dashboard, then **Zero Trust** (left menu). If it asks you to pick a team name and plan, choose the free plan.
2. **Access controls**, then **Applications**, then **Add an application**, then **Self-hosted**.
3. Name: `Stats`. Add a public hostname: subdomain `stats`, domain `heartsaglow.io`.
4. Create a policy: name `Hailen`, action **Allow**, rule **Emails** equal to your email. Save.
5. Under login methods make sure **One-time PIN** is on. (Cloudflare emails you a 6-digit code each time you sign in.)
6. Save the application. Open it again and copy the **Application Audience (AUD) Tag**, a long hex string.
7. Your **team domain** is shown under Zero Trust, **Settings**, **Custom pages** (or in the page's "Team domain"). It looks like `yourname.cloudflareaccess.com`.
8. In `stats/wrangler.jsonc`, under `vars`, set `TEAM_DOMAIN` to that team domain including the `https://` and no slash at the end (for example `"https://yourname.cloudflareaccess.com"`), and `POLICY_AUD` to the AUD tag. Commit. These are not secrets. If `TEAM_DOMAIN` is wrong, the dashboard answers "Forbidden" for everything with no other clue, so check it first if that happens.

## 3. Let GitHub deploy for you

1. Cloudflare dashboard, top right profile icon, **My Profile**, **API Tokens**, **Create Token**.
2. Use the **Edit Cloudflare Workers** template. Add one more permission to it: **Account, D1, Edit** (the deploy runs database migrations). Under Zone Resources pick `heartsaglow.io` so it can attach the custom domain. Create the token and copy it (it is shown once).
3. Your **Account ID** is on the Cloudflare dashboard home page, right side (or in the URL after `dash.cloudflare.com/`).
4. GitHub, this repo, **Settings**, **Secrets and variables**, **Actions**, **New repository secret**. Add two:
   - `CLOUDFLARE_API_TOKEN`: the token
   - `CLOUDFLARE_ACCOUNT_ID`: the account id
5. Push to `main`. The Stats workflow runs the tests and deploys. Until `CLOUDFLARE_API_TOKEN` exists, it runs the tests and prints a notice instead of deploying, so it never goes red for this reason.

The first deploy also creates the `stats.heartsaglow.io` address and runs the database migrations.

## 4. Steam wishlists

1. Steamworks partner site, **Users & Permissions**, **Manage Groups**, create a group for the financial API (for example `stats`), and give it permission to view financial info for OTO (app 4433980).
2. Open the group and create a **Publisher Web API Key**. Copy it.
3. Check whether the page says the key is limited to certain **IP addresses**. Cloudflare Workers do not have a fixed IP, so a locked key will not work. If it is locked, skip the key and use the wishlist CSV from Steamworks instead (CSV import is in the "Coming later" list below).
4. From `stats/`: `npx wrangler secret put STEAM_PUBLISHER_KEY`

## 5. YouTube

YouTube asks you to approve access once, from the dashboard.

1. Go to the Google Cloud console, create a project (name it `heartsaglow-stats`).
2. **APIs & Services**, **Library**: enable **YouTube Analytics API** and **YouTube Data API v3**.
3. **OAuth consent screen** (may be called **Google Auth Platform**): choose **External**, fill in the app name and your email, add yourself as a contact.
4. Important: set the publishing status to **In production** (the **Publish app** button). In "Testing" mode, Google expires the login after 7 days and the sync would break weekly. You will see an "unverified app" warning when you approve it yourself; that is expected for your own account.
5. **Credentials**, **Create credentials**, **OAuth client ID**, type **Web application**. Under **Authorized redirect URIs** add exactly: `https://stats.heartsaglow.io/api/callback/youtube`
6. Copy the client id and client secret, then from `stats/`:
   - `npx wrangler secret put YT_CLIENT_ID`
   - `npx wrangler secret put YT_CLIENT_SECRET`
7. After the deploy is live, open `https://stats.heartsaglow.io/api/connect/youtube`, sign in with the Google account that owns the channel, and approve. (The health strip on the dashboard also offers a reconnect link if it ever expires.)

## 6. Instagram

Typed in on the Social tab for now (followers and 28-day engagement, like TikTok and X). In October 2026 Meta moved new apps to "Instagram API (Unified Login)", which goes through Facebook Login for Business, needs the Instagram account linked to a Facebook business portfolio, and needs extra permissions; the dashboard's Instagram Login connector cannot authorize a new app. `stats/src/connectors/instagram.js` stays in the repo, unregistered, until it is ported. The `IG_APP_ID` / `IG_APP_SECRET` secrets set earlier are unused and harmless.

## 7. itch.io

1. itch.io, top right menu, **Settings**, **API keys**, **Generate new API key**. Copy it.
2. From `stats/`: `npx wrangler secret put ITCH_API_KEY`

## 8. beehiiv

1. beehiiv dashboard, **Settings**, **Integrations**, **API**, **Create API key**. Copy it.
2. Your **publication id** is on the same page (it starts with `pub_`).
3. From `stats/`:
   - `npx wrangler secret put BEEHIIV_API_KEY`
   - `npx wrangler secret put BEEHIIV_PUBLICATION_ID`

## 9. GoatCounter

1. GoatCounter, **Settings**, **API**, **Create new token**. Give it permission to **read statistics**. Copy it.
2. From `stats/`: `npx wrangler secret put GOATCOUNTER_TOKEN`
3. The site name is already set in `wrangler.jsonc` (`GOATCOUNTER_SITE`, `heartsaglow`). Change it there only if your GoatCounter address is different.

## 10. TikTok

TikTok will not give API access until the app is reviewed, and that can take weeks. Until then you type the numbers in on the dashboard, and the health strip shows TikTok as *waiting*.

1. developers.tiktok.com, **Manage apps**, **Connect an app**. Fill in the name, description and a short screen recording of how the data is used.
2. Request `user.info.stats` and `video.list`, and submit for review.
3. Nothing to set here yet. When it is approved, say so and the connector gets built.

Bluesky needs nothing: it reads your public profile.

## Coming later

Spotify for Artists, Bandcamp and the Steam store-traffic report only export CSV files. Importers for them will be built once you give a real sample export of each (Spotify audience timeline and songs, Bandcamp sales report, Steamworks traffic/UTM). Until then those tiles stay empty. Apple Music and X are typed in on the dashboard.

## Test it locally first (optional)

This runs the dashboard on your computer with fake data, and no login.

1. `cd stats && cp .dev.vars.example .dev.vars` (the file is ignored by git).
2. Create the local database and load the sample numbers:
   - `npx wrangler d1 migrations apply stats --local`
   - `npx wrangler d1 execute stats --local --file test/fixtures/seed.sql`
3. `npm run dev` and open the address it prints (usually `http://localhost:8787`).

The sample data ends 2026-11-09. If the page looks empty later, the dates need shifting.

## Run a sync by hand

The daily sync runs at 12:00 UTC (5 or 6 a.m. Mountain). To run it right now:

- On your computer: `npx wrangler dev --test-scheduled`, then in another terminal `curl "http://localhost:8787/__scheduled"`. Locally it only reaches services whose secrets are in `.dev.vars`.
- On the live site: press **Sync now** next to the sync time at the top of the dashboard. It runs every source straight away (the same sync the cron runs) and reloads the page, so the health strip shows each result. Steam fetches at most 14 days per sync, so filling the days since 2026-11-10 (the first day Steam has data for OTO) (or a long outage) can take a few presses or a few daily runs. Each one starts from the earliest missing day.
- To watch what happens as it runs: `cd stats && npx wrangler tail`, and trigger the sync while that is open.

The health strip at the top of the dashboard shows each source's last result and any error message.

## First sync checks

A few details of other companies' APIs could not be confirmed until the real thing runs. On the first real sync, check each one. If it is wrong, the health strip will usually show an error for that source or a number will look wrong; tell Claude what you see.

| Check | How to confirm |
|---|---|
| **Steam**: the wishlist path version (`/v1/` or `/v001/`) and the shape of the reply. | `npx wrangler tail` during a sync. A 404 means the path version is wrong. A "reply had no wishlist_summary" error on the Steam chip means the call worked but the reply wrapper differs. Compare Steam's adds/deletes for a day with the Steamworks wishlist report. |
| **itch**: earnings `amount` is in **cents**. | Compare the earnings figure with your itch.io dashboard total. If it is 100 times too big or small, the unit is wrong. |
| **GoatCounter**: the `/stats/toprefs` referrer endpoint works, and whether its day buckets are **UTC** or your site's local time. | Referrers tile fills in. For the buckets, compare one day's visit total with GoatCounter's own page for the same day, near midnight: if the numbers sit one day off, the buckets use local time. |
| **Instagram**: fields `followers_count`, and `like_count` / `comments_count` per post, are returned under Instagram Login. | After the first sync, followers and post engagement are filled. A "field not found" error in `wrangler tail` means that field is not allowed for this login type. |
| **beehiiv**: post stats (recipients, clicks, opens) arrive with the expanded request. | Newsletter tile shows per-post numbers, not just the subscriber count. If only subscribers appear, the `expand` form needs changing. |

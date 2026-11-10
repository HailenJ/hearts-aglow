const BASE = 'https://public.api.bsky.app/xrpc/'

export function parseBluesky(profile, feed, handle, today) {
  const readings = []
  const items = []
  const add = (metric, dim, value) => Number.isFinite(value) && readings.push({ source: 'bluesky', metric, dim, date: today, value })
  add('followers', '', profile.followersCount)
  // Reposts of other accounts carry a `reason`; they are not this account's posts.
  for (const { post, reason } of feed.feed ?? []) {
    if (reason) continue
    const likes = post.likeCount, reposts = post.repostCount, replies = post.replyCount, quotes = post.quoteCount
    const counts = [likes, reposts, replies, quotes]
    if (counts.every(Number.isFinite)) add('engagement', post.uri, counts.reduce((a, b) => a + b, 0))
    const text = post.record?.text ?? ''
    items.push({
      source: 'bluesky',
      id: post.uri,
      title: text.length > 140 ? `${text.slice(0, 139)}…` : text,
      url: `https://bsky.app/profile/${handle}/post/${post.uri.split('/').pop()}`,
      date: (post.record?.createdAt ?? post.indexedAt).slice(0, 10),
    })
  }
  return { readings, items }
}

export const bluesky = {
  source: 'bluesky',
  cadenceHours: 24,
  async pull(env, { fetch, today }) {
    const handle = env.BSKY_HANDLE
    const get = async (path, params) => {
      const res = await fetch(`${BASE}${path}?${new URLSearchParams({ actor: handle, ...params })}`)
      if (!res.ok) throw new Error(`Bluesky: HTTP ${res.status}`)
      return res.json()
    }
    const [profile, feed] = await Promise.all([get('app.bsky.actor.getProfile'), get('app.bsky.feed.getAuthorFeed', { limit: 30 })])
    return parseBluesky(profile, feed, handle, today)
  },
}

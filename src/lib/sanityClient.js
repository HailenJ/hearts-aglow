// A read-only GROQ fetch, by hand.
//
// `@sanity/client` was roughly a third of the bundle and two extra chunks for
// exactly one query, with no auth, no mutations, no listeners, no portable-text
// serialiser and no image-url builder. What follows is the entire surface this
// site ever used of it.
const PROJECT_ID = 'lmi10j91'
const DATASET = 'production'
const API_VERSION = '2024-01-01'

// `api`, not `apicdn`: the CDN host serves a cached edge copy, and the client
// this replaces was configured `useCdn: false` so that edits show up at once.
const ENDPOINT = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}`

/**
 * Runs a GROQ query and returns its result. Throws on a non-2xx so the caller's
 * catch can fall back to local data — a Sanity outage must never blank the site.
 */
export async function sanityFetch(query) {
  // returnQuery=false: without it the response echoes the whole query back,
  // which here is larger than most of the data it returns.
  const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(query)}&returnQuery=false`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Sanity responded ${res.status} ${res.statusText}`)
  const { result } = await res.json()
  return result ?? {}
}

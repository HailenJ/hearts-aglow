import { useState, useEffect } from 'react'
import { fetchAllContent } from '../lib/queries'
import { slugify } from '../lib/route'
import * as fallback from '../data/fallback'

const initialData = {
  musicReleases: fallback.musicReleases,
  socialLinks: fallback.socialLinks,
  games: fallback.games,
  software: fallback.software,
  game: fallback.game,
  heroSubtitle: fallback.heroSubtitle,
  aboutParagraphs: fallback.aboutParagraphs,
}

const withSlugs = list => (list ?? []).map(item => ({ ...item, slug: item.slug || slugify(item.title) || String(item.id) }))

// The featured game is simply the newest one. Sanity's `game` type already
// carries every field the Game window needs, so there is nothing to add there.
const featured = (games) => {
  const g = games?.[0]
  if (!g) return fallback.game
  return {
    title: g.title ?? '',
    year: g.year ?? '',
    status: g.status ?? 'in development',
    logline: g.description ?? '',
    keyArt: g.image ?? '',
    storeUrl: g.url ?? '',
  }
}

export function useSanityData() {
  const [data, setData] = useState(initialData)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let live = true
    fetchAllContent()
      .then(sanityData => {
        if (!live || !Object.keys(sanityData).length) return
        const next = { ...sanityData }
        if (next.musicReleases) next.musicReleases = withSlugs(next.musicReleases)
        if (next.games) { next.games = withSlugs(next.games); next.game = featured(next.games) }
        if (next.software) next.software = withSlugs(next.software)
        setData(prev => ({ ...prev, ...next }))
      })
      .catch(err => console.error('[Sanity] fetch failed:', err))
      .finally(() => { if (live) setIsLoaded(true) })
    return () => { live = false }
  }, [])

  return { data, isLoaded }
}

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

// Sanity returns tracks as bare strings, with no durations. The local data
// carries real runtimes pulled from the public Bandcamp pages, so enrich the
// remote records rather than letting the CMS silently drop the detail — the
// same trap that once removed the contact address from Connect.
const withDurations = (list) => (list ?? []).map(r => {
  const local = fallback.musicReleases.find(x => x.slug === r.slug)
  if (!local || !Array.isArray(r.tracks)) return r
  const byTitle = new Map(local.tracks.map(t => [t.title, t.duration]))
  return {
    ...r,
    tracks: r.tracks.map((t, i) => {
      if (t && typeof t === 'object') return t
      const duration = byTitle.get(t) ?? local.tracks[i]?.duration ?? 0
      return { title: t, duration }
    }),
  }
})

const withSlugs = list => (list ?? []).map(item => ({ ...item, slug: item.slug || slugify(item.title) || String(item.id) }))

// Which game the hero CTA points at is the site's single primary action, so it
// must not depend on Sanity's sort order. Set `featured: true` on exactly one
// game document to pin it. With none set, this falls back to newest-by-year —
// which is arbitrary between two games of the same year, so pin one.
const featured = (games) => {
  const g = games?.find(x => x.featured) ?? games?.[0]
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
        if (next.musicReleases) next.musicReleases = withDurations(withSlugs(next.musicReleases))
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

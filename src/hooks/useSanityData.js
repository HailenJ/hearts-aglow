import { useState, useEffect } from 'react'
import { fetchAllContent } from '../lib/queries'
import * as fallback from '../data/fallback'

const initialData = {
  musicReleases: fallback.musicReleases,
  socialLinks: fallback.socialLinks,
  games: fallback.games,
  software: fallback.software,
  heroTitle: fallback.heroTitle,
  heroSubtitle: fallback.heroSubtitle,
  aboutParagraphs: fallback.aboutParagraphs,
}

export function useSanityData() {
  const [data, setData] = useState(initialData)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    console.log('[Sanity] Starting fetch...')
    try {
      const promise = fetchAllContent()
      console.log('[Sanity] Promise created:', promise)
      promise
        .then(sanityData => {
          console.log('[Sanity] Data received:', sanityData)
          if (Object.keys(sanityData).length > 0) {
            setData(prev => ({ ...prev, ...sanityData }))
          }
          setIsLoaded(true)
        })
        .catch(err => {
          console.error('[Sanity] Fetch failed:', err)
          setIsLoaded(true)
        })
    } catch (err) {
      console.error('[Sanity] Sync error:', err)
      setIsLoaded(true)
    }
  }, [])

  return { data, isLoaded }
}

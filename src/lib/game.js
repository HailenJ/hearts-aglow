// One shape for a game, whatever produced it.
//
// A Sanity `game` document — and so a card in the Games grid — carries
// `image`, `description` and `url`. The takeover reads `keyArt`, `logline`
// and `storeUrl`. Launching the takeover from a card used to hand it the raw
// document, so every one of those fields arrived undefined and the panel
// announced "Key art in progress" over art that was sitting right there in
// the CMS. Both paths go through here now.
// Sanity stores the raw option value, so the takeover printed "2026 ·
// DEVELOPMENT" — development of what? Both render sites read the label from
// here so they cannot drift apart again.
export function statusLabel(status) {
  const s = String(status ?? '').trim()
  if (!s || s === 'development') return 'In development'
  return s[0].toUpperCase() + s.slice(1)
}

export function asGame(g) {
  return {
    title: g?.title ?? '',
    year: g?.year ?? '',
    status: g?.status ?? 'in development',
    logline: g?.description ?? '',
    keyArt: g?.image ?? '',
    storeUrl: g?.url ?? '',
  }
}

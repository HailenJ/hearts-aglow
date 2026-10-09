// Ask each CDN for the size an image is shown at, not the original upload.
// Sanity hands back whatever was uploaded (the OTO key art is a 5.6 MB PNG)
// but resizes and re-encodes on request; fit=max never upscales. Bandcamp
// serves fixed sizes keyed by a suffix — _10 is the 1200px original.
// `w` is in device pixels, so pass roughly twice the CSS width.
const BANDCAMP = [[100, 3], [350, 2], [700, 5]]

export function sized(url, w) {
  if (!url) return url
  if (url.startsWith('https://cdn.sanity.io/images/')) return `${url}?w=${w}&fit=max&auto=format`
  const code = BANDCAMP.find(([px]) => px >= w)?.[1]
  return code ? url.replace(/_10\.jpg$/, `_${code}.jpg`) : url
}

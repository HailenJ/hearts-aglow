import { sanityFetch } from './sanityClient'

const ALL_CONTENT_QUERY = `{
  "musicReleases": *[_type == "musicRelease"] | order(order asc) {
    "id": _id,
    title,
    type,
    year,
    description,
    "url": link,
    "image": artwork.asset->url,
    artist,
    bandcampId,
    tracks,
    bpm,
    order
  },
  "games": *[_type == "game"] | order(featured desc, year desc, _createdAt desc) {
    "id": _id,
    title,
    year,
    description,
    status,
    url,
    featured,
    "image": artwork.asset->url
  },
  "software": *[_type == "software"] | order(year desc) {
    "id": _id,
    title,
    year,
    description,
    status,
    url,
    "image": artwork.asset->url
  },
  "aboutParagraphs": *[_type == "about"][0].paragraphs[] {
    text,
    linkText,
    linkUrl
  },
  "socialLinks": *[_type == "social"] | order(order asc) {
    "id": _id,
    name,
    label,
    url,
    order
  }
}`

export async function fetchAllContent() {
  const result = await sanityFetch(ALL_CONTENT_QUERY)

  const data = {}

  if (result.musicReleases?.length) {
    data.musicReleases = result.musicReleases
  }

  if (result.games?.length) {
    data.games = result.games
  }

  if (result.software?.length) {
    data.software = result.software
  }

  if (result.aboutParagraphs?.length) {
    data.aboutParagraphs = result.aboutParagraphs
  }

  if (result.socialLinks?.length) {
    data.socialLinks = result.socialLinks
  }

  return data
}

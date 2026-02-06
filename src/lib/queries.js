import { sanityClient } from './sanityClient'

const ALL_CONTENT_QUERY = `{
  "musicReleases": *[_type == "musicRelease"] | order(order asc) {
    "id": _id,
    title,
    type,
    year,
    description,
    "url": link,
    order
  },
  "siteSettings": *[_type == "siteSettings"][0] {
    heroTitle,
    heroSubtitle,
    aboutParagraphs[] { text, linkText, linkUrl },
    socialLinks[] { label, url }
  }
}`

export async function fetchAllContent() {
  const result = await sanityClient.fetch(ALL_CONTENT_QUERY)

  const data = {}

  if (result.musicReleases?.length) {
    data.musicReleases = result.musicReleases
  }

  if (result.siteSettings) {
    const s = result.siteSettings

    if (s.heroTitle) data.heroTitle = s.heroTitle
    if (s.heroSubtitle) data.heroSubtitle = s.heroSubtitle

    if (s.aboutParagraphs?.length) {
      data.aboutParagraphs = s.aboutParagraphs
    }

    if (s.socialLinks?.length) {
      data.socialLinks = s.socialLinks.map(link => ({
        name: link.label,
        url: link.url,
        label: link.label,
      }))
    }
  }

  return data
}

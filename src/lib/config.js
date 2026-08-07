// Site constants — structural facts, not editorial content.
//
// These deliberately do NOT live in Sanity. They are the site's conversion
// paths, and a CMS edit must not be able to delete them. That is not
// hypothetical: this file exists because making Sanity authoritative over the
// social list silently removed the contact address and the Bandcamp link from
// the Connect window, taking two of the three audiences' conversion paths with
// them. Editorial links belong in Sanity; the ways to reach and hear this
// studio belong here.

export const CONTACT_EMAIL = 'hailen@heartsaglow.io'

export const BANDCAMP_URL = 'https://hailenjackson.bandcamp.com'

// Hosted form endpoint for launch-news signup. Static hosting means no
// server of our own. Buttondown's embed URL looks like:
//   https://buttondown.email/api/emails/embed-subscribe/<username>
// Empty until the account exists; the form renders disabled rather than
// silently posting nowhere.
export const EMAIL_ENDPOINT = ''

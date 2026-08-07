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

// Newsletter signup, via beehiiv.
//
// This is a LINK, not a form, and that was decided by testing rather than
// taste. Beehiiv offers three routes: their API needs a secret key that cannot
// live in client-side code; their iframe embed is an unstylable widget that
// would drop a white box into a Ganzfeld; and their hosted page does NOT
// prefill from a ?email= query parameter — verified by rendering
// /subscribe?email=probe@example.com and finding the address nowhere in the
// resulting DOM.
//
// So a form of our own would collect an address, hand off, and make the
// visitor type it a second time. One styled button that opens beehiiv's own
// signup is fewer steps for them and keeps our surface ours.
export const NEWSLETTER_URL = 'https://heartsaglow.beehiiv.com/subscribe'

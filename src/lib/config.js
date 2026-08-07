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
// Beehiiv offers three routes and only one fits a static site with a committed
// visual world:
//   - Their API needs a secret key, which cannot live in client-side code.
//   - Their iframe embed works but is an unstylable widget; dropping a white
//     beehiiv box into a Ganzfeld would undo the design it sits in.
//   - Their hosted subscribe page accepts the address as a query parameter, so
//     our own form can stay our own form and simply hand off.
//
// The third is what runs here: the visitor types into a field we designed, and
// submitting opens beehiiv's page with the address already filled in for them
// to confirm. One extra step, in exchange for the takeover keeping its
// integrity.
//
// Set this to the publication's subscribe page, e.g.
//   'https://yourname.beehiiv.com/subscribe'
// While it is empty the form renders disabled with honest copy rather than
// pretending to work.
export const NEWSLETTER_URL = ''

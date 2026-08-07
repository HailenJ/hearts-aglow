import SocialIcon from '../components/SocialIcon'
import { CONTACT_EMAIL, BANDCAMP_URL } from '../lib/config'

const SOCIAL_ORDER = ['bandcamp', 'bluesky', 'instagram', 'twitter', 'x', 'tiktok']
const socialRank = (name) => {
  const key = (name || '').toLowerCase().replace(/[^a-z]/g, '')
  const i = SOCIAL_ORDER.indexOf(key)
  return i === -1 ? SOCIAL_ORDER.length : i
}
const nameOf = (l) => (l.name || '').toLowerCase().trim()

function Connect({ socialLinks }) {
  // Email and Bandcamp are structural, not editorial: they are the conversion
  // paths for two of the three audiences, so they render from site constants
  // and no CMS edit can remove them. Sanity stays authoritative for every
  // OTHER social link, including deletions.
  const fromSanity = [...socialLinks]
    .filter(l => nameOf(l) !== 'email' && nameOf(l) !== 'bandcamp')
    .sort((a, b) => socialRank(a.name) - socialRank(b.name))

  // If Sanity supplies its own Bandcamp entry, prefer its label; otherwise
  // fall back to the constant. Either way the row exists.
  const sanityBandcamp = socialLinks.find(l => nameOf(l) === 'bandcamp')
  const bandcamp = {
    name: 'Bandcamp',
    url: sanityBandcamp?.url || BANDCAMP_URL,
    label: sanityBandcamp?.label || BANDCAMP_URL.replace(/^https?:\/\//, ''),
  }

  const secondary = [bandcamp, ...fromSanity]

  return (
    <div className="contact">
      <a className="contact__primary" href={`mailto:${CONTACT_EMAIL}`}>
        <span className="contact__primary-label">Inquiries &amp; collaboration</span>
        <span className="contact__primary-value">
          <SocialIcon name="Email" className="contact__icon" />
          {CONTACT_EMAIL}
        </span>
      </a>

      <ul className="contact__list">
        {secondary.map((link, i) => (
          <li key={`${link.name}-${i}`} className="contact__item">
            <span className="contact__label">
              <SocialIcon name={link.name} className="contact__icon" />
              {link.name}
            </span>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="contact__value"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Connect

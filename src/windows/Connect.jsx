import SocialIcon from '../components/SocialIcon'
import * as fallbackData from '../data/fallback'

const SOCIAL_ORDER = ['email', 'bandcamp', 'bluesky', 'instagram', 'twitter', 'x', 'tiktok']
const socialRank = (name) => {
  const key = (name || '').toLowerCase().replace(/[^a-z]/g, '')
  const i = SOCIAL_ORDER.indexOf(key)
  return i === -1 ? SOCIAL_ORDER.length : i
}
const isPrimary = (name) => /^email$/i.test((name || '').trim())

function Connect({ socialLinks }) {
  const seen = new Set(socialLinks.map(l => (l.name || '').toLowerCase().trim()))
  const filledFromFallback = fallbackData.socialLinks.filter(
    l => !seen.has((l.name || '').toLowerCase().trim())
  )
  const merged = [...socialLinks, ...filledFromFallback].sort(
    (a, b) => socialRank(a.name) - socialRank(b.name)
  )

  const primary = merged.find(l => isPrimary(l.name))
  const secondary = merged.filter(l => !isPrimary(l.name))

  return (
    <div className="contact">
      {primary && (
        <a
          className="contact__primary"
          href={primary.url}
          target={primary.url.startsWith('mailto') ? undefined : '_blank'}
          rel={primary.url.startsWith('mailto') ? undefined : 'noopener noreferrer'}
        >
          <span className="contact__primary-label">Inquiries &amp; collaboration</span>
          <span className="contact__primary-value">
            <SocialIcon name={primary.name} className="contact__icon" />
            {primary.label}
          </span>
        </a>
      )}
      <ul className="contact__list">
        {secondary.map((link, i) => (
          <li key={`${link.name}-${i}`} className="contact__item">
            <span className="contact__label">
              <SocialIcon name={link.name} className="contact__icon" />
              {link.name}
            </span>
            <a
              href={link.url}
              target={link.url.startsWith('mailto') ? undefined : '_blank'}
              rel={link.url.startsWith('mailto') ? undefined : 'noopener noreferrer'}
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

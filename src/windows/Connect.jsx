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
  // Sanity, when it returns anything at all, is the complete list — a link
  // deleted there must disappear from the live site, not get backfilled from
  // the local fallback. Only fall back wholesale when Sanity has nothing.
  const links = socialLinks.length > 0 ? socialLinks : fallbackData.socialLinks
  const merged = [...links].sort((a, b) => socialRank(a.name) - socialRank(b.name))

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

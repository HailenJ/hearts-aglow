const ICONS = {
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  bandcamp: (
    <path d="M4 6h16l-4 12H0z" />
  ),
  bluesky: (
    <>
      <path d="M6 5c2 1 4 3 6 6 2-3 4-5 6-6" />
      <path d="M6 5c-1.5 4-1 8 1 11 2-1 3.5-2 5-5" />
      <path d="M18 5c1.5 4 1 8-1 11-2-1-3.5-2-5-5" />
    </>
  ),
  twitter: (
    <path d="M4 4l16 16M20 4L4 20" />
  ),
  x: (
    <path d="M4 4l16 16M20 4L4 20" />
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  tiktok: (
    <>
      <path d="M14 4v10.5a3 3 0 1 1-3-3" />
      <path d="M14 4c0 2.5 2 4.5 4.5 4.5" />
    </>
  ),
  default: (
    <circle cx="12" cy="12" r="3.5" />
  ),
}

export default function SocialIcon({ name, className = '' }) {
  const key = (name || '').toLowerCase().replace(/[^a-z]/g, '')
  const icon = ICONS[key] ?? ICONS.default
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icon}
    </svg>
  )
}

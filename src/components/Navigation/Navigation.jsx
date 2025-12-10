import './Navigation.css'

/*
  Navigation Component
  
  Minimal floating dots on the right side.
  Hidden by default, fades in after scrolling.
  Clicking a dot smooth-scrolls to that section.
*/

function Navigation({ activeSection, visible }) {
  const sections = [
    { id: 'hero', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'portfolio', label: 'Works' },
    { id: 'contact', label: 'Contact' },
  ]

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className={`navigation ${visible ? 'navigation--visible' : ''}`}>
      <ul className="navigation__list">
        {sections.map((section) => (
          <li key={section.id} className="navigation__item">
            <button
              className={`navigation__dot ${activeSection === section.id ? 'navigation__dot--active' : ''}`}
              onClick={() => scrollToSection(section.id)}
              aria-label={`Go to ${section.label}`}
            >
              <span className="navigation__tooltip font-mono">
                {section.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Navigation

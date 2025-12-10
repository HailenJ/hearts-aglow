import './Contact.css'

/*
  Contact Component
  
  Minimal contact info with social links.
  Keeping it simple for MVP - no form yet.
*/

function Contact() {
  const socialLinks = [
    {
      name: 'Email',
      url: 'mailto:Hailen@Hailen.info',
      label: 'Hailen@Hailen.info',
    },
    {
      name: 'Bandcamp',
      url: 'https://hailenjackson.bandcamp.com',
      label: 'hailenjackson.bandcamp.com',
    },
    {
      name: 'Twitter',
      url: 'https://twitter.com/hailenjackson',
      label: '@hailenjackson',
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com/hailenjackson',
      label: '@hailenjackson',
    },
  ]

  return (
    <section id="contact" className="contact">
      {/* Background glow */}
      <div className="contact__glow"></div>
      
      <div className="contact__container">
        <div className="contact__panel glass-panel">
          {/* Corner accents */}
          <div className="contact__corner contact__corner--tl"></div>
          <div className="contact__corner contact__corner--tr"></div>
          <div className="contact__corner contact__corner--bl"></div>
          <div className="contact__corner contact__corner--br"></div>
          
          <h2 className="contact__title glow-text-subtle">Connect</h2>
          
          <ul className="contact__links">
            {socialLinks.map((link, index) => (
              <li key={index} className="contact__link-item">
                <span className="contact__link-name font-mono">{link.name}</span>
                <a 
                  href={link.url}
                  target={link.url.startsWith('mailto') ? undefined : '_blank'}
                  rel={link.url.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                  className="contact__link"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          

        </div>
      </div>
      
      {/* Footer */}
      <footer className="contact__footer font-mono">
        <p>© {new Date().getFullYear()} Hearts Aglow</p>
      </footer>
    </section>
  )
}

export default Contact

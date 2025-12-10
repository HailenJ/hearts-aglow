import './Hero.css'

/*
  Hero Component
  
  The first thing visitors see - pure atmosphere.
  Animated gradient background + glowing title + tagline.
  
  In React, components are just functions that return JSX
  (which looks like HTML but is actually JavaScript).
*/

function Hero() {
  const scrollToAbout = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="hero" className="hero gradient-bg radial-glow">
      {/* Floating particles/orbs for atmosphere - subtle */}
      <div className="hero__orbs">
        <div className="hero__orb hero__orb--1"></div>
        <div className="hero__orb hero__orb--2"></div>
        <div className="hero__orb hero__orb--3"></div>
      </div>

      <div className="hero__content">
        {/* Logo/Title */}
        <h1 className="hero__title fade-in">
          <span className="hero__title-text glow-text">Hearts Aglow</span>
        </h1>
        
        {/* Tagline */}
        <p className="hero__tagline fade-in-delayed">
          Light, sound, and what hums beneath.
        </p>
        
        {/* Subtle scroll indicator */}
        <div className="hero__scroll-hint fade-in-delayed-2" onClick={scrollToAbout}>
          <span className="font-mono">Enter</span>
          <div className="hero__scroll-line"></div>
        </div>
      </div>
    </section>
  )
}

export default Hero

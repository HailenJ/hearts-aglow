import './About.css'

/*
  About Component
  
  The poetic introduction to Hearts Aglow.
  Uses a glassmorphic panel for that .hack THE WORLD feel.
*/

function About() {
  return (
    <section id="about" className="about">
      {/* Subtle background glow */}
      <div className="about__glow"></div>
      
      <div className="about__container">
        <article className="about__panel glass-panel">
          {/* Decorative corner accents - THE WORLD style */}
          <div className="about__corner about__corner--tl"></div>
          <div className="about__corner about__corner--tr"></div>
          <div className="about__corner about__corner--bl"></div>
          <div className="about__corner about__corner--br"></div>
          
          <div className="about__content">
            <p className="about__lead">
              Some things glow from within.
            </p>
            
            <p>
              Hearts Aglow is a small studio for games, software, and music — all built 
              on the belief that digital spaces can feel alive. Founded by{' '}
              <a 
                href="https://hailenjackson.bandcamp.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Hailen Jackson
              </a>, 
              whose atmospheric electronic work has soundtracked games, films, 
              and late-night radio across the world.
            </p>
            
            <p>
              We make things that breathe. Come drift with us.
            </p>
          </div>
        </article>
      </div>
    </section>
  )
}

export default About

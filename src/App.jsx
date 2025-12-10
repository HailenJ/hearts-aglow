import { useState, useEffect } from 'react'
import Hero from './components/Hero/Hero'
import About from './components/About/About'
import Portfolio from './components/Portfolio/Portfolio'
import Contact from './components/Contact/Contact'
import Navigation from './components/Navigation/Navigation'

/*
  App.jsx - The Root Component
  
  Think of this like the "main template" in WordPress.
  It composes all the sections together and manages any global state.
*/

function App() {
  // Track which section is currently in view (for navigation dots)
  const [activeSection, setActiveSection] = useState('hero')
  
  // Track if user has scrolled (to show/hide navigation)
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show navigation after scrolling a bit
      setHasScrolled(window.scrollY > 100)
      
      // Determine which section is in view
      const sections = ['hero', 'about', 'portfolio', 'contact']
      
      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const rect = element.getBoundingClientRect()
          // If section is roughly in the middle of viewport
          if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="app">
      {/* Navigation dots - appear after scrolling */}
      <Navigation 
        activeSection={activeSection} 
        visible={hasScrolled}
      />
      
      {/* Page Sections */}
      <Hero />
      <About />
      <Portfolio />
      <Contact />
    </div>
  )
}

export default App

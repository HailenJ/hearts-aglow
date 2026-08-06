function Hero({ hasOpenWindows, heroSubtitle }) {
  if (hasOpenWindows) return null

  return (
    <div className="hero">
      <img src="/logo.png" alt="Hearts Aglow" className="hero__logo" />
      <p className="hero__tagline">{heroSubtitle}</p>
    </div>
  )
}

export default Hero

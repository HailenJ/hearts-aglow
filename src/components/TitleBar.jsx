import { useState, useEffect } from 'react'

function TitleBar({ nowPlaying }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const formatted = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).toLowerCase().replace(' ', ' ')
      setTime(formatted)
    }
    updateTime()
    const interval = setInterval(updateTime, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="titlebar">
      <div className="titlebar__brand">
        <span className={`titlebar__dot ${nowPlaying ? 'titlebar__dot--live' : ''}`} />
        <span>heartsaglow</span>
      </div>
      {nowPlaying && <span className="titlebar__np">♪ {nowPlaying}</span>}
      <span className="titlebar__time">{time}</span>
    </header>
  )
}

export default TitleBar

import { useEffect, useRef } from 'react'

// HONEST NOTE, because this is easy to misread later:
// This is NOT an audio analyser. It cannot be. The Bandcamp player is a
// cross-origin iframe and its stream ships without CORS headers, so the
// browser silences any Web Audio graph we connect to it. Verified, not
// assumed.
//
// So rather than fake a spectrum, this draws a deterministic signature of the
// RECORD: frequencies, phases and amplitudes are derived from the release's
// own id and track durations. Drift 6 looks different from Coda, and each
// looks the same every time you open it. It is a generated portrait, not a
// measurement — which suits a catalogue whose music is itself generated from
// biological signals rather than performed.

const hash = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Small deterministic PRNG so a given release always yields the same figure.
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}

export default function Visualizer({ release }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !release) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    // Seed from the record itself: its id, and the shape of its tracklist.
    const durations = (release.tracks ?? [])
      .map(t => (typeof t === 'object' ? t.duration : 0) || 0)
    const seedStr = `${release.bandcampId || release.slug || release.title}:${durations.join(',')}`
    const rand = rng(hash(seedStr))

    // Six ribbons. Longer records get slower, wider waves — a 35-minute
    // ambient piece should not shimmer like a two-minute one.
    const mean = durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 240
    const languor = Math.min(1, mean / 900)
    const waves = Array.from({ length: 6 }, () => ({
      freq: 0.6 + rand() * 2.4 * (1 - languor * 0.6),
      phase: rand() * Math.PI * 2,
      speed: (0.06 + rand() * 0.22) * (1 - languor * 0.55),
      amp: 0.18 + rand() * 0.5,
      hue: rand(),
    }))

    let raf = 0
    let w = 0
    let h = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      for (const wv of waves) {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const u = x / w
          const y = h / 2 + Math.sin(u * Math.PI * 2 * wv.freq + wv.phase + t * wv.speed)
            * (h / 2) * wv.amp
            // envelope so the ribbons taper at both edges instead of being cut
            * Math.sin(u * Math.PI)
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        // Palette runs bloom-violet to signal-cyan, matching the field.
        const r = Math.round(196 + wv.hue * 27)
        const g = Math.round(138 + wv.hue * 106)
        const b = Math.round(255)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.52)`
        ctx.lineWidth = 1.2
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`
        ctx.shadowBlur = 6
        ctx.stroke()
        ctx.shadowBlur = 0
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    resize()
    window.addEventListener('resize', resize)

    const start = performance.now()
    const loop = () => {
      raf = requestAnimationFrame(loop)
      draw((performance.now() - start) / 1000)
    }

    const onMotion = () => {
      cancelAnimationFrame(raf)
      raf = 0
      if (reduced.matches) draw(0)
      else loop()
    }
    onMotion()
    reduced.addEventListener('change', onMotion)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      reduced.removeEventListener('change', onMotion)
    }
  }, [release])

  return <canvas ref={canvasRef} className="player__viz" aria-hidden="true" />
}

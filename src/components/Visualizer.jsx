import { useEffect, useRef } from 'react'

// HONEST NOTE, because this is easy to misread later:
// None of these are audio analysers. They cannot be. The Bandcamp player is a
// cross-origin iframe and its stream ships without CORS headers, so the
// browser silences any Web Audio graph connected to it. Verified by request,
// not assumed.
//
// Instead each mode draws a deterministic portrait of the RECORD: every
// frequency, phase, angle and hue derives from the release's own id and the
// shape of its tracklist. Drift 6 looks unlike Coda, and each looks identical
// every time you open it. A signature, not a measurement — which suits a
// catalogue whose music is itself generated from biological signals.


const hash = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}

export default function Visualizer({ release, mode = 'ribbons' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !release) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    const durations = (release.tracks ?? []).map(t => (typeof t === 'object' ? t.duration : 0) || 0)
    const seedStr = `${release.bandcampId || release.slug || release.title}:${durations.join(',')}`
    const rand = rng(hash(seedStr))

    // Longer records move slower. A 35-minute ambient piece should not
    // shimmer like a two-minute one.
    const mean = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 240
    const languor = Math.min(1, mean / 900)
    const tempo = 1 - languor * 0.6

    const waves = Array.from({ length: 6 }, () => ({
      freq: 0.6 + rand() * 2.4 * tempo,
      phase: rand() * Math.PI * 2,
      speed: (0.06 + rand() * 0.22) * tempo,
      amp: 0.18 + rand() * 0.5,
      hue: rand(),
    }))

    // Belson: concentric rings, one per track, drifting off-centre and
    // breathing — the centric mandala of Allures and Samadhi.
    const rings = Array.from({ length: Math.max(5, Math.min(durations.length, 12)) }, (_, i) => ({
      r: 0.12 + i * 0.075,
      wobble: 0.4 + rand() * 0.9,
      speed: (0.05 + rand() * 0.13) * tempo,
      hue: rand(),
    }))

    // Minter: mirrored vector spokes with feedback trails — the Llamasoft
    // light-synth lineage, where the trail IS the image.
    const arms = 5 + Math.floor(rand() * 4)
    const spokes = Array.from({ length: 7 }, () => ({
      a: rand() * Math.PI * 2,
      spin: (rand() - 0.5) * 1.1 * tempo,
      len: 0.35 + rand() * 0.6,
      hue: rand(),
    }))

    let raf = 0, w = 0, h = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // Palette: bloom-violet through signal-cyan for the quiet modes, and the
    // field's warm amber added for Minter, which earns the saturation.
    const cool = (u, a) => `rgba(${Math.round(196 + u * 27)}, ${Math.round(138 + u * 106)}, 255, ${a})`
    const hot = (u, a) => (u < 0.5
      ? `rgba(255, ${Math.round(120 + u * 200)}, ${Math.round(200 - u * 120)}, ${a})`
      : `rgba(${Math.round(150 + u * 105)}, ${Math.round(230 - u * 60)}, 255, ${a})`)

    const drawRibbons = (t) => {
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      for (const v of waves) {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 2) {
          const u = x / w
          const y = h / 2
            + Math.sin(u * Math.PI * 2 * v.freq + v.phase + t * v.speed) * (h / 2) * v.amp
            * Math.sin(u * Math.PI)
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.strokeStyle = cool(v.hue, 0.52)
        ctx.lineWidth = 1.2
        ctx.shadowColor = cool(v.hue, 0.6)
        ctx.shadowBlur = 6
        ctx.stroke()
      }
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'source-over'
    }

    const drawBelson = (t) => {
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      const cx = w / 2, cy = h / 2
      const base = Math.min(w, h * 2.2)

      // The aperture at the centre, breathing.
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.42)
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.22 * tempo)
      glow.addColorStop(0, `rgba(214, 176, 255, ${0.16 + pulse * 0.12})`)
      glow.addColorStop(1, 'rgba(214, 176, 255, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)

      for (const r of rings) {
        const rad = base * r.r * (1 + 0.08 * Math.sin(t * r.speed * 2 + r.wobble))
        const ox = Math.sin(t * r.speed + r.wobble) * w * 0.03
        const oy = Math.cos(t * r.speed * 0.7 + r.wobble) * h * 0.06
        ctx.beginPath()
        ctx.ellipse(cx + ox, cy + oy, rad, rad * 0.42, 0, 0, Math.PI * 2)
        ctx.strokeStyle = cool(r.hue, 0.3)
        ctx.lineWidth = 1
        ctx.shadowColor = cool(r.hue, 0.5)
        ctx.shadowBlur = 8
        ctx.stroke()
      }
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'source-over'
    }

    const drawMinter = (t) => {
      // Feedback rather than clearing: the trail is the image. Erase alpha
      // instead of painting black — filling with a dark colour accumulates to
      // an opaque slab and destroys the player's glass.
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0, 0, 0, 0.30)'
      ctx.fillRect(0, 0, w, h)

      // Additive blending accumulates fast across a feedback trail: at any
      // meaningful alpha every spoke converges on white and swamps the panel.
      // Low per-stroke alpha keeps the colour and lets the trail do the work.
      ctx.globalCompositeOperation = 'lighter'
      const cx = w / 2, cy = h / 2
      const reach = Math.min(w / 2, h * 1.15) * 0.72

      for (const s of spokes) {
        const ang = s.a + t * s.spin
        for (let k = 0; k < arms; k++) {
          // Kaleidoscopic mirror: every spoke repeated around the centre.
          const a = ang + (k / arms) * Math.PI * 2
          const len = reach * s.len * (0.55 + 0.45 * Math.sin(t * 0.9 + s.a * 3))
          const inner = len * 0.22
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner * 0.42)
          ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.42)
          ctx.strokeStyle = hot((s.hue + t * 0.03) % 1, 0.14)
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    const draw = (t) => {
      if (mode === 'belson') drawBelson(t)
      else if (mode === 'minter') drawMinter(t)
      else drawRibbons(t)
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
      ctx.clearRect(0, 0, w, h)
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
  }, [release, mode])

  return <canvas ref={canvasRef} className="player__viz" aria-hidden="true" />
}

import { useEffect, useRef } from 'react'
import { Renderer, Program, Mesh, Triangle } from 'ogl'
import { vizSeed, DEFAULT_BPM, WAVES, RINGS, SPOKES, TRAIL } from '../lib/vizSeed'

// HONEST NOTE, because this is easy to misread later:
// None of these are audio analysers. They cannot be. The Bandcamp player is a
// cross-origin iframe and its stream ships without CORS headers, so the
// browser silences any Web Audio graph connected to it. Verified by request,
// not assumed.
//
// The beat is not sync either, and the difference matters. `uBeat` comes from a
// hardcoded BPM in the data, so the pulse runs at the track's true RATE but at
// an arbitrary PHASE — it is a free-running oscillator, not a follower. The
// same iframe boundary hides `currentTime`, play and pause, so there is no
// instant to align to. An iframe-focus heuristic could guess when someone
// pressed play, but it cannot see a pause, so it would desync permanently the
// first time anyone used one. A pulse at the right tempo is honest; a fake sync
// that drifts is worse than none, so this does not pretend.
//
// Instead each mode draws a deterministic portrait of the RECORD — see
// lib/vizSeed.js. A signature, not a measurement, which suits a catalogue
// whose music is itself generated from biological signals.
//
// WHY WEBGL: the first version was Canvas 2D hairline strokes with shadowBlur
// standing in for glow, and it read as wireframes taped onto a light field.
// That was a materials mismatch, not a tuning problem — the rest of the site
// is a gaussian, dithered, edgeless shader. So these now speak the same
// vocabulary as LightField.jsx: every figure is a sum of gaussians, each one a
// tight core plus a wide halo, which is what shadowBlur was imitating.

const MODE = { strand: 0, halo: 1, bloom: 2 }

// Where each figure centres, in CSS pixels down from the panel's top edge.
// Must stay inside `.player__stage`, which is 148px at every width.
const FOCUS_PX = 78

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uMotion;
  uniform float uMode;
  uniform float uAspect;
  uniform float uFocus;
  uniform float uArms;
  uniform float uBeat;   // Hz — the loaded track's BPM over sixty.

  uniform vec4  uWaves[${WAVES}];
  uniform float uWaveHue[${WAVES}];
  uniform vec4  uRings[${RINGS}];
  uniform float uRingOn[${RINGS}];
  uniform vec4  uSpokes[${SPOKES}];

  varying vec2 vUv;

  const float PI  = 3.14159265359;
  const float TAU = 6.28318530718;

  // Same ember palette as LightField.jsx, so a record's portrait and the room
  // it plays in are lit by one set of colours. BONE replaces what was signal
  // cyan (#dff4ff): --signal has four sanctioned uses and "bright end of a
  // decorative ramp" is not one of them, so the hot core is a warm white now.
  const vec3 ROSE  = vec3(1.000, 0.302, 0.427);  // #ff4d6d
  const vec3 PEACH = vec3(1.000, 0.659, 0.471);  // #ffa878
  const vec3 BONE  = vec3(1.000, 0.914, 0.871);  // #ffe9de

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // The one primitive everything is built from. Gaussian falloff never reaches
  // zero, so nothing drawn here has an edge — same requirement as the field.
  float g(float d, float r) {
    return exp(-(d * d) / (r * r));
  }

  vec3 ramp(float u) { return mix(ROSE, BONE, u); }

  // One beat: a fast attack and a long decay, which is the shape of a pulse
  // rather than of a sine. Free-running — see the note in Visualizer.jsx about
  // why the phase cannot be aligned to the audio.
  float beat(float t) {
    return exp(-fract(t * uBeat) * 2.6);
  }

  // Bloom earns the saturation the quiet modes do not: peach through rose and
  // out into a white-hot core.
  vec3 hot(float u) {
    return u < 0.5 ? mix(PEACH, ROSE, u * 2.0) : mix(ROSE, BONE, (u - 0.5) * 2.0);
  }

  float segDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * h);
  }

  // Strand — travelling waves pinned at both ends. Distance to the curve is
  // measured perpendicular, not vertically, or the ribbons would pinch wherever
  // they run steep. The slope is known analytically, so the correction is free.
  vec3 strand(float t, float b) {
    vec3 col = vec3(0.0);
    float u = vUv.x;
    float y0 = vUv.y - uFocus;
    float env = sin(u * PI);
    float denv = PI * cos(u * PI);
    for (int i = 0; i < ${WAVES}; i++) {
      vec4 w = uWaves[i];
      float k = u * TAU * w.x + w.y + t * w.z;
      float amp = 0.28 * w.w * (1.0 + 0.07 * b);
      float y = sin(k) * amp * env;
      float slope = amp * (cos(k) * TAU * w.x * env + sin(k) * denv) / uAspect;
      float d = abs(y0 - y) / sqrt(1.0 + slope * slope);
      // Kept under the clip point: six ribbons crossing at 0.55 each summed to
      // white and threw the colour away exactly where the weave is busiest.
      col += ramp(uWaveHue[i]) * (g(d, 0.009) * 0.40 + g(d, 0.055) * 0.10) * (0.86 + 0.22 * b);
    }
    return col;
  }

  // Halo — concentric rings drifting off-centre around a breathing aperture,
  // after Jordan Belson's Allures and Samadhi. Centric forms, so this needs the
  // whole panel rather than a strip.
  vec3 halo(vec2 p, float t, float b) {
    vec3 col = vec3(0.0);
    // The slow breath stays and the beat rides on top of it: a long swell with
    // a pulse in it, rather than one replacing the other.
    col += ROSE * g(length(p), 0.17 + 0.014 * sin(t * 0.27) + 0.020 * b) * (0.30 + 0.10 * b);
    for (int i = 0; i < ${RINGS}; i++) {
      vec4 r = uRings[i];
      vec2 c = vec2(sin(t * r.z + r.y), cos(t * r.z * 0.7 + r.y)) * 0.03;
      float rad = r.x * (1.0 + 0.07 * sin(t * r.z * 2.0 + r.y));
      float d = abs(length(p - c) - rad);
      col += ramp(r.w) * (g(d, 0.005) * 0.40 + g(d, 0.03) * 0.07) * uRingOn[i] * (0.86 + 0.22 * b);
    }
    return col;
  }

  // Bloom — mirrored spokes after Jeff Minter's Llamasoft light synths, where
  // the trail IS the image. The only mode that runs the full spectrum.
  // ponytail: the trail is analytic, not a feedback buffer — each spoke is
  // re-evaluated at ${TRAIL} past instants with decaying weight. Ceiling: it can only
  // trail as far back as the loop is long, so a very fast spin shows a dotted
  // arc rather than a smear. Upgrade path is a ping-pong RenderTarget, which
  // costs two framebuffers and a second program for a panel this size.
  vec3 bloom(vec2 p, float t, float b) {
    vec3 col = vec3(0.0);
    float sector = TAU / uArms;
    float rr = length(p);
    // Fold the pixel into one sector and mirror it: the kaleidoscope is the
    // coordinate system, so nothing has to be drawn more than once.
    float pa = abs(mod(atan(p.y, p.x), sector) - sector * 0.5);
    vec2 q = vec2(cos(pa), sin(pa)) * rr;

    // Every spoke converges on the origin, so without this the additive sum
    // pegs at white there and the figure becomes a headlight — the same trap
    // the Canvas version fell into. The spokes are held off the centre and the
    // core is drawn once, deliberately, instead of accumulating.
    float keepOff = smoothstep(0.03, 0.17, rr);
    col += mix(PEACH, ROSE, 0.5) * g(rr, 0.045 + 0.010 * b) * (0.42 + 0.26 * b);

    for (int i = 0; i < ${SPOKES}; i++) {
      vec4 s = uSpokes[i];
      for (int k = 0; k < ${TRAIL}; k++) {
        float tk = t - float(k) * 0.06;
        float sa = abs(mod(s.x + tk * s.y, sector) - sector * 0.5);
        float len = s.z * 0.42 * (0.55 + 0.45 * sin(tk * 0.9 + s.x * 3.0)) * (1.0 + 0.06 * b);
        vec2 e = vec2(cos(sa), sin(sa)) * len;
        float d = segDist(q, e * 0.34, e);
        col += hot(fract(s.w + t * 0.03)) * (g(d, 0.006) * 0.26 + g(d, 0.032) * 0.055)
             * exp(-float(k) * 0.6) * keepOff * (0.84 + 0.26 * b);
      }
    }
    return col;
  }

  void main() {
    float t = uTime * uMotion;
    // The figures centre on uFocus, not on the panel, because the panel's
    // middle is where the meta bar and the Bandcamp iframe sit — centring
    // there buried the aperture and the starburst's core under the chrome.
    vec2 p = (vUv - vec2(0.5, uFocus)) * vec2(uAspect, 1.0);

    float b = beat(t);

    vec3 col;
    if (uMode < 0.5)      col = strand(t, b);
    else if (uMode < 1.5) col = halo(p, t, b);
    else                  col = bloom(p, t, b);

    // Per-pixel dither, for the same reason the field has it.
    col = max(col + (hash(gl_FragCoord.xy) - 0.5) / 255.0 * 1.6, 0.0);

    // Premultiplied, so the canvas adds light to the pane beneath it rather
    // than replacing it: where the figure is dark the panel's glass shows.
    float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
    gl_FragColor = vec4(min(col, vec3(a)), a);
  }
`

export default function Visualizer({ release, mode = 'strand', bpm = DEFAULT_BPM }) {
  const hostRef = useRef(null)
  const liveRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !release) return

    const seed = vizSeed(release)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    const renderer = new Renderer({
      depth: false,
      alpha: true,
      premultipliedAlpha: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    })
    const gl = renderer.gl
    host.appendChild(gl.canvas)

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uMotion: { value: reduced.matches ? 0 : 1 },
        uMode: { value: 0 },
        uAspect: { value: 1 },
        uFocus: { value: 0.5 },
        uArms: { value: seed.arms },
        uBeat: { value: DEFAULT_BPM / 60 },
        uWaves: { value: seed.waves },
        uWaveHue: { value: seed.waveHue },
        uRings: { value: seed.rings },
        uRingOn: { value: seed.ringOn },
        uSpokes: { value: seed.spokes },
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
    const paint = () => renderer.render({ scene: mesh })
    liveRef.current = { program, paint }

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      program.uniforms.uAspect.value = w / h
      // Measured down from the top edge rather than as a fraction, because the
      // chrome below is a fixed number of pixels while the panel's height rides
      // on how many tracks the record has.
      program.uniforms.uFocus.value = 1 - FOCUS_PX / h
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    const start = performance.now()
    const loop = () => {
      raf = requestAnimationFrame(loop)
      program.uniforms.uTime.value = (performance.now() - start) / 1000
      paint()
    }

    const onMotionChange = () => {
      const reduce = reduced.matches
      program.uniforms.uMotion.value = reduce ? 0 : 1
      if (reduce) {
        cancelAnimationFrame(raf)
        raf = 0
        paint()
      } else if (!raf) {
        loop()
      }
    }
    reduced.addEventListener('change', onMotionChange)

    if (reduced.matches) paint()
    else loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      reduced.removeEventListener('change', onMotionChange)
      liveRef.current = null
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [release])

  // Mode and beat are both a single uniform, so changing either must not
  // rebuild the WebGL context — three mode buttons and a twelve-track list
  // would otherwise churn a context per click. `release` is a dependency
  // because the effect above rebuilds the program when it changes, and the
  // fresh program starts on mode zero at the default pulse.
  useEffect(() => {
    const live = liveRef.current
    if (!live) return
    live.program.uniforms.uMode.value = MODE[mode] ?? 0
    live.program.uniforms.uBeat.value = bpm / 60
    // Frozen under reduced motion, so the switch has to paint the change itself.
    if (live.program.uniforms.uMotion.value === 0) live.paint()
  }, [release, mode, bpm])

  return <div ref={hostRef} className="player__viz" aria-hidden="true" />
}

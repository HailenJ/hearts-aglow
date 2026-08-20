import { useEffect, useLayoutEffect, useRef } from 'react'
import { Renderer, Program, Mesh, Triangle } from 'ogl'

// The ground reacts, because that is the whole idea.
//
// The field used to be inert while a BPM-pulsed visualiser ran inside a 148px
// panel in the corner. That is backwards: the room is the thing you are inside,
// so the room is what should breathe. When a record is loaded the field takes
// its pulse and leans toward its hue; when the visitor opens the place up,
// embers rise through it.
//
// HONEST NOTE, same as Visualizer.jsx: none of this is audio analysis and it
// cannot be. The Bandcamp player is a cross-origin iframe whose stream ships
// without CORS headers, so any Web Audio graph connected to it is silenced,
// and currentTime/play/pause are invisible too. `uBeat` therefore runs at the
// track's true RATE and an arbitrary PHASE — a free oscillator, not a
// follower. Reactivity that could be faked is not faked: `uEnergy` responds to
// a record being LOADED, and `uActivity` to windows being opened, because
// those are things this page can actually observe.

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const EMBERS = 14

const fragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform float uMotion;
  uniform float uBeat;      // Hz — the loaded track's BPM over sixty, 0 when idle.
  uniform float uEnergy;    // 0..1 — a record is loaded.
  uniform float uTint;      // 0..1 — which record, as a hue nudge.
  uniform float uActivity;  // 0..1 — how much the visitor has opened.

  varying vec2 vUv;

  // Ember, not violet: the field burns the same colours the brand marks
  // already use (public/logo.png peach-to-rose, favicon.svg crimson). Keep these
  // four in sync with the --bloom-* tokens in globals.css, which mirror them.
  const vec3 VOID  = vec3(0.031, 0.027, 0.043);  // #08070b
  const vec3 ROSE  = vec3(1.000, 0.302, 0.427);  // #ff4d6d
  const vec3 PEACH = vec3(1.000, 0.659, 0.471);  // #ffa878
  const vec3 DEEP  = vec3(0.478, 0.184, 0.263);  // #7a2f43
  // A second lead so records differ without leaving the arc. Rose through
  // coral is the whole range any record can tint the field: still ember, never
  // near --signal's cyan.
  const vec3 CORAL = vec3(1.000, 0.420, 0.290);  // #ff6b4a

  const float TAU = 6.28318530718;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // Gaussian falloff never reaches zero, so the field has no boundary
  // anywhere. That absence of edge is the whole Ganzfeld requirement.
  float bloom(vec2 uv, vec2 c, float r) {
    vec2 d = (uv - c) * vec2(uResolution.x / uResolution.y, 1.0);
    return exp(-dot(d, d) / (r * r));
  }

  // One beat: fast attack, long decay — the shape of a pulse, not a sine.
  // Identical to Visualizer.jsx's so the field and the panel agree. Gated on
  // uMotion so reduced-motion gets a still field rather than a silent strobe.
  float beat(float t) {
    if (uBeat <= 0.0) return 0.0;
    return exp(-fract(t * uBeat) * 2.6) * uMotion;
  }

  // The field's only discrete elements, and still sums of gaussians, so the
  // no-edge rule holds. Each ember's column, size and rise speed come from a
  // hash of its index, so they are fixed for the life of the page rather than
  // reshuffling every frame.
  float embers(vec2 uv, float t, float b) {
    float acc = 0.0;
    for (int i = 0; i < ${EMBERS}; i++) {
      float fi = float(i);
      float sx = hash(vec2(fi, 1.0));
      float sy = hash(vec2(fi, 2.0));
      float rise = 0.004 + hash(vec2(fi, 3.0)) * 0.014;
      float x = sx + 0.04 * sin(t * 0.11 + fi * 1.7);
      float y = fract(sy + t * rise);
      float r = 0.005 + 0.009 * hash(vec2(fi, 4.0));
      // Dim at both edges so they arrive and leave instead of popping.
      float fade = sin(y * 3.14159265);
      acc += bloom(uv, vec2(x, y), r * (1.0 + 0.45 * b)) * fade * fade;
    }
    return acc;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * uMotion;
    float b = beat(t);

    // Which record the field is carrying. Rose at rest, coral at the far end.
    vec3 lead = mix(ROSE, CORAL, uTint);

    // Periods 431 / 619 / 787 seconds share no common multiple inside any
    // plausible visit, so the field never visibly repeats.
    float a = t / 431.0 * TAU;
    float bb = t / 619.0 * TAU;
    float c = t / 787.0 * TAU;

    vec2 p1 = vec2(0.32 + 0.10 * sin(a),        0.28 + 0.08 * cos(a * 1.3));
    vec2 p2 = vec2(0.74 + 0.09 * cos(bb),       0.68 + 0.07 * sin(bb * 0.9));
    vec2 p3 = vec2(0.50 + 0.14 * sin(c * 0.7),  1.02 + 0.06 * cos(c));

    float f1 = bloom(uv, p1, 0.46);
    float f2 = bloom(uv, p2, 0.52);
    float f3 = bloom(uv, p3, 0.70);

    vec3 warm = mix(lead, PEACH, 0.5 + 0.5 * sin(a * 0.5));
    vec3 cool = mix(DEEP, lead,  0.5 + 0.5 * cos(bb * 0.5));

    // The swell is small on purpose. The blooms are most of the field's light,
    // so a big multiplier here would strobe the entire screen on the beat.
    float swell = 1.0 + 0.09 * b * uEnergy;

    vec3 col = VOID;
    col += warm * f1 * 0.34 * swell;
    col += cool * f2 * 0.26 * swell;
    col += DEEP * f3 * 0.40;

    // Belson's centric aperture, breathing on a 23s cycle — and the one place
    // the pulse is allowed to be obvious, because it is the smallest.
    float ap = bloom(uv, vec2(0.5), 0.30 + 0.02 * sin(t / 23.0 * TAU));
    col += lead * ap * (0.05 + 0.05 * b * uEnergy);

    // Embers are always present but nearly invisible until something is
    // happening: opening windows and loading a record both raise them.
    //
    // These three numbers are calibrated, not chosen. An ember core is the
    // brightest thing the field can produce, and text sits on that field, so
    // the lift is bounded by contrast: at 0.06/0.24/0.18 the peak grew 48%
    // when a record played and --text fell to 4.08:1, under WCAG AA. These
    // values hold the growth to 11.7% and --text at 6.21:1.
    // test/fieldContrast.test.js fails if that stops being true.
    float lift = 0.03 + 0.05 * uActivity + 0.035 * uEnergy;
    col += mix(lead, PEACH, 0.4) * embers(uv, t, b) * lift;

    // Highlight compression rather than a hard clamp: the top end rolls off
    // toward white instead of flattening, which is what makes a bright core
    // read as a bright core. Also guarantees nothing clips.
    // ponytail: a one-line tonemap, not a threshold/blur/composite bloom pass.
    // The field is already built from wide gaussians, so a post-process blur
    // would mostly blur things that are soft to begin with. If discrete bright
    // objects ever get added, revisit with an ogl RenderTarget.
    col = 1.0 - exp(-col);

    // Per-pixel dither: the second half of the anti-banding strategy.
    col += (hash(gl_FragCoord.xy) - 0.5) / 255.0 * 1.6;

    gl_FragColor = vec4(col, 1.0);
  }
`

// How fast the field eases toward a new target, per second. A record loading
// should feel like the room warming up, not like a switch.
const EASE = 1.8

export default function LightField({ bpm = 0, playing = false, tint = 0, activity = 0 }) {
  const hostRef = useRef(null)
  // Targets live in a ref so changing them never re-runs the WebGL setup
  // effect — the render loop reads them and eases the uniforms toward them.
  // Synced in a layout effect rather than during render, same pattern as
  // Boot.jsx and useHashRoute.js: writing a ref while rendering is not safe.
  const target = useRef({ bpm: 0, energy: 0, tint: 0, activity: 0 })
  // Lets the prop-watching effect ask for a repaint when the field is frozen.
  const nudgeRef = useRef(null)
  useLayoutEffect(() => {
    target.current = { bpm, energy: playing ? 1 : 0, tint, activity }
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    const renderer = new Renderer({ depth: false, alpha: false, dpr: Math.min(window.devicePixelRatio, 2) })
    const gl = renderer.gl
    host.appendChild(gl.canvas)

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uMotion: { value: reduced.matches ? 0 : 1 },
        uBeat: { value: 0 },
        uEnergy: { value: 0 },
        uTint: { value: target.current.tint },
        uActivity: { value: 0 },
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight)
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height]
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let last = performance.now()
    const start = last

    // Eases every driven uniform toward its target. Returns true while
    // anything is still moving, so the reduced-motion path knows whether it
    // needs another frame.
    const ease = (dt) => {
      const u = program.uniforms
      const k = Math.min(1, dt * EASE)
      const t = target.current
      let moving = false
      for (const [name, want] of [
        ['uBeat', t.bpm / 60],
        ['uEnergy', t.energy],
        ['uTint', t.tint],
        ['uActivity', t.activity],
      ]) {
        const diff = want - u[name].value
        if (Math.abs(diff) > 1e-4) { u[name].value += diff * k; moving = true }
        else u[name].value = want
      }
      return moving
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now()
      ease((now - last) / 1000)
      last = now
      program.uniforms.uTime.value = (now - start) / 1000
      renderer.render({ scene: mesh })
    }

    // Reduced motion holds the field still, but a record loading still has to
    // change its colour — so ease over a few frames, then stop, rather than
    // running a permanent loop.
    let settle = 0
    const settleStep = () => {
      settle = requestAnimationFrame(settleStep)
      const now = performance.now()
      const moving = ease((now - last) / 1000)
      last = now
      renderer.render({ scene: mesh })
      if (!moving) { cancelAnimationFrame(settle); settle = 0 }
    }
    const nudge = () => {
      if (program.uniforms.uMotion.value === 0 && !settle) { last = performance.now(); settleStep() }
    }

    const onMotionChange = () => {
      const reduce = reduced.matches
      program.uniforms.uMotion.value = reduce ? 0 : 1
      if (reduce) {
        cancelAnimationFrame(raf)
        raf = 0
        renderer.render({ scene: mesh })
      } else if (!raf) {
        last = performance.now()
        loop()
      }
    }
    reduced.addEventListener('change', onMotionChange)

    if (reduced.matches) {
      renderer.render({ scene: mesh })
    } else {
      loop()
    }

    nudgeRef.current = nudge

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(settle)
      nudgeRef.current = null
      window.removeEventListener('resize', resize)
      reduced.removeEventListener('change', onMotionChange)
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  // Under reduced motion there is no running loop to notice a new target.
  useEffect(() => { nudgeRef.current?.() }, [bpm, playing, tint, activity])

  return <div ref={hostRef} className="lightfield" aria-hidden="true" />
}

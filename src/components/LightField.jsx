import { useEffect, useRef } from 'react'
import { Renderer, Program, Mesh, Triangle } from 'ogl'

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
  uniform vec2  uResolution;
  uniform float uMotion;

  varying vec2 vUv;

  const vec3 VOID   = vec3(0.031, 0.027, 0.043);
  const vec3 VIOLET = vec3(0.769, 0.541, 1.000);
  const vec3 AMBER  = vec3(1.000, 0.659, 0.471);
  const vec3 DEEP   = vec3(0.282, 0.204, 0.471);

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

  void main() {
    vec2 uv = vUv;
    float t = uTime * uMotion;

    // Periods 431 / 619 / 787 seconds share no common multiple inside any
    // plausible visit, so the field never visibly repeats.
    float a = t / 431.0 * TAU;
    float b = t / 619.0 * TAU;
    float c = t / 787.0 * TAU;

    vec2 p1 = vec2(0.32 + 0.10 * sin(a),       0.28 + 0.08 * cos(a * 1.3));
    vec2 p2 = vec2(0.74 + 0.09 * cos(b),       0.68 + 0.07 * sin(b * 0.9));
    vec2 p3 = vec2(0.50 + 0.14 * sin(c * 0.7), 1.02 + 0.06 * cos(c));

    float f1 = bloom(uv, p1, 0.46);
    float f2 = bloom(uv, p2, 0.52);
    float f3 = bloom(uv, p3, 0.70);

    vec3 warm = mix(VIOLET, AMBER,  0.5 + 0.5 * sin(a * 0.5));
    vec3 cool = mix(DEEP,   VIOLET, 0.5 + 0.5 * cos(b * 0.5));

    vec3 col = VOID;
    col += warm * f1 * 0.34;
    col += cool * f2 * 0.26;
    col += DEEP * f3 * 0.40;

    // Belson's centric aperture, breathing on a 23s cycle.
    float ap = bloom(uv, vec2(0.5), 0.30 + 0.02 * sin(t / 23.0 * TAU));
    col += VIOLET * ap * 0.05;

    // Per-pixel dither: the second half of the anti-banding strategy.
    col += (hash(gl_FragCoord.xy) - 0.5) / 255.0 * 1.6;

    gl_FragColor = vec4(col, 1.0);
  }
`

export default function LightField() {
  const hostRef = useRef(null)

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
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight)
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height]
    }
    resize()
    window.addEventListener('resize', resize)

    const onMotionChange = () => {
      program.uniforms.uMotion.value = reduced.matches ? 0 : 1
      renderer.render({ scene: mesh })
    }
    reduced.addEventListener('change', onMotionChange)

    let raf = 0
    const start = performance.now()
    const loop = () => {
      raf = requestAnimationFrame(loop)
      program.uniforms.uTime.value = (performance.now() - start) / 1000
      renderer.render({ scene: mesh })
    }

    if (reduced.matches) {
      renderer.render({ scene: mesh })
    } else {
      loop()
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      reduced.removeEventListener('change', onMotionChange)
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return <div ref={hostRef} className="lightfield" aria-hidden="true" />
}

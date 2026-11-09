// src/components/ui/aurora-background.tsx
'use client';

import { useEffect, useRef } from 'react';
import { cn } from 'cn';

const VERTEX_SHADER = /* glsl */ `
  attribute vec2 aPosition;

  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uIntensity;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);

    for (int i = 0; i < 6; i++) {
      value += amplitude * valueNoise(p);
      p = rotation * p * 2.02 + 11.7;
      amplitude *= 0.5;
    }

    return value;
  }

  vec2 domainWarp(vec2 p) {
    float t = uTime * 0.06;

    vec2 q = vec2(
      fbm(p + vec2(0.0, t)),
      fbm(p + vec2(5.2, 1.3) - t)
    );

    vec2 r = vec2(
      fbm(p + 2.0 * q + vec2(1.7, 9.2) + t),
      fbm(p + 2.0 * q + vec2(8.3, 2.8) - t)
    );

    return p + 1.8 * (r - 0.5);
  }

  void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
    float t = uTime * 0.075;

    vec2 warped = domainWarp(p * 1.15 + vec2(0.0, t * 0.35));

    float light = 0.0;

    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float phase = fi * 2.094395;

      // High frequency across x, low across y, so the curtains stretch
      // vertically instead of turning into round blobs.
      float displace = fbm(vec2(
        warped.x * 5.0 + phase * 1.7,
        warped.y * 1.15 + t + phase * 0.6
      ));

      float x = warped.x + (displace - 0.5) * 1.5;
      float center = (fi - 1.0) * 0.62 + sin(t * 0.9 + phase) * 0.10;
      float width = 0.24 + 0.06 * sin(t * 0.7 + phase * 1.3);
      float band = (x - center) / width;
      float curtain = exp(-band * band);

      // Curtains fade out toward the top and bottom of the frame.
      float vertical =
        smoothstep(-1.05, 0.15, p.y) *
        (1.0 - smoothstep(0.45, 1.05, p.y));

      float detail = valueNoise(vec2(
        warped.x * 9.0 + phase,
        warped.y * 2.0 - t * 0.8
      ));

      light += curtain * vertical * (0.35 + 0.65 * detail);
    }

    vec2 mouse = (uMouse - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    float distanceToMouse = length(p - mouse);
    float pointer = (1.0 - smoothstep(0.0, 0.38, distanceToMouse)) * uIntensity;

    float energy = clamp(light + pointer * 0.45, 0.0, 1.5);

    vec3 ground = vec3(0.018, 0.015, 0.017);
    vec3 maroon = vec3(0.180, 0.035, 0.055);
    vec3 red = vec3(0.780, 0.030, 0.070);

    float hue = smoothstep(
      0.12,
      0.88,
      energy + 0.10 * sin(t * 1.4 + p.y * 2.0)
    );

    vec3 color = mix(maroon, red, hue);
    color = mix(ground, color, smoothstep(0.04, 0.92, energy) * 0.78);
    color += red * pow(smoothstep(0.52, 1.2, energy), 2.0) * 0.08;
    color += maroon * pointer * 0.10;

    float vignette = 1.0 - smoothstep(0.35, 1.35, length(p * vec2(0.82, 1.0)));
    color *= 0.48 + 0.52 * vignette;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface AuroraBackgroundProps {
  className?: string;
  opacity?: number;
  speed?: number;
  interactive?: boolean;
}

export function AuroraBackground({
  className,
  opacity = 1,
  speed = 1,
  interactive = true,
}: AuroraBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      powerPreference: 'low-power',
    });

    if (!gl) return;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(
          '[AuroraBackground] shader compile failed:',
          type === gl.VERTEX_SHADER ? 'vertex' : 'fragment',
          gl.getShaderInfoLog(shader)
        );
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[AuroraBackground] program link failed:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'uResolution'),
      time: gl.getUniformLocation(program, 'uTime'),
      mouse: gl.getUniformLocation(program, 'uMouse'),
      intensity: gl.getUniformLocation(program, 'uIntensity'),
    };

    gl.useProgram(program);
    gl.clearColor(0.018, 0.015, 0.017, 1);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const quality = 0.75;
      const width = Math.max(1, Math.floor((canvas.clientWidth || window.innerWidth) * dpr * quality));
      const height = Math.max(1, Math.floor((canvas.clientHeight || window.innerHeight) * dpr * quality));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener('resize', resize);

    const pointer = {
      x: 0.5,
      y: 0.5,
      targetX: 0.5,
      targetY: 0.5,
      intensity: interactive ? 0 : 0.25,
      targetIntensity: interactive ? 0 : 0.25,
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.targetX = event.clientX / Math.max(window.innerWidth, 1);
      pointer.targetY = 1 - event.clientY / Math.max(window.innerHeight, 1);
      pointer.targetIntensity = 1;
    };

    const onPointerLeave = () => {
      pointer.targetIntensity = 0;
    };

    if (interactive) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerleave', onPointerLeave);
      window.addEventListener('blur', onPointerLeave);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let frame = 0;
    let running = true;
    let last = performance.now();
    let elapsed = 0;

    const render = (now: number) => {
      if (!running) return;

      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (!reducedMotion) {
        elapsed += delta * speed;
      }

      const positionEase = 1 - Math.pow(0.0001, delta);
      const intensityEase = 1 - Math.pow(0.01, delta);
      pointer.x += (pointer.targetX - pointer.x) * positionEase;
      pointer.y += (pointer.targetY - pointer.y) * positionEase;
      pointer.intensity += (pointer.targetIntensity - pointer.intensity) * intensityEase;

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, elapsed);
      gl.uniform2f(uniforms.mouse, pointer.x, pointer.y);
      gl.uniform1f(uniforms.intensity, pointer.intensity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!reducedMotion) {
        frame = requestAnimationFrame(render);
      }
    };

    frame = requestAnimationFrame(render);

    const onVisibilityChange = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
        return;
      }

      if (!reducedMotion) {
        running = true;
        last = performance.now();
        frame = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      if (interactive) {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerleave', onPointerLeave);
        window.removeEventListener('blur', onPointerLeave);
      }

      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [interactive, speed]);

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#07070A]', className)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_22%,rgba(229,9,20,0.18),transparent_58%),radial-gradient(ellipse_at_76%_74%,rgba(120,15,25,0.22),transparent_56%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ opacity }} />
      <div className="absolute inset-0 bg-[#050505]/45" />
    </div>
  );
}

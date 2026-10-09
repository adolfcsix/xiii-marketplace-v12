'use client';
import { useEffect, useRef, useState } from 'react';
import { useStreetMotion } from './street-motion';
import { bufferSize } from '../lib/threeui-runtime';
import { LIQUID_FRAGMENT, LIQUID_VERTEX } from '../lib/liquid-shader';

export function LiquidSculpture() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { enabled, profile } = useStreetMotion();
  const [ready, setReady] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    setReady(false);
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power', premultipliedAlpha: false });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram();
    let buffer: WebGLBuffer | null = null;
    const dispose = () => { if (buffer) gl.deleteBuffer(buffer); shaders.forEach(shader => gl.deleteShader(shader)); if (program) gl.deleteProgram(program); };
    try {
      if (!program) throw new Error('No program');
      for (const [type, source] of [[gl.VERTEX_SHADER, LIQUID_VERTEX], [gl.FRAGMENT_SHADER, LIQUID_FRAGMENT]] as const) {
        const shader = gl.createShader(type); if (!shader) throw new Error('No shader');
        shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader unavailable');
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Link unavailable');
      gl.useProgram(program); buffer = gl.createBuffer(); if (!buffer) throw new Error('No buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    } catch { dispose(); return; }
    const resolution = gl.getUniformLocation(program!, 'resolution');
    const pointer = gl.getUniformLocation(program!, 'pointer');
    const time = gl.getUniformLocation(program!, 'time');
    let frame = 0, visible = false, last = 0, elapsed = 0, lost = false;
    let x = 0, y = 0, sx = 0, sy = 0;
    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const size = bufferSize(box.width, box.height, devicePixelRatio, { ...profile, pixels: Math.min(profile.pixels, 300000) });
      canvas.width = size.width; canvas.height = size.height;
      gl.viewport(0, 0, size.width, size.height); gl.uniform2f(resolution, size.width, size.height);
    };
    const draw = (now: number) => {
      frame = 0;
      if (!visible || document.hidden || lost) return;
      if (!last || now - last >= 1000 / profile.fps - 1) {
        const dt = last ? Math.min(80, now - last) : 16; last = now; elapsed += dt / 1000;
        const smoothing = 1 - Math.exp(-dt * .006); sx += (x-sx)*smoothing; sy += (y-sy)*smoothing;
        gl.uniform2f(pointer, sx, sy); gl.uniform1f(time, elapsed); gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      frame = requestAnimationFrame(draw);
    };
    const sync = () => {
      cancelAnimationFrame(frame); frame = 0; last = 0;
      if (visible && !document.hidden && !lost) frame = requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting); sync(); }); observer.observe(canvas);
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); resize();
    const hero = canvas.closest('.street-hero');
    const move = (event: Event) => { const e = event as PointerEvent; if (e.pointerType !== 'mouse') return; const box = canvas.getBoundingClientRect(); x = Math.max(-1, Math.min(1, (e.clientX-box.left)/box.width*2-1)); y = Math.max(-1, Math.min(1, 1-(e.clientY-box.top)/box.height*2)); };
    const leave = () => { x = 0; y = 0; };
    const contextLost = (event: Event) => { event.preventDefault(); lost = true; setReady(false); sync(); };
    const contextRestored = () => setGeneration(n => n + 1);
    hero?.addEventListener('pointermove', move, { passive: true }); hero?.addEventListener('pointerleave', leave);
    canvas.addEventListener('webglcontextlost', contextLost); canvas.addEventListener('webglcontextrestored', contextRestored);
    document.addEventListener('visibilitychange', sync); setReady(true);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect(); dispose();
      hero?.removeEventListener('pointermove', move); hero?.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('webglcontextlost', contextLost); canvas.removeEventListener('webglcontextrestored', contextRestored);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [enabled, profile, generation]);
  return <div className="liquid-sculpture" data-ready={ready} aria-hidden="true"><div className="liquid-fallback"><i/><i/><i/></div><canvas ref={canvasRef}/><span className="liquid-coordinate">XIII / FORM WITHOUT LIMITS</span></div>;
}

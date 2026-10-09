// XIII optimized runtime derived from MengTo/threeui EnergyOrb (MIT).
import { useEffect, useRef } from "react";
import { NXA_ENERGY_ORB_VERTEX_SHADER } from "./energyOrbShaders";
import {STREET_ORB_FRAGMENT} from '../../lib/street-orb-shader';
import {advanceClock,bufferSize,type OrbClock} from '../../lib/threeui-runtime';
import type {MutableRefObject} from 'react';

export type EnergyOrbProps = {
  speed?: number;
  scale?: number;
  smokeScale?: number;
  smokeStrength?: number;
  smokeSpeed?: number;
  hue?: number;
  saturation?: number;
  glow?: number;
  starDensity?: number;
  starSpeed?: number;
  starSize?: number;
  brightness?: number;
  opacity?: number;
  className?: string;
  profile:{dpr:number;pixels:number;fps:number};
  adaptive?:boolean;
  clock:MutableRefObject<OrbClock>;
  look:MutableRefObject<{x:number;y:number}>;
};

export const ENERGY_ORB_DEFAULTS = {
  speed: 1,
  scale: 1,
  smokeScale: 1,
  smokeStrength: 1,
  smokeSpeed: 1,
  hue: 0,
  saturation: 1,
  glow: 1,
  starDensity: 1,
  starSpeed: 1,
  starSize: 1,
  brightness: 1,
  opacity: 1,
} as const;

type Star = { x: number; y: number; depth: number; phase: number; drift: number; size: number };

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create energy-orb shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Energy orb shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function seeded(index: number, salt: number) {
  return Math.abs(Math.sin(index * 91.173 + salt * 17.719) * 43758.5453) % 1;
}

function createStars(count: number): Star[] {
  return Array.from({ length: count }, (_, index) => ({
    x: seeded(index, 1),
    y: seeded(index, 2),
    depth: 0.25 + seeded(index, 3) * 0.75,
    phase: seeded(index, 4) * Math.PI * 2,
    drift: 0.35 + seeded(index, 5) * 0.65,
    size: 0.45 + seeded(index, 6) * 1.15,
  }));
}

function fract(value: number) {
  return value - Math.floor(value);
}

export function StreetEnergyOrb({ className = "", profile, adaptive=false, clock, look, ...props }: EnergyOrbProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const starCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef({ ...ENERGY_ORB_DEFAULTS, ...props });
  optionsRef.current = { ...ENERGY_ORB_DEFAULTS, ...props };

  const runtime=useRef({profile,adaptive});runtime.current={profile,adaptive};
  useEffect(() => {
    const host = hostRef.current;
    const starCanvas = starCanvasRef.current;
    const canvas = canvasRef.current;
    if (!host || !starCanvas || !canvas) return undefined;

    const starContext = starCanvas.getContext("2d", { alpha: true });
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!starContext || !gl) throw new Error("WebGL unavailable");

    const vertex = compile(gl, gl.VERTEX_SHADER, NXA_ENERGY_ORB_VERTEX_SHADER);
    let fragment:WebGLShader;try{fragment=compile(gl, gl.FRAGMENT_SHADER, STREET_ORB_FRAGMENT)}catch(error){gl.deleteShader(vertex);throw error;}
    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      return undefined;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) ?? "Energy orb program link failed";
      gl.deleteShader(vertex);gl.deleteShader(fragment);gl.deleteProgram(program);
      throw new Error(message);
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      look: gl.getUniformLocation(program, "uLook"),
      time: gl.getUniformLocation(program, "uT"),
      resolution: gl.getUniformLocation(program, "uR"),
      smokeScale: gl.getUniformLocation(program, "uSmokeScale"),
      smokeStrength: gl.getUniformLocation(program, "uSmokeStrength"),
      smokeSpeed: gl.getUniformLocation(program, "uSmokeSpeed"),
      hue: gl.getUniformLocation(program, "uHue"),
      saturation: gl.getUniformLocation(program, "uSaturation"),
      glow: gl.getUniformLocation(program, "uGlow"),
    };
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const stars = createStars(180);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    let width = 1;
    let height = 1;
    let starDpr = 1;
    let frame = 0;
    let visible = true;
    let lastTime=0,lastRaf=0,lastDraw=0,average=16,slowFrames=0,qualityScale=1;
    let drawnLook={x:0,y:0};
    let lastProfile=runtime.current.profile;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const size=bufferSize(width,height,window.devicePixelRatio||1,runtime.current.profile,qualityScale);
      const bufferWidth=size.width,bufferHeight=size.height;
      canvas.dataset.pixelBudget=String(runtime.current.profile.pixels);
      canvas.dataset.frameLimit=String(runtime.current.profile.fps);
      if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
        canvas.width = bufferWidth;
        canvas.height = bufferHeight;
      }
      gl.viewport(0, 0, bufferWidth, bufferHeight);
      gl.uniform2f(uniforms.resolution, bufferWidth, bufferHeight);

      starDpr = Math.min(window.devicePixelRatio || 1, runtime.current.profile.dpr, 1.5);
      const starWidth = Math.max(1, Math.round(width * starDpr));
      const starHeight = Math.max(1, Math.round(height * starDpr));
      if (starCanvas.width !== starWidth || starCanvas.height !== starHeight) {
        starCanvas.width = starWidth;
        starCanvas.height = starHeight;
      }
    };

    const drawStars = (elapsed: number) => {
      const options = optionsRef.current;
      starContext.setTransform(1, 0, 0, 1, 0, 0);
      starContext.clearRect(0, 0, starCanvas.width, starCanvas.height);
      const density = Math.max(0, options.starDensity);
      const count = Math.min(stars.length, Math.round((width * height / 4_200) * density));
      if (!count) return;

      starContext.setTransform(starDpr, 0, 0, starDpr, 0, 0);
      starContext.globalCompositeOperation = "screen";
      const particleTime = reducedMotion ? 0 : elapsed;
      const colorHue = fract((252 + options.hue) / 360) * 360;
      for (let index = 0; index < count; index += 1) {
        const star = stars[index];
        const x = fract(star.x + particleTime * 0.0022 * star.drift) * width;
        const y = fract(star.y - particleTime * 0.0008 * star.depth + 1) * height;
        const twinkle = reducedMotion ? 0.78 : 0.58 + Math.sin(particleTime * (0.8 + star.depth) + star.phase) * 0.24;
        const alpha = Math.max(0.08, twinkle * (0.22 + star.depth * 0.48));
        const radius = Math.max(0.35, star.size * star.depth * Math.max(0.25, options.starSize));
        starContext.fillStyle = `hsla(${colorHue}, 84%, ${72 + star.depth * 20}%, ${alpha})`;
        starContext.beginPath();
        starContext.arc(x, y, radius, 0, Math.PI * 2);
        starContext.fill();
      }
      starContext.globalCompositeOperation = "source-over";
    };

    const render = (now: number) => {
      frame = 0;
      const options = optionsRef.current;
      if(lastProfile!==runtime.current.profile){lastProfile=runtime.current.profile;qualityScale=1;resize();}
      const rawDelta=lastRaf?now-lastRaf:16;lastRaf=now;average=average*.94+rawDelta*.06;
      if(runtime.current.adaptive&&average>1000/runtime.current.profile.fps*1.8){slowFrames++;if(slowFrames>90&&qualityScale>.55){qualityScale=Math.max(.5,qualityScale*.8);resize();slowFrames=0;}}else slowFrames=0;
      if(lastDraw&&now-lastDraw<1000/runtime.current.profile.fps-1){frame=requestAnimationFrame(render);return;}
      const dt=lastTime?now-lastTime:0;lastTime=now;lastDraw=now;
      advanceClock(clock.current,dt,options.speed,options.starSpeed);
      const blend=1-Math.exp(-Math.min(dt,100)/1000*9);
      drawnLook.x+=(look.current.x-drawnLook.x)*blend;drawnLook.y+=(look.current.y-drawnLook.y)*blend;
      gl.uniform2f(uniforms.look,drawnLook.x,drawnLook.y);
      drawStars(clock.current.stars);
      gl.uniform1f(uniforms.time, clock.current.shader);
      gl.uniform1f(uniforms.smokeScale, Math.max(0.01, options.smokeScale));
      gl.uniform1f(uniforms.smokeStrength, Math.max(0, options.smokeStrength));
      gl.uniform1f(uniforms.smokeSpeed, Math.max(0, options.smokeSpeed));
      gl.uniform1f(uniforms.hue, options.hue * Math.PI / 180);
      gl.uniform1f(uniforms.saturation, Math.max(0, options.saturation));
      gl.uniform1f(uniforms.glow, Math.max(0, options.glow));
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (visible && !document.hidden) frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render);
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;lastTime=0;lastRaf=0;lastDraw=0;
    };
    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };
    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) start();
      else stop();
    });
    resizeObserver.observe(host);
    intersection.observe(host);
    document.addEventListener("visibilitychange", onVisibilityChange);
    motionQuery.addEventListener("change", onMotionChange);
    resize();
    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery.removeEventListener("change", onMotionChange);
      gl.deleteBuffer(buffer);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteProgram(program);
      queueMicrotask(()=>{if(!canvas.isConnected)gl.getExtension("WEBGL_lose_context")?.loseContext()});
    };
  }, []);

  const options = optionsRef.current;
  return (
    <div ref={hostRef} className={`threeui-background energy-orb${className ? ` ${className}` : ""}`} style={{ background: "#05030e" }}>
      <canvas ref={starCanvasRef} className="energy-orb__stars" aria-hidden="true" style={{ zIndex: 0, pointerEvents: "none" }} />
      <canvas ref={canvasRef} className="energy-orb__shader" aria-hidden="true" style={{ zIndex: 1, opacity: options.opacity, filter: `brightness(${options.brightness})`, transform: `scale(${options.scale})`, pointerEvents: "none" }} />
    </div>
  );
}

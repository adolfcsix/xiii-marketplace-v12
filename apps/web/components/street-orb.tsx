'use client';

import { Component, useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight } from './icons';
import { useStreetMotion } from './street-motion';

const EnergyOrb = dynamic(() => import('./threeui-energy/StreetEnergyOrb').then(module => module.StreetEnergyOrb), { ssr: false });

class OrbBoundary extends Component<{ children: ReactNode; onFailure:()=>void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(){this.props.onFailure()}
  render() { return this.state.failed ? null : this.props.children; }
}

export function StreetOrb() {
  const { enabled, quality, setQuality, profile } = useStreetMotion();
  const [mounted, setMounted] = useState(false);
  const clock=useRef({shader:0,stars:0}),look=useRef({x:0,y:0});
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [lost, setLost] = useState(false);
  const [speed, setSpeed] = useState(0.65);
  const [glow, setGlow] = useState(0.8);
  const [palette, setPalette] = useState<'silver' | 'violet'>('silver');
  const motion = mounted && enabled;
  const active = motion && visible && tabVisible && !paused && !lost;

  useEffect(() => {
    setMounted(true);
    const element = section.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)), { threshold: 0.05 });
    const visibility = () => setTabVisible(!document.hidden);
    const contextLost = (event: Event) => { event.preventDefault(); setLost(true); };
    observer.observe(element);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    element.addEventListener('webglcontextlost', contextLost, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      element.removeEventListener('webglcontextlost', contextLost, true);
    };
  }, []);

  useEffect(()=>{const element=section.current?.querySelector<HTMLElement>('.street-orb-stage');if(!element||!active){look.current={x:0,y:0};return;}const move=(e:PointerEvent)=>{if(e.pointerType!=='mouse'||e.target instanceof Element&&e.target.closest('dialog[open]'))return;const r=element.getBoundingClientRect();look.current={x:Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1)),y:Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1))}};const reset=()=>{look.current={x:0,y:0}};element.addEventListener('pointermove',move);element.addEventListener('pointerleave',reset);return()=>{element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',reset);reset()}},[active]);

  return <section className="street-orb" ref={section} aria-labelledby="street-orb-title" data-palette={palette} style={{ '--orb-light': String(0.7 + glow * 0.4) } as CSSProperties}>
    <div className="street-orb-copy">
      <span className="street-eyebrow">XIII / NEXT DIMENSION</span>
      <h2 id="street-orb-title">CHẤT RIÊNG.<br /><em>KHÔNG GIỚI HẠN.</em></h2>
      <p>Đổi góc nhìn. Tìm sắc thái của bạn.<br />Mỗi chuyển động, một chất riêng.</p>
      <Link className="street-button light" href="/search?sort=newest">Khám phá bộ sưu tập <ArrowRight size={19} /></Link>
    </div>
    <div className="street-orb-experience">
      <div className="street-orb-stage" data-depth="orb" aria-hidden="true" data-active={active ? 'true' : 'false'}>
        <div className="street-orb-orbits"><i/><i/><i/></div>
        <div className="street-orb-still" />
        {active && <OrbBoundary onFailure={()=>setLost(true)}><EnergyOrb profile={profile} adaptive={quality==='auto'} clock={clock} look={look} speed={speed} saturation={palette === 'silver' ? 0 : 1}
          brightness={1.25} glow={glow} starDensity={0.45} starSpeed={0.6} /></OrbBoundary>}
        <span className="street-orb-mark">XIII</span>
      </div>
      <div className="street-orb-controls">
        <div role="group" aria-label="Sắc thái khối cầu">
          <button type="button" aria-pressed={palette === 'silver'} onClick={() => setPalette('silver')}><i className="orb-swatch silver" aria-hidden="true" />Bạc</button>
          <button type="button" aria-pressed={palette === 'violet'} onClick={() => setPalette('violet')}><i className="orb-swatch violet" aria-hidden="true" />Tím</button>
        </div>
        <button type="button" disabled={!motion} aria-pressed={paused || !motion}
          aria-label={lost ? 'Khởi động lại khối cầu 3D' : paused ? 'Tiếp tục khối cầu 3D' : 'Tạm dừng khối cầu 3D'}
          onClick={() => { if (lost) { setLost(false); setPaused(false); } else setPaused(value => !value); }}>
          {lost ? 'Thử lại' : !motion ? 'Chuyển động đang tắt' : paused ? 'Tiếp tục ▷' : 'Tạm dừng Ⅱ'}
        </button>
      </div>
      <div className="street-orb-quality"><label htmlFor="orb-quality">Chất lượng 3D</label><select id="orb-quality" value={quality} onChange={e=>setQuality(e.target.value as typeof quality)}><option value="auto">Tự động — theo thiết bị</option><option value="light">Nhẹ — ưu tiên mượt</option><option value="detail">Chi tiết — ưu tiên hình ảnh</option></select><small>Di chuột trên khối cầu để đổi góc nhìn.</small></div><div className="street-orb-tuning">
        <label htmlFor="orb-speed">Tốc độ <output htmlFor="orb-speed">{speed.toFixed(2)}×</output></label>
        <input id="orb-speed" type="range" min="0.2" max="1.6" step="0.05" value={speed} disabled={!motion} onChange={event => setSpeed(Number(event.target.value))}/>
        <label htmlFor="orb-glow">Ánh sáng <output htmlFor="orb-glow">{Math.round(glow * 100)}%</output></label>
        <input id="orb-glow" type="range" min="0.2" max="1.5" step="0.05" value={glow} onChange={event => setGlow(Number(event.target.value))}/>
        <button type="button" onClick={() => { setSpeed(0.65); setGlow(0.8); setPalette('silver'); }}>Đặt lại hiệu ứng</button>
      </div>
    </div>
  </section>;
}

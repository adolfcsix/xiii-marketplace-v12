'use client';

import { useEffect, useRef, useState } from 'react';
import {adaptConstellationSource} from '../lib/constellation-runtime';
import { buildFocusedDocument } from '../lib/threeui-focus';
import { useStreetMotion } from './street-motion';

// The authored Canvas renderer is preserved in public/effects/threeui.
// Host integration adds bounded resolution, frame timing and pointer delivery.
export function ThreeUIConstellation() {
  const { enabled, profile } = useStreetMotion();
  const boundary = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [source, setSource] = useState('');
  const active = enabled && visible && documentVisible;

  useEffect(() => {
    const element = boundary.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => {
      setVisible(entries.some(entry => entry.isIntersecting));
    });
    observer.observe(element);
    const visibility = () => setDocumentVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useEffect(()=>{setSource('')},[profile.dpr,profile.fps]);

  useEffect(() => {
    if (!active || source) return;
    const controller = new AbortController();
    fetch('/effects/threeui/constellation-field.html', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Effect unavailable');
        return response.text();
      })
      .then(html => {
        if (controller.signal.aborted) return;
        // CDN scripts belong to the original demo shell, not the Canvas renderer.
        // Keep the canonical file untouched; the focused frame runs entirely locally.
        const local=adaptConstellationSource(html,profile.dpr);
        const focus = buildFocusedDocument({
          source: local,
          title: 'Constellation Field',
          background: 'transparent',
          targets: [{ selector: '#constellationCanvas', role: 'background' }],
        }, { variant: 'constellation-field', mode: 'dark', speed: 1, size: 1,
          gap: 2, length: 1, density: 1, strokeWidth: 1, opacity: 1 });
        const pointerBridge = `<script>
          window.addEventListener('message', function(event) {
            if (event.source !== parent || !event.data || event.data.type !== 'xiii-pointer') return;
            var x = Number(event.data.x), y = Number(event.data.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            document.dispatchEvent(new MouseEvent('mousemove', {clientX:x, clientY:y}));
          });
        </script>`;
        const budget=`<script data-xiii-frame-budget>(function(){var raw=requestAnimationFrame.bind(window),last=0;window.requestAnimationFrame=function(callback){function tick(now){if(now-last>=${1000/profile.fps}-1){last=now;callback(now)}else raw(tick)}return raw(tick)}})();</script>`;
        setSource(focus.replace(/<head([^>]*)>/i,'<head$1>'+budget).replace('</body>', pointerBridge + '</body>'));
      })
      .catch(() => { /* A decorative effect never blocks the storefront. */ });
    return () => controller.abort();
  }, [active, source, profile.dpr, profile.fps]);

  useEffect(() => {
    const hero = boundary.current?.closest('.street-hero');
    if (!active || !source || !hero) return;
    let frame = 0;
    let pointer = { x: -1000, y: -1000 };
    const send = () => {
      frame = 0;
      boundary.current?.querySelector('iframe')?.contentWindow?.postMessage(
        { type: 'xiii-pointer', ...pointer }, '*');
    };
    const move = (event: Event) => {
      const e = event as PointerEvent;
      if (e.pointerType !== 'mouse') return;
      const rect = hero.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (!frame) frame = requestAnimationFrame(send);
    };
    const leave = () => {
      pointer = { x: -1000, y: -1000 };
      if (!frame) frame = requestAnimationFrame(send);
    };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', leave);
    };
  }, [active, source]);

  return <div ref={boundary} className="threeui-constellation" aria-hidden="true">
    {active && source && <iframe title="Hiệu ứng Constellation của ThreeUI"
      srcDoc={source} sandbox="allow-scripts" tabIndex={-1} />}
  </div>;
}

'use client';

import { useEffect } from 'react';
import { useStreetMotion } from './street-motion';

/** Delegation covers streamed cards and dialogs without per-button listeners. */
const selector = '.street-button,.hero-secondary,.icon-link,.wishlist-button,.product-bag,.product-card-tools>button,.product-card-tools>a,.detail-add,.detail-buy,.cart-checkout,.cart-primary-link,.checkout-place,.auth-submit,.motion-toggle,.outfit-tabs button,.avatar-options button,.outfit-stage-toolbar button,.outfit-search button,.outfit-save button';

export function LiquidControls() {
  const { enabled } = useStreetMotion();
  useEffect(() => {
    if (!enabled) return;
    let hovered: HTMLElement | null = null;
    let pressed: HTMLElement | null = null;
    let frame = 0;
    let point = { x: 50, y: 30 };
    const animations = new Map<HTMLElement, Animation>();
    const target = (event: Event) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
      return element && !element.matches(':disabled,[aria-disabled="true"],[aria-busy="true"]') ? element : null;
    };
    const clearHover = () => {
      cancelAnimationFrame(frame); frame = 0;
      hovered?.style.removeProperty('--glass-x');
      hovered?.style.removeProperty('--glass-y');
      hovered = null;
    };
    const position = (event: PointerEvent) => {
      const element = target(event);
      if (hovered !== element) { clearHover(); hovered = element; }
      if (!element) return;
      const rect = element.getBoundingClientRect();
      point = { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / Math.max(1, rect.width) * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / Math.max(1, rect.height) * 100)) };
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        hovered?.style.setProperty('--glass-x', `${point.x}%`);
        hovered?.style.setProperty('--glass-y', `${point.y}%`);
      });
    };
    const cancelPress = () => { pressed?.removeAttribute('data-liquid-down'); pressed = null; };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      cancelPress(); position(event); pressed = target(event);
      if (pressed) { animations.get(pressed)?.cancel(); pressed.setAttribute('data-liquid-down', 'true'); }
    };
    const release = () => {
      const element = pressed; cancelPress();
      if (!element?.isConnected || element.matches(':disabled,[aria-disabled="true"]')) return;
      const animation = element.animate([
        { scale: '.95 1.025', offset: 0 },
        { scale: '1.022 .982', offset: .42 },
        { scale: '.997 1.003', offset: .75 },
        { scale: '1', offset: 1 },
      ], { duration: 520, easing: 'cubic-bezier(.22,.75,.25,1)' });
      animations.get(element)?.cancel(); animations.set(element, animation);
      animation.onfinish = () => animations.delete(element);
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
      const element = target(event);
      if (!element || (event.key === ' ' && element.tagName === 'A')) return;
      cancelPress(); pressed = element; animations.get(element)?.cancel(); element.setAttribute('data-liquid-down', 'true');
    };
    const keyUp = (event: KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') release(); };
    const reset = () => { clearHover(); cancelPress(); animations.forEach(a => a.cancel()); animations.clear(); };
    document.addEventListener('pointermove', position, { passive: true });
    document.addEventListener('pointerdown', down, { passive: true });
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', reset);
    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);
    document.addEventListener('visibilitychange', reset);
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('scroll', reset, { passive: true });
    return () => {
      reset();
      document.removeEventListener('pointermove', position);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', release);
      document.removeEventListener('pointercancel', reset);
      document.removeEventListener('keydown', keyDown);
      document.removeEventListener('keyup', keyUp);
      document.removeEventListener('visibilitychange', reset);
      document.documentElement.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset); window.removeEventListener('scroll', reset);
    };
  }, [enabled]);
  return null;
}

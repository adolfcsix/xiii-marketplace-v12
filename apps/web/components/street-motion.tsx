'use client';
import { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import {CartFlight} from './cart-flight';
import { StreetDepth } from './street-depth';
import { LiquidControls } from './liquid-controls';
import {renderProfile,type Quality} from '../lib/threeui-runtime';
import { usePathname } from 'next/navigation';
const MotionContext=createContext({enabled:false,ready:false,toggle:()=>{},quality:'auto' as Quality,setQuality:(_value:Quality)=>{},profile:renderProfile('auto',true)});
export function useStreetMotion(){return useContext(MotionContext);}
export function StreetMotion({children}:{children:React.ReactNode}){
 const [quality,setQualityState]=useState<Quality>('auto'),[compact,setCompact]=useState(true);
 const profile=useMemo(()=>renderProfile(quality,compact),[quality,compact]);
 function setQuality(value:Quality){setQualityState(value);try{localStorage.setItem('xiii-3d-quality',value)}catch{}}
 useEffect(()=>{const mq=matchMedia('(max-width:767px)');const sync=()=>setCompact(mq.matches||navigator.hardwareConcurrency<=4||(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData===true);sync();mq.addEventListener('change',sync);try{const value=localStorage.getItem('xiii-3d-quality');if(value==='auto'||value==='light'||value==='detail')setQualityState(value)}catch{}return()=>mq.removeEventListener('change',sync)},[]);
 const pathname=usePathname();const [enabled,setEnabled]=useState(false);const [ready,setReady]=useState(false);const preference=useRef<'on'|'off'|null>(null);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');try{const stored=localStorage.getItem('xiii-motion');preference.current=stored==='on'||stored==='off'?stored:null;}catch{}
  const sync=()=>setEnabled(preference.current==='off'?false:!media.matches);sync();setReady(true);media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);
 },[]);
 useEffect(()=>{document.documentElement.dataset.motion=enabled?'on':'off';
  if(!enabled){document.documentElement.style.setProperty('--hero-shift','0px');return;}
  const animations=new Set<Animation>();
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;observer.unobserve(entry.target);const element=entry.target as HTMLElement;
   const animation=element.animate([{opacity:0,transform:'translate3d(0,24px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:620,delay:Number(element.dataset.delay||0),easing:'cubic-bezier(.2,.75,.2,1)'});animations.add(animation);animation.onfinish=()=>animations.delete(animation);
  });},{threshold:.08});
  const seen=new WeakSet<Element>();const observe=()=>document.querySelectorAll('[data-reveal]').forEach(element=>{if(!seen.has(element)){seen.add(element);observer.observe(element);}});observe();
  const changes=new MutationObserver(observe);changes.observe(document.body,{childList:true,subtree:true});
  let frame=0;const scroll=()=>{if(frame)return;frame=requestAnimationFrame(()=>{const root=document.documentElement;root.style.setProperty('--page-progress',String(window.scrollY/Math.max(1,root.scrollHeight-window.innerHeight)));root.style.setProperty('--hero-shift',Math.min(32,window.scrollY*.08)+'px');frame=0;});};
  window.addEventListener('scroll',scroll,{passive:true});scroll();
  return()=>{observer.disconnect();changes.disconnect();window.removeEventListener('scroll',scroll);cancelAnimationFrame(frame);animations.forEach(animation=>animation.cancel());};
 },[enabled,pathname]);
 function toggle(){const next=!enabled;preference.current=next?'on':'off';try{localStorage.setItem('xiii-motion',preference.current);}catch{}setEnabled(next&&!matchMedia('(prefers-reduced-motion: reduce)').matches);}
 return <MotionContext.Provider value={{enabled,ready,toggle,quality,setQuality,profile}}>{children}<StreetDepth/><LiquidControls/><CartFlight/><div className="street-progress" aria-hidden="true"/></MotionContext.Provider>;
}
export function MotionToggle({pending=false}:{pending?:boolean}){const {enabled,ready,toggle}=useStreetMotion();const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);const active=mounted&&enabled;return <button type="button" disabled={pending||!ready||!mounted} className="motion-toggle" onClick={toggle} aria-pressed={active} aria-label={active?'Tắt chuyển động':'Bật chuyển động'}><span aria-hidden="true">{active?'Ⅱ':'▷'}</span> Chuyển động {active?'bật':'tắt'}</button>;}

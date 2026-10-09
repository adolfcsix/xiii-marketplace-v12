'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {useStreetMotion} from './street-motion';
type Flight={src:string;x:number;y:number;width:number;height:number};
export function CartFlight(){
 const {enabled}=useStreetMotion();const pathname=usePathname();
 useEffect(()=>{
  if(!enabled)return;
  const active=new Set<()=>void>();
  const clear=()=>{active.forEach(fn=>fn());active.clear()};
  const fly=(event:Event)=>{
   if(document.hidden||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
   const target=document.querySelector<HTMLElement>('.bag-link[href="/cart"]');const to=target?.getBoundingClientRect();
   const from=(event as CustomEvent<Flight>).detail;
   if(!target||!to||!from||to.bottom<0||to.top>innerHeight||from.y+from.height<0||from.y>innerHeight)return;
   // Keep at most three transient nodes; batch outfit writes never accumulate overlays.
   if(active.size>=3)active.values().next().value?.();
   const node=document.createElement('div');node.className='cart-flight';node.setAttribute('aria-hidden','true');node.setAttribute('popover','manual');
   const img=document.createElement('img');img.src=from.src;img.alt='';node.append(img);document.body.append(node);
   const size=Math.min(100,from.width,from.height),x=from.x+(from.width-size)/2,y=from.y+(from.height-size)/2;
   Object.assign(node.style,{left:x+'px',top:y+'px',width:size+'px',height:size+'px'});
   // A manual popover sits above Quick View without stealing focus or intercepting input.
   try{node.showPopover()}catch{node.removeAttribute('popover');if(document.querySelector('dialog[open]')){node.remove();return;}}
   const dx=to.x+to.width/2-x-size/2,dy=to.y+to.height/2-y-size/2;
   const animation=node.animate([{transform:'translate3d(0,0,0) rotateY(0deg) scale(1)',opacity:.95},{transform:`translate3d(${dx*.45}px,${Math.min(dy*.45,-65)}px,0) rotateY(-22deg) scale(.7)`,opacity:.9,offset:.45},{transform:`translate3d(${dx}px,${dy}px,0) rotateY(18deg) scale(.12)`,opacity:0}],{duration:680,easing:'cubic-bezier(.22,.65,.35,1)',fill:'forwards'});
   let pulse:Animation|undefined;const dispose=()=>{animation.cancel();pulse?.cancel();node.remove();active.delete(dispose)};active.add(dispose);
   animation.onfinish=()=>{node.remove();pulse=target.animate([{transform:'scale(1)'},{transform:'scale(1.18) rotate(-7deg)'},{transform:'scale(1)'}],{duration:240});pulse.onfinish=dispose};
  };
  window.addEventListener('xiii-cart-flight',fly);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  return()=>{clear();window.removeEventListener('xiii-cart-flight',fly);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear)};
 },[enabled,pathname]);
 return null;
}

'use client';
import {useEffect} from 'react';
import {useStreetMotion} from './street-motion';
/** One delegated, demand-driven loop for all current and streamed depth targets. */
export function StreetDepth(){
 const {enabled,profile}=useStreetMotion();
 useEffect(()=>{
  if(!enabled)return;
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  let current:HTMLElement|null=null,frame=0,last=0,x=.5,y=.5,sx=.5,sy=.5;
  const clear=()=>{cancelAnimationFrame(frame);frame=0;last=0;if(current){for(const key of ['--depth-x','--depth-y','--light-x','--light-y','--parallax-x','--parallax-y'])current.style.removeProperty(key);current.removeAttribute('data-depth-active');current=null;}sx=.5;sy=.5;};
  const render=(now:number)=>{
   frame=0;if(!current?.isConnected||document.hidden||!fine.matches){clear();return;}
   const dt=last?Math.min(64,now-last):16;
   if(last&&dt<1000/profile.fps-1){frame=requestAnimationFrame(render);return;}
   last=now;const blend=1-Math.exp(-dt*.012);sx+=(x-sx)*blend;sy+=(y-sy)*blend;
   current.style.setProperty('--depth-x',((.5-sy)*9).toFixed(2)+'deg');current.style.setProperty('--depth-y',((sx-.5)*12).toFixed(2)+'deg');current.style.setProperty('--light-x',(sx*100).toFixed(1)+'%');current.style.setProperty('--light-y',(sy*100).toFixed(1)+'%');current.style.setProperty('--parallax-x',((sx-.5)*18).toFixed(2)+'px');current.style.setProperty('--parallax-y',((sy-.5)*12).toFixed(2)+'px');current.setAttribute('data-depth-active','true');
   if(Math.abs(x-sx)+Math.abs(y-sy)>.002)frame=requestAnimationFrame(render);else last=0;
  };
  const move=(event:PointerEvent)=>{
   if(event.pointerType!=='mouse'||document.hidden||!fine.matches||event.target instanceof Element&&event.target.closest('dialog[open]')){clear();return;}
   const target=event.target instanceof Element?event.target.closest<HTMLElement>('[data-depth]'):null;
   if(!target){clear();return;}if(current!==target){clear();current=target;}
   const box=target.getBoundingClientRect();if(!box.width||!box.height)return;
   x=Math.max(0,Math.min(1,(event.clientX-box.left)/box.width));y=Math.max(0,Math.min(1,(event.clientY-box.top)/box.height));if(!frame)frame=requestAnimationFrame(render);
  };
  const dialogs=new MutationObserver(records=>{if(records.some(r=>r.target instanceof HTMLDialogElement&&r.target.open))clear()});dialogs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  document.addEventListener('pointermove',move,{passive:true});document.documentElement.addEventListener('pointerleave',clear);document.addEventListener('visibilitychange',clear);window.addEventListener('blur',clear);window.addEventListener('scroll',clear,{passive:true});fine.addEventListener('change',clear);
  return()=>{clear();dialogs.disconnect();document.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',clear);document.removeEventListener('visibilitychange',clear);window.removeEventListener('blur',clear);window.removeEventListener('scroll',clear);fine.removeEventListener('change',clear)};
 },[enabled,profile.fps]);
 return null;
}

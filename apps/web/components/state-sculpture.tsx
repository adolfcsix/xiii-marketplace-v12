'use client';
import {useEffect,useRef,useState} from 'react';
import {useStreetMotion} from './street-motion';
/** Decorative CSS geometry; status copy and actions remain owned by the host. */
export function StateSculpture({kind='empty'}:{kind?:'loading'|'empty'}){
 const {enabled}=useStreetMotion();const root=useRef<HTMLDivElement>(null);const [running,setRunning]=useState(false);
 useEffect(()=>{
  if(!enabled||kind!=='loading'){setRunning(false);return;}
  let visible=false;const sync=()=>setRunning(visible&&!document.hidden);
  const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting||false;sync()});if(root.current)observer.observe(root.current);
  document.addEventListener('visibilitychange',sync);return()=>{observer.disconnect();document.removeEventListener('visibilitychange',sync)};
 },[enabled,kind]);
 return <div ref={root} className="state-sculpture" aria-hidden="true" data-kind={kind} data-animated={running}>
  <div className="state-bag"><i className="state-bag-front"><span>XIII</span></i><i className="state-bag-side"/><i className="state-bag-bottom"/><i className="state-bag-handle"/></div><div className="state-bag-shadow"/>
 </div>;
}

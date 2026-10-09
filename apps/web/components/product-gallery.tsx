'use client';
import {useRef,useState} from 'react';
import {HeartIcon} from './icons';
const fallback='/products/fallback.svg';
function imageFallback(event:React.SyntheticEvent<HTMLImageElement>){if(!event.currentTarget.src.endsWith(fallback))event.currentTarget.src=fallback;}
export function ProductGallery({images,name,discount,saved,onSave}:{images:string[];name:string;discount:number;saved:boolean;onSave:()=>void}){
 const sources=Array.from(new Set(images.filter(Boolean)));if(!sources.length)sources.push(fallback);
 const [chosen,setChosen]=useState('');const current=sources.includes(chosen)?chosen:sources[0];const index=sources.indexOf(current);
 const dialog=useRef<HTMLDialogElement>(null);const touch=useRef<{x:number;y:number}|null>(null);const swipeUntil=useRef(0);
 const [direction,setDirection]=useState(1);
 function choose(src:string){setDirection(sources.indexOf(src)>=index?1:-1);setChosen(src);}
 function move(step:number){setDirection(step);setChosen(sources[(index+step+sources.length)%sources.length]);}
 function open(){if(Date.now()<swipeUntil.current)return;dialog.current?.showModal();}
 return <div className="detail-gallery">
  <div className="detail-thumbs" aria-label="Ảnh sản phẩm">{sources.map((src,i)=><button type="button" key={src} className={current===src?'active':''} aria-label={'Xem ảnh '+(i+1)} aria-pressed={current===src} onClick={()=>choose(src)}><img src={src} alt="" loading="lazy" onError={imageFallback}/></button>)}</div>
  <div className="detail-hero-image gallery-depth-stage" data-depth="gallery" onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}}}>
   {sources.length>1&&<div className="gallery-peeks" aria-hidden="true"><img src={sources[(index-1+sources.length)%sources.length]} alt="" onError={imageFallback}/><img src={sources[(index+1)%sources.length]} alt="" onError={imageFallback}/></div>}
   {discount>0&&<span className="detail-sale-badge">-{discount}%</span>}
   <button type="button" className="gallery-open" aria-label={'Phóng to ảnh '+name} onClick={open} onPointerDown={event=>{if(event.pointerType==='touch')touch.current={x:event.clientX,y:event.clientY};}} onPointerCancel={()=>{touch.current=null;}} onPointerUp={event=>{const start=touch.current;touch.current=null;if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(sources.length>1&&Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5){swipeUntil.current=Date.now()+500;move(dx<0?1:-1);}}}><span className="gallery-plane" key={current} style={{'--gallery-direction':direction} as React.CSSProperties}><img src={current} alt={name} decoding="async" onError={imageFallback}/></span><span>↗ Phóng to ảnh</span></button>
   <button type="button" className={'detail-heart '+(saved?'saved':'')} aria-pressed={saved} onClick={onSave} aria-label={saved?'Bỏ yêu thích':'Yêu thích'}><HeartIcon size={22}/></button>
   <div className="gallery-toolbar"><span aria-live="polite">{String(index+1).padStart(2,'0')} / {String(sources.length).padStart(2,'0')}</span>{sources.length>1&&<div><button type="button" aria-label="Ảnh trước" onClick={()=>move(-1)}>←</button><button type="button" aria-label="Ảnh tiếp theo" onClick={()=>move(1)}>→</button></div>}</div>
  </div>
  <dialog ref={dialog} className="gallery-dialog" aria-label={'Ảnh phóng to: '+name} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}}}>
   <div className="gallery-dialog-head"><span>{name}</span><button type="button" autoFocus aria-label="Đóng ảnh phóng to" onClick={()=>dialog.current?.close()}>Đóng ×</button></div>
   <img src={current} alt={name} onError={imageFallback}/>
   <div className="gallery-dialog-foot"><span>{index+1} / {sources.length} · Esc để đóng</span>{sources.length>1&&<div><button type="button" aria-label="Ảnh trước trong khung phóng to" onClick={()=>move(-1)}>←</button><button type="button" aria-label="Ảnh tiếp theo trong khung phóng to" onClick={()=>move(1)}>→</button></div>}</div>
  </dialog>
 </div>;
}

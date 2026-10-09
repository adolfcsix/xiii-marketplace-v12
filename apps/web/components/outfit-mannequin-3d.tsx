'use client';

import {useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent,type KeyboardEvent as ReactKeyboardEvent} from 'react';
import type {OutfitSelection} from '../lib/product-preview';
import type {Avatar} from '../lib/outfit-appearance';
import {createMannequinMesh,cross,norm,shade,sub,type V3} from '../lib/mannequin-geometry';

type DragState={pointerId:number;startX:number;startY:number;baseX:number;baseY:number};

function render(canvas:HTMLCanvasElement,angleY:number,angleX:number,avatar:Avatar,chosen:Array<OutfitSelection|null>,mesh?:ReturnType<typeof createMannequinMesh>){
 const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
 const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
 const {faces,top}=mesh||createMannequinMesh(avatar,chosen);
 const yaw=angleY*Math.PI/180,pitch=angleX*Math.PI/180,cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),camera=6.3;
 const project=(p:V3)=>{const x=p[0]*cy+p[2]*sy,z0=-p[0]*sy+p[2]*cy,y=p[1]*cx-z0*sx,z=z0*cx+p[1]*sx,scale=Math.min(rect.width*.4,rect.height*.265)*camera/(camera-z);return {x:rect.width/2+x*scale,y:rect.height*.52-y*scale,z};};
 const polygons=faces.map(face=>{const points=face.points.map(project);const a=sub(face.points[1],face.points[0]),b=sub(face.points[2],face.points[0]);const normal=norm(cross(a,b));const transformedNormal:V3=[normal[0]*cy+normal[2]*sy,(normal[1]*cx)-( -normal[0]*sy+normal[2]*cy)*sx,(-normal[0]*sy+normal[2]*cy)*cx];const light=Math.max(0,transformedNormal[0]*-.24+transformedNormal[1]*.46+transformedNormal[2]*.85);return {face,points,facing:transformedNormal[2],depth:points.reduce((n,p)=>n+p.z,0)/points.length,light};}).filter(item=>item.facing>0).sort((a,b)=>a.depth-b.depth);
 for(const item of polygons){ctx.beginPath();ctx.moveTo(item.points[0].x,item.points[0].y);for(let i=1;i<item.points.length;i++)ctx.lineTo(item.points[i].x,item.points[i].y);ctx.closePath();ctx.fillStyle=shade(item.face.color,.62+item.light*.48);ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.5;ctx.stroke();}
 if(chosen[0]&&!chosen[4]&&cy>.1&&/xiii/i.test(chosen[0].product.name)){const logo=project([.08,.78,.36]);ctx.save();ctx.fillStyle=top.toLowerCase()==='#ffffff'?'#252525':'#f9f8f4';ctx.font='700 9px Arial,sans-serif';ctx.textAlign='center';ctx.translate(logo.x,logo.y);ctx.scale(cy,1);ctx.fillText('XIII',0,0);ctx.restore();}
 // Soft studio shadow anchors the floating figure to the floor.
 ctx.save();ctx.globalCompositeOperation='destination-over';const gradient=ctx.createRadialGradient(rect.width/2,rect.height*.9,2,rect.width/2,rect.height*.9,rect.width*.24);gradient.addColorStop(0,'#2229');gradient.addColorStop(1,'#2220');ctx.fillStyle=gradient;ctx.beginPath();ctx.ellipse(rect.width/2,rect.height*.9,rect.width*.23,12,0,0,Math.PI*2);ctx.fill();ctx.restore();
}

export function OutfitMannequin3D({avatar,chosen}:{avatar:Avatar;chosen:Array<OutfitSelection|null>}){
 const canvas=useRef<HTMLCanvasElement>(null),drag=useRef<DragState|null>(null);const [rotation,setRotation]=useState({x:0,y:0});const [dragging,setDragging]=useState(false);
 const mesh=useMemo(()=>createMannequinMesh(avatar,chosen),[avatar,chosen]);
 const style={'--avatar-rotate-y':rotation.y+'deg','--avatar-rotate-x':rotation.x+'deg'} as CSSProperties;
 useEffect(()=>{const target=canvas.current;if(!target)return;const paint=()=>render(target,rotation.y,rotation.x,avatar,chosen,mesh);paint();const observer=new ResizeObserver(paint);observer.observe(target);return()=>observer.disconnect();},[rotation,avatar,chosen,mesh]);
 function pointerDown(e:ReactPointerEvent<HTMLDivElement>){if(e.pointerType==='mouse'&&e.button!==0)return;drag.current={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,baseX:rotation.x,baseY:rotation.y};setDragging(true);e.currentTarget.setPointerCapture(e.pointerId);}
 function pointerMove(e:ReactPointerEvent<HTMLDivElement>){const start=drag.current;if(!start||start.pointerId!==e.pointerId)return;setRotation({y:start.baseY+(e.clientX-start.startX)*.62,x:Math.max(-12,Math.min(12,start.baseX-(e.clientY-start.startY)*.22))});}
 function pointerUp(e:ReactPointerEvent<HTMLDivElement>){if(drag.current?.pointerId!==e.pointerId)return;drag.current=null;setDragging(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
 function keyDown(e:ReactKeyboardEvent<HTMLDivElement>){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setRotation(v=>({...v,y:v.y+(e.key==='ArrowRight'?15:-15)}));}else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();setRotation(v=>({...v,x:Math.max(-12,Math.min(12,v.x+(e.key==='ArrowUp'?-4:4)))}));}else if(e.key==='Home'){e.preventDefault();setRotation({x:0,y:0});}}
 const angle=Math.round(((rotation.y%360)+360)%360);
 return <div className="avatar-rotation-shell mannequin-3d" role="slider" tabIndex={0} aria-label="Xoay ma-nơ-canh 3D" aria-valuemin={0} aria-valuemax={359} aria-valuenow={angle} aria-valuetext={'Góc xoay '+angle+' độ'} data-dragging={dragging} style={style} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={()=>{drag.current=null;setDragging(false)}} onKeyDown={keyDown}>
  <canvas ref={canvas} className="outfit-mannequin-canvas" role="img" aria-label="Ma-nơ-canh 3D đang mặc bộ trang phục đã chọn"/>
  <div className="avatar-rotate-hint" aria-hidden="true"><span>⟳</span>KÉO / VUỐT ĐỂ XOAY</div>
 </div>;
}

export type Quality='auto'|'light'|'detail';
export function renderProfile(quality:Quality,compact:boolean){
 if(quality==='detail')return {dpr:2,pixels:950_000,fps:60};
 if(quality==='light')return {dpr:1,pixels:180_000,fps:30};
 return compact?{dpr:1,pixels:160_000,fps:30}:{dpr:1.5,pixels:450_000,fps:45};
}
export function bufferSize(width:number,height:number,deviceDpr:number,profile:{dpr:number;pixels:number},scale=1){
 const w=Math.max(1,width),h=Math.max(1,height);
 const dpr=Math.min(Math.max(1,deviceDpr),profile.dpr,Math.sqrt(profile.pixels/(w*h)))*Math.max(.5,Math.min(1,scale));
 return {width:Math.max(1,Math.floor(w*dpr)),height:Math.max(1,Math.floor(h*dpr)),dpr};
}
export type OrbClock={shader:number;stars:number};
export function advanceClock(clock:OrbClock,deltaMs:number,speed:number,starSpeed:number){
 const dt=Math.max(0,Math.min(100,deltaMs))/1000;
 clock.shader+=dt*Math.max(0,speed);clock.stars+=dt*Math.max(0,starSpeed);return clock;
}

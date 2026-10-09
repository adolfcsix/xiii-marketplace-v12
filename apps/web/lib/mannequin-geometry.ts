import {itemPreview,type Avatar} from './outfit-appearance';
import type {OutfitSelection} from './product-preview';
export type V3=[number,number,number];
export type Face={points:V3[];color:string};
const add=(a:V3,b:V3):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a:V3,n:number):V3=>[a[0]*n,a[1]*n,a[2]*n];
export const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const norm=(v:V3):V3=>{const d=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/d,v[1]/d,v[2]/d]};
function sphere(faces:Face[],center:V3,radii:V3,color:string,segments=16,rings=10,upperOnly=false){
 const start=upperOnly?0:-Math.PI/2,end=Math.PI/2;
 for(let r=0;r<rings;r++)for(let s=0;s<segments;s++){
  const a0=start+(end-start)*r/rings,a1=start+(end-start)*(r+1)/rings,b0=2*Math.PI*s/segments,b1=2*Math.PI*(s+1)/segments;
  const p=(a:number,b:number):V3=>[center[0]+radii[0]*Math.cos(a)*Math.cos(b),center[1]+radii[1]*Math.sin(a),center[2]+radii[2]*Math.cos(a)*Math.sin(b)];
  const p00=p(a0,b0),p01=p(a0,b1),p10=p(a1,b0),p11=p(a1,b1);
  faces.push({points:[p00,p10,p11],color},{points:[p00,p11,p01],color});
 }
}
function cylinder(faces:Face[],a:V3,b:V3,ra:number,rb:number,color:string,segments=12,rounded=true){
 const axis=norm(sub(b,a));let u=norm(cross(axis,[0,0,1]));if(Math.hypot(...u)<.1)u=[1,0,0];const v=norm(cross(axis,u));
 const ring=(center:V3,r:number):V3[]=>Array.from({length:segments},(_,i)=>add(center,add(mul(u,Math.cos(2*Math.PI*i/segments)*r),mul(v,Math.sin(2*Math.PI*i/segments)*r))));
 const start=ring(a,ra),end=ring(b,rb);
 for(let i=0;i<segments;i++){const j=(i+1)%segments;faces.push({points:[start[i],end[j],end[i]],color},{points:[start[i],start[j],end[j]],color});if(!rounded)faces.push({points:[a,start[j],start[i]],color},{points:[b,end[i],end[j]],color});}
 if(rounded){sphere(faces,a,[ra,ra,ra],color,10,6);sphere(faces,b,[rb,rb,rb],color,10,6);}
}
function box(faces:Face[],center:V3,size:V3,color:string){
 const points:V3[]=Array.from({length:8},(_,i)=>[center[0]+((i&1)?1:-1)*size[0]/2,center[1]+((i&2)?1:-1)*size[1]/2,center[2]+((i&4)?1:-1)*size[2]/2]);
 for(const [a,b,c,d] of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])faces.push({points:[points[a],points[c],points[b]],color},{points:[points[a],points[d],points[c]],color});
}
export function shade(hex:string,amount:number){
 const expanded=/^#[\da-f]{3}$/i.test(hex)?'#'+hex.slice(1).split('').map(c=>c+c).join(''):hex;
 const match=/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(expanded);if(!match)return hex;
 return 'rgb('+match.slice(1).map(v=>Math.max(0,Math.min(255,Math.round(parseInt(v,16)*amount)))).join(',')+')';
}
/** Procedural illustration only: garment photos are not reconstructed here. */
export function createMannequinMesh(avatar:Avatar,chosen:Array<OutfitSelection|null>){
 const parts=Array.from({length:5},(_,i)=>itemPreview(chosen[i]||null,i,avatar.form));
 const skin=avatar.skin,top=chosen[0]?parts[0].color:'#d7d2c8',bottom=chosen[1]?parts[1].color:'#303138',shoe=chosen[2]?parts[2].color:'#ecebe6';
 const feminine=avatar.form==='feminine',buildScale=avatar.build==='slim'?.9:avatar.build==='relaxed'?1.1:1;
 const faces:Face[]=[],shoulderWidth=(feminine?.33:.39)*buildScale,hipWidth=(feminine?.25:.28)*buildScale;
 const shortBottom=Boolean(chosen[1])&&parts[1].kind==='shorts',skirt=Boolean(chosen[1])&&parts[1].kind==='skirt';
 for(const side of [-1,1]){
  const shoulder:V3=[side*shoulderWidth,.91,0],elbow:V3=[side*(shoulderWidth+.16),.49,.015],wrist:V3=[side*(shoulderWidth+.19),.03,0];
  cylinder(faces,shoulder,elbow,.095,.075,skin);cylinder(faces,elbow,wrist,.071,.052,skin);sphere(faces,wrist,[.064,.075,.06],skin,12,8);
  const hip:V3=[side*hipWidth,-.34,0],knee:V3=[side*(hipWidth+.015),-.93,.01],ankle:V3=[side*(hipWidth+.025),-1.48,.015];
  cylinder(faces,hip,knee,shortBottom||skirt?.105:.17,shortBottom||skirt?.076:.108,shortBottom||skirt?skin:bottom);
  cylinder(faces,knee,ankle,shortBottom||skirt?.078:.106,.073,shortBottom||skirt?skin:bottom);
  if(shortBottom)cylinder(faces,hip,[side*(hipWidth+.01),-.78,.01],.18,.14,bottom,14,false);
  if(chosen[1]&&parts[1].kind==='cargo')box(faces,[side*(hipWidth+.07),-.70,.14],[.16,.20,.07],shade(bottom,.85));
  if(chosen[2]&&parts[2].kind==='boots')cylinder(faces,[side*(hipWidth+.025),-1.22,.015],ankle,.105,.10,shoe,14,false);
  sphere(faces,[side*(hipWidth+.025),-1.56,.07],[.13,.085,.22],shoe,14,8);
 }
 if(skirt)cylinder(faces,[0,-.34,0],[0,-.88,0],.34*buildScale,.47*buildScale,bottom,24,false);
 cylinder(faces,[0,.29,0],[0,1.04,0],.28*buildScale,.40*buildScale,top,20,false);
 cylinder(faces,[0,-.35,0],[0,.32,0],.35*buildScale,.29*buildScale,bottom,20,false);
 const longSleeves=Boolean(chosen[0])&&['hoodie','sweater','jacket'].includes(parts[0].kind);
 for(const side of [-1,1]){
  cylinder(faces,[side*.28*buildScale,.97,0],[side*(shoulderWidth+.10),.66,.005],.14,.105,top,14);
  if(longSleeves){cylinder(faces,[side*(shoulderWidth+.10),.66,.005],[side*(shoulderWidth+.16),.49,.015],.105,.088,top,14);cylinder(faces,[side*(shoulderWidth+.16),.49,.015],[side*(shoulderWidth+.19),.12,0],.088,.063,top,14);}
  if(chosen[4]){cylinder(faces,[side*.29*buildScale,.97,0],[side*(shoulderWidth+.16),.49,.015],.17,.11,parts[4].color,14);cylinder(faces,[side*(shoulderWidth+.16),.49,.015],[side*(shoulderWidth+.19),.12,0],.11,.08,parts[4].color,14);}
 }
 if(chosen[0]&&parts[0].kind==='hoodie')sphere(faces,[0,1.07,-.11],[.24,.22,.20],top,16,10);
 if(chosen[4]){cylinder(faces,[0,.25,0],[0,.99,0],.32*buildScale,.43*buildScale,parts[4].color,20,false);box(faces,[0,.70,.41],[.07,.48,.025],top);}
 cylinder(faces,[0,1.02,0],[0,1.23,0],.105,.105,skin,14);sphere(faces,[0,1.52,0],[.225,.30,.205],skin,22,14);
 const hairColor='#242328';sphere(faces,[0,1.69,-.025],[.232,.22,.214],hairColor,20,10,true);
 if(avatar.hair==='long'||avatar.hair==='bob')cylinder(faces,[0,1.52,-.13],[0,avatar.hair==='bob'?1.24:.88,-.12],.225,.19,hairColor,18);
 if(avatar.hair==='tied')sphere(faces,[0,1.25,-.25],[.13,.26,.13],hairColor,14,9);
 for(const side of [-1,1])sphere(faces,[side*.075,1.55,.19],[.018,.012,.012],'#252327',8,5);
 sphere(faces,[0,1.47,.201],[.018,.035,.018],shade(skin,.78),8,5);cylinder(faces,[-.045,1.39,.195],[.045,1.39,.195],.008,.008,'#805b50',8);
 if(chosen[3]){
  const {kind,color}=parts[3];
  if(kind==='cap'){sphere(faces,[0,1.79,.005],[.25,.085,.22],color,18,8,true);sphere(faces,[0,1.77,.22],[.21,.022,.14],color,14,6);}
  if(kind==='bag'){cylinder(faces,[-.27,1.01,.20],[.31,.25,.24],.027,.027,color,8);box(faces,[.32,.22,.24],[.28,.36,.14],color);}
  if(kind==='glasses'){for(const side of [-1,1]){const x=side*.078;for(const y of [1.59,1.51])box(faces,[x,y,.218],[.13,.016,.025],color);for(const edge of [-1,1])box(faces,[x+edge*.065,1.55,.218],[.016,.09,.025],color);}box(faces,[0,1.56,.22],[.035,.018,.025],color);}
  if(kind==='chain'){let previous:V3=[-.15,1.10,.15];for(let i=1;i<=12;i++){const t=i/12,p:V3=[-.15+.30*t,1.10-.24*Math.sin(Math.PI*t),.15+.23*Math.sin(Math.PI*t)];cylinder(faces,previous,p,.012,.012,color,6,false);previous=p;}box(faces,[0,.84,.39],[.06,.08,.025],color);}
 }
 return {faces,top};
}

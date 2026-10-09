import type { OutfitSelection } from './product-preview';
import {isOutfitArtworkUrl} from '../../../shared/outfit-artwork';
export type Avatar = { form:'masculine'|'feminine'|'neutral'; build:'slim'|'regular'|'relaxed'; skin:string; hair:'short'|'long'|'bob'|'tied'; face:'soft'|'defined' };
export const DEFAULT_AVATAR:Avatar={form:'neutral',build:'regular',skin:'#dca77f',hair:'short',face:'soft'};
export const SKIN_TONES=['#f0c8aa','#dca77f','#9b6244'];
export function readAvatar(value:unknown):Avatar {
 const v=value && typeof value==='object'?value as Record<string,unknown>:{};
 return {form:v.form==='masculine'||v.form==='feminine'?v.form:'neutral',build:v.build==='slim'||v.build==='relaxed'?v.build:'regular',skin:SKIN_TONES.includes(String(v.skin))?String(v.skin):DEFAULT_AVATAR.skin,hair:v.hair==='long'||v.hair==='bob'||v.hair==='tied'?v.hair:'short',face:v.face==='defined'?'defined':'soft'};
}
const normalize=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
export function outfitSlot(name:string,category=''):number|null {
 const text=normalize(name);
 if(/\b(jackets?|coats?|blazers?|ao khoac)\b/.test(text))return 4;
 if(category){const detected=outfitSlot(category);if(detected!==null)return detected;}
 if(/\b(giay|dep|sneakers?|shoes?|boots?|sandals?|clogs?)\b/.test(text))return 2;
 if(/\b(mu|non|cap|hat|tui|bag|chain|day chuyen|phu kien|accessories|accessory|kinh|glasses)\b/.test(text))return 3;
 if(/\b(quan|shorts?|cargo|jeans|trousers|pants|vay|skirts?)\b/.test(text))return 1;
 if(/\b(ao|shirts?|tees?|hoodies?|jackets?|sweatshirts?|sweaters?|tops?)\b/.test(text))return 0;
 return null;
}
export function itemPreview(item:OutfitSelection|null,slot:number,form:Avatar['form']) {
 const source=item?.product.attributes?.outfitPreview;
 const meta=source&&typeof source==='object'?source as Record<string,unknown>:{};
 const colorText=String(item?.variant.attributes?.color||meta.color||item?.product.name||'');
 const palette:[RegExp,string][]=[[/trang|white|cream|kem/i,'#eee9df'],[/navy/i,'#253346'],[/\b(den|black|charcoal)\b/i,'#262a30'],[/xam|gray|grey|silver|bac/i,'#9b9fa7'],[/beige|be\b|brown|nau/i,'#987254'],[/xanh la|green|olive/i,'#647455'],[/xanh|blue|denim/i,'#46668d'],[/do\b|red|burgundy/i,'#a94c49'],[/hong|pink/i,'#d295af'],[/vang|yellow/i,'#dbc36b'],[/tim|purple/i,'#8f7bac'],[/cam|orange/i,'#cf8654']];
 const text=normalize(colorText);
 const hex=(value:unknown)=>typeof value==='string'&&/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)?value:undefined;
 const color=hex(colorText)||palette.find(([re])=>re.test(text))?.[1]||hex(meta.color)||(slot===2?'#eee9df':'#444955');
 const name=normalize(String(meta.kind||item?.product.name||''));
 const kind=slot===4?'jacket':slot===0?(/hoodie/.test(name)?'hoodie':/jacket|khoac/.test(name)?'jacket':/sweater|sweatshirt|len/.test(name)?'sweater':'tee'):slot===1?(/short|dui/.test(name)?'shorts':/skirt|vay/.test(name)?'skirt':/cargo/.test(name)?'cargo':'pants'):slot===2?(/boot/.test(name)?'boots':/dep|sandal|clog/.test(name)?'clogs':'sneakers'):(/cap|hat|mu\b|non/.test(name)?'cap':/bag|tui/.test(name)?'bag':/kinh|glasses/.test(name)?'glasses':'chain');
 const overlays=meta.overlays&&typeof meta.overlays==='object'?meta.overlays as Record<string,unknown>:{};
 const overlay=overlays[form]||overlays.neutral;
 const variantMap=meta.variantOverlays&&typeof meta.variantOverlays==='object'?meta.variantOverlays as Record<string,unknown>:{};
 const variantSource=variantMap[item?.variant._id||''];const variantOverlays=variantSource&&typeof variantSource==='object'?variantSource as Record<string,unknown>:{};const variantOverlay=variantOverlays[form]||variantOverlays.neutral;
 const variantImage=isOutfitArtworkUrl(variantOverlay)?variantOverlay:undefined;
 const productImage=isOutfitArtworkUrl(overlay)?overlay:undefined;
 return {color,kind,artworkSource:variantImage?'variant':productImage?'product':'illustration',overlay:variantImage||productImage};
}
export function outfitOwnerKey():string {
 try {
  const token=localStorage.getItem('xiii_access')||localStorage.getItem('xiii_refresh');
  if(!token)return 'xiii-outfit-v2:guest';
  // Token identity takes precedence over possibly stale cached profile data.
  try{const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(typeof payload.sub==='string'&&payload.sub)return 'xiii-outfit-v2:user:'+encodeURIComponent(payload.sub);}catch{}
  try{const user=JSON.parse(localStorage.getItem('xiii_user')||'null');const id=user?._id||user?.id;if(typeof id==='string'&&id)return 'xiii-outfit-v2:user:'+encodeURIComponent(id);}catch{}
  let fingerprint=2166136261;for(const char of token)fingerprint=Math.imul(fingerprint^char.charCodeAt(0),16777619);return 'xiii-outfit-v2:session:'+String(fingerprint>>>0);
 }catch{return 'xiii-outfit-v2:guest';}
}

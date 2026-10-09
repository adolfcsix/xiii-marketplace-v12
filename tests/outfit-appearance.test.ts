import {test} from 'node:test';
import assert from 'node:assert/strict';
import {itemPreview,outfitOwnerKey,outfitSlot} from '../apps/web/lib/outfit-appearance';
import type {OutfitSelection} from '../apps/web/lib/product-preview';
const item=(color:string,defaultColor?:string)=>({product:{name:'Jeans',attributes:{outfitPreview:{color:defaultColor}}},variant:{_id:'sku',attributes:{color}}}) as OutfitSelection;
test('Vietnamese uppercase Đ and English plural categories resolve correctly',()=>{
 for(const name of ['Giày Đen','Sneakers','Shoes','Boots','Sandals'])assert.equal(outfitSlot(name),2);
 assert.equal(outfitSlot('Accessories'),3);assert.equal(outfitSlot('Shirts'),0);assert.equal(outfitSlot('Skirts'),1);
 assert.equal(itemPreview(item('Đen'),1,'neutral').color,'#262a30');
 assert.equal(itemPreview(item('Denim'),1,'neutral').color,'#46668d');
});
test('chosen variant colour overrides default artwork colour and accepts hex',()=>{
 assert.equal(itemPreview(item('White','#123456'),0,'neutral').color,'#eee9df');
 assert.equal(itemPreview(item('#abc','#123456'),0,'neutral').color,'#abc');
 assert.equal(itemPreview(item('Unknown','#123456'),0,'neutral').color,'#123456');
});
test('account draft identity survives corrupt or stale cached profile',()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');const values=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)||null}});
 try{
  values.set('xiii_user','broken');assert.equal(outfitOwnerKey(),'xiii-outfit-v2:guest');
  values.set('xiii_access','e30.'+btoa(JSON.stringify({sub:'current-user'}))+'.signature');assert.equal(outfitOwnerKey(),'xiii-outfit-v2:user:current-user');
  values.set('xiii_user',JSON.stringify({_id:'old-user'}));assert.equal(outfitOwnerKey(),'xiii-outfit-v2:user:current-user');
  values.set('xiii_access','fixture');values.set('xiii_user','broken');assert.match(outfitOwnerKey(),/^xiii-outfit-v2:session:/);
 }finally{if(old)Object.defineProperty(globalThis,'localStorage',old);else Reflect.deleteProperty(globalThis,'localStorage');}
});
test('outerwear uses its own layer even within broad tops category',()=>{
 assert.equal(outfitSlot('Áo khoác denim','Áo'),4);assert.equal(outfitSlot('Blazer','Shirts'),4);assert.equal(outfitSlot('Hoodie'),0);
});

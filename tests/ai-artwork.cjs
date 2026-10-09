const {test}=require('node:test');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const {Types}=require('mongoose');
const {AiArtworkService}=require('../services/api/dist/products/ai-artwork.service');
const {StorageService}=require('../services/api/dist/storage/storage.service');
const {artworkGuide,normalizeArtwork,isPilotTop,prepareProductPhoto}=require('../services/api/dist/products/ai-artwork-image');
const pid=new Types.ObjectId(),sid=new Types.ObjectId(),vid=new Types.ObjectId();
const configValues={AI_OUTFIT_ENABLED:'true',OPENAI_API_KEY:'test-key',AI_OUTFIT_DAILY_LIMIT:2};
const config={get:(key,fallback)=>configValues[key]??fallback};
function match(row,q){return Object.entries(q).every(([k,v])=>v&&typeof v==='object'&&!(v instanceof Types.ObjectId)&&!(v instanceof Date)?('$in'in v?v.$in.includes(row[k]):'$lt'in v?row[k]<v.$lt:false):String(row[k])===String(v));}
function harness(){
 const rows=[],quotas=new Map();let writes=0,updates=0;
 const product={_id:pid,shopId:sid,name:'Áo tee XIII',status:'DRAFT',category:{name:'Áo'},variants:[{_id:vid,status:'ACTIVE',image:'https://storage.example/uploads/product_image/2026/10/photo.png',attributes:{color:'Đen',size:'M'}}]};
 const jobs={findOne:q=>({lean:async()=>rows.find(r=>match(r,q))||null}),create:async data=>{const row={...data,_id:new Types.ObjectId()};rows.push(row);return row;},findOneAndUpdate:(q,u)=>{const row=rows.find(r=>match(r,q));if(row)Object.assign(row,u.$set);const promise=Promise.resolve(row||null);promise.lean=async()=>row||null;return promise;},updateOne:async(q,u)=>{const row=rows.find(r=>match(r,q));if(row)Object.assign(row,u.$set);},updateMany:async(q,u)=>{rows.filter(r=>match(r,q)).forEach(r=>Object.assign(r,u.$set));}};
 const quotaModel={updateOne:async(q,u)=>{if(!quotas.has(q._id)&&u.$setOnInsert)quotas.set(q._id,{...u.$setOnInsert});if(u.$inc&&quotas.has(q._id))quotas.get(q._id).used+=u.$inc.used;},findOneAndUpdate:async(q,u)=>{const row=quotas.get(q._id);if(row&&row.used<q.used.$lt){row.used+=u.$inc.used;return row;}return null;}};
 const products={sellerOne:async(user,id)=>{if(user!=='owner'||String(id)!==String(pid))throw new Error('PRODUCT_NOT_FOUND');return product;},update:()=>{updates++;}};
 const storage={artworkConfigured:()=>true,productImageKey:()=> 'trusted-key',readProductImage:async()=>sharp({create:{width:128,height:128,channels:4,background:'#222'}}).png().toBuffer(),storeArtwork:async()=>{writes++;return 'https://storage.example/artwork/ai/test.png';}};
 const permissions={allowed:true};const actor={status:'ACTIVE',roles:['SELLER']};const shopAccess={require:async()=>{if(!permissions.allowed)throw Error('SHOP_PERMISSION_DENIED');}};const users={findById:()=>({select:()=>({lean:async()=>actor})})};
 const service=new AiArtworkService(jobs,quotaModel,products,storage,config,shopAccess,users);
 return {service,rows,product,storage,jobs,quotas,permissions,actor,writes:()=>writes,updates:()=>updates};
}
async function syntheticArtwork(){return sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536"><path d="M448 426L380 452L335 550L370 588L411 550V780H613V550L654 588L689 550L644 452L576 426Z" fill="#222"/></svg>')).png().toBuffer();}
test('pilot categories exclude jackets, dresses and non-clothing; guide exactly matches provider canvas',async()=>{
 assert.equal(isPilotTop('Áo thun','Áo'),true);assert.equal(isPilotTop('Hoodie','Streetwear'),true);
 for(const name of ['Áo khoác','Jacket','Dress','Quần','Giày','Bag'])assert.equal(isPilotTop(name,'Áo'),false);
 for(const form of ['neutral','masculine','feminine']){const meta=await sharp(await artworkGuide(form)).metadata();assert.equal(meta.width,1024);assert.equal(meta.height,1536);}
});
test('source preprocessing rejects disguised SVG/GIF and actually decodes supported raster formats',async()=>{
 for(const bytes of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'),Buffer.from('GIF89a-not-a-photo')])await assert.rejects(prepareProductPhoto(bytes),/UNSUPPORTED_SOURCE_IMAGE/);
 for(const format of ['png','jpeg','webp','avif']){const bytes=await sharp({create:{width:32,height:32,channels:3,background:'#222'}}).toFormat(format).toBuffer();const meta=await sharp(await prepareProductPhoto(bytes)).metadata();assert.equal(meta.format,'png');assert.equal(meta.width,32);}
});
test('artwork rejects wrong dimensions, opaque backgrounds and stray mannequin; valid image is 360x620',async()=>{
 const bytes=await syntheticArtwork();const output=await normalizeArtwork(bytes);const meta=await sharp(output).metadata();assert.equal(meta.width,360);assert.equal(meta.height,620);assert.ok(meta.hasAlpha);
 await assert.rejects(normalizeArtwork(await sharp(bytes).resize(512,768).png().toBuffer()),/INVALID_AI_CANVAS/);
 await assert.rejects(normalizeArtwork(await sharp(bytes).flatten({background:'#fff'}).png().toBuffer()),/INVALID_AI_CANVAS/);
 const dirty=await sharp(bytes).composite([{input:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536"><rect x="450" y="50" width="120" height="200" fill="red"/></svg>')}]).png().toBuffer();
 await assert.rejects(normalizeArtwork(dirty),/CLEANUP/);
});
test('bucket source restriction rejects arbitrary hosts, traversal and query tricks',()=>{
 const service=new StorageService({get:(key,fallback)=>({STORAGE_BUCKET:'qa',STORAGE_PUBLIC_BASE_URL:'https://store.example/bucket',STORAGE_ACCESS_KEY_ID:'qa',STORAGE_SECRET_ACCESS_KEY:'qa',STORAGE_REGION:'us-east-1'}[key]??fallback)});
 assert.equal(service.productImageKey('https://store.example/bucket/uploads/product_image/2026/10/photo.png'),'uploads/product_image/2026/10/photo.png');
 for(const url of ['http://127.0.0.1/a.png','https://store.example.evil/bucket/uploads/product_image/2026/10/photo.png','https://store.example/bucket/uploads/product_image/2026/10/../../a.png','https://store.example/bucket/uploads/product_image/2026/10/a.png?key=x'])assert.throws(()=>service.productImageKey(url));
});
test('same SKU/form requests reuse one job; forms reserve separate quota; third form exceeds limit',async()=>{
 const h=harness();const first=await h.service.create('owner',pid,String(vid),'neutral','request-a');const again=await h.service.create('owner',pid,String(vid),'neutral','request-b');assert.equal(first.id,again.id);assert.equal(h.rows.length,1);
 await h.service.create('owner',pid,String(vid),'masculine','request-c');await assert.rejects(h.service.create('owner',pid,String(vid),'feminine','request-d'),/hết lượt/);
 assert.equal(h.rows.length,2);
});
test('ownership, saved SKU photo, disabled variants and pending moderation block creation',async()=>{
 const h=harness();await assert.rejects(h.service.create('other',pid,String(vid),'neutral','r'),/PRODUCT_NOT_FOUND/);
 h.product.variants[0].image='';await assert.rejects(h.service.create('owner',pid,String(vid),'neutral','r'),/upload ảnh/);
 h.product.variants[0].status='DISABLED';await assert.rejects(h.service.create('owner',pid,String(vid),'neutral','r'),/ngừng bán/);
 h.product.status='PENDING_REVIEW';await assert.rejects(h.service.create('owner',pid,String(vid),'neutral','r'),/chờ duyệt/);assert.equal(h.rows.length,0);
});
test('worker sends two reference images, stores clean PNG; acceptance stages asset without product writes',async()=>{
 const h=harness(),job=await h.service.create('owner',pid,String(vid),'feminine','r');const old=global.fetch;let calls=0;
 global.fetch=async(url,init)=>{calls++;assert.equal(url,'https://api.openai.com/v1/images/edits');assert.equal(init.headers.Authorization,'Bearer test-key');assert.equal(init.body.get('background'),'transparent');assert.equal(init.body.get('input_fidelity'),'high');assert.equal(init.body.getAll('image[]').length,2);assert.match(init.body.get('prompt'),/exact top/);return new Response(JSON.stringify({data:[{b64_json:(await syntheticArtwork()).toString('base64')}]}),{status:200});};
 try{await h.service.tick();const ready=await h.service.get('owner',pid,new Types.ObjectId(job.id));assert.equal(ready.status,'READY');assert.equal(h.writes(),1);await h.service.tick();assert.equal(calls,1);await assert.rejects(h.service.get('other',pid,new Types.ObjectId(job.id)),/PRODUCT_NOT_FOUND/);const accepted=await h.service.review('owner',pid,new Types.ObjectId(job.id),'ACCEPT');assert.equal(accepted.outputUrl,ready.outputUrl);assert.ok(accepted.reviewedAt);assert.equal(h.updates(),0);h.product.variants[0].attributes.color='White';await assert.rejects(h.service.review('owner',pid,new Types.ObjectId(job.id),'ACCEPT'),/đã đổi/);}finally{global.fetch=old;}
});
test('provider error is sanitized and never automatically retried; reject prevents later acceptance',async()=>{
 const h=harness(),job=await h.service.create('owner',pid,String(vid),'neutral','r');const old=global.fetch;let calls=0;
 global.fetch=async()=>{calls++;return new Response('secret-provider-detail',{status:429});};
 try{await h.service.tick();await h.service.tick();assert.equal(calls,1);assert.equal(h.rows[0].status,'FAILED');assert.doesNotMatch(h.rows[0].error,/secret/);assert.equal(h.writes(),0);await assert.rejects(h.service.review('owner',pid,new Types.ObjectId(job.id),'ACCEPT'),/chưa sẵn sàng/);h.rows[0].status='READY';h.rows[0].outputUrl='https://storage.example/art.png';await h.service.review('owner',pid,new Types.ObjectId(job.id),'REJECT');assert.equal(h.rows[0].status,'REJECTED');await assert.rejects(h.service.review('owner',pid,new Types.ObjectId(job.id),'ACCEPT'),/chưa sẵn sàng/);}finally{global.fetch=old;}
});
test('changed source before processing fails without a paid call',async()=>{
 const h=harness();await h.service.create('owner',pid,String(vid),'neutral','r');h.product.variants[0].image+='-changed';const old=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw Error('unexpected');};try{await h.service.tick();assert.equal(calls,0);assert.equal(h.rows[0].status,'FAILED');assert.match(h.rows[0].error,/thay đổi/);}finally{global.fetch=old;}
});
test('queued work rechecks account status, role and product-write permission before a paid call',async()=>{
 const old=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw Error('unexpected paid request');};
 try{for(const revoke of [h=>h.actor.status='BLOCKED',h=>h.actor.roles=['BUYER'],h=>h.permissions.allowed=false]){const h=harness();await h.service.create('owner',pid,String(vid),'neutral','r');revoke(h);await h.service.tick();assert.equal(h.rows[0].status,'FAILED');}assert.equal(calls,0);}finally{global.fetch=old;}
});
test('ambiguous database insert failure retains quota rather than risking excess paid jobs',async()=>{
 const h=harness();h.jobs.create=async()=>{throw Error('write acknowledgment lost');};await assert.rejects(h.service.create('owner',pid,String(vid),'neutral','r'),/acknowledgment lost/);assert.equal([...h.quotas.values()][0].used,1);
});
test('revocation while downloading the source is checked again immediately before the provider call',async()=>{
 const h=harness();await h.service.create('owner',pid,String(vid),'neutral','r');const read=h.storage.readProductImage;h.storage.readProductImage=async()=>{const image=await read();h.permissions.allowed=false;return image;};const old=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw Error('unexpected paid request');};try{await h.service.tick();assert.equal(calls,0);assert.equal(h.rows[0].status,'FAILED');assert.match(h.rows[0].error,/quyền/);}finally{global.fetch=old;}
});

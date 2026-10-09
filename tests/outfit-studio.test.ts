import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readMannequinView} from '../shared/outfit-preferences';
import {isOutfitArtworkUrl} from '../shared/outfit-artwork';
import {configuredOrigin} from '../shared/app-links';
import {createMannequinMesh,shade} from '../apps/web/lib/mannequin-geometry';
import {DEFAULT_AVATAR,itemPreview} from '../apps/web/lib/outfit-appearance';
import type {OutfitSelection} from '../apps/web/lib/product-preview';
const garment=(name:string,color='#bada55')=>({product:{name},variant:{_id:'sku',attributes:{color}}}) as OutfitSelection;
const slots=()=>Array<OutfitSelection|null>(5).fill(null);
test('view preference survives save/reload and accepts earlier raw values',()=>{
 for(const mode of ['2d','3d'] as const){assert.equal(readMannequinView(JSON.stringify(mode)),mode);assert.equal(readMannequinView(mode),mode);}
 for(const value of [null,'broken','null','{}','"4d"'])assert.equal(readMannequinView(value),'3d');
});
test('local MinIO artwork and HTTPS artwork render, malformed variants fall back to product artwork',()=>{
 for(const url of ['/artwork/top.png','https://cdn.example.com/art.png','http://localhost:9000/media/top.png','http://127.0.0.1:9000/media/top.png'])assert.equal(isOutfitArtworkUrl(url),true);
 for(const url of ['javascript:alert(1)','data:image/png;base64,AAA','//external.test/x','/\\external.test/x','https://','https://user:pass@cdn.example.com/x','http://external.test/x'])assert.equal(isOutfitArtworkUrl(url),false);
 const item=garment('Áo');item.product.attributes={outfitPreview:{variantOverlays:{sku:{neutral:'http://localhost:9000/media/top.png'}}}};
 assert.equal(itemPreview(item,0,'neutral').overlay,'http://localhost:9000/media/top.png');
 item.product.attributes={outfitPreview:{overlays:{neutral:'/artwork/top.png'},variantOverlays:{sku:{neutral:'javascript:alert(1)'}}}};
 assert.equal(itemPreview(item,0,'neutral').overlay,'/artwork/top.png');
 assert.equal(itemPreview(item,0,'neutral').artworkSource,'product');
});
test('production links use configured origins, stripping paths and rejecting unsafe schemes',()=>{
 assert.equal(configuredOrigin('https://store.example.com/base/','http://localhost:3000'),'https://store.example.com');
 assert.equal(configuredOrigin('javascript:alert(1)','http://localhost:3000'),'http://localhost:3000');
});
test('shorts cover the upper legs and skirts extend around the lower body',()=>{
 const chosen=slots();chosen[1]=garment('Shorts');let mesh=createMannequinMesh(DEFAULT_AVATAR,chosen);
 assert.ok(mesh.faces.some(f=>f.color==='#bada55'&&f.points.some(p=>p[1]<-.5)));
 chosen[1]=garment('Skirt');mesh=createMannequinMesh(DEFAULT_AVATAR,chosen);
 const skirt=mesh.faces.filter(f=>f.color==='#bada55').flatMap(f=>f.points).filter(p=>p[1]<-.5);
 assert.ok(skirt.some(p=>p[0]>.4)&&skirt.some(p=>p[0]<-.4));
});
test('outerwear covers the torso and every accessory produces visible geometry',()=>{
 const chosen=slots();chosen[4]=garment('Áo khoác');const coat=createMannequinMesh(DEFAULT_AVATAR,chosen);
 assert.ok(coat.faces.some(f=>f.color==='#bada55'&&f.points.some(p=>Math.abs(p[0])<.1&&p[1]>.5&&p[1]<1)));
 for(const name of ['Cap','Bag','Glasses','Chain']){const outfit=slots();outfit[3]=garment(name);assert.ok(createMannequinMesh(DEFAULT_AVATAR,outfit).faces.some(f=>f.color==='#bada55'),name);}
});
test('all body forms and builds produce finite triangles; short hex colours receive lighting',()=>{
 const chosen=slots();chosen[0]=garment('Hoodie');chosen[1]=garment('Cargo');chosen[2]=garment('Boots');chosen[3]=garment('Bag');chosen[4]=garment('Jacket');
 for(const form of ['masculine','feminine','neutral'] as const)for(const build of ['slim','regular','relaxed'] as const){const mesh=createMannequinMesh({...DEFAULT_AVATAR,form,build},chosen);assert.ok(mesh.faces.length>100);assert.ok(mesh.faces.every(f=>f.points.length===3&&f.points.flat().every(Number.isFinite)));}
 assert.equal(shade('#abc',1),'rgb(170,187,204)');
});

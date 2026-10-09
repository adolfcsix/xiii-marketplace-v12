import {test} from 'node:test';import assert from 'node:assert/strict';import {cropGeometry,ORIGINAL_EDIT} from '../shared/image-editor';
test('rotation exchanges dimensions without cropping the original',()=>{
 assert.deepEqual(cropGeometry(160,80,{...ORIGINAL_EDIT,rotation:90}),{width:80,height:160,x:0,y:0,rotatedWidth:80,rotatedHeight:160});
 assert.equal(cropGeometry(160,80,{...ORIGINAL_EDIT,rotation:180}).width,160);
});
test('ratio, zoom and pan keep the crop within the rotated image at both extremes',()=>{
 for(const rotation of [0,90,180,270] as const)for(const ratio of [1,0.8,16/9,3,9/16])for(const zoom of [1,2,3])for(const x of [-100,0,100])for(const y of [-100,100]){
  const g=cropGeometry(160,80,{rotation,ratio,zoom,x,y});assert.ok(Math.abs(g.width/g.height-ratio)<0.00001);assert.ok(g.x>=0&&g.y>=0);assert.ok(g.x+g.width<=g.rotatedWidth+0.00001);assert.ok(g.y+g.height<=g.rotatedHeight+0.00001);
 }
});
test('cropping clamps out-of-range controls and rejects bad source dimensions',()=>{
 const g=cropGeometry(160,80,{...ORIGINAL_EDIT,ratio:1,zoom:99,x:-999,y:999});assert.equal(g.width,80/3);assert.equal(g.x,0);
 for(const w of [0,-1,NaN,Infinity])assert.throws(()=>cropGeometry(w,80,ORIGINAL_EDIT));
});

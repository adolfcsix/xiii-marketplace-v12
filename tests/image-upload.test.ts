import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sniffImage,canonicalImageName,checkImageSize,IMAGE_LIMITS} from '../shared/image-upload';
const bytes=(s:string)=>new Uint8Array(Buffer.from(s,'binary'));
test('detects supported bytes regardless of filename or browser MIME',()=>{
 assert.equal(sniffImage(new Uint8Array([255,216,255])),'image/jpeg');
 assert.equal(sniffImage(new Uint8Array([137,80,78,71,13,10,26,10])),'image/png');
 assert.equal(sniffImage(bytes('RIFF0000WEBP')),'image/webp');
 for(const version of ['GIF87a','GIF89a'])assert.equal(sniffImage(bytes(version)),'image/gif');
 assert.equal(sniffImage(bytes('\x00\x00\x00\x18ftypmif1\x00\x00\x00\x00avifmif1')),'image/avif');
});
test('rejects HEIC, SVG, truncated signatures and arbitrary content',()=>{
 for(const value of ['','\x89PNG','<svg></svg>','GIF','RIFF0000WAVE','\x00\x00\x00\x18ftypheic0000mif1heic'])assert.equal(sniffImage(bytes(value)),null);
});
test('canonical filename keeps a useful stem and aligns extension with actual content',()=>{
 assert.equal(canonicalImageName('Ảnh sản phẩm.jpeg','image/png'),'Ảnh sản phẩm.png');
 assert.equal(canonicalImageName('C:\\fakepath\\photo.jfif','image/jpeg'),'photo.jpg');
 assert.equal(canonicalImageName('../wrong.svg','image/avif'),'wrong.avif');
 assert.equal(canonicalImageName('\x00.png','image/png'),'image.png');
 assert.ok(canonicalImageName('a'.repeat(300)+'.png','image/png').length<=154);
});
test('each purpose accepts its exact limit and rejects empty or oversized files',()=>{
 for(const purpose of Object.keys(IMAGE_LIMITS) as (keyof typeof IMAGE_LIMITS)[]){
  checkImageSize(IMAGE_LIMITS[purpose]*1024*1024,purpose);
  assert.throws(()=>checkImageSize(IMAGE_LIMITS[purpose]*1024*1024+1,purpose),/MB/);
  for(const size of [0,-1,NaN,1.5])assert.throws(()=>checkImageSize(size,purpose));
 }
});

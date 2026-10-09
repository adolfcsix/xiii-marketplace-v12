const {test}=require('node:test');const assert=require('node:assert/strict');
const {StorageService,LIMITS,MIME_EXTENSION}=require('../services/api/dist/storage/storage.service');
const values={STORAGE_BUCKET:'qa',STORAGE_PUBLIC_BASE_URL:'https://qa.invalid',STORAGE_ACCESS_KEY_ID:'qa',STORAGE_SECRET_ACCESS_KEY:'qa',STORAGE_REGION:'us-east-1'};
const storage=new StorageService({get:(key,fallback)=>values[key]??fallback});
test('presigned policy uses canonical MIME and extensions for supported aliases and new formats',async()=>{
 for(const [input,mime,extension] of [['image/jpg','image/jpeg','jpg'],['image/jfif','image/jpeg','jpg'],[' IMAGE/PNG ','image/png','png'],['image/gif','image/gif','gif'],['image/avif','image/avif','avif']]){
  const result=await storage.createUpload('qa-user',{purpose:'PRODUCT_IMAGE',fileName:'wrong.txt',contentType:input,sizeBytes:100});
  assert.equal(result.fields['Content-Type'],mime);assert.ok(result.objectKey.endsWith('.'+extension));
  const policy=JSON.parse(Buffer.from(result.fields.Policy,'base64').toString());
  assert.ok(policy.conditions.some(c=>JSON.stringify(c)===JSON.stringify(['eq','$Content-Type',mime])));
  assert.ok(policy.conditions.some(c=>JSON.stringify(c)===JSON.stringify(['content-length-range',1,100])));
 }
});
test('unsupported MIME including prototype keys and excessive sizes never receive a signed policy',async()=>{
 for(const contentType of ['image/heic','image/svg+xml','toString','__proto__',''])await assert.rejects(storage.createUpload('qa',{purpose:'PRODUCT_IMAGE',fileName:'x.jpg',contentType,sizeBytes:10}),/Chỉ hỗ trợ/);
 for(const purpose of Object.keys(LIMITS))await assert.rejects(storage.createUpload('qa',{purpose,fileName:'x.jpg',contentType:'image/jpeg',sizeBytes:LIMITS[purpose]+1}),/MB/);
 assert.deepEqual(Object.keys(MIME_EXTENSION).sort(),['image/avif','image/gif','image/jpeg','image/png','image/webp']);
});

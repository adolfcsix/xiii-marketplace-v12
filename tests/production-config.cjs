const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateEnv}=require('../services/api/dist/common/config/env.validation');
const base={MONGODB_URI:'mongodb://127.0.0.1/test',JWT_ACCESS_SECRET:'a'.repeat(40),JWT_REFRESH_SECRET:'b'.repeat(40),PAYOUT_ENCRYPTION_KEY:'c'.repeat(40),STORAGE_DRIVER:'disabled'};
const storage={STORAGE_DRIVER:'s3',STORAGE_BUCKET:'media',STORAGE_REGION:'us-east-1',STORAGE_ACCESS_KEY_ID:'test',STORAGE_SECRET_ACCESS_KEY:'test',STORAGE_PUBLIC_BASE_URL:'https://cdn.example.com'};
test('AI disabled remains optional; enabled fails fast on missing key/storage and malformed limits',()=>{
 assert.equal(validateEnv(base).AI_OUTFIT_ENABLED,'false');
 for(const AI_OUTFIT_ENABLED of ['yes','1','TRUE'])assert.throws(()=>validateEnv({...base,AI_OUTFIT_ENABLED}),/must be true or false/);
 assert.throws(()=>validateEnv({...base,AI_OUTFIT_ENABLED:'true',OPENAI_API_KEY:'test'}),/requires S3/);
 assert.throws(()=>validateEnv({...base,...storage,AI_OUTFIT_ENABLED:'true'}),/OPENAI_API_KEY/);
 for(const AI_OUTFIT_DAILY_LIMIT of [0,-1,101,1.1,'abc'])assert.throws(()=>validateEnv({...base,AI_OUTFIT_DAILY_LIMIT}),/integer from 1 to 100/);
 const good=validateEnv({...base,...storage,AI_OUTFIT_ENABLED:' true ',OPENAI_API_KEY:' test ',AI_OUTFIT_DAILY_LIMIT:'7'});assert.equal(good.OPENAI_API_KEY,'test');assert.equal(good.AI_OUTFIT_DAILY_LIMIT,7);
});
test('production blocks placeholder secrets and insecure public image URL',()=>{
 const prod={...base,...storage,NODE_ENV:'production',CORS_ORIGINS:'https://shop.example.com'};
 assert.doesNotThrow(()=>validateEnv(prod));
 for(const JWT_ACCESS_SECRET of ['change-me-'.padEnd(40,'x'),'REPLACE_ME_'.padEnd(40,'x')])assert.throws(()=>validateEnv({...prod,JWT_ACCESS_SECRET}),/non-default secret/);
 for(const STORAGE_PUBLIC_BASE_URL of ['http://cdn.example.com','https://user:pass@cdn.example.com','https://cdn.example.com/?token=secret','https://cdn.example.com/#file'])assert.throws(()=>validateEnv({...prod,STORAGE_PUBLIC_BASE_URL}),/HTTPS base URL/);
 assert.throws(()=>validateEnv({...prod,AI_OUTFIT_ENABLED:'true',OPENAI_API_KEY:'test',AI_OUTFIT_MODEL:'unrelated-model'}),/GPT image model/);
});

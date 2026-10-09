const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {io}=require('socket.io-client');
const {JwtService}=require('@nestjs/jwt');
const enabled=process.env.XIII_LIVE_TESTS==='1';
const api=process.env.E2E_API_URL||'http://localhost:4000/api/v1';
const origin=api.replace(/\/api\/v1\/?$/,'');
let user,admin,userId;
const credentials={email:`qa-live-${Date.now()}@xiii.local`,password:'XiiiLive12345!',fullName:'QA Realtime'};
async function request(path,token,method='GET',body){
  const r=await fetch(api+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,json:await r.json()};
}
async function login(){const r=await request('/auth/login',null,'POST',{email:credentials.email,password:credentials.password});assert.equal(r.status,201,JSON.stringify(r.json));user=r.json.data;return user;}
async function status(value){const r=await request(`/admin/users/${userId}/status`,admin.accessToken,'PATCH',{status:value});assert.equal(r.status,200);}
function connection(token){return io(origin+'/realtime',{auth:{token},transports:['websocket'],autoConnect:false,reconnection:false});}
function event(socket,name,timeout=6000){return new Promise((resolve,reject)=>{const t=setTimeout(()=>{socket.off(name,done);reject(Error('Timeout waiting for '+name))},timeout);function done(value){clearTimeout(t);resolve(value)}socket.once(name,done)});}
async function ready(token){const s=connection(token);const p=event(s,'realtime:ready');s.connect();await p;return s;}
before(async()=>{
  if(!enabled)return;
  assert.ok(['localhost','127.0.0.1'].includes(new URL(api).hostname),'Live regressions only run against local disposable data');
  const signup=await request('/auth/register',null,'POST',credentials);assert.equal(signup.status,201);user=signup.json.data;userId=user.user.id;
  const a=await request('/auth/login',null,'POST',{email:'admin@xiii.local',password:'Xiii12345!'});assert.equal(a.status,201);admin=a.json.data;
});
after(async()=>{if(enabled&&admin&&userId)await status('ACTIVE')});
test('real socket closes at JWT expiration without requiring another client event',{skip:!enabled},async()=>{
  const token=new JwtService().sign({sub:userId,roles:['BUYER']},{secret:process.env.JWT_ACCESS_SECRET,expiresIn:'2s'});
  const s=await ready(token);try{assert.equal(await event(s,'disconnect',4000),'io server disconnect')}finally{s.close()}
});
test('admin blocking a connected account immediately closes the real socket',{skip:!enabled},async()=>{
  await login();const s=await ready(user.accessToken);try{const disconnected=event(s,'disconnect');await status('BLOCKED');assert.equal(await disconnected,'io server disconnect');const r=await request('/auth/refresh',null,'POST',{refreshToken:user.refreshToken});assert.equal(r.status,401)}finally{s.close();await status('ACTIVE')}
});
test('a blocked account cannot establish realtime even with an unexpired token',{skip:!enabled},async()=>{
  await login();await status('BLOCKED');const s=connection(user.accessToken);try{const disconnected=event(s,'disconnect');s.connect();assert.equal(await disconnected,'io server disconnect')}finally{s.close();await status('ACTIVE')}
});
test('server logout closes the real socket and revokes refresh',{skip:!enabled},async()=>{
  await login();const s=await ready(user.accessToken);try{const disconnected=event(s,'disconnect');const r=await request('/auth/logout',user.accessToken,'POST',{});assert.equal(r.status,201);assert.equal(await disconnected,'io server disconnect');assert.equal((await request('/auth/refresh',null,'POST',{refreshToken:user.refreshToken})).status,401)}finally{s.close()}
});
test('real presigned multipart upload stores the original PNG bytes',{skip:!enabled},async()=>{
  await login();const bytes=fs.readFileSync('e2e/fixtures/images/sample.png');
  const r=await request('/uploads/presign',user.accessToken,'POST',{purpose:'AVATAR',fileName:'qa-live.png',contentType:'image/png',sizeBytes:bytes.length});assert.equal(r.status,201);
  const data=r.json.data;const form=new FormData();for(const [k,v] of Object.entries(data.fields))form.append(k,v);form.append('file',new Blob([bytes],{type:'image/png'}),'qa-live.png');
  const upload=await fetch(data.uploadUrl,{method:'POST',body:form});assert.ok(upload.ok,await upload.text());
  const image=await fetch(data.publicUrl);assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),bytes);
});
test('buyer cannot obtain product or CMS upload permissions',{skip:!enabled},async()=>{
  for(const purpose of ['PRODUCT_IMAGE','CMS_BANNER'])assert.equal((await request('/uploads/presign',user.accessToken,'POST',{purpose,fileName:'qa-live.png',contentType:'image/png',sizeBytes:100})).status,403);
});

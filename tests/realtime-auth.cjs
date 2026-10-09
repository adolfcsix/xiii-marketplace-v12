const {test}=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const {JwtService}=require('@nestjs/jwt');
const {ChatGateway}=require('../services/api/dist/chat/chat.gateway');
const secret='realtime-regression-secret-at-least-32-characters';
process.env.JWT_ACCESS_SECRET=secret;
const id='507f1f77bcf86cd799439011';
function setup(claims={},options={}){
  const jwt=new JwtService();let user={status:'ACTIVE',roles:['BUYER']};let writes=0;
  const token=jwt.sign({sub:id,...claims},{secret,expiresIn:options.ttl||'15m'});
  const users={findById:()=>({select:()=>({lean:async()=>user})})};
  const chat={send:async()=>{writes++;return {ok:true}},authorizeSocket:async()=>{},markRead:async()=>({ok:true})};
  const gateway=new ChatGateway(jwt,chat,{},users);
  const socket={handshake:{auth:{token},headers:{}},data:{},join:async()=>{},emit:()=>{},disconnect(){this.disconnected=true;gateway.handleDisconnect(this)}};
  return {gateway,socket,setUser:v=>user=v,writes:()=>writes};
}
test('active connection sends and retains database roles instead of stale token roles',async()=>{
  const s=setup({roles:['SUPER_ADMIN']});await s.gateway.handleConnection(s.socket);
  assert.deepEqual(s.socket.data.user.roles,['BUYER']);
  assert.deepEqual(await s.gateway.send(s.socket,{conversationId:id,actorRole:'BUYER',text:'hello'}),{ok:true});
  s.gateway.handleDisconnect(s.socket);
});
test('blocked or missing accounts cannot establish a realtime connection',async()=>{
  for(const user of [{status:'BLOCKED',roles:['BUYER']},null]){
    const s=setup();s.setUser(user);await s.gateway.handleConnection(s.socket);assert.equal(s.socket.disconnected,true);assert.equal(s.socket.data.user,undefined);
  }
});
test('expired connection cannot write even before the disconnect timer fires',async()=>{
  const s=setup();await s.gateway.handleConnection(s.socket);
  const jwt=new JwtService();s.socket.data.accessToken=jwt.sign({sub:id},{secret,expiresIn:-1});
  await assert.rejects(s.gateway.send(s.socket,{conversationId:id,actorRole:'BUYER',text:'hello'}));
  assert.equal(s.socket.disconnected,true);assert.equal(s.writes(),0);
});
test('blocking an already connected account denies join, send and read',async()=>{
  for(const method of ['join','send','read']){
    const s=setup();await s.gateway.handleConnection(s.socket);s.setUser({status:'BLOCKED',roles:['BUYER']});
    await assert.rejects(s.gateway[method](s.socket,{conversationId:id,actorRole:'BUYER',text:'hello'}));
    assert.equal(s.socket.disconnected,true);assert.equal(s.writes(),0);
  }
});
test('removing seller role takes effect on the next event',async()=>{
  const s=setup({roles:['SELLER']});s.setUser({status:'ACTIVE',roles:['SELLER']});await s.gateway.handleConnection(s.socket);
  s.setUser({status:'ACTIVE',roles:['BUYER']});await assert.rejects(s.gateway.send(s.socket,{conversationId:id,actorRole:'SELLER',text:'hello'}));
  assert.equal(s.writes(),0);s.gateway.handleDisconnect(s.socket);
});
test('expiration timer disconnects an idle authenticated socket',async()=>{
  const s=setup({}, {ttl:'1s'});await s.gateway.handleConnection(s.socket);
  await new Promise(resolve=>setTimeout(resolve,1100));assert.equal(s.socket.disconnected,true);assert.equal(s.socket.data.user,undefined);
});

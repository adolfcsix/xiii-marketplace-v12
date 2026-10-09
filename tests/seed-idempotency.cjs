const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {MongoClient}=require('mongodb');
test('repeated seed preserves demo user IDs, clears legacy demo orders and retains unrelated data',{skip:process.env.XIII_SEED_TESTS!=='1'},async()=>{
  const uri=new URL(process.env.MONGODB_URI||'mongodb://localhost:27017/?replicaSet=rs0');
  assert.ok(['localhost','127.0.0.1'].includes(uri.hostname));
  const name='xiii_qa_seed_'+Date.now();uri.pathname='/'+name;
  const client=await MongoClient.connect(uri.toString());const db=client.db(name);
  const seed=()=>{const r=spawnSync(process.execPath,['--import','tsx','services/api/src/database/seed.ts'],{env:{...process.env,MONGODB_URI:uri.toString()},encoding:'utf8'});assert.equal(r.status,0,r.stderr)};
  try{
    seed();const before=await db.collection('users').find({seedTag:'phase1-demo'}).sort({email:1}).toArray();
    await db.collection('orders').createIndex({orderCode:1},{unique:true});
    const unrelated=await db.collection('users').insertOne({email:'unrelated@qa.local',fullName:'Keep this user'});
    // Simulate an orphaned demo order from the old seed's recreated buyer ID.
    await db.collection('orders').updateOne({orderCode:'XIII-DEMO-RETURN-001'},{$set:{buyerId:unrelated.insertedId}});
    seed();const after=await db.collection('users').find({seedTag:'phase1-demo'}).sort({email:1}).toArray();
    assert.deepEqual(after.map(x=>String(x._id)),before.map(x=>String(x._id)));
    assert.equal(await db.collection('orders').countDocuments({orderCode:'XIII-DEMO-RETURN-001'}),1);
    assert.equal(await db.collection('users').countDocuments({_id:unrelated.insertedId}),1);
    assert.equal(await db.collection('suborders').countDocuments({subOrderCode:'XIII-SUB-RETURN-001'}),1);
  }finally{await db.dropDatabase();await client.close()}
});

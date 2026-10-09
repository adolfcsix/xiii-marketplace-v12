const {test}=require('node:test');
const assert=require('node:assert/strict');
const {VariantsService}=require('../services/api/dist/variants/variants.service');
const {InventoryService}=require('../services/api/dist/inventory/inventory.service');
const user='a'.repeat(24);
function sessionFixture(state){
 let ended=0;
 const session={async withTransaction(action){const previous=structuredClone(state);try{await action();}catch(error){Object.assign(state,previous);throw error;}},async endSession(){ended++;}};
 return {session,connection:{startSession:async()=>session},ended:()=>ended};
}
function variantFixture(){
 const state={variants:[],inventories:[]};const tx=sessionFixture(state);let failInventory=false;
 const service=new VariantsService({exists:async()=>false,create:async(rows,options)=>{assert.equal(options.session,tx.session);state.variants.push(...rows);return [{...rows[0],_id:'variant'}];}}, {},{},
 {create:async(rows,options)=>{assert.equal(options.session,tx.session);if(failInventory)throw Error('STORAGE_FAILED');state.inventories.push(...rows);return rows;}},{},tx.connection);
 service.ownerProduct=async()=>({_id:'product',shopId:'shop',status:'DRAFT'});
 return {service,state,tx,fail:()=>{failInventory=true;}};
}
test('new SKU and inventory use the same transaction',async()=>{
 const f=variantFixture();const v=await f.service.create(user,'product',{sku:' tee-m ',price:10});
 assert.equal(v.sku,'TEE-M');assert.equal(f.state.variants.length,1);assert.equal(f.state.inventories[0].variantId,v._id);assert.equal(f.tx.ended(),1);
});
test('inventory creation failure rolls back the new SKU and ends the session',async()=>{
 const f=variantFixture();f.fail();await assert.rejects(f.service.create(user,'product',{sku:'TEE-M'}),/STORAGE_FAILED/);
 assert.deepEqual(f.state,{variants:[],inventories:[]});assert.equal(f.tx.ended(),1);
});
test('blank SKU is rejected before opening a write session',async()=>{
 const f=variantFixture();await assert.rejects(f.service.create(user,'product',{sku:'  '}),/SKU_REQUIRED/);assert.equal(f.tx.ended(),0);
});
test('duplicate-key race maps to SKU_EXISTS and closes the session',async()=>{
 const f=variantFixture();f.service.variants.create=async()=>{throw Object.assign(Error('duplicate'),{code:11000});};
 await assert.rejects(f.service.create(user,'product',{sku:'TEE-M'}),/SKU_EXISTS/);assert.equal(f.tx.ended(),1);
});
function inventoryFixture(){
 const state={inventory:{available:8,reserved:3,sold:2,lowStockThreshold:5},history:[]};const tx=sessionFixture(state);let failLog=false,conflict=false;
 const inv={findOne:()=>({session:s=>{assert.equal(s,tx.session);return Promise.resolve({...state.inventory});}}),
 findOneAndUpdate:async(filter,update,options)=>{assert.equal(options.session,tx.session);assert.equal(options.runValidators,true);assert.equal(filter.available,8);if(conflict)return null;Object.assign(state.inventory,update.$set);return {...state.inventory};}};
 const log={create:async(rows,options)=>{assert.equal(options.session,tx.session);if(failLog)throw Error('AUDIT_FAILED');state.history.push(...rows);return rows;}};
 const service=new InventoryService(inv,log,{},{},{},{},tx.connection);service.owner=async()=>({shopId:'shop'});
 return {service,state,tx,fail:()=>{failLog=true;},conflict:()=>{conflict=true;}};
}
test('stock adjustment logs its actual before/after and leaves reserved/sold untouched',async()=>{
 const f=inventoryFixture();await f.service.adjust(user,'variant',{available:10,expectedAvailable:8,lowStockThreshold:0});
 assert.deepEqual(f.state.inventory,{available:10,reserved:3,sold:2,lowStockThreshold:0});
 assert.equal(f.state.history[0].beforeQuantity,8);assert.equal(f.state.history[0].afterQuantity,10);assert.equal(f.state.history[0].quantity,2);assert.equal(f.tx.ended(),1);
});
test('audit failure rolls back the stock adjustment',async()=>{
 const f=inventoryFixture();f.fail();await assert.rejects(f.service.adjust(user,'variant',{available:10}),/AUDIT_FAILED/);
 assert.equal(f.state.inventory.available,8);assert.equal(f.state.history.length,0);assert.equal(f.tx.ended(),1);
});
test('stale expected stock cannot overwrite a newer balance',async()=>{
 const f=inventoryFixture();await assert.rejects(f.service.adjust(user,'variant',{available:10,expectedAvailable:9}),/INVENTORY_CONCURRENT_UPDATE/);
 assert.equal(f.state.inventory.available,8);assert.equal(f.state.history.length,0);assert.equal(f.tx.ended(),1);
});
test('compare-and-set conflict cannot record a phantom inventory adjustment',async()=>{
 const f=inventoryFixture();f.conflict();await assert.rejects(f.service.adjust(user,'variant',{available:10}),/INVENTORY_CONCURRENT_UPDATE/);
 assert.equal(f.state.history.length,0);assert.equal(f.tx.ended(),1);
});
test('clearing compare price removes the old value without changing the sale price',async()=>{
 const f=variantFixture();const variant={productId:'product',sku:'TEE-M',price:100,compareAtPrice:150,save:async function(){return this;}};
 f.service.variants.findById=async()=>variant;
 await f.service.update(user,'variant',{compareAtPrice:null});assert.equal(variant.compareAtPrice,undefined);assert.equal(variant.price,100);
});
test('duplicate SKU during an update maps to a recoverable conflict',async()=>{
 const f=variantFixture();f.service.variants.findById=async()=>({productId:'product',sku:'TEE-M',save:async()=>{throw Object.assign(Error('duplicate'),{code:11000});}});
 await assert.rejects(f.service.update(user,'variant',{sku:'TEE-L'}),/SKU_EXISTS/);
});
test('null or blank SKU updates return a validation error instead of crashing or erasing the code',async()=>{
 const f=variantFixture();const variant={productId:'product',sku:'TEE-M',save:async function(){return this;}};
 f.service.variants.findById=async()=>variant;
 for(const sku of [null,'','   '])await assert.rejects(f.service.update(user,'variant',{sku}),/SKU_REQUIRED/);
 assert.equal(variant.sku,'TEE-M');
});

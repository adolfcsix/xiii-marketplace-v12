import {test} from 'node:test';
import assert from 'node:assert/strict';
import {variantPayload,persistSellerVariant} from '../shared/seller-variant';
const row={sku:' tee-m ',color:' Black ',size:' M ',price:'150000',compareAtPrice:'',weight:'200',image:'',available:'3',lowStockThreshold:'0'};
test('seller preserves zero stock threshold and normalizes SKU and attributes',()=>{
 const payload=variantPayload(row);assert.equal(payload.lowStockThreshold,0);assert.equal(payload.sku,'TEE-M');assert.deepEqual(payload.attributes,{color:'Black',size:'M'});assert.equal(payload.compareAtPrice,undefined);
});
test('seller rejects blank prices and invalid optional numbers before issuing requests',()=>{
 for(const values of [{price:''},{price:' '},{price:'-1'},{price:'Infinity'},{compareAtPrice:'NaN'},{compareAtPrice:'-1'},{weight:'-1'},{weight:'Infinity'},{lowStockThreshold:'-1'},{lowStockThreshold:'1.5'},{available:'-1'},{available:'2.5'},{sku:' '}])assert.throws(()=>variantPayload({...row,...values}),JSON.stringify(values));
});
test('free SKU and zero stock remain valid',()=>{
 const payload=variantPayload({...row,price:'0',available:'0',weight:'0'});assert.equal(payload.price,0);assert.equal(payload.initialAvailable,0);assert.equal(payload.weight,0);
});
test('retry after stock failure updates the committed SKU instead of creating a duplicate',async()=>{
 const calls:{path:string;body:Record<string,unknown>}[]=[];
 let failStock=true;
 const request=async(path:string,init:{method:string;body:string})=>{
   calls.push({path,body:JSON.parse(init.body)});
   if(path.includes('/inventory/')&&failStock)throw Error('NETWORK_FAILED');
   return {_id:'sku-created'};
 };
 let saved:{id?:string;originalAvailable:number;status:string}={originalAvailable:0,status:'ACTIVE'};
 const onCreated=(id:string)=>{saved={...saved,id};};
 await assert.rejects(persistSellerVariant(request,'product',saved,variantPayload(row),onCreated),/NETWORK_FAILED/);
 assert.equal(saved.id,'sku-created');failStock=false;
 await persistSellerVariant(request,'product',saved,variantPayload(row),onCreated);
 assert.equal(calls.filter(c=>c.path==='/seller/products/product/variants').length,1);
 assert.equal(calls[2].path,'/seller/variants/sku-created');assert.equal(calls[2].body.compareAtPrice,null);
 assert.equal(calls[3].body.expectedAvailable,0);
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ProductsService}=require('../services/api/dist/products/products.service');
const {VariantsService}=require('../services/api/dist/variants/variants.service');
function productService(shop){
 const product={_id:'product',shopId:'shop',categoryId:'category',status:'ACTIVE',slug:'tee'};
 const products={findOneAndUpdate:()=>({lean:async()=>product})};
 const shops={findById:()=>({lean:async()=>shop})};
 const categories={findById:()=>({lean:async()=>null})};
 return new ProductsService(products,shops,{},categories,{}, {},{},{},{create:async()=>({})},{},{});
}
test('public detail never exposes a product from an inactive or missing shop',async()=>{
 for(const shop of [null,{status:'SUSPENDED'},{status:'PENDING'},{status:'REJECTED'}])await assert.rejects(productService(shop).one('tee'),/PRODUCT_NOT_FOUND/);
 assert.equal((await productService({_id:'shop',status:'ACTIVE',name:'Shop'}).one('tee')).slug,'tee');
});
test('public variant endpoint blocks drafts, hidden products and inactive shops before reading SKUs',async()=>{
 for(const productStatus of ['ACTIVE','DRAFT','HIDDEN','PENDING_REVIEW','REJECTED','MISSING'])for(const shopStatus of ['ACTIVE','SUSPENDED','MISSING']){
  let reads=0;
  const variants={aggregate:async()=>{reads++;return [{_id:'sku',available:2}];}};
  const products={findOne:q=>({lean:async()=>productStatus===q.status?{shopId:'shop',status:productStatus}:null})};
  const shops={exists:async q=>shopStatus===q.status};
  const service=new VariantsService(variants,products,shops,{},{});
  const result=await service.list('product');
  const visible=productStatus==='ACTIVE'&&shopStatus==='ACTIVE';
  assert.equal(reads,visible?1:0,productStatus+'/'+shopStatus);
  assert.equal(result.length,visible?1:0);
 }
});
function editableProduct(status='DRAFT'){
 const product={_id:'a'.repeat(24),shopId:'b'.repeat(24),categoryId:'c'.repeat(24),brandId:'d'.repeat(24),name:'Original tee',slug:'original-tee',status,save:async function(){return this;}};
 let brandLookups=0,reviews=0;
 const products={findById:async()=>product};const shops={findById:async()=>({_id:product.shopId,status:'ACTIVE'})};
 const service=new ProductsService(products,shops,{countDocuments:async()=>1},{findOne:async()=>({_id:product.categoryId})},{findOne:async()=>{brandLookups++;return null;}},{},{},{create:async()=>{reviews++;}},{},{},{resolve:async()=>({shopId:product.shopId})});
 return {product,service,brandLookups:()=>brandLookups,reviews:()=>reviews};
}
test('editing a product name keeps URLs and saved outfit references stable',async()=>{
 const h=editableProduct();await h.service.update('e'.repeat(24),h.product._id,{name:'Renamed tee'});
 assert.equal(h.product.name,'Renamed tee');assert.equal(h.product.slug,'original-tee');
});
test('removing a brand during a category edit does not validate the removed brand',async()=>{
 const h=editableProduct();await h.service.update('e'.repeat(24),h.product._id,{categoryId:'f'.repeat(24),brandId:null});
 assert.equal(h.product.brandId,undefined);assert.equal(h.brandLookups(),0);
});
test('editing a live product still requeues moderation while keeping its URL',async()=>{
 const h=editableProduct('ACTIVE');await h.service.update('e'.repeat(24),h.product._id,{name:'Renamed tee'});
 assert.equal(h.product.status,'PENDING_REVIEW');assert.equal(h.product.slug,'original-tee');assert.equal(h.reviews(),1);
});

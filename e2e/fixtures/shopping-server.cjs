const http=require('node:http');
const chart=[{size:'M',heightMin:160,heightMax:175,weightMin:50,weightMax:70},{size:'L',heightMin:165,heightMax:185,weightMin:60,weightMax:85}];
const products=['tee-black','hoodie-gray','cargo-black','sneaker','cap','bag','chain','sweatshirt','jacket-navy'].map((name,index)=>({_id:'qa-product-'+index,name:'XIII '+name,slug:name,images:['/street/'+(name==='jacket-navy'?'hoodie-gray':name)+'.webp'],primaryVariant:{price:250000+index*10000,compareAtPrice:350000+index*10000},attributes:{material:'Cotton',fit:'Oversized',...(index<3?{sizeChart:chart}:{})},brand:{name:'XIII'},soldCount:10,ratingAverage:4.9,ratingCount:5}));
products[0].images.push('/street/hoodie-gray.webp','/street/cargo-black.webp');
const blackVariants=p=>['M','L'].map((size,i)=>({_id:p._id+'-'+size,sku:p.slug+'-'+size,attributes:{size,color:'Black'},price:p.primaryVariant.price,available:10,image:p.images[0],weight:200,status:'ACTIVE',inventory:{available:10,reserved:0,sold:0,lowStockThreshold:5}}));
const variants=p=>[...blackVariants(p),...(p._id==='qa-product-5'?[{...blackVariants(p)[0],_id:p._id+'-White-M',sku:p.slug+'-White-M',attributes:{size:'M',color:'White'},image:'/products/fallback.svg'}]:[])];
http.createServer(async(req,res)=>{
res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');res.setHeader('Content-Type','application/json');
if(req.method==='OPTIONS'){res.end();return;}
const url=new URL(req.url,'http://localhost');let data=[];
if(url.pathname.endsWith('/products'))data=products;
if(/\/products\/[^/]+$/.test(url.pathname))data=products.find(p=>p.slug===url.pathname.split('/').pop())||products[0];
if(url.pathname.endsWith('/variants')){const id=url.pathname.split('/').at(-2);data=variants(products.find(p=>p._id===id)||products[0]);}
if(url.pathname.includes('/reviews/product/'))data={items:[],summary:{average:0,count:0,distribution:{}}};
if(url.pathname.endsWith('/categories'))data=[{_id:'cat-tee',name:'Áo thun',slug:'ao-thun',level:2}];
if(url.pathname.endsWith('/cms/home'))data={sections:[],banners:{hero:[],promo:[],editorial:[]}};
if(url.pathname.endsWith('/seller/shop'))data={name:'XIII QA',slug:'xiii'};
if(url.pathname.includes('/unread-count'))data={unreadCount:0};
if(url.pathname.endsWith('/auth/me'))data={displayName:'QA Buyer',role:'BUYER'};
if(url.pathname.endsWith('/cart'))data={groups:[],summary:{itemCount:0,total:0}};
if(url.pathname.includes('/seller/products/')&&!url.pathname.endsWith('/variants')){
 data={...products[0],categoryId:'cat-tee',shortDescription:'QA shirt',description:'QA fixture',status:'DRAFT',variants:variants(products[0])};
 if(req.method==='PATCH'){let body='';for await(const chunk of req)body+=chunk;data={...data,...JSON.parse(body||'{}')};}
}
res.end(JSON.stringify({success:true,data,meta:{total:Array.isArray(data)?data.length:0}}));
}).listen(4000,'127.0.0.1');

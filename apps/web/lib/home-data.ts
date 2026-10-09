import { api, apiPage } from './api';
import type { ProductCardData } from '../components/product-card';
export type HomeCategory={_id:string;name:string;slug:string;level:number;image?:string};
export type HomeBanner={_id:string;key:string;title:string;subtitle?:string;eyebrow?:string;image:string;mobileImage?:string;href:string;ctaLabel:string;sortOrder:number};
export type HomeSection={_id:string;key:string;title:string;subtitle?:string;type:string;sortOrder:number;config?:Record<string,unknown>};
export type HomeCms={banners?:{hero?:HomeBanner[];promo?:HomeBanner[];editorial?:HomeBanner[]};sections?:HomeSection[]};
export type CatalogProduct={_id:string;name:string;slug:string;images?:string[];primaryVariant?:{price:number;compareAtPrice?:number;image?:string};brand?:{name?:string};category?:{name?:string;slug?:string};ratingAverage?:number;ratingCount?:number;soldCount?:number};
export const toHomeCard=(p:CatalogProduct):ProductCardData=>({_id:p._id,name:p.name,slug:p.slug,image:p.images?.[0]||p.primaryVariant?.image,price:p.primaryVariant?.price,compareAtPrice:p.primaryVariant?.compareAtPrice,ratingAverage:p.ratingAverage,ratingCount:p.ratingCount,soldCount:p.soldCount,brand:p.brand?.name,...(p.category?{category:p.category.name||p.category.slug}:{})});
export function homeProductSections(cms:HomeCms|null):HomeSection[]{
 const sections=Array.isArray(cms?.sections)?cms.sections.filter(section=>section.type==='PRODUCT_GRID'):[];
 // An empty successful CMS response must never remove the storefront's catalog.
 return sections.length?sections.sort((a,b)=>a.sortOrder-b.sortOrder):[{_id:'default-catalog',key:'catalog',title:'Chọn gu của bạn.',subtitle:'Những món đồ dành cho ngày bạn muốn là chính mình.',type:'PRODUCT_GRID',sortOrder:0,config:{productLimit:8}}];
}
export async function loadHome(){
 const [catalog,categories,cms]=await Promise.allSettled([apiPage<CatalogProduct[]>('/products?limit=16'),api<HomeCategory[]>('/categories'),api<HomeCms>('/cms/home')]);
 const content=cms.status==='fulfilled'?cms.value:null;
 const products=catalog.status==='fulfilled'&&Array.isArray(catalog.value.data)?catalog.value.data.map(toHomeCard):[];
 const catalogError=catalog.status==='rejected'||(catalog.status==='fulfilled'&&!Array.isArray(catalog.value.data));
 const sections=homeProductSections(content);
 const queries=[...new Set(sections.map(section=>String(section.config?.query||'').trim()).filter(Boolean))];
 const collections:Record<string,{products:ProductCardData[];error:boolean}>={};
 await Promise.all(queries.map(async query=>{try{const page=await apiPage<CatalogProduct[]>('/products?limit=16&q='+encodeURIComponent(query));if(!Array.isArray(page.data))throw new Error('Invalid catalog response');collections[query]={products:page.data.map(toHomeCard),error:false};}catch{collections[query]={products:[],error:true};}}));
 return {products,catalogError,categories:categories.status==='fulfilled'&&Array.isArray(categories.value)?categories.value.filter(category=>category.level>=2):[],cms:content,sections,collections};
}
export type HomeData=Awaited<ReturnType<typeof loadHome>>;

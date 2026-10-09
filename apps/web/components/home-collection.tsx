'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { apiPage } from '../lib/api';
import { CatalogProduct, toHomeCard } from '../lib/home-data';
import { ProductCard, ProductCardData } from './product-card';
import { ArrowRight } from './icons';
type Filter='featured'|'all'|'newest'|'sale';
export function HomeCollection({initialProducts,allProducts,initialError,allError,title,subtitle,query='',limit=8,first=false}:{initialProducts:ProductCardData[];allProducts:ProductCardData[];initialError:boolean;allError:boolean;title:string;subtitle?:string;query?:string;limit?:number;first?:boolean}){
 const [products,setProducts]=useState(initialProducts);const [error,setError]=useState(initialError);const [loading,setLoading]=useState(false);const [filter,setFilter]=useState<Filter>('featured');const controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function select(next:Filter,force=false){
  controller.current?.abort();const request=new AbortController();controller.current=request;setFilter(next);setError(false);
  if(!force&&next==='all'&&!allError){setProducts(allProducts);setLoading(false);return;}
  if(!force&&next==='featured'&&!initialError){setProducts(initialProducts);setLoading(false);return;}
  setLoading(true);
  try{const q=next==='sale'?'sale':next==='featured'?query:'';const result=await apiPage<CatalogProduct[]>('/products?limit=16'+(next==='newest'?'&sort=newest':'')+(q?'&q='+encodeURIComponent(q):''),{signal:request.signal});if(!Array.isArray(result.data))throw new Error('Invalid response');if(!request.signal.aborted)setProducts(result.data.map(toHomeCard));}
  catch{if(!request.signal.aborted)setError(true);}finally{if(!request.signal.aborted)setLoading(false);}
 }
 const safeLimit=Number.isFinite(limit)?Math.max(1,Math.min(16,Math.floor(limit))):8;
 const displayTitle=filter==='all'?'Tất cả sản phẩm.':filter==='newest'?'Mới lên kệ.':filter==='sale'?'Đang giảm giá.':title;
 const search=filter==='newest'?'/search?sort=newest':filter==='sale'?'/search?q=sale':filter==='featured'&&query?'/search?q='+encodeURIComponent(query):'/search';
 return <section className="street-collection" id={first?'collections':undefined} aria-busy={loading}>
  <div className="street-section-heading" data-reveal><div><span className="street-eyebrow">{first?'01 / THE SELECTION':'CURATED / XIII'}</span><h2>{displayTitle}</h2><p>{subtitle||'Tìm món đồ hợp gu. Phối theo cách của bạn.'}</p></div><Link href={search} className="street-text-link">Xem tất cả <ArrowRight size={18}/></Link></div>
  {first&&<div className="collection-filters" role="group" aria-label="Lọc sản phẩm trang chủ">{([['featured',query?'Tuyển chọn':'Nổi bật'],['all','Tất cả'],['newest','Mới nhất'],['sale','Đang giảm giá']] as [Filter,string][]).map(([value,label])=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>select(value)}>{label}</button>)}<span className="collection-count">{loading?'Đang tải…':error?'Chưa kết nối':products.length+' sản phẩm'}</span></div>}
  {loading?<CollectionSkeleton compact/>:error?<div className="street-empty" role="alert"><span>↻</span><h3>Chưa tải được sản phẩm.</h3><p>Kết nối đang gián đoạn. Bạn có thể thử lại ngay tại đây.</p><button type="button" className="street-button" onClick={()=>select(filter,true)}>Thử lại <ArrowRight size={17}/></button></div>:products.length?<div className="product-grid street-product-grid">{products.slice(0,safeLimit).map((product,index)=><div key={product._id} data-reveal data-delay={(index%4)*55}><ProductCard product={product}/></div>)}</div>:<div className="street-empty"><span>✳</span><h3>{query||filter==='sale'?'Chưa có sản phẩm trong lựa chọn này.':'Bộ sưu tập đang được chuẩn bị.'}</h3><p>{query||filter==='sale'?'Thử xem toàn bộ sản phẩm để tìm món đồ hợp gu.':'Sản phẩm đã được đăng bán và duyệt sẽ xuất hiện tại đây.'}</p>{query||filter==='sale'?<button type="button" className="street-button" onClick={()=>select('all')}>Xem tất cả sản phẩm <ArrowRight size={17}/></button>:<Link href="/search" className="street-button">Khám phá cửa hàng <ArrowRight size={17}/></Link>}</div>}
 </section>;
}
export function CollectionSkeleton({compact=false}:{compact?:boolean}){return <div id={compact?undefined:'collections'} className={compact?'collection-loading':'street-collection collection-loading'} role="status" aria-label="Đang tải sản phẩm">{!compact&&<div className="skeleton" style={{width:300,maxWidth:'100%',height:50,marginBottom:28}}/>}<div className="product-grid street-product-grid">{[0,1,2,3].map(i=><div className="skeleton skeleton-product" key={i}/>)}</div><span className="sr-only">Đang tải sản phẩm…</span></div>;}

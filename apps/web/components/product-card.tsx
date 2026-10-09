'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { BagIcon, HeartIcon, StarIcon } from './icons';
import { toggleWishlist, useWishlist } from '../lib/wishlist';
const Preview=dynamic(()=>import('./product-preview').then(m=>m.ProductPreview),{ssr:false});
export type ProductCardData={_id:string;name:string;slug:string;image?:string;price?:number;compareAtPrice?:number;ratingAverage?:number;ratingCount?:number;soldCount?:number;brand?:string;category?:string};
const money=(n?:number)=>n===undefined?'Liên hệ':new Intl.NumberFormat('vi-VN').format(n)+'đ';
export function ProductCard({product}:{product:ProductCardData}){
  const {items}=useWishlist();const saved=items.some(p=>p._id===product._id);
  const [error,setError]=useState('');const [preview,setPreview]=useState(false);const previewButton=useRef<HTMLButtonElement>(null);
  const discount=product.price!==undefined&&product.compareAtPrice&&product.compareAtPrice>product.price?Math.round((1-product.price/product.compareAtPrice)*100):0;
  const href='/product/'+encodeURIComponent(product.slug);
  return <article className="product-card" data-depth="product">
    <div className="product-visual">
      <Link className="product-image-wrap" href={href} prefetch={false}>
        {discount>0&&<span className="discount-badge">-{discount}%</span>}
        <img src={product.image||'/products/fallback.svg'} alt={product.name} loading="lazy" decoding="async" width={360} height={382} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/products/fallback.svg';}}/>
      </Link>
      <button type="button" className={'wishlist-button '+(saved?'saved':'')} aria-pressed={saved} aria-label={(saved?'Bỏ yêu thích ':'Yêu thích ')+product.name} onClick={()=>{setError(toggleWishlist(product)?'':'Không lưu được. Hãy cho phép lưu dữ liệu trình duyệt.');}}><HeartIcon size={18}/></button>
    </div>
    <div className="product-card-tools"><button ref={previewButton} type="button" onClick={()=>setPreview(true)} aria-label={'Xem nhanh '+product.name}>Xem nhanh ↗</button><Link href={'/outfit?product='+encodeURIComponent(product.slug)} prefetch={false} aria-label={'Phối đồ với '+product.name}>Phối đồ +</Link></div>
    <div className="product-copy">
      <p className="product-brand">{product.brand||'XIII'}</p>
      <Link className="product-name" href={href} prefetch={false}>{product.name}</Link>
      <div className="price-row"><strong>{money(product.price)}</strong>{product.compareAtPrice!==undefined&&product.price!==undefined&&product.compareAtPrice>product.price?<del>{money(product.compareAtPrice)}</del>:null}</div>
      <div className="product-meta"><span><StarIcon size={13}/>{product.ratingCount?(product.ratingAverage??0).toFixed(1):'Mới'} <i>({product.ratingCount??0})</i></span><Link className="product-bag" href={href} prefetch={false} aria-label={'Chọn phân loại '+product.name} title="Chọn màu và kích thước"><BagIcon size={16}/></Link></div>
      {error&&<small role="alert">{error}</small>}
    </div>
    {preview&&<Preview slug={product.slug} onClose={()=>{setPreview(false);previewButton.current?.focus();}}/>}
  </article>;
}

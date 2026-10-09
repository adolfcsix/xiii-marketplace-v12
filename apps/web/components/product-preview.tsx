'use client';
import Link from 'next/link';
import {celebrateCart} from '../lib/cart-motion';
import { useEffect, useRef, useState } from 'react';
import { loadPreview, type OutfitSelection } from '../lib/product-preview';
import { clientApi, emitCartUpdated, hasSession } from '../lib/client-api';
import type { DetailProduct, DetailVariant } from './product-detail-client';
import { SizeAdvisor } from './size-advisor';

export function ProductPreview({slug,onClose,onChoose,initialVariantId}:{slug:string;initialVariantId?:string;onClose:()=>void;onChoose?:(selection:OutfitSelection)=>void}) {
 const dialog=useRef<HTMLDialogElement>(null); const busyRef=useRef(false);const addFocus=useRef<HTMLButtonElement>(null);const restoreAddFocus=useRef(false);
 const [data,setData]=useState<{product:DetailProduct;variants:DetailVariant[]} | null>(null);
 const [variantId,setVariantId]=useState(''); const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const [retry,setRetry]=useState(0);
 useEffect(()=>{dialog.current?.showModal();const controller=new AbortController();setData(null);setError('');setNotice('');
  loadPreview(slug,controller.signal).then(result=>{if(controller.signal.aborted)return;setData(result);setVariantId((result.variants.find(v=>v._id===initialVariantId)||result.variants.find(v=>(v.available??0)>0)||result.variants[0])?._id||'');}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Chưa tải được sản phẩm.');});
  return()=>controller.abort();
 },[slug,retry,initialVariantId]);
 useEffect(()=>{if(!busy&&restoreAddFocus.current){restoreAddFocus.current=false;if(dialog.current?.open&&document.activeElement===document.body)addFocus.current?.focus({preventScroll:true});}},[busy]);
 const selected=data?.variants.find(v=>v._id===variantId);
 const close=()=>{dialog.current?.close();onClose();};
 async function add(){
  if(busyRef.current||!selected||(selected.available??0)<=0)return;
  if(!hasSession()){window.location.href='/login?next='+encodeURIComponent(window.location.pathname+window.location.search);return;}
  restoreAddFocus.current=document.activeElement===addFocus.current;busyRef.current=true;setBusy(true);setNotice('');
  try{await clientApi('/cart/items',{method:'POST',body:JSON.stringify({variantId:selected._id,quantity:1})});emitCartUpdated();celebrateCart(dialog.current?.querySelector('img')||null);setNotice('Đã thêm vào giỏ.');}
  catch(e){setNotice(e instanceof Error?e.message:'Không thể thêm vào giỏ.');}finally{busyRef.current=false;setBusy(false);}
 }
 return <dialog ref={dialog} className="product-preview" aria-label="Xem nhanh sản phẩm" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
  <header><span>XIII / QUICK VIEW</span><button type="button" autoFocus onClick={close} aria-label="Đóng xem nhanh">Đóng ×</button></header>
  {error?<div className="preview-loading" role="alert"><p>{error}</p><button type="button" onClick={()=>setRetry(v=>v+1)}>Thử lại</button></div>:!data?<div className="preview-loading" role="status">Đang tải sản phẩm…</div>:<div className="preview-grid">
   <img src={selected?.image||data.product.images?.[0]||'/products/fallback.svg'} alt={data.product.name} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/products/fallback.svg';}}/>
   <div><span className="street-eyebrow">{data.product.brand?.name||'XIII'}</span><h2>{data.product.name}</h2><strong className="preview-price">{selected?new Intl.NumberFormat('vi-VN').format(selected.price)+'₫':'Chưa có giá'}</strong>
    <p>{data.product.shortDescription||data.product.description}</p>
    <label className="preview-choice">Màu / kích cỡ<select value={variantId} disabled={busy} onChange={e=>{setVariantId(e.target.value);setNotice('');}}>{data.variants.map(v=><option key={v._id} value={v._id} disabled={(v.available??0)<=0}>{Object.values(v.attributes||{}).join(' / ')||v.sku} {(v.available??0)<=0?'— Hết hàng':''}</option>)}</select></label>
    <p>{selected&&(selected.available??0)>0?'Còn '+selected.available+' sản phẩm':'Tạm hết hàng'}</p>
    <SizeAdvisor disabled={busy} chart={data.product.attributes?.sizeChart} sizes={data.variants.filter(v=>(v.available??0)>0&&v.attributes?.color===selected?.attributes?.color).map(v=>v.attributes?.size||'Free')} onSelect={size=>{const v=data.variants.find(v=>v.attributes?.size===size&&v.attributes?.color===selected?.attributes?.color&&(v.available??0)>0);if(v&&!busyRef.current)setVariantId(v._id);}}/>
    <button ref={addFocus} type="button" className="street-button" disabled={busy||!selected||(selected.available??0)<=0} onClick={()=>{if(onChoose&&selected){dialog.current?.close();onChoose({product:data.product,variant:selected});}else void add();}}>{onChoose?'Chọn cho outfit':busy?'Đang thêm…':'Thêm vào giỏ'}</button>
    {notice&&<p role="status">{notice} <Link href="/cart">Xem giỏ hàng ↗</Link></p>}
    <div className="preview-links"><Link href={'/product/'+encodeURIComponent(data.product.slug)}>Xem chi tiết ↗</Link>{!onChoose&&<Link href={'/outfit?product='+encodeURIComponent(data.product.slug)}>Phối với món này ↗</Link>}</div>
   </div>
  </div>}
 </dialog>;
}

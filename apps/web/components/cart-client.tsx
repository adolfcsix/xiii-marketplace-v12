'use client';
import {StateSculpture} from './state-sculpture';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BagIcon, ChevronRight, TruckIcon } from './icons';
import { ClientApiError, clientApi, emitCartUpdated, hasSession } from '../lib/client-api';

type CartItem = {
  variantId:string; quantity:number; purchasable:boolean; available:number; lineTotal:number;
  variant:null|{_id:string;sku:string;attributes:Record<string,string>;price:number;compareAtPrice?:number;image?:string};
  product:null|{_id:string;name:string;slug:string;images?:string[];shortDescription?:string};
};
type CartShop = {shop:null|{_id:string;name:string;slug:string;logo?:string;verified?:boolean};subtotal:number;items:CartItem[]};
type CartData = {id?:string;shops:CartShop[];summary:{itemCount:number;subtotal:number;canCheckout:boolean}};

const money=(n:number)=>new Intl.NumberFormat('vi-VN').format(n)+'₫';

export function CartClient(){
  const [cart,setCart]=useState<CartData|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState('');
  const mutation=useRef(false);
  const clearDialog=useRef<HTMLDialogElement>(null);

  const load=useCallback(async()=>{
    if(!hasSession()){setLoading(false);setCart(null);return;}
    try{setCart(await clientApi<CartData>('/cart'));}
    catch(err){ if(err instanceof ClientApiError && err.status===401) setCart(null); else setMessage(err instanceof Error?err.message:'Không tải được giỏ hàng'); }
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{load();},[load]);

  async function update(variantId:string,quantity:number){
    if(mutation.current)return;mutation.current=true;
    setBusy(variantId);setMessage('');
    try{const next=await clientApi<CartData>('/cart/items/'+variantId,{method:'PATCH',body:JSON.stringify({quantity})});setCart(next);emitCartUpdated(next.summary.itemCount);}
    catch(err){setMessage(err instanceof Error?err.message:'Không thể cập nhật số lượng');}
    finally{mutation.current=false;setBusy('');}
  }
  async function remove(variantId:string){
    if(mutation.current)return;mutation.current=true;
    setBusy(variantId);setMessage('');
    try{const next=await clientApi<CartData>('/cart/items/'+variantId,{method:'DELETE'});setCart(next);emitCartUpdated(next.summary.itemCount);}
    catch(err){setMessage(err instanceof Error?err.message:'Không thể xóa sản phẩm');}
    finally{mutation.current=false;setBusy('');}
  }
  async function clear(){
    if(mutation.current)return;
    mutation.current=true;setBusy('all');setMessage('');
    try{await clientApi('/cart',{method:'DELETE'});clearDialog.current?.close();setCart(current=>({id:current?.id,shops:[],summary:{itemCount:0,subtotal:0,canCheckout:false}}));emitCartUpdated(0);}
    catch(err){setMessage(err instanceof Error?err.message:'Không thể xóa giỏ hàng');}
    finally{mutation.current=false;setBusy('');}
  }

  const shops=cart?.shops||[];
  const unavailable=useMemo(()=>shops.reduce((n,s)=>n+s.items.filter(i=>!i.purchasable).length,0),[shops]);

  if(loading) return <section className="cart-state"><StateSculpture kind="loading"/><b role="status">Đang tải giỏ hàng…</b></section>;
  if(!hasSession()) return <section className="cart-state"><StateSculpture/><h1>Đăng nhập để xem giỏ hàng</h1><p>Giỏ hàng được lưu theo tài khoản để đồng bộ giữa các thiết bị.</p><a className="cart-primary-link" href={'/login?next='+encodeURIComponent('/cart')}>Đăng nhập</a></section>;
  if(!cart && message)return <section className="cart-state" role="alert"><h1>Chưa tải được giỏ hàng</h1><p>{message}</p><button className="cart-checkout" onClick={()=>{setMessage('');setLoading(true);load();}}>Thử lại</button></section>;
  if(!cart || cart.summary.itemCount===0) return <section className="cart-state"><StateSculpture/><h1>Giỏ hàng đang trống</h1><p>Khám phá các local brand và thêm món bạn thích vào đây.</p><a className="cart-primary-link" href="/search">Tiếp tục mua sắm</a></section>;

  return <div className="cart-layout">
    <section className="cart-list-column">
      <div className="cart-title-row"><div><h1>Giỏ hàng</h1><p>{cart.summary.itemCount} sản phẩm từ {shops.length} shop</p></div><button onClick={()=>{setMessage('');clearDialog.current?.showModal();}} disabled={Boolean(busy)}>Xóa tất cả</button></div>
      {message&&<div className="cart-alert" role="alert">{message}</div>}
      {unavailable>0&&<div className="cart-warning">Có {unavailable} sản phẩm không còn đủ tồn kho. Hãy điều chỉnh trước khi thanh toán.</div>}
      {shops.map((group,index)=><article className="cart-shop" key={group.shop?._id||'unavailable-'+index}>
        <header className="cart-shop-head"><div className="cart-shop-brand"><span>{(group.shop?.name||'SHOP').slice(0,2).toUpperCase()}</span><div><b>{group.shop?.name||'Sản phẩm không khả dụng'} {group.shop?.verified?'✓':''}</b><small>Đơn từ shop này được xử lý riêng</small></div></div>{group.shop?._id&&<a href={'/search?shop='+encodeURIComponent(group.shop._id)}>Xem shop <ChevronRight size={14}/></a>}</header>
        <div className="cart-shop-items">
          {group.items.map(item=>{
            const product=item.product;const variant=item.variant;const attrs=variant?.attributes||{};
            const image=variant?.image||product?.images?.[0]||'/products/fallback.svg';
            return <div aria-busy={busy===item.variantId} className={'cart-line '+(!item.purchasable?'unavailable':'')} key={item.variantId}>
              <a className="cart-line-image" href={product?'/product/'+product.slug:'#'}><img src={image} alt={product?.name||'Sản phẩm'}/></a>
              <div className="cart-line-copy"><a className="cart-line-name" href={product?'/product/'+product.slug:'#'}>{product?.name||'Sản phẩm không còn khả dụng'}</a><p>{[attrs.color,attrs.size].filter(Boolean).join(' · ')||'SKU '+(variant?.sku||'—')}</p><small>SKU: {variant?.sku||'—'}</small>{!item.purchasable&&<em>Không đủ tồn kho / sản phẩm đã ngừng bán</em>}</div>
              <div className="cart-line-price"><strong>{money(variant?.price||0)}</strong>{variant?.compareAtPrice&&variant.compareAtPrice>variant.price?<del>{money(variant.compareAtPrice)}</del>:null}</div>
              <div className="cart-qty"><button aria-label={'Giảm số lượng '+(product?.name||'sản phẩm')} disabled={Boolean(busy)||item.quantity<=1} onClick={()=>update(item.variantId,item.quantity-1)}>−</button><span>{item.quantity}</span><button aria-label={'Tăng số lượng '+(product?.name||'sản phẩm')} disabled={Boolean(busy)||item.quantity>=Math.min(item.available,99)} onClick={()=>update(item.variantId,item.quantity+1)}>+</button><small>Còn {item.available}</small></div>
              <div className="cart-line-total"><strong>{money(item.lineTotal)}</strong><button onClick={()=>remove(item.variantId)} disabled={Boolean(busy)}>Xóa</button></div>
            </div>;
          })}
        </div>
        <footer className="cart-shop-foot"><span>Tạm tính shop</span><strong>{money(group.subtotal)}</strong></footer>
      </article>)}
    </section>

    <aside className="cart-summary-card">
      <h2>Tóm tắt đơn hàng</h2>
      <div className="cart-summary-row"><span>Tạm tính</span><b>{money(cart.summary.subtotal)}</b></div>
      <div className="cart-summary-row"><span>Phí vận chuyển</span><b>Tính ở checkout</b></div>
      <div className="cart-summary-row"><span>Voucher</span><b>Áp dụng ở checkout</b></div>
      <div className="cart-summary-divider"/>
      <div className="cart-summary-total"><span>Tổng tạm tính</span><strong>{money(cart.summary.subtotal)}</strong></div>
      <button className="cart-checkout" disabled={Boolean(busy)||!cart.summary.canCheckout} onClick={()=>{if(!busy&&cart.summary.canCheckout)window.location.href='/checkout';}}>Tiếp tục thanh toán</button>
      <div className="cart-protection"><TruckIcon size={20}/><div><b>Buyer Protection</b><span>Giá và số lượng được xác nhận lại trước khi bạn đặt hàng.</span></div></div>
      <a className="cart-continue" href="/search">← Tiếp tục mua sắm</a>
    </aside>
    <dialog ref={clearDialog} className="cart-confirm" aria-labelledby="clear-cart-title" onCancel={event=>{if(mutation.current)event.preventDefault();}}>
      <span className="street-eyebrow">YOUR BAG / XIII</span><h2 id="clear-cart-title">Dọn lại giỏ hàng?</h2><p>Xóa toàn bộ {cart.summary.itemCount} sản phẩm khỏi giỏ. Bạn có thể tìm và thêm lại khi muốn.</p>
      {message&&<p className="cart-confirm-error" role="alert">{message}</p>}
      <div><button type="button" autoFocus disabled={Boolean(busy)} onClick={()=>clearDialog.current?.close()}>Giữ lại</button><button type="button" disabled={Boolean(busy)} onClick={clear}>{busy==='all'?'Đang xóa…':'Xóa toàn bộ'}</button></div>
    </dialog>
  </div>;
}

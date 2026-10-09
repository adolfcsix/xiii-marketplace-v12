'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clientApi, emitCartUpdated, hasSession } from '../lib/client-api';
import { BagIcon, TruckIcon } from './icons';

type Address = {_id:string;recipientName:string;phone:string;province:string;district:string;ward:string;addressLine:string;label:string;isDefault:boolean};
type Preview = {
  address:Address;shippingMethod:'STANDARD'|'EXPRESS';voucher:null|{code:string;type:string;value:number};
  shops:Array<{shop:{_id:string;name:string;slug:string;verified:boolean};originalSubtotal:number;subtotal:number;campaignDiscount:number;shopVoucherDiscount:number;shopVoucher:null|{code:string;name:string};shippingFee:number;items:Array<{variantId:string;quantity:number;originalLineTotal:number;lineTotal:number;campaignDiscount:number;campaign:null|{id:string;name:string;type:string;value:number};product:{name:string;slug:string;image:string};variant:{sku:string;attributes:Record<string,string>;price:number;originalPrice:number}}>}>;
  summary:{itemCount:number;originalSubtotal:number;subtotal:number;campaignDiscount:number;shopVoucherDiscount:number;shippingFee:number;shippingDiscount:number;discountAmount:number;totalAmount:number};
  shopVouchers:Array<{shopId:string;code:string;name:string;discountAmount:number}>;
};

type CreateResult={orderId:string;orderCode:string;status:string;paymentMethod:string;paymentStatus:string;totalAmount:number;nextAction:string};
type ProviderState={expiresMinutes:number;codEnabled:boolean;standardShippingFee:number;expressShippingFee:number;providers:Array<{name:'MOMO'|'VNPAY';configured:boolean;enabled:boolean}>};
type PaymentCreateResult={paymentCode:string;orderCode:string;provider:'MOMO'|'VNPAY';amount:number;status:string;payUrl:string;expiresAt:string};
const money=(n:number)=>new Intl.NumberFormat('vi-VN').format(n)+'₫';

export function CheckoutClient(){
  const [addresses,setAddresses]=useState<Address[]>([]);
  const [addressId,setAddressId]=useState('');
  const [shippingMethod,setShippingMethod]=useState<'STANDARD'|'EXPRESS'>('STANDARD');
  const [paymentMethod,setPaymentMethod]=useState<'COD'|'MOMO'|'VNPAY'>('COD');
  const [voucherInput,setVoucherInput]=useState('');
  const [voucherCode,setVoucherCode]=useState('');
  const [shopVoucherInputs,setShopVoucherInputs]=useState<Record<string,string>>({});
  const [shopVoucherCodes,setShopVoucherCodes]=useState<Record<string,string>>({});
  const [preview,setPreview]=useState<Preview|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const ordering=useRef(false);
  const [previewKey,setPreviewKey]=useState('');
  const currentPreviewKey=JSON.stringify({addressId,shippingMethod,voucherCode,shopVoucherCodes});
  const [message,setMessage]=useState('');
  const [showAddressForm,setShowAddressForm]=useState(false);
  const [providers,setProviders]=useState<ProviderState|null>(null);

  const loadAddresses=useCallback(async()=>{
    const list=await clientApi<Address[]>('/users/me/addresses');
    setAddresses(list);
    if(list.length)setAddressId(current=>current||(list.find(a=>a.isDefault)||list[0])._id);
    return list;
  },[]);

  useEffect(()=>{
    if(!hasSession()){setLoading(false);return;}
    Promise.all([
      loadAddresses(),
      clientApi<ProviderState>('/payments/providers').then(setProviders),
    ]).catch(err=>setMessage(err instanceof Error?err.message:'Không tải được dữ liệu checkout')).finally(()=>setLoading(false));
  },[loadAddresses]);

  useEffect(()=>{
    const controller=new AbortController();
    let active=true;
    setPreview(null);setPreviewKey('');
    if(!addressId)return;
    setMessage('');
    clientApi<Preview>('/checkout/preview',{method:'POST',signal:controller.signal,
      body:JSON.stringify({addressId,shippingMethod,voucherCode:voucherCode||undefined,shopVoucherCodes:Object.values(shopVoucherCodes).filter(Boolean)})})
      .then(data=>{if(active){setPreview(data);setPreviewKey(currentPreviewKey);}})
      .catch(err=>{if(active)setMessage(err instanceof Error?err.message:'Không thể tính đơn hàng');});
    return()=>{active=false;controller.abort();};
  },[addressId,shippingMethod,voucherCode,shopVoucherCodes,currentPreviewKey]);

  async function addAddress(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMessage('');
    const f=new FormData(e.currentTarget);
    const payload={recipientName:f.get('recipientName'),phone:f.get('phone'),province:f.get('province'),district:f.get('district'),ward:f.get('ward'),addressLine:f.get('addressLine'),label:'HOME',isDefault:addresses.length===0};
    try{const created=await clientApi<Address>('/users/me/addresses',{method:'POST',body:JSON.stringify(payload)});await loadAddresses();setAddressId(created._id);setShowAddressForm(false);}
    catch(err){setMessage(err instanceof Error?err.message:'Không thể thêm địa chỉ');}
    finally{setBusy(false);}
  }

  async function placeOrder(){
    if(ordering.current||!preview||!addressId||previewKey!==currentPreviewKey||!onlineReady)return;
    ordering.current=true;
    setBusy(true);setMessage('');
    try{
      const created=await clientApi<CreateResult>('/checkout/create',{method:'POST',body:JSON.stringify({addressId,shippingMethod,voucherCode:voucherCode||undefined,shopVoucherCodes:Object.values(shopVoucherCodes).filter(Boolean),paymentMethod})});
      emitCartUpdated();
      if(paymentMethod==='COD'){window.location.href='/order-success/'+encodeURIComponent(created.orderCode);return;}
      try{
        const payment=await clientApi<PaymentCreateResult>('/payments/create',{method:'POST',body:JSON.stringify({orderCode:created.orderCode,provider:paymentMethod})});
        if(!payment.payUrl)throw new Error('PAYMENT_URL_MISSING');
        window.location.href=payment.payUrl;
      }catch(paymentError){
        const msg=paymentError instanceof Error?paymentError.message:'Không khởi tạo được cổng thanh toán';
        window.location.href='/payment-result?orderCode='+encodeURIComponent(created.orderCode)+'&provider='+paymentMethod+'&setupError='+encodeURIComponent(msg);
      }
    }catch(err){setMessage(err instanceof Error?err.message:'Không thể tạo đơn hàng');}
    finally{ordering.current=false;setBusy(false);}
  }

  const selectedAddress=useMemo(()=>addresses.find(a=>a._id===addressId),[addresses,addressId]);
  const providerEnabled=(name:'MOMO'|'VNPAY')=>{const p=providers?.providers.find(p=>p.name===name);return Boolean(p?.configured&&p?.enabled)};
  const onlineReady=paymentMethod==='COD'?Boolean(providers?.codEnabled):providerEnabled(paymentMethod);

  if(loading)return <section className="cart-state"><div className="cart-spinner"/><b>Đang chuẩn bị checkout…</b></section>;
  if(!hasSession())return <section className="cart-state"><BagIcon size={40}/><h1>Đăng nhập để thanh toán</h1><p>Checkout cần tài khoản để lưu địa chỉ và đơn hàng.</p><a className="cart-primary-link" href={'/login?next='+encodeURIComponent('/checkout')}>Đăng nhập</a></section>;

  return <div className="checkout-layout">
    <section className="checkout-main">
      <header className="checkout-title"><span>CHECKOUT</span><h1>Hoàn tất đơn hàng</h1><p>Kiểm tra địa chỉ, chọn vận chuyển và thanh toán theo cách bạn muốn.</p></header>
      {message&&<div className="cart-alert">{message}</div>}

      <article className="checkout-card">
        <div className="checkout-card-head"><div><span>01</span><div><b>Địa chỉ nhận hàng</b><small>Chọn địa chỉ thuộc tài khoản của bạn</small></div></div><button onClick={()=>setShowAddressForm(v=>!v)}>{showAddressForm?'Đóng':'+ Thêm địa chỉ'}</button></div>
        {addresses.length>0?<div className="checkout-address-list">{addresses.map(a=><label className={'checkout-address '+(a._id===addressId?'selected':'')} key={a._id}><input type="radio" name="address" checked={a._id===addressId} onChange={()=>setAddressId(a._id)}/><div><b>{a.recipientName} · {a.phone}</b><p>{a.addressLine}, {a.ward}, {a.district}, {a.province}</p><small>{a.label}{a.isDefault?' · Mặc định':''}</small></div></label>)}</div>:<p className="checkout-empty-note">Chưa có địa chỉ. Hãy thêm địa chỉ để tiếp tục.</p>}
        {showAddressForm&&<form className="checkout-address-form" onSubmit={addAddress}><input name="recipientName" placeholder="Họ tên người nhận" required/><input name="phone" placeholder="Số điện thoại" required/><input name="province" placeholder="Tỉnh / thành phố" required/><input name="district" placeholder="Quận / huyện" required/><input name="ward" placeholder="Phường / xã" required/><input className="wide" name="addressLine" placeholder="Số nhà, tên đường" required/><button className="wide" disabled={busy}>Lưu địa chỉ</button></form>}
      </article>

      <article className="checkout-card">
        <div className="checkout-card-head"><div><span>02</span><div><b>Vận chuyển</b><small>Phí được tính theo từng shop</small></div></div></div>
        <div className="checkout-option-grid"><label className={shippingMethod==='STANDARD'?'selected':''}><input type="radio" checked={shippingMethod==='STANDARD'} onChange={()=>setShippingMethod('STANDARD')}/><TruckIcon size={22}/><div><b>Tiêu chuẩn</b><small>2–4 ngày · {money(providers?.standardShippingFee??25000)} / shop</small></div></label><label className={shippingMethod==='EXPRESS'?'selected':''}><input type="radio" checked={shippingMethod==='EXPRESS'} onChange={()=>setShippingMethod('EXPRESS')}/><TruckIcon size={22}/><div><b>Hỏa tốc</b><small>1–2 ngày · {money(providers?.expressShippingFee??45000)} / shop</small></div></label></div>
      </article>

      <article className="checkout-card">
        <div className="checkout-card-head"><div><span>03</span><div><b>Voucher</b><small>Nhập mã ưu đãi áp dụng cho đơn hàng</small></div></div></div>
        <div className="checkout-voucher"><input value={voucherInput} onChange={e=>setVoucherInput(e.target.value.toUpperCase())} placeholder="Nhập mã, ví dụ XIII120"/><button onClick={()=>setVoucherCode(voucherInput.trim())}>Áp dụng</button>{voucherCode&&<button className="ghost" onClick={()=>{setVoucherCode('');setVoucherInput('');}}>Bỏ mã</button>}</div>
        <div className="checkout-voucher-hints"><button onClick={()=>{setVoucherInput('XIII120');setVoucherCode('XIII120');}}>XIII120 · giảm 120K cho đơn từ 1 triệu</button><button onClick={()=>{setVoucherInput('SHIP25');setVoucherCode('SHIP25');}}>SHIP25 · hỗ trợ ship 25K</button></div>
      </article>

      <article className="checkout-card">
        <div className="checkout-card-head"><div><span>04</span><div><b>Phương thức thanh toán</b><small>Chọn phương thức thanh toán phù hợp với bạn.</small></div></div></div>
        <div className="checkout-payments"><label className={(paymentMethod==='COD'?'selected ':'')+(providers?.codEnabled===false?'disabled':'')}><input type="radio" checked={paymentMethod==='COD'} disabled={providers?.codEnabled===false} onChange={()=>setPaymentMethod('COD')}/><div><b>Thanh toán khi nhận hàng (COD)</b><small>{providers?.codEnabled===false?'Marketplace đang tạm tắt COD.':'Thanh toán cho đơn vị vận chuyển khi nhận hàng.'}</small></div></label><label className={(paymentMethod==='MOMO'?'selected ':'')+(!providerEnabled('MOMO')?'disabled':'')}><input type="radio" checked={paymentMethod==='MOMO'} disabled={!providerEnabled('MOMO')} onChange={()=>setPaymentMethod('MOMO')}/><div><b>MoMo</b><small>{providerEnabled('MOMO')?'Thanh toán qua ứng dụng MoMo.':'Phương thức này hiện chưa khả dụng.'}</small></div><em>{providerEnabled('MOMO')?'Online':'Tạm ngừng'}</em></label><label className={(paymentMethod==='VNPAY'?'selected ':'')+(!providerEnabled('VNPAY')?'disabled':'')}><input type="radio" checked={paymentMethod==='VNPAY'} disabled={!providerEnabled('VNPAY')} onChange={()=>setPaymentMethod('VNPAY')}/><div><b>VNPAY</b><small>{providerEnabled('VNPAY')?'Thanh toán an toàn qua VNPAY.':'Phương thức này hiện chưa khả dụng.'}</small></div><em>{providerEnabled('VNPAY')?'Online':'Tạm ngừng'}</em></label></div>
      </article>

      {preview&&<article className="checkout-card">
        <div className="checkout-card-head"><div><span>05</span><div><b>Sản phẩm</b><small>{preview.summary.itemCount} sản phẩm từ {preview.shops.length} shop</small></div></div></div>
        {preview.shops.map(group=><div className="checkout-shop" key={group.shop._id}><div className="checkout-shop-name"><b>{group.shop.name} {group.shop.verified?'✓':''}</b><span>Phí ship {money(group.shippingFee)}</span></div>{group.items.map(item=><div className="checkout-product" key={item.variantId}><img src={item.product.image||'/products/fallback.svg'} alt={item.product.name}/><div><b>{item.product.name}</b><small>{Object.values(item.variant.attributes).filter(Boolean).join(' · ')} · SKU {item.variant.sku}</small>{item.campaign&&<small className="checkout-campaign-tag">{item.campaign.name} · -{money(item.campaignDiscount)}</small>}<span>x{item.quantity}</span></div><strong>{money(item.lineTotal)}{item.campaignDiscount>0&&<del>{money(item.originalLineTotal)}</del>}</strong></div>)}<div className="checkout-shop-voucher"><input value={shopVoucherInputs[group.shop._id]||''} onChange={e=>setShopVoucherInputs(v=>({...v,[group.shop._id]:e.target.value.toUpperCase()}))} placeholder="Voucher của shop"/><button onClick={()=>setShopVoucherCodes(v=>({...v,[group.shop._id]:(shopVoucherInputs[group.shop._id]||'').trim()}))}>Áp dụng</button>{shopVoucherCodes[group.shop._id]&&<button className="ghost" onClick={()=>{setShopVoucherCodes(v=>({...v,[group.shop._id]:''}));setShopVoucherInputs(v=>({...v,[group.shop._id]:''}));}}>Bỏ</button>}{group.shopVoucher&&<span>{group.shopVoucher.code} · -{money(group.shopVoucherDiscount)}</span>}</div></div>)}
      </article>}
    </section>

    <aside className="checkout-summary">
      <div className="checkout-summary-top"><span>Đơn hàng</span><small>{selectedAddress?selectedAddress.province:'Chưa chọn địa chỉ'}</small></div>
      {preview?<><div className="checkout-summary-row"><span>Giá gốc sản phẩm</span><b>{money(preview.summary.originalSubtotal)}</b></div>{preview.summary.campaignDiscount>0&&<div className="checkout-summary-row discount"><span>Campaign shop</span><b>−{money(preview.summary.campaignDiscount)}</b></div>}{preview.summary.shopVoucherDiscount>0&&<div className="checkout-summary-row discount"><span>Voucher shop</span><b>−{money(preview.summary.shopVoucherDiscount)}</b></div>}<div className="checkout-summary-row"><span>Phí vận chuyển</span><b>{money(preview.summary.shippingFee)}</b></div>{preview.summary.shippingDiscount>0&&<div className="checkout-summary-row discount"><span>Giảm phí ship</span><b>−{money(preview.summary.shippingDiscount)}</b></div>}{preview.summary.discountAmount>0&&<div className="checkout-summary-row discount"><span>Voucher sàn {preview.voucher?.code}</span><b>−{money(preview.summary.discountAmount)}</b></div>}<div className="checkout-summary-divider"/><div className="checkout-summary-total"><span>Tổng thanh toán</span><strong>{money(preview.summary.totalAmount)}</strong></div><button className="checkout-place" disabled={busy||!addressId||!onlineReady||previewKey!==currentPreviewKey} onClick={placeOrder}>{busy?'Đang tạo đơn…':'ĐẶT HÀNG · '+money(preview.summary.totalAmount)}</button><p className="checkout-legal">Vui lòng kiểm tra thông tin trước khi đặt hàng. Với thanh toán online, sản phẩm được giữ tối đa {providers?.expiresMinutes||15} phút để bạn hoàn tất thanh toán.</p></>:<div className="checkout-summary-loading" role="status">{addressId?'Đang cập nhật tổng tiền…':'Chọn địa chỉ hợp lệ để tính đơn hàng.'}</div>}
      <a className="cart-continue" href="/cart">← Quay lại giỏ hàng</a>
    </aside>
  </div>;
}

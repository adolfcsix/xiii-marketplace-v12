'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { clientApi, hasSession } from '../lib/client-api';

const money=(n:number)=>new Intl.NumberFormat('vi-VN').format(n)+'₫';
const date=(value?:string)=>value?new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'—';
const STATUS:Record<string,string>={PENDING_PAYMENT:'Chờ thanh toán',PAID:'Đã thanh toán',CONFIRMED:'Đã xác nhận',PACKING:'Đang đóng gói',READY_TO_SHIP:'Chờ lấy hàng',SHIPPED:'Đang giao',DELIVERED:'Đã giao',COMPLETED:'Hoàn tất',CANCELLED:'Đã hủy',RETURN_REQUESTED:'Yêu cầu trả hàng',RETURN_APPROVED:'Đã duyệt trả hàng',RETURN_REJECTED:'Từ chối trả hàng',RETURNED:'Đã trả hàng',REFUND_PENDING:'Chờ hoàn tiền',REFUNDED:'Đã hoàn tiền',DISPUTED:'Khiếu nại'};
type Timeline={_id:string;subOrderId:string|null;fromStatus:string|null;toStatus:string;note:string;createdAt:string};
type Order={
  orderCode:string;status:string;paymentMethod:'COD'|'MOMO'|'VNPAY';paymentStatus:string;shippingMethod:string;subtotal:number;shippingFee:number;discountAmount:number;totalAmount:number;voucherCode?:string;createdAt:string;cancelReason?:string;cancelledAt?:string;completedAt?:string;
  shippingAddress:Record<string,string>;canCancel:boolean;canConfirmReceived:boolean;canPay:boolean;timeline:Timeline[];payment:null|{paymentCode:string;provider:string;status:string;amount:number;providerTransactionId?:string;expiresAt?:string;paidAt?:string};
  subOrders:Array<{_id:string;subOrderCode:string;status:string;subtotal:number;shippingFee:number;trackingCode?:string;shippingProvider?:string;shop:null|{name:string;slug:string;verified:boolean};items:Array<{_id:string;productName:string;image:string;quantity:number;unitPrice:number;totalPrice:number;variantSnapshot:{sku?:string;attributes?:Record<string,string>}}>}>;
};

export function OrderDetailClient({orderCode}:{orderCode:string}){
  const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);
  const [order,setOrder]=useState<Order|null>(null);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{if(!hasSession())return;try{setOrder(await clientApi<Order>('/orders/'+encodeURIComponent(orderCode)));}catch(err){setMessage(err instanceof Error?err.message:'Không tải được đơn hàng');}},[orderCode]);
  useEffect(()=>{load();},[load]);
  const masterTimeline=useMemo(()=>order?.timeline.filter(x=>!x.subOrderId)??[],[order]);

  async function cancel(){if(!order||!confirm(`Hủy đơn ${order.orderCode}?`))return;const input=prompt('Lý do hủy đơn:','Đổi ý, không còn nhu cầu');if(input===null)return;const reason=input.trim()||'Người mua hủy đơn';setBusy(true);setMessage('');try{await clientApi(`/orders/${encodeURIComponent(order.orderCode)}/cancel`,{method:'POST',body:JSON.stringify({reason})});await load();}catch(err){setMessage(err instanceof Error?err.message:'Không thể hủy đơn');}finally{setBusy(false);}}
  async function confirmReceived(){if(!order||!confirm('Xác nhận bạn đã nhận đủ hàng? Hành động này hoàn tất đơn.'))return;setBusy(true);setMessage('');try{await clientApi(`/orders/${encodeURIComponent(order.orderCode)}/confirm-received`,{method:'POST',body:'{}'});await load();}catch(err){setMessage(err instanceof Error?err.message:'Không thể xác nhận nhận hàng');}finally{setBusy(false);}}
  async function payNow(){if(!order)return;setBusy(true);setMessage('');try{const payment=await clientApi<{payUrl:string}>('/payments/create',{method:'POST',body:JSON.stringify({orderCode:order.orderCode,provider:order.paymentMethod})});if(!payment.payUrl)throw new Error('PAYMENT_URL_MISSING');window.location.href=payment.payUrl;}catch(err){setMessage(err instanceof Error?err.message:'Không thể tạo thanh toán');setBusy(false);}}

  if(!mounted)return <section className="orders-loading" role="status"><div className="cart-spinner"/><b>Đang tải chi tiết đơn…</b></section>;
  if(!hasSession())return <section className="orders-state"><h1>Chi tiết đơn hàng</h1><p>Bạn cần đăng nhập để mở đơn.</p><a href={'/login?next='+encodeURIComponent('/account/orders/'+orderCode)}>Đăng nhập</a></section>;
  if(message&&!order)return <section className="orders-state"><h1>Không thể mở đơn hàng</h1><p>{message}</p><a href="/account/orders">Quay lại đơn mua</a></section>;
  if(!order)return <section className="orders-loading"><div className="cart-spinner"/><b>Đang tải chi tiết đơn…</b></section>;
  const a=order.shippingAddress;
  const trackingSummary=order.subOrders.filter(sub=>sub.trackingCode).map(sub=>`${sub.shippingProvider||'OTHER'} · ${sub.trackingCode}`).join(' / ');
  return <div className="order-detail-wrap">
    <div className="order-detail-top"><div><a href="/account/orders">← Đơn mua</a><span>ORDER DETAIL</span><h1>{order.orderCode}</h1><p>Đặt lúc {date(order.createdAt)}</p></div><div className="order-detail-actions"><strong className={'order-status status-'+order.status.toLowerCase()}>{STATUS[order.status]||order.status}</strong>{order.canPay&&<button className="dark" disabled={busy} onClick={payNow}>Thanh toán ngay</button>}{order.canConfirmReceived&&<button className="dark" disabled={busy} onClick={confirmReceived}>Đã nhận hàng</button>}{order.canCancel&&<button disabled={busy} onClick={cancel}>Hủy đơn</button>}</div></div>
    {message&&<div className="orders-alert">{message}</div>}
    <section className="order-timeline-card"><h2>Tiến trình đơn hàng</h2><div className="order-timeline">{masterTimeline.map((t,i)=><div className="timeline-step" key={t._id}><span>{i+1}</span><div><b>{STATUS[t.toStatus]||t.toStatus}</b><small>{date(t.createdAt)}</small><p>{t.note}</p></div></div>)}</div>{order.status==='CANCELLED'&&order.cancelReason&&<div className="cancel-note"><b>Lý do hủy</b><span>{order.cancelReason}</span></div>}</section>
    <div className="order-detail-grid"><section className="order-detail-main">{order.subOrders.map(sub=><article className="detail-shop-card" key={sub._id}><header><div><b>{sub.shop?.name||'Shop'} {sub.shop?.verified?'✓':''}</b><small>{sub.subOrderCode}</small></div><div className="detail-shop-head-actions"><strong>{STATUS[sub.status]||sub.status}</strong>{['DELIVERED','COMPLETED'].includes(sub.status)&&<a className="return-link" href={'/account/returns/new?subOrderCode='+encodeURIComponent(sub.subOrderCode)}>Yêu cầu trả hàng</a>}</div></header>{sub.items.map(item=><div className="detail-order-item" key={item._id}><img src={item.image||'/products/fallback.svg'} alt={item.productName}/><div><b>{item.productName}</b><small>{Object.values(item.variantSnapshot?.attributes||{}).filter(Boolean).join(' · ')} · SKU {item.variantSnapshot?.sku||'—'}</small><span>{money(item.unitPrice)} × {item.quantity}</span></div><strong>{money(item.totalPrice)}</strong></div>)}<footer><span>Phí vận chuyển <b>{money(sub.shippingFee)}</b></span>{sub.trackingCode&&<span>Vận đơn <b>{sub.shippingProvider||'OTHER'} · {sub.trackingCode}</b></span>}<span>Tạm tính shop <b>{money(sub.subtotal+sub.shippingFee)}</b></span></footer></article>)}</section>
      <aside className="order-detail-side"><section><h2>Giao hàng</h2><b>{a.recipientName} · {a.phone}</b><p>{a.addressLine}, {a.ward}, {a.district}, {a.province}</p><div className="detail-kv"><span>Phương thức</span><b>{order.shippingMethod==='EXPRESS'?'Nhanh':'Tiêu chuẩn'}</b></div><div className="detail-kv"><span>Mã vận đơn</span><b>{trackingSummary||'Chưa cập nhật'}</b></div></section>
      <section><h2>Thanh toán</h2><div className="detail-kv"><span>Phương thức</span><b>{order.paymentMethod}</b></div><div className="detail-kv"><span>Trạng thái</span><b>{order.paymentStatus}</b></div>{order.payment&&<><div className="detail-kv"><span>Mã payment</span><b>{order.payment.paymentCode}</b></div>{order.payment.providerTransactionId&&<div className="detail-kv"><span>Gateway ID</span><b>{order.payment.providerTransactionId}</b></div>}</>}</section>
      <section><h2>Tổng đơn</h2><div className="detail-kv"><span>Tạm tính</span><b>{money(order.subtotal)}</b></div><div className="detail-kv"><span>Vận chuyển</span><b>{money(order.shippingFee)}</b></div><div className="detail-kv"><span>Giảm giá {order.voucherCode?`(${order.voucherCode})`:''}</span><b>−{money(order.discountAmount)}</b></div><hr/><div className="detail-total"><span>Tổng thanh toán</span><b>{money(order.totalAmount)}</b></div></section></aside>
    </div>
  </div>;
}

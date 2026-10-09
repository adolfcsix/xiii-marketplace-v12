'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clientApi, hasSession } from '../lib/client-api';

const money=(n:number)=>new Intl.NumberFormat('vi-VN').format(n)+'₫';
const date=(value:string)=>new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
const STATUS:Record<string,string>={
  PENDING_PAYMENT:'Chờ thanh toán',PAID:'Đã thanh toán',CONFIRMED:'Đã xác nhận',PACKING:'Đang đóng gói',READY_TO_SHIP:'Chờ lấy hàng',
  SHIPPED:'Đang giao',DELIVERED:'Đã giao',COMPLETED:'Hoàn tất',CANCELLED:'Đã hủy',RETURN_REQUESTED:'Yêu cầu trả hàng',RETURN_APPROVED:'Đã duyệt trả hàng',
  RETURN_REJECTED:'Từ chối trả hàng',RETURNED:'Đã trả hàng',REFUND_PENDING:'Chờ hoàn tiền',REFUNDED:'Đã hoàn tiền',DISPUTED:'Khiếu nại',
};
const TABS=[
  {key:'',label:'Tất cả'},
  {key:'PENDING_PAYMENT',label:'Chờ thanh toán'},
  {key:'CONFIRMED',label:'Đã xác nhận'},
  {key:'SHIPPED',label:'Đang giao'},
  {key:'COMPLETED',label:'Hoàn tất'},
  {key:'CANCELLED',label:'Đã hủy'},
];

type PreviewItem={_id:string;productName:string;image:string;quantity:number;totalPrice:number;variantSnapshot?:{attributes?:Record<string,string>}};
type OrderRow={
  _id:string;orderCode:string;status:string;paymentMethod:string;paymentStatus:string;totalAmount:number;createdAt:string;itemCount:number;subOrderCount:number;
  shops:Array<{_id:string;name:string;slug:string;verified:boolean}>;previewItems:PreviewItem[];canCancel:boolean;canConfirmReceived:boolean;
};
type OrderList={items:OrderRow[];meta:{page:number;limit:number;total:number;totalPages:number};statusCounts:Record<string,number>};

export function OrdersClient(){
  const [status,setStatus]=useState('');
  const [page,setPage]=useState(1);
  const [data,setData]=useState<OrderList|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState('');
  const [ready,setReady]=useState(false),[cancelling,setCancelling]=useState<OrderRow|null>(null),[reason,setReason]=useState('');
  const controller=useRef<AbortController|null>(null),loadVersion=useRef(0),cancelLock=useRef(false),dialog=useRef<HTMLDialogElement>(null),reload=useRef<()=>Promise<void>>(async()=>{});
  useEffect(()=>{const restore=()=>{const value=new URLSearchParams(location.search).get('status')||'';setStatus(STATUS[value]?value:'');setPage(1);setReady(true);};restore();window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);},[]);
  useEffect(()=>{if(cancelling){dialog.current?.showModal();dialog.current?.querySelector<HTMLButtonElement>('[data-keep]')?.focus();}else dialog.current?.close();},[cancelling]);

  const load=useCallback(async()=>{
    if(!ready||!hasSession()){if(ready)setLoading(false);return;}
    controller.current?.abort();const request=new AbortController();controller.current=request;const version=++loadVersion.current;
    setLoading(true);setMessage('');setData(null);
    const qs=new URLSearchParams({page:String(page),limit:'10'});if(status)qs.set('status',status);
    try{const result=await clientApi<OrderList>('/orders?'+qs.toString(),{signal:request.signal});if(!request.signal.aborted&&version===loadVersion.current)setData(result);}
    catch(err){if(!request.signal.aborted&&version===loadVersion.current)setMessage(err instanceof Error?err.message:'Không tải được đơn hàng');}
    finally{if(!request.signal.aborted&&version===loadVersion.current)setLoading(false);}
  },[page,status,ready]);
  reload.current=load;
  useEffect(()=>{void load();return()=>{controller.current?.abort();loadVersion.current++;};},[load]);

  function choose(next:string){setStatus(next);setPage(1);const u=new URL(window.location.href);if(next)u.searchParams.set('status',next);else u.searchParams.delete('status');window.history.replaceState(window.history.state,'',u);}

  async function cancel(event:React.FormEvent){
    event.preventDefault();if(!cancelling||cancelLock.current)return;
    cancelLock.current=true;setBusy(cancelling.orderCode);setMessage('');
    try{await clientApi(`/orders/${encodeURIComponent(cancelling.orderCode)}/cancel`,{method:'POST',body:JSON.stringify({reason:reason.trim()||'Người mua hủy đơn'})});setCancelling(null);await reload.current();}
    catch(err){setMessage(err instanceof Error?err.message:'Không thể hủy đơn');}
    finally{cancelLock.current=false;setBusy('');}
  }

  const totalLabel=useMemo(()=>data?.meta.total||0,[data]);
  if(!ready)return <section className="orders-loading" role="status"><div className="cart-spinner"/><b>Đang tải đơn hàng…</b></section>;
  if(!hasSession())return <section className="orders-state"><h1>Đơn mua của bạn</h1><p>Đăng nhập để xem và quản lý đơn hàng.</p><a href="/login?next=%2Faccount%2Forders">Đăng nhập</a></section>;

  return <div className="account-layout">
    <aside className="account-sidebar">
      <div className="account-user"><span>CM</span><div><b>Tài khoản XIII</b><small>Buyer Center</small></div></div>
      <nav><a href="/account/orders" className="active">Đơn mua</a><a href="/account/returns">Trả hàng & hoàn tiền</a><a href="/help">Trợ giúp</a><a href="/checkout">Địa chỉ</a><a href="/wishlist">Yêu thích</a><a href="/search?q=sale">Voucher</a><a href="/account/messages">Tin nhắn</a></nav>
    </aside>
    <section className="orders-main">
      <header className="orders-heading"><div><span>BUYER CENTER</span><h1>Đơn mua</h1><p>Theo dõi trạng thái, thanh toán và quản lý các đơn đã đặt.</p></div><b>{totalLabel} đơn</b></header>
      <div className="orders-tabs">{TABS.map(tab=><button key={tab.key||'ALL'} className={status===tab.key?'active':''} onClick={()=>choose(tab.key)}>{tab.label}{tab.key&&data?.statusCounts?.[tab.key]!==undefined?<em>{data.statusCounts[tab.key]}</em>:null}</button>)}</div>
      {message&&!cancelling&&<div className="orders-alert" role="alert">{message}</div>}
      {loading?<div className="orders-loading"><div className="cart-spinner"/><b>Đang tải đơn hàng…</b></div>:!data?<div className="orders-empty"><h2>Chưa tải được đơn hàng</h2><button className="account-retry" onClick={()=>void load()}>Thử lại</button></div>:data.items.length? <div className="orders-list">{data.items.map(order=><article className="order-card" key={order._id}>
        <header><div><span>{order.shops.map(s=>s.name+(s.verified?' ✓':'')).join(' · ')||'XIII Marketplace'}</span><small>{order.orderCode} · {date(order.createdAt)}</small></div><strong className={'order-status status-'+order.status.toLowerCase()}>{STATUS[order.status]||order.status}</strong></header>
        <div className="order-items-preview">{order.previewItems.map(item=><div className="order-preview-item" key={item._id}><img src={item.image||'/products/fallback.svg'} alt={item.productName}/><div><b>{item.productName}</b><small>{Object.values(item.variantSnapshot?.attributes||{}).filter(Boolean).join(' · ')||'SKU'} · x{item.quantity}</small></div><strong>{money(item.totalPrice)}</strong></div>)}{order.itemCount>order.previewItems.reduce((n,i)=>n+i.quantity,0)&&<div className="order-more">+ sản phẩm khác trong đơn</div>}</div>
        <footer><div><small>{order.paymentMethod} · {order.paymentStatus}</small><span>Tổng thanh toán <b>{money(order.totalAmount)}</b></span></div><div className="order-actions"><a href={'/account/orders/'+encodeURIComponent(order.orderCode)}>Xem chi tiết</a>{order.canCancel&&<button disabled={Boolean(busy)} onClick={()=>{setCancelling(order);setReason('');setMessage('');}}>{busy===order.orderCode?'Đang hủy…':'Hủy đơn'}</button>}</div></footer>
      </article>)}</div>:<div className="orders-empty"><h2>Chưa có đơn trong trạng thái này</h2><p>Khám phá sản phẩm mới và quay lại đây để theo dõi đơn hàng.</p><a href="/search">Mua sắm ngay</a></div>}
      {data&&data.meta.totalPages>1&&<div className="orders-pagination"><button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>← Trước</button><span>Trang {data.meta.page} / {data.meta.totalPages}</span><button disabled={page>=data.meta.totalPages} onClick={()=>setPage(p=>p+1)}>Sau →</button></div>}
    </section>
    <dialog ref={dialog} className="order-cancel-dialog" aria-labelledby="order-cancel-title" onCancel={event=>{if(cancelLock.current)event.preventDefault();else setCancelling(null);}} onClose={()=>setCancelling(null)}>
      <form onSubmit={cancel}><span className="street-eyebrow">QUẢN LÝ ĐƠN MUA</span><h2 id="order-cancel-title">Hủy đơn hàng?</h2><p>Đơn {cancelling?.orderCode}. Sản phẩm đang giữ sẽ được trả lại kho.</p><label>Lý do hủy (không bắt buộc)<textarea value={reason} onChange={event=>setReason(event.target.value)} maxLength={200} rows={3} disabled={Boolean(busy)} placeholder="Chia sẻ lý do với shop…"/><small>{reason.length}/200 ký tự</small></label>{message&&<div className="orders-alert" role="alert">{message}</div>}<div className="order-cancel-actions"><button type="button" data-keep disabled={Boolean(busy)} onClick={()=>setCancelling(null)}>Giữ đơn</button><button disabled={Boolean(busy)}>{busy?'Đang hủy…':'Xác nhận hủy'}</button></div></form>
    </dialog>
  </div>;
}

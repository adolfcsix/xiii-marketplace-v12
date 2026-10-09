'use client';

import { useCallback, useEffect, useState } from 'react';
import { clientApi, hasSession } from '../lib/client-api';

type PaymentSummary={
  orderCode:string;orderStatus:string;paymentStatus:string;paymentMethod:'MOMO'|'VNPAY'|'COD';totalAmount:number;
  payment:null|{paymentCode:string;provider:'MOMO'|'VNPAY';status:string;payUrl:string;expiresAt:string;amount:number};
};
type PaymentCreateResult={paymentCode:string;orderCode:string;provider:'MOMO'|'VNPAY';amount:number;status:string;payUrl:string;expiresAt:string};
const money=(n:number)=>new Intl.NumberFormat('vi-VN').format(n)+'₫';

export function PaymentResultClient({orderCode,provider,setupError}:{orderCode:string;provider:string;setupError?:string}){
  const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);
  const [data,setData]=useState<PaymentSummary|null>(null);
  const [message,setMessage]=useState(setupError||'');
  const [loading,setLoading]=useState(true);
  const [retrying,setRetrying]=useState(false);

  const load=useCallback(async()=>{
    if(!orderCode||!hasSession()){setLoading(false);return;}
    try{setData(await clientApi<PaymentSummary>('/payments/order/'+encodeURIComponent(orderCode)));}
    catch(err){setMessage(err instanceof Error?err.message:'Không tải được trạng thái thanh toán');}
    finally{setLoading(false);}
  },[orderCode]);

  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(!data||['SUCCESS','FAILED','CANCELLED','EXPIRED','REFUNDED'].includes(data.paymentStatus)||data.orderStatus==='PAID'||data.orderStatus==='CANCELLED')return;
    const id=setInterval(()=>void load(),2000);return()=>clearInterval(id);
  },[data,load]);

  async function retry(){
    if(!orderCode||(provider!=='MOMO'&&provider!=='VNPAY'))return;
    setRetrying(true);setMessage('');
    try{const p=await clientApi<PaymentCreateResult>('/payments/create',{method:'POST',body:JSON.stringify({orderCode,provider})});if(!p.payUrl)throw new Error('PAYMENT_URL_MISSING');window.location.href=p.payUrl;}
    catch(err){setMessage(err instanceof Error?err.message:'Không tạo lại được liên kết thanh toán');setRetrying(false);}
  }

  if(!orderCode)return <section className="payment-state"><h1>Thiếu mã đơn hàng</h1><p>Không xác định được giao dịch cần kiểm tra.</p><a href="/">Về trang chủ</a></section>;
  if(!mounted)return <section className="payment-state" role="status"><div className="cart-spinner"/><b>Đang xác minh kết quả thanh toán…</b></section>;
  if(!hasSession())return <section className="payment-state"><h1>Đăng nhập để xem thanh toán</h1><a href={'/login?next='+encodeURIComponent('/payment-result?orderCode='+orderCode+'&provider='+provider)}>Đăng nhập</a></section>;
  if(loading&&!data)return <section className="payment-state"><div className="cart-spinner"/><b>Đang xác minh kết quả thanh toán…</b></section>;

  const success=data?.paymentStatus==='SUCCESS'||data?.orderStatus==='PAID';
  const failed=data?.paymentStatus==='FAILED'||data?.paymentStatus==='CANCELLED'||data?.orderStatus==='CANCELLED';
  const expired=data?.payment?.status==='EXPIRED';
  const pending=!success&&!failed&&!expired;

  return <div className="payment-result-wrap">
    <section className={'payment-result-card '+(success?'success':failed||expired?'failed':'pending')}>
      <div className="payment-result-icon">{success?'✓':failed||expired?'!':'…'}</div>
      <span>{provider||data?.paymentMethod||'ONLINE PAYMENT'}</span>
      <h1>{success?'Thanh toán thành công':failed?'Thanh toán không thành công':expired?'Phiên thanh toán đã hết hạn':'Đang xác minh thanh toán'}</h1>
      <p>{success?'Gateway đã được xác minh ở backend và đơn hàng đã chuyển sang PAID.':failed?'Đơn online đã được hủy và tồn kho giữ chỗ được trả lại.':expired?'Hệ thống đã tự giải phóng tồn kho giữ chỗ cho đơn này.':'Kết quả cuối cùng chỉ được tin sau khi backend xác minh IPN/checksum từ cổng thanh toán.'}</p>
      <div className="payment-result-meta"><div><span>Mã đơn</span><b>{orderCode}</b></div><div><span>Tổng tiền</span><b>{data?money(data.totalAmount):'—'}</b></div><div><span>Order</span><b>{data?.orderStatus||'—'}</b></div><div><span>Payment</span><b>{data?.paymentStatus||data?.payment?.status||'—'}</b></div></div>
      {message&&<div className="cart-alert">{message}</div>}
      {pending&&<div className="payment-wait"><div className="cart-spinner"/><span>Đang chờ webhook/IPN… trang tự kiểm tra lại mỗi 2 giây.</span></div>}
      <div className="payment-actions">
        {success&&<a className="payment-primary" href={'/order-success/'+encodeURIComponent(orderCode)}>XEM ĐƠN HÀNG</a>}
        {pending&&data?.payment?.payUrl&&<a className="payment-primary" href={data.payment.payUrl}>MỞ LẠI CỔNG THANH TOÁN</a>}
        {pending&&!data?.payment?.payUrl&&(provider==='MOMO'||provider==='VNPAY')&&<button className="payment-primary" disabled={retrying} onClick={retry}>{retrying?'Đang tạo…':'THỬ TẠO LẠI THANH TOÁN'}</button>}
        <a className="payment-secondary" href="/">Về trang chủ</a>
      </div>
    </section>
  </div>;
}

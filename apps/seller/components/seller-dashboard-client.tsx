'use client';
import { useEffect, useState } from 'react';
import { hasSellerSession, sellerApi } from '../lib/client-api';
import { SellerShell } from './seller-shell';

const money=(n:number)=>new Intl.NumberFormat('vi-VN').format(n)+'₫';
const STATUS:Record<string,string>={PAID:'Đã thanh toán',CONFIRMED:'Đã xác nhận',PACKING:'Đang đóng gói',READY_TO_SHIP:'Chờ giao',SHIPPED:'Đang giao',DELIVERED:'Đã giao',COMPLETED:'Hoàn tất',CANCELLED:'Đã hủy',PENDING_PAYMENT:'Chờ thanh toán'};
type Summary={todayOrders:number;todayRevenue:number;needsAction:number;shippingNow:number;statusCounts:Record<string,number>;recent:Array<{_id:string;subOrderCode:string;orderCode:string;status:string;sellerRevenue:number;createdAt:string;nextStatus?:string}>};

export function SellerDashboardClient(){
  const [data,setData]=useState<Summary|null>(null);const [error,setError]=useState('');
  useEffect(()=>{if(!hasSellerSession()){window.location.href='/login';return;}sellerApi<Summary>('/seller/orders/summary').then(setData).catch(e=>setError(e instanceof Error?e.message:'Không tải được Seller Center'));},[]);
  return <SellerShell active="overview">
    <section className="seller-page-head"><div><span>SELLER OVERVIEW</span><h1>Tổng quan vận hành</h1><p>Dữ liệu dưới đây lấy trực tiếp từ SubOrder thuộc shop đang đăng nhập.</p></div><a className="seller-primary" href="/orders">Quản lý đơn hàng</a></section>
    {error&&<div className="seller-alert">{error}</div>}
    <div className="seller-kpis">
      <article><small>Đơn hôm nay</small><strong>{data?.todayOrders??'—'}</strong><span>SubOrder mới trong ngày</span></article>
      <article><small>Doanh thu hôm nay</small><strong>{data?money(data.todayRevenue):'—'}</strong><span>Sau platform fee</span></article>
      <article><small>Cần xử lý</small><strong>{data?.needsAction??'—'}</strong><span>Paid / Confirmed / Packing / Ready</span></article>
      <article><small>Đang giao</small><strong>{data?.shippingNow??'—'}</strong><span>Đã bàn giao vận chuyển</span></article>
    </div>
    <div className="seller-grid-2">
      <section className="seller-panel"><div className="seller-panel-head"><div><span>FULFILMENT</span><h2>Trạng thái đơn</h2></div></div><div className="seller-status-grid">{['PAID','CONFIRMED','PACKING','READY_TO_SHIP','SHIPPED','DELIVERED'].map(s=><div key={s}><b>{data?.statusCounts?.[s]||0}</b><span>{STATUS[s]}</span></div>)}</div></section>
      <section className="seller-panel"><div className="seller-panel-head"><div><span>RECENT</span><h2>Đơn gần đây</h2></div><a href="/orders">Xem tất cả</a></div>{data?.recent?.length?<div className="seller-recent-list">{data.recent.map(row=><a href={'/orders/'+encodeURIComponent(row.subOrderCode)} key={row._id}><div><b>{row.subOrderCode}</b><small>{row.orderCode}</small></div><div><strong>{money(row.sellerRevenue)}</strong><span className={'seller-badge status-'+row.status.toLowerCase()}>{STATUS[row.status]||row.status}</span></div></a>)}</div>:<div className="seller-empty-mini">Chưa có đơn. Hãy tạo một đơn từ Buyer Store để test luồng seller.</div>}</section>
    </div>
  </SellerShell>;
}

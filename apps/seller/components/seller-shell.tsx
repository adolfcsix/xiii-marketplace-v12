'use client';
import {BUYER_STORE_URL} from '../../../shared/app-links';
import { useEffect, useState } from 'react';
import { logoutSellerSession, sellerApi } from '../lib/client-api';
import { disconnectSellerSocket, sellerSocket } from '../lib/realtime';

type Shop={name:string;slug:string;logo?:string;accessRole?:string;permissions?:string[]};

export function SellerShell({children,active='overview'}:{children:React.ReactNode;active?:string}){
  const [shop,setShop]=useState<Shop|null>(null);
  const [chatCount,setChatCount]=useState(0);
  const [notificationCount,setNotificationCount]=useState(0);
  const [loggingOut,setLoggingOut]=useState(false);
  const items=[
    ['overview','/','Tổng quan'],['orders','/orders','Đơn hàng'],['messages','/messages','Tin nhắn'],['notifications','/notifications','Thông báo'],['returns','/returns','Trả hàng & hoàn tiền'],['reviews','/reviews','Đánh giá'],['products','/products','Sản phẩm'],['inventory','/inventory','Kho hàng'],
    ['promotions','/promotions','Khuyến mãi'],['finance','/finance','Tài chính'],['analytics','/analytics','Phân tích'],['team','/team','Nhân sự & quyền'],['settings','/settings','Cài đặt shop'],
  ];
  useEffect(()=>{sellerApi<Shop>('/seller/shop').then(setShop).catch(()=>{});Promise.all([sellerApi<{unreadCount:number}>('/seller/chat/unread-count'),sellerApi<{unreadCount:number}>('/notifications/unread-count')]).then(([c,n])=>{setChatCount(c.unreadCount||0);setNotificationCount(n.unreadCount||0)}).catch(()=>{});const socket=sellerSocket();const onChat=(p:{unreadCount:number})=>setChatCount(p.unreadCount||0);const onNotif=()=>setNotificationCount(n=>n+1);const onNotifCount=(p:{unreadCount:number})=>setNotificationCount(p.unreadCount||0);socket?.on('chat:unread',onChat);socket?.on('notification:new',onNotif);socket?.on('notification:count',onNotifCount);return()=>{socket?.off('chat:unread',onChat);socket?.off('notification:new',onNotif);socket?.off('notification:count',onNotifCount)};},[]);
  async function logout(){if(loggingOut)return;setLoggingOut(true);await logoutSellerSession();disconnectSellerSocket();window.location.href='/login';}
  const initials=(shop?.name||'XIII').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  return <div className="seller-app">
    <aside className="seller-sidebar">
      <a className="seller-logo" href="/"><strong>XIII</strong><span>SELLER CENTER</span></a>
      <div className="seller-shop-chip"><span>{initials}</span><div><b>{shop?.name||'Đang tải shop...'}</b><small>{shop?.accessRole||'Seller workspace'}</small></div></div>
      <nav>{items.map(([key,href,label])=><a key={key} href={href} className={active===key?'active':''}>{label}{key==='messages'&&chatCount>0?<small className="seller-nav-count">{chatCount>99?'99+':chatCount}</small>:key==='notifications'&&notificationCount>0?<small className="seller-nav-count">{notificationCount>99?'99+':notificationCount}</small>:href==='#'?<small>soon</small>:null}</a>)}</nav>
      <div className="seller-side-bottom"><a href={BUYER_STORE_URL} target="_blank">Mở Buyer Store ↗</a><button disabled={loggingOut} onClick={logout}>{loggingOut?'Đang đăng xuất…':'Đăng xuất'}</button></div>
    </aside>
    <div className="seller-workspace">
      <header className="seller-topbar"><div><b>Seller Center</b><span>{shop?.name||'Quản trị vận hành shop'}</span></div><div className="seller-top-actions"><span>● API live</span><a href="/messages">Chat {chatCount>0?`(${chatCount})`:''}</a><a href="/notifications">Thông báo {notificationCount>0?`(${notificationCount})`:''}</a><a href="/orders">Đơn hàng</a></div></header>
      <main className="seller-content">{children}</main>
    </div>
  </div>;
}

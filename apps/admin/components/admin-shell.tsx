'use client';
import {BUYER_STORE_URL,SELLER_CENTER_URL} from '../../../shared/app-links';
import { useState } from 'react';
import { logoutAdminSession } from '../lib/client-api';

export function AdminShell({children,active='overview'}:{children:React.ReactNode;active?:string}){
  const [loggingOut,setLoggingOut]=useState(false);
  const items=[
    ['overview','/','Tổng quan'],['products','/products','Duyệt sản phẩm'],['reviews','/reviews','Đánh giá'],['after-sales','/after-sales','Khiếu nại & hoàn tiền'],['sellers','/seller-applications','Seller applications'],['users','/users','Người dùng'],['orders','/orders','Đơn hàng'],['payments','/payments','Thanh toán'],['finance','/finance','Tài chính & rút tiền'],['analytics','/analytics','Phân tích & báo cáo'],['cms','/cms','CMS & Homepage'],['admins','/admins','Admin & quyền'],['audit','/audit-logs','Audit logs'],['settings','/settings','Cài đặt'],
  ];
  async function logout(){if(loggingOut)return;setLoggingOut(true);await logoutAdminSession();window.location.href='/login';}
  return <div className="admin-app">
    <aside className="admin-sidebar">
      <a className="admin-logo" href="/"><strong>XIII</strong><span>ADMIN</span></a>
      <div className="admin-role"><span>A</span><div><b>Marketplace Admin</b><small>Operations workspace</small></div></div>
      <nav>{items.map(([key,href,label])=><a key={key} href={href} className={active===key?'active':''}>{label}{href==='#'&&<small>soon</small>}</a>)}</nav>
      <div className="admin-side-bottom"><a href={BUYER_STORE_URL} target="_blank">Buyer Store ↗</a><a href={SELLER_CENTER_URL} target="_blank">Seller Center ↗</a><button disabled={loggingOut} onClick={logout}>{loggingOut?'Đang đăng xuất…':'Đăng xuất'}</button></div>
    </aside>
    <div className="admin-workspace"><header className="admin-topbar"><div><b>Marketplace Administration</b><span>Review queue & governance</span></div><div className="admin-live">● API live</div></header><main className="admin-content">{children}</main></div>
  </div>;
}

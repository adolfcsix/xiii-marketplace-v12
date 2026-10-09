'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BagIcon, BellIcon, HeartIcon, MenuIcon, MessageIcon, SearchIcon, UserIcon } from './icons';
import { clientApi, hasSession, logoutBuyerSession } from '../lib/client-api';
import { buyerSocket, disconnectBuyerSocket } from '../lib/realtime';

type MiniCart={summary:{itemCount:number}};

export function SiteHeader(){
  const router=useRouter();
  const pathname=usePathname();
  const [cartCount,setCartCount]=useState(0);
  const [loggedIn,setLoggedIn]=useState(false);
  const [chatCount,setChatCount]=useState(0);
  const [notificationCount,setNotificationCount]=useState(0);
  const [loggingOut,setLoggingOut]=useState(false);
  const syncVersion=useRef(0);
  const sync=useCallback(async(event?:Event)=>{
    const version=++syncVersion.current;const known=(event as CustomEvent<{itemCount?:number}>|undefined)?.detail?.itemCount;if(typeof known==='number')setCartCount(known);
    if(!hasSession()){setCartCount(0);setChatCount(0);setNotificationCount(0);return;}
    try{const [cart,chat,notifications]=await Promise.allSettled([clientApi<MiniCart>('/cart'),clientApi<{unreadCount:number}>('/chat/unread-count'),clientApi<{unreadCount:number}>('/notifications/unread-count')]);if(!hasSession()||version!==syncVersion.current)return;if(cart.status==='fulfilled')setCartCount(cart.value.summary.itemCount||0);if(chat.status==='fulfilled')setChatCount(chat.value.unreadCount||0);if(notifications.status==='fulfilled')setNotificationCount(notifications.value.unreadCount||0);}catch{setCartCount(0);}
  },[]);
  useEffect(()=>{
    const active=hasSession();
    setLoggedIn(active);
    sync();
    window.addEventListener('xiii-cart-updated',sync);
    window.addEventListener('xiii-notifications-updated',sync);
    const socket=active?buyerSocket():null;
    const onNotif=()=>setNotificationCount(n=>n+1);
    const onNotifCount=(p:{unreadCount:number})=>setNotificationCount(p.unreadCount||0);
    const onChat=(p:{unreadCount:number})=>setChatCount(p.unreadCount||0);
    const onSessionCleared=()=>{syncVersion.current++;setLoggedIn(false);setCartCount(0);setChatCount(0);setNotificationCount(0);};
    socket?.on('notification:new',onNotif);
    socket?.on('notification:count',onNotifCount);
    socket?.on('chat:unread',onChat);
    window.addEventListener('xiii-buyer-session-cleared',onSessionCleared);
    return()=>{
      window.removeEventListener('xiii-cart-updated',sync);
      window.removeEventListener('xiii-notifications-updated',sync);
      window.removeEventListener('xiii-buyer-session-cleared',onSessionCleared);
      socket?.off('notification:new',onNotif);
      socket?.off('notification:count',onNotifCount);
      socket?.off('chat:unread',onChat);
    };
  },[sync]);

  async function logout(){
    if(loggingOut)return;
    setLoggingOut(true);
    await logoutBuyerSession();
    disconnectBuyerSocket();
    window.location.href='/login';
  }

  return <>
    <div className="utility-bar"><div className="utility-inner"><span>Local brands · Thời trang theo gu của bạn</span><div><Link prefetch={false} href="/account/orders">Theo dõi đơn hàng</Link><span>·</span><Link prefetch={false} href="/help">Hỗ trợ</Link><span>·</span><Link prefetch={false} href="/seller-apply">Trở thành người bán</Link></div></div></div>
    <header className="site-header">
      <div className="header-main">
        <Link prefetch={false} className="xiii-logo logo-depth" data-depth="logo" href="/" aria-label="XIII home"><span className="logo-face" aria-hidden="true">XIII</span></Link>
        <form action="/search" className="global-search" onSubmit={event=>{event.preventDefault();const q=String(new FormData(event.currentTarget).get("q")||"").trim();router.push("/search"+(q?"?q="+encodeURIComponent(q):""));}}><input name="q" placeholder="Tìm sản phẩm, thương hiệu, shop..." aria-label="Tìm kiếm"/><button aria-label="Tìm kiếm"><SearchIcon size={23}/></button></form>
        <nav className="header-actions" aria-label="Tài khoản">
          <Link prefetch={false} className="icon-link" href="/wishlist" title="Yêu thích"><HeartIcon size={23}/></Link>
          {loggedIn&&<Link prefetch={false} className="icon-link bag-link" href="/account/messages" title="Tin nhắn"><MessageIcon size={23}/>{chatCount>0&&<span className="action-badge">{chatCount>99?'99+':chatCount}</span>}</Link>}
          {loggedIn&&<Link prefetch={false} className="icon-link bag-link" href="/account/notifications" title="Thông báo"><BellIcon size={23}/>{notificationCount>0&&<span className="action-badge">{notificationCount>99?'99+':notificationCount}</span>}</Link>}
          <Link prefetch={false} className="icon-link bag-link" href="/cart" title="Giỏ hàng"><BagIcon size={23}/>{cartCount>0&&<span className="action-badge">{cartCount>99?'99+':cartCount}</span>}</Link>
          {loggedIn?<details className="account-menu"><summary className="account-link"><span className="avatar-mini"><UserIcon size={17}/></span><span>Tài khoản</span></summary><div className="account-menu-popover"><Link prefetch={false} href="/account/orders">Đơn mua</Link><Link prefetch={false} href="/account/returns">Trả hàng & hoàn tiền</Link><Link prefetch={false} href="/account/reviews">Đánh giá</Link><Link prefetch={false} href="/account/messages">Tin nhắn</Link><Link prefetch={false} href="/account/notifications">Thông báo</Link><button type="button" disabled={loggingOut} onClick={logout}>{loggingOut?'Đang đăng xuất…':'Đăng xuất'}</button></div></details>:<Link prefetch={false} className="account-link" href="/login"><span className="avatar-mini"><UserIcon size={17}/></span><span>Đăng nhập</span></Link>}
        </nav>
      </div>
      <div className="header-nav">
        <Link prefetch={false} className="category-menu" href="/search"><MenuIcon size={18}/>Danh mục</Link>
        <nav className="primary-nav" aria-label="Danh mục chính"><Link prefetch={false} href="/" aria-current={pathname==='/'?'page':undefined}>Trang chủ</Link><Link prefetch={false} href="/search?sort=newest">Sản phẩm mới</Link><Link prefetch={false} href="/search">Local Brand</Link><Link prefetch={false} href="/search">Streetwear</Link><Link prefetch={false} href="/search?category=phu-kien">Phụ kiện</Link><Link prefetch={false} className="sale-nav" href="/search?q=sale">Sale</Link><Link prefetch={false} href="/search?sort=newest">Bộ sưu tập</Link><Link prefetch={false} href="/outfit" aria-current={pathname==='/outfit'?'page':undefined}>Phòng phối đồ</Link><Link prefetch={false} href="/wishlist">Đã lưu</Link></nav>
        <div className="header-nav-right"><Link prefetch={false} href="/seller-apply">Bán hàng trên XIII</Link><Link prefetch={false} href="/help">Hỗ trợ</Link></div>
      </div>
    </header>
  </>;
}

'use client';

import { useEffect } from 'react';
import { disconnectSellerSocket } from '../lib/realtime';

function loginUrl() {
  const next = window.location.pathname + window.location.search + window.location.hash;
  return '/login?next=' + encodeURIComponent(next || '/');
}

export function SessionLifecycle() {
  useEffect(() => {
    const onCleared = (event: Event) => {
      disconnectSellerSocket();
      const reason = (event as CustomEvent<{reason?:string}>).detail?.reason;
      if (reason === 'expired' && window.location.pathname !== '/login') window.location.href = loginUrl();
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || !['xiii_seller_access','xiii_seller_refresh'].includes(event.key)) return;
      const hasSession = Boolean(localStorage.getItem('xiii_seller_access') || localStorage.getItem('xiii_seller_refresh'));
      if (!hasSession) {
        disconnectSellerSocket();
        if (window.location.pathname !== '/login') window.location.href = loginUrl();
      }
    };
    window.addEventListener('xiii-seller-session-cleared', onCleared as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('xiii-seller-session-cleared', onCleared as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return null;
}

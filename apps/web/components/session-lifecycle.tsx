'use client';

import { useEffect } from 'react';
import { disconnectBuyerSocket } from '../lib/realtime';

function loginUrl() {
  const next = window.location.pathname + window.location.search + window.location.hash;
  return '/login?next=' + encodeURIComponent(next || '/');
}

export function SessionLifecycle() {
  useEffect(() => {
    const onCleared = (event: Event) => {
      disconnectBuyerSocket();
      const reason = (event as CustomEvent<{reason?:string}>).detail?.reason;
      if (reason === 'expired' && window.location.pathname !== '/login') window.location.href = loginUrl();
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || !['xiii_access','xiii_refresh'].includes(event.key)) return;
      const hasSession = Boolean(localStorage.getItem('xiii_access') || localStorage.getItem('xiii_refresh'));
      if (!hasSession) {
        disconnectBuyerSocket();
        if (window.location.pathname !== '/login') window.location.href = loginUrl();
      }
    };
    window.addEventListener('xiii-buyer-session-cleared', onCleared as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('xiii-buyer-session-cleared', onCleared as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return null;
}

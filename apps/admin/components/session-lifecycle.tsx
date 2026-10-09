'use client';

import { useEffect } from 'react';

function loginUrl() {
  const next = window.location.pathname + window.location.search + window.location.hash;
  return '/login?next=' + encodeURIComponent(next || '/');
}

export function SessionLifecycle() {
  useEffect(() => {
    const onCleared = (event: Event) => {
      const reason = (event as CustomEvent<{reason?:string}>).detail?.reason;
      if (reason === 'expired' && window.location.pathname !== '/login') window.location.href = loginUrl();
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || !['xiii_admin_access','xiii_admin_refresh'].includes(event.key)) return;
      const hasSession = Boolean(localStorage.getItem('xiii_admin_access') || localStorage.getItem('xiii_admin_refresh'));
      if (!hasSession && window.location.pathname !== '/login') window.location.href = loginUrl();
    };
    window.addEventListener('xiii-admin-session-cleared', onCleared as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('xiii-admin-session-cleared', onCleared as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return null;
}

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

type Envelope<T> = { success: boolean; data?: T; message?: string; code?: string };
type SessionClearReason = 'logout' | 'expired';

export class AdminApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code; }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204 && response.ok) return undefined as T;
  let json: Envelope<T>;
  try { json = await response.json(); } catch { throw new AdminApiError('Máy chủ chưa phản hồi hợp lệ. Vui lòng thử lại.', response.status); }
  if (!json || !response.ok || !json.success) throw new AdminApiError(json?.message || json?.code || 'API_ERROR', response.status, json?.code);
  return json.data as T;
}

export function clearAdminSession(reason: SessionClearReason = 'logout') {
  if (typeof window === 'undefined') return;
  sessionEpoch += 1;
  localStorage.removeItem('xiii_admin_access');
  localStorage.removeItem('xiii_admin_refresh');
  localStorage.removeItem('xiii_admin_user');
  window.dispatchEvent(new CustomEvent('xiii-admin-session-cleared', { detail: { reason } }));
}

let sessionEpoch = 0;
let refreshPromise: Promise<string | null> | null = null;

async function performRefreshAccessToken() {
  const epoch=sessionEpoch;
  const refreshToken = localStorage.getItem('xiii_admin_refresh');
  if (!refreshToken) {
    clearAdminSession('expired');
    return null;
  }
  let response: Response;
  try {
    response = await fetch(API + '/auth/refresh', { signal: AbortSignal.timeout(15000), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
  } catch {
    throw new AdminApiError('Kết nối bị gián đoạn. Vui lòng thử lại.', 503);
  }
  if(epoch!==sessionEpoch || localStorage.getItem('xiii_admin_refresh')!==refreshToken)return null;
  if (response.status === 401 || response.status === 403) {
    clearAdminSession('expired');
    return null;
  }
  if (!response.ok) throw new AdminApiError('Máy chủ đang bận. Vui lòng thử lại.', response.status);
  const json = await response.json().catch(() => { throw new AdminApiError('Máy chủ chưa phản hồi hợp lệ.', 502); }) as Envelope<{accessToken:string;refreshToken:string;user?:unknown}>;
  if (!json || !json.success || !json.data?.accessToken || !json.data?.refreshToken) {
    clearAdminSession('expired');
    return null;
  }
  if(epoch!==sessionEpoch || localStorage.getItem('xiii_admin_refresh')!==refreshToken)return null;
  localStorage.setItem('xiii_admin_access', json.data.accessToken);
  localStorage.setItem('xiii_admin_refresh', json.data.refreshToken);
  if (json.data.user) localStorage.setItem('xiii_admin_user', JSON.stringify(json.data.user));
  return json.data.accessToken;
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = performRefreshAccessToken().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function adminApi<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  let accessToken = localStorage.getItem('xiii_admin_access');
  const request = () => {
    const headers = new Headers(init?.headers);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (accessToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(API + path, { ...init, headers, signal: init?.signal ?? AbortSignal.timeout(20000) });
  };

  let response = await request();
  if (response.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) { accessToken = refreshed; response = await request(); }
  }
  if (response.status === 401 && retry) clearAdminSession('expired');
  return parse<T>(response);
}

export async function logoutAdminSession() {
  try {
    if (hasAdminSession()) await adminApi<{loggedOut:boolean}>('/auth/logout', { method: 'POST' });
  } catch {
    // Local logout is guaranteed even during an API outage.
  } finally {
    clearAdminSession('logout');
  }
}

export function hasAdminSession() { return typeof window !== 'undefined' && Boolean(localStorage.getItem('xiii_admin_access') || localStorage.getItem('xiii_admin_refresh')); }

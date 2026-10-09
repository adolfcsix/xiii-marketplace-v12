export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

type Envelope<T> = { success: boolean; data?: T; message?: string; code?: string };
type SessionClearReason = 'logout' | 'expired';

export class SellerApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message); this.status = status; this.code = code;
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204 && response.ok) return undefined as T;
  let json: Envelope<T>;
  try { json = await response.json(); } catch { throw new SellerApiError('Máy chủ chưa phản hồi hợp lệ. Vui lòng thử lại.', response.status); }
  if (!json || !response.ok || !json.success) throw new SellerApiError(json?.message || json?.code || 'API_ERROR', response.status, json?.code);
  return json.data as T;
}

export function clearSellerSession(reason: SessionClearReason = 'logout') {
  if (typeof window === 'undefined') return;
  sessionEpoch += 1;
  localStorage.removeItem('xiii_seller_access');
  localStorage.removeItem('xiii_seller_refresh');
  localStorage.removeItem('xiii_seller_user');
  window.dispatchEvent(new CustomEvent('xiii-seller-session-cleared', { detail: { reason } }));
}

let sessionEpoch = 0;
let refreshPromise: Promise<string | null> | null = null;

async function performRefreshAccessToken() {
  const epoch=sessionEpoch;
  const refreshToken = localStorage.getItem('xiii_seller_refresh');
  if (!refreshToken) {
    clearSellerSession('expired');
    return null;
  }
  let response: Response;
  try {
    response = await fetch(API + '/auth/refresh', {
      signal: AbortSignal.timeout(15000), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
    });
  } catch {
    throw new SellerApiError('Kết nối bị gián đoạn. Vui lòng thử lại.', 503);
  }
  if(epoch!==sessionEpoch || localStorage.getItem('xiii_seller_refresh')!==refreshToken)return null;
  if (response.status === 401 || response.status === 403) {
    clearSellerSession('expired');
    return null;
  }
  if (!response.ok) throw new SellerApiError('Máy chủ đang bận. Vui lòng thử lại.', response.status);
  const json = await response.json().catch(() => { throw new SellerApiError('Máy chủ chưa phản hồi hợp lệ.', 502); }) as Envelope<{accessToken:string;refreshToken:string;user?:unknown}>;
  if (!json || !json.success || !json.data?.accessToken || !json.data?.refreshToken) {
    clearSellerSession('expired');
    return null;
  }
  if(epoch!==sessionEpoch || localStorage.getItem('xiii_seller_refresh')!==refreshToken)return null;
  localStorage.setItem('xiii_seller_access', json.data.accessToken);
  localStorage.setItem('xiii_seller_refresh', json.data.refreshToken);
  if (json.data.user) localStorage.setItem('xiii_seller_user', JSON.stringify(json.data.user));
  window.dispatchEvent(new Event('xiii-seller-token-refreshed'));
  return json.data.accessToken;
}

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = performRefreshAccessToken().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function sellerApi<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  let accessToken = localStorage.getItem('xiii_seller_access');
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
  if (response.status === 401 && retry) clearSellerSession('expired');
  return parse<T>(response);
}

export async function logoutSellerSession() {
  try {
    if (hasSellerSession()) await sellerApi<{loggedOut:boolean}>('/auth/logout', { method: 'POST' });
  } catch {
    // Always complete local logout, even if the API cannot be reached.
  } finally {
    clearSellerSession('logout');
  }
}

export function hasSellerSession() {
  return typeof window !== 'undefined' && Boolean(localStorage.getItem('xiii_seller_access') || localStorage.getItem('xiii_seller_refresh'));
}

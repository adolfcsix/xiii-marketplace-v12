export function configuredOrigin(value: string | undefined, fallback: string) {
  try {
    const url = new URL(value || fallback);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : fallback;
  } catch { return fallback; }
}

export const BUYER_STORE_URL = configuredOrigin(process.env.NEXT_PUBLIC_WEB_URL, 'http://localhost:3000');
export const SELLER_CENTER_URL = configuredOrigin(process.env.NEXT_PUBLIC_SELLER_URL, 'http://localhost:3001');

export function isOutfitArtworkUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value || /[\s\\]/.test(value)) return false;
  if (value.startsWith('/')) return value.length > 1 && !value.startsWith('//');
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    return url.protocol === 'https:' || (url.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '9000');
  } catch { return false; }
}

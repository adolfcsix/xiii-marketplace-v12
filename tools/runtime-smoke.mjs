const API = (process.env.API_BASE || 'http://localhost:4000/api/v1').replace(/\/$/, '');
const WEB = process.env.WEB_BASE || 'http://localhost:3000';
const SELLER = process.env.SELLER_BASE || 'http://localhost:3001';
const ADMIN = process.env.ADMIN_BASE || 'http://localhost:3002';
const PASSWORD = process.env.SEED_PASSWORD || 'Xiii12345!';

const results = [];
const push = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); };

async function json(path, init = {}) {
  const response = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok || body?.success === false) throw new Error(`${response.status} ${body?.code || body?.message || response.statusText}`);
  return body?.data ?? body;
}

async function login(email) {
  return await json('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: PASSWORD }) });
}

async function authed(path, token) { return await json(path, { headers: { Authorization: `Bearer ${token}` } }); }

async function checkHttp(name, url) {
  try { const r = await fetch(url, { redirect: 'manual' }); push(name, r.status >= 200 && r.status < 500, `HTTP ${r.status}`); }
  catch (e) { push(name, false, e.message); }
}

await checkHttp('Buyer frontend', WEB);
await checkHttp('Seller frontend', SELLER);
await checkHttp('Admin frontend', ADMIN);

for (const [name, path] of [
  ['API live', '/health/live'],
  ['API ready', '/health/ready'],
  ['Public products', '/products?limit=2'],
  ['Public categories', '/categories'],
  ['Public brands', '/brands'],
  ['Public CMS', '/cms/home'],
  ['Public marketplace settings', '/settings/public'],
]) {
  try { await json(path); push(name, true); } catch (e) { push(name, false, e.message); }
}

const actors = [
  ['Buyer', 'buyer@xiii.local'],
  ['Seller', 'seller@xiii.local'],
  ['Admin', 'admin@xiii.local'],
];
const sessions = {};
for (const [name, email] of actors) {
  try {
    const data = await login(email);
    sessions[name] = { accessToken: data.accessToken, refreshToken: data.refreshToken };
    push(`${name} login`, Boolean(data.accessToken && data.refreshToken));
  } catch (e) { push(`${name} login`, false, e.message); }
}

const buyerChecks = ['/users/me','/users/me/addresses','/cart','/orders?limit=2','/notifications/unread-count','/reviews/mine?limit=2'];
const sellerChecks = ['/seller/access/me','/seller/products?limit=2','/seller/orders?limit=2','/seller/inventory?limit=2','/seller/finance/summary'];
const adminChecks = ['/admin/users?limit=2','/admin/products?limit=2','/admin/orders?limit=2','/admin/payments?limit=2','/admin/settings'];
for (const [actor, paths] of [['Buyer',buyerChecks],['Seller',sellerChecks],['Admin',adminChecks]]) {
  const session = sessions[actor];
  if (!session?.accessToken) continue;
  for (const path of paths) {
    try { const data=await authed(path, session.accessToken); push(`${actor} GET ${path}`, path!=='/users/me/addresses'||(Array.isArray(data)&&data.length>0), path==='/users/me/addresses'?`addresses: ${data?.length ?? 'invalid'}`:''); }
    catch (e) { push(`${actor} GET ${path}`, false, e.message); }
  }
}


for (const [actor] of actors) {
  const session = sessions[actor];
  if (!session?.accessToken || !session?.refreshToken) continue;
  try {
    await json('/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}` }, body: '{}' });
    push(`${actor} logout`, true);
    const response = await fetch(`${API}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: session.refreshToken }) });
    push(`${actor} refresh revoked after logout`, response.status === 401, `HTTP ${response.status}`);
  } catch (e) { push(`${actor} logout`, false, e.message); }
}

const failed = results.filter(r => !r.ok);
console.log(`\nSmoke summary: ${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) process.exitCode = 1;

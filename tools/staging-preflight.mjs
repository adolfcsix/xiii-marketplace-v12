import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const file = process.env.STAGING_ENV_FILE || '.env.staging';
const errors = [];
const warnings = [];
const ok = [];

function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

function commandWorks(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'ignore', shell: process.platform === 'win32' });
  return !r.error && r.status === 0;
}
function fail(m) { errors.push(m); }
function warn(m) { warnings.push(m); }
function pass(m) { ok.push(m); }

if (!fs.existsSync(file)) {
  fail(`${file} is missing. Copy .env.staging.example and replace every placeholder.`);
} else {
  const env = parseEnv(fs.readFileSync(file, 'utf8'));
  const required = [
    'MONGODB_URI','REDIS_PASSWORD','REDIS_URL','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','PAYOUT_ENCRYPTION_KEY',
    'WEB_URL','SELLER_URL','ADMIN_URL','API_PUBLIC_URL','NEXT_PUBLIC_API_URL','NEXT_PUBLIC_SOCKET_URL','CORS_ORIGINS',
    'STAGING_WEB_HOST','STAGING_SELLER_HOST','STAGING_ADMIN_HOST','STAGING_API_HOST',
    'STORAGE_ENDPOINT','STORAGE_BUCKET','STORAGE_ACCESS_KEY_ID','STORAGE_SECRET_ACCESS_KEY','STORAGE_PUBLIC_BASE_URL'
  ];
  for (const key of required) {
    const value = env[key] || '';
    if (!value) fail(`${key} is empty`);
    else if (/REPLACE|example\.com|YOUR_STAGING|YOUR_/i.test(value)) fail(`${key} still contains a placeholder`);
  }
  for (const key of ['JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','PAYOUT_ENCRYPTION_KEY']) {
    if ((env[key] || '').length < 48) fail(`${key} must be at least 48 characters for staging`);
  }
  if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) fail('JWT access and refresh secrets must be different');
  if (env.MONGODB_URI && !env.MONGODB_URI.includes('replicaSet=rs0')) fail('MONGODB_URI must include replicaSet=rs0 because checkout/order flows use MongoDB transactions');
  if ((env.REDIS_PASSWORD || '').length < 24) fail('REDIS_PASSWORD must be at least 24 characters');
  if (env.CORS_ORIGINS?.includes('*')) fail('CORS_ORIGINS must not contain *');
  for (const key of ['WEB_URL','SELLER_URL','ADMIN_URL','API_PUBLIC_URL','NEXT_PUBLIC_API_URL','NEXT_PUBLIC_SOCKET_URL','STORAGE_PUBLIC_BASE_URL']) {
    const value = env[key];
    if (value && !value.startsWith('https://')) fail(`${key} must use https:// in staging`);
  }
  const momo = ['MOMO_PARTNER_CODE','MOMO_ACCESS_KEY','MOMO_SECRET_KEY'].map(k => Boolean(env[k]));
  if (momo.some(Boolean) && !momo.every(Boolean)) fail('MoMo credentials must be either all configured or all empty');
  const vnpay = ['VNPAY_TMN_CODE','VNPAY_HASH_SECRET'].map(k => Boolean(env[k]));
  if (vnpay.some(Boolean) && !vnpay.every(Boolean)) fail('VNPAY credentials must be either all configured or all empty');
}

commandWorks('docker', ['--version']) ? pass('Docker available') : fail('Docker is unavailable');
commandWorks('docker', ['compose','version']) ? pass('Docker Compose available') : fail('Docker Compose is unavailable');
if (fs.existsSync('package-lock.json')) pass('package-lock.json present');
else warnings.push('package-lock.json is missing. Deployment can build, but dependency resolution is not reproducible. Generate and commit it after a successful npm install.');

for (const m of ok) console.log(`PASS ${m}`);
for (const m of warnings) console.log(`WARN ${m}`);
for (const m of errors) console.error(`FAIL ${m}`);
if (errors.length) {
  console.error(`\nStaging preflight failed with ${errors.length} blocking issue(s).`);
  process.exit(1);
}
console.log('\nStaging preflight passed.');

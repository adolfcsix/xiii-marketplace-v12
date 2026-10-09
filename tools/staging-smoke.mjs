import fs from 'node:fs';

const file = process.env.STAGING_ENV_FILE || '.env.staging';
if (!fs.existsSync(file)) throw new Error(`${file} is missing`);
const env = {};
for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 1) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
}

async function check(label, url, validate) {
  const started = Date.now();
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10_000), headers: { 'user-agent': 'xiii-staging-smoke/1.0' } });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (validate && !validate(text, response)) throw new Error('unexpected response payload');
    console.log(`PASS ${label} ${response.status} ${Date.now() - started}ms`);
  } catch (error) {
    console.error(`FAIL ${label}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

const api = env.API_PUBLIC_URL;
const expectedRelease = process.env.EXPECTED_RELEASE || '';
await check('API liveness', `${api}/api/v1/health/live`, text => text.includes('xiii-api') && (!expectedRelease || text.includes(expectedRelease)));
await check('API readiness', `${api}/api/v1/health/ready`, text => text.includes('ready'));
await check('Buyer web', env.WEB_URL, text => text.toLowerCase().includes('xiii'));
await check('Seller login', `${env.SELLER_URL}/login`, text => text.toLowerCase().includes('xiii'));
await check('Admin login', `${env.ADMIN_URL}/login`, text => text.toLowerCase().includes('xiii'));
await check('Public categories', `${api}/api/v1/categories`, text => text.includes('success'));
await check('Public brands', `${api}/api/v1/brands`, text => text.includes('success'));
await check('Homepage CMS', `${api}/api/v1/cms/home`, text => text.includes('success'));

if (process.exitCode) throw new Error('Staging smoke test failed.');
console.log('\nStaging smoke PASS: public surfaces and API dependencies are reachable.');

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  'e2e/playwright.config.ts',
  'e2e/helpers/session.ts',
  'e2e/tests/marketplace-flow.spec.ts',
  'e2e/tests/security-smoke.spec.ts',
  'e2e/tests/auth-session.spec.ts',
  'tools/e2e-stack.mjs',
  'docs/E2E_BROWSER_TESTING.md',
];
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) failures.push(`missing ${rel}`);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['e2e','e2e:stack','e2e:install','verify:e2e']) if (!pkg.scripts?.[script]) failures.push(`missing package script ${script}`);
if (!pkg.devDependencies?.['@playwright/test']) failures.push('missing @playwright/test devDependency');

const flow = fs.readFileSync(path.join(root, 'e2e/tests/marketplace-flow.spec.ts'), 'utf8');
for (const marker of ['xiii-hoodie-gray','Tiếp tục thanh toán','checkout-place','Bắt đầu đóng gói','Bàn giao vận chuyển','Đã nhận hàng','Đánh giá','/orders']) {
  if (!flow.includes(marker)) failures.push(`critical E2E marker missing: ${marker}`);
}
const authFlow = fs.readFileSync(path.join(root, 'e2e/tests/auth-session.spec.ts'), 'utf8');
for (const marker of ['logout revokes refresh token','/auth/refresh','invalid refresh token']) if (!authFlow.includes(marker)) failures.push(`auth E2E marker missing: ${marker}`);

const orchestrator = fs.readFileSync(path.join(root, 'tools/e2e-stack.mjs'), 'utf8');
for (const marker of ['docker','compose','runtime:preflight','seed','playwright','health/ready']) if (!orchestrator.includes(marker)) failures.push(`orchestrator marker missing: ${marker}`);

if (failures.length) {
  for (const failure of failures) console.error('FAIL:', failure);
  process.exit(1);
}
console.log('E2E verification passed: Playwright config, critical commerce flow, security/auth-session smoke and one-shot stack orchestrator are present.');

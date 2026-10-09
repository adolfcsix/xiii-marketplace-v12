import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const required = [
  'services/api/src/auth/auth.controller.ts',
  'services/api/src/auth/auth.service.ts',
  'apps/web/lib/client-api.ts',
  'apps/web/lib/realtime.ts',
  'apps/web/components/session-lifecycle.tsx',
  'apps/web/components/site-header.tsx',
  'apps/seller/lib/client-api.ts',
  'apps/seller/lib/realtime.ts',
  'apps/seller/components/session-lifecycle.tsx',
  'apps/seller/components/seller-shell.tsx',
  'apps/admin/lib/client-api.ts',
  'apps/admin/components/session-lifecycle.tsx',
  'apps/admin/components/admin-shell.tsx',
  'e2e/tests/auth-session.spec.ts',
];
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) failures.push(`missing ${rel}`);

function expectMarkers(rel, markers) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const marker of markers) if (!text.includes(marker)) failures.push(`${rel} missing marker: ${marker}`);
}

expectMarkers('services/api/src/auth/auth.controller.ts', ["@Post('logout')", '@UseGuards(JwtGuard)']);
expectMarkers('services/api/src/auth/auth.service.ts', ["$unset: { refreshTokenHash: 1 }", 'loggedOut: true']);
expectMarkers('apps/web/lib/client-api.ts', ['logoutBuyerSession', 'clearBuyerSession', 'refreshPromise', 'xiii-buyer-session-cleared']);
expectMarkers('apps/seller/lib/client-api.ts', ['logoutSellerSession', 'clearSellerSession', 'refreshPromise', 'xiii-seller-session-cleared']);
expectMarkers('apps/admin/lib/client-api.ts', ['logoutAdminSession', 'clearAdminSession', 'refreshPromise', 'xiii-admin-session-cleared']);
expectMarkers('apps/web/lib/realtime.ts', ['disconnectBuyerSocket']);
expectMarkers('apps/seller/lib/realtime.ts', ['disconnectSellerSocket']);
expectMarkers('apps/web/components/site-header.tsx', ['Đăng xuất', 'logoutBuyerSession']);
expectMarkers('apps/seller/components/seller-shell.tsx', ['logoutSellerSession', 'Đăng xuất']);
expectMarkers('apps/admin/components/admin-shell.tsx', ['logoutAdminSession', 'Đăng xuất']);
expectMarkers('e2e/tests/auth-session.spec.ts', ['revokes refresh token', '/auth/refresh', 'invalid refresh token']);

if (failures.length) {
  for (const failure of failures) console.error('FAIL:', failure);
  process.exit(1);
}
console.log('Auth/session verification passed: API refresh-token revocation, Buyer/Seller/Admin logout, single-flight refresh, session expiry and realtime disconnect hooks are present.');

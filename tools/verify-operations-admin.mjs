import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const ts=require('typescript');const read=f=>fs.readFileSync(f,'utf8');
const required=[
  'services/api/src/users/admin-users.controller.ts','services/api/src/users/users.service.ts','services/api/src/users/users.dto.ts',
  'services/api/src/sellers/sellers.controller.ts','services/api/src/sellers/sellers.service.ts','services/api/src/sellers/sellers.dto.ts',
  'services/api/src/shops/shops.service.ts','services/api/src/shops/shops.dto.ts','services/api/src/auth/jwt.strategy.ts',
  'apps/admin/app/users/page.tsx','apps/admin/app/users/[id]/page.tsx','apps/admin/components/admin-users-client.tsx','apps/admin/components/admin-user-detail-client.tsx',
  'apps/admin/app/seller-applications/page.tsx','apps/admin/app/seller-applications/[id]/page.tsx','apps/admin/components/admin-seller-applications-client.tsx','apps/admin/components/admin-seller-application-detail-client.tsx',
  'apps/seller/app/settings/page.tsx','apps/seller/components/seller-settings-client.tsx','docs/OPERATIONS_ADMIN_SHOP_SETTINGS.md'
];
for(const f of required){if(!fs.existsSync(f)||fs.statSync(f).size<60)throw new Error('Missing/incomplete '+f)}
const sources={users:read('services/api/src/users/admin-users.controller.ts'),usersSvc:read('services/api/src/users/users.service.ts'),sellerCtrl:read('services/api/src/sellers/sellers.controller.ts'),sellerSvc:read('services/api/src/sellers/sellers.service.ts'),shopSvc:read('services/api/src/shops/shops.service.ts'),jwt:read('services/api/src/auth/jwt.strategy.ts'),adminShell:read('apps/admin/components/admin-shell.tsx'),sellerShell:read('apps/seller/components/seller-shell.tsx'),seed:read('services/api/src/database/seed.ts')};
const checks=[
  [sources.users,"@Controller('admin/users')",'admin users controller'],[sources.users,"@AdminPermissions('USERS_MANAGE')",'users permission'],[sources.users,"@Patch(':id/status')",'user status endpoint'],[sources.users,"@Patch(':id/verification')",'verification endpoint'],
  [sources.usersSvc,'refreshTokenHash = undefined','block revokes refresh token'],[sources.usersSvc,'CANNOT_BLOCK_SELF','self block protection'],
  [sources.jwt,"user.status !== 'ACTIVE'",'live JWT account status check'],
  [sources.sellerCtrl,"@Get('admin/seller-applications/:id')",'seller application detail'],[sources.sellerCtrl,"@Post('admin/seller-applications/:id/review')",'under-review action'],
  [sources.sellerSvc,'session.withTransaction','seller approval transaction'],[sources.sellerSvc,"REJECTION_REASON_REQUIRED",'seller rejection reason'],[sources.sellerSvc,"SHOP_ROLE_DEFAULTS.OWNER",'owner permission creation'],
  [sources.shopSvc,"['SHOP_SETTINGS']",'shop settings permission'],[sources.shopSvc,'CATEGORY_NOT_FOUND_OR_INACTIVE','category validation'],[sources.shopSvc,'SHOP_SLUG_EXISTS','slug conflict protection'],
  [sources.adminShell,"'/seller-applications'",'seller applications navigation'],[sources.adminShell,"'/users'",'users navigation'],[sources.sellerShell,"'/settings'",'shop settings navigation'],
  [sources.seed,'applicant@xiii.local','pending applicant seed'],[sources.seed,'blocked@xiii.local','blocked user seed'],[sources.seed,"status: 'PENDING'",'pending application seed']
];
for(const [src,tok,label] of checks){if(!src.includes(tok))throw new Error(`Missing ${label}: ${tok}`)}
const files=[];for(const root of ['services/api/src','apps/web','apps/seller','apps/admin']){const walk=d=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(p)&&!p.endsWith('.d.ts'))files.push(p)}};walk(root)}
const diagnostics=[];for(const f of files){const r=ts.transpileModule(read(f),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,emitDecoratorMetadata:true}});for(const d of r.diagnostics??[])if(d.category===ts.DiagnosticCategory.Error)diagnostics.push(`${f}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`)}if(diagnostics.length)throw new Error('Transpile diagnostics:\n'+diagnostics.slice(0,30).join('\n'));
console.log(`Operations/admin verification passed: ${required.length} required files, ${checks.length} behavior markers, ${files.length} parsed sources.`);

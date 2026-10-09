import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url); const ts=require('typescript');
const required=[
  'services/api/src/access-control/access.constants.ts',
  'services/api/src/access-control/access.decorators.ts',
  'services/api/src/access-control/shop-member.schema.ts',
  'services/api/src/access-control/admin-access.schema.ts',
  'services/api/src/access-control/audit-log.schema.ts',
  'services/api/src/access-control/shop-access.service.ts',
  'services/api/src/access-control/access.guards.ts',
  'services/api/src/access-control/audit.service.ts',
  'services/api/src/access-control/audit.interceptor.ts',
  'services/api/src/access-control/access.service.ts',
  'services/api/src/access-control/access.controller.ts',
  'services/api/src/access-control/access-control.module.ts',
  'apps/seller/app/team/page.tsx',
  'apps/seller/components/seller-team-client.tsx',
  'apps/admin/app/admins/page.tsx',
  'apps/admin/components/admin-access-client.tsx',
  'apps/admin/app/audit-logs/page.tsx',
  'apps/admin/components/admin-audit-logs-client.tsx',
  'docs/ACCESS_CONTROL_AUDIT.md'
];
for(const f of required){if(!fs.existsSync(f)||fs.statSync(f).size<80)throw new Error('Missing/incomplete '+f);}
const read=f=>fs.readFileSync(f,'utf8');
const constants=read('services/api/src/access-control/access.constants.ts');
const guards=read('services/api/src/access-control/access.guards.ts');
const shopAccess=read('services/api/src/access-control/shop-access.service.ts');
const service=read('services/api/src/access-control/access.service.ts');
const audit=read('services/api/src/access-control/audit.interceptor.ts');
const app=read('services/api/src/app.module.ts');
const controller=read('services/api/src/access-control/access.controller.ts');
const sellerShell=read('apps/seller/components/seller-shell.tsx');
const adminShell=read('apps/admin/components/admin-shell.tsx');
const seed=read('services/api/src/database/seed.ts');
const sellers=read('services/api/src/sellers/sellers.service.ts');
const products=read('services/api/src/products/products.service.ts');
const orders=read('services/api/src/orders/orders.service.ts');
const finance=read('services/api/src/finance/finance.service.ts');
const checks=[
  [constants,"'TEAM_MANAGE'",'shop team permission'],
  [constants,"'FINANCE_WITHDRAW'",'separate withdraw permission'],
  [constants,"'ADMIN_MANAGE'",'admin management permission'],
  [constants,"'AUDIT_VIEW'",'audit permission'],
  [guards,"user.roles?.includes('SUPER_ADMIN')",'super admin bypass'],
  [shopAccess,'SHOP_PERMISSION_DENIED','shop permission denial'],
  [controller,"@Controller('seller/access')",'seller access routes'],
  [controller,"@Get('team')",'team list route'],
  [controller,"@Controller('admin/access')",'admin access routes'],
  [controller,"@Get('audit-logs')",'audit route'],
  [service,'OWNER_CANNOT_BE_REMOVED','owner protection'],
  [service,'CANNOT_EDIT_OWN_ADMIN_ACCESS','self admin lock'],
  [service,'SUPER_ADMIN_ACCESS_IMMUTABLE','super admin lock'],
  [audit,"['POST','PATCH','PUT','DELETE']",'mutation audit scope'],
  [audit,'bodyKeys:Object.keys(req.body||{})','audit without request body values'],
  [app,'AccessControlModule','access module wiring'],
  [app,'useClass: AuditInterceptor','global audit interceptor'],
  [sellerShell,"'/team'",'seller team navigation'],
  [adminShell,"'/admins'",'admin roles navigation'],
  [adminShell,"'/audit-logs'",'audit navigation'],
  [seed,"manager@xiii.local",'manager seed'],
  [seed,"staff@xiii.local",'staff seed'],
  [seed,"ops@xiii.local",'ops admin seed'],
  [seed,"'SUPER_ADMIN'",'super admin seed role'],
  [sellers,'ShopMember','owner member on seller approval'],
  [products,'ShopAccessService','product shop access integration'],
  [orders,'ShopAccessService','order shop access integration'],
  [finance,'ShopAccessService','finance shop access integration']
];
for(const [src,tok,label] of checks){if(!src.includes(tok))throw new Error('Missing '+label+' ('+tok+')');}
const controllerChecks=[
 ['services/api/src/products/products.controller.ts',"@ShopPermissions('PRODUCT_WRITE')"],
 ['services/api/src/inventory/inventory.controller.ts',"@ShopPermissions('INVENTORY_WRITE')"],
 ['services/api/src/orders/seller-orders.controller.ts',"@ShopPermissions('ORDER_FULFILL')"],
 ['services/api/src/finance/finance.controller.ts',"@ShopPermissions('FINANCE_WITHDRAW')"],
 ['services/api/src/cms/cms.controller.ts',"@AdminPermissions('CMS_MANAGE')"],
 ['services/api/src/products/products.controller.ts',"@AdminPermissions('PRODUCTS_MODERATE')"],
 ['services/api/src/finance/finance.controller.ts',"@AdminPermissions('FINANCE_MANAGE')"]
];
for(const [f,tok] of controllerChecks){if(!read(f).includes(tok))throw new Error(`Missing permission marker ${tok} in ${f}`);}
const files=[];
for(const root of ['services/api/src','apps/web','apps/seller','apps/admin']){
  const walk=d=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(p)&&!p.endsWith('.d.ts'))files.push(p)}}; walk(root);
}
const diagnostics=[];
for(const f of files){
  const r=ts.transpileModule(read(f),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,emitDecoratorMetadata:true}});
  for(const d of r.diagnostics??[])if(d.category===ts.DiagnosticCategory.Error)diagnostics.push(`${f}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`);
}
if(diagnostics.length)throw new Error('Transpile diagnostics:\n'+diagnostics.slice(0,20).join('\n'));
console.log(`Access-control verification passed: ${required.length} required files, ${checks.length+controllerChecks.length} behavior markers, ${files.length} parsed sources.`);

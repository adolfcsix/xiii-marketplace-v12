import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const ts=require('typescript');
const required=[
  'services/api/src/orders/seller-orders.controller.ts','services/api/src/orders/orders.service.ts','services/api/src/orders/orders.dto.ts','services/api/src/orders/order.schema.ts',
  'apps/seller/lib/client-api.ts','apps/seller/components/seller-shell.tsx','apps/seller/components/seller-dashboard-client.tsx','apps/seller/components/seller-orders-client.tsx','apps/seller/components/seller-order-detail-client.tsx',
  'apps/seller/app/login/page.tsx','apps/seller/app/orders/page.tsx','apps/seller/app/orders/[subOrderCode]/page.tsx','docs/SELLER_ORDERS.md'
];
for(const f of required){if(!fs.existsSync(f)||fs.statSync(f).size<100)throw new Error('Missing/incomplete '+f)}
const service=fs.readFileSync('services/api/src/orders/orders.service.ts','utf8');
const controller=fs.readFileSync('services/api/src/orders/seller-orders.controller.ts','utf8');
const detail=fs.readFileSync('apps/seller/components/seller-order-detail-client.tsx','utf8');
const checks=[
 [service,"PAID: 'CONFIRMED'",'online paid -> confirmed transition'],
 [service,"CONFIRMED: 'PACKING'",'confirmed -> packing transition'],
 [service,"PACKING: 'READY_TO_SHIP'",'packing -> ready transition'],
 [service,"READY_TO_SHIP: 'SHIPPED'",'ready -> shipped transition'],
 [service,"SHIPPED: 'DELIVERED'",'shipped -> delivered transition'],
 [service,'shopId: access.shopId','shop membership ownership scope'],
 [service,'TRACKING_CODE_REQUIRED','tracking requirement'],
 [service,'syncMasterStatus','master synchronization'],
 [service,'SELLER_ORDER_CONCURRENT_UPDATE','optimistic state guard'],
 [controller,"@Controller('seller/orders')",'seller route prefix'],
 [controller,"@Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')",'seller RBAC'],
 [controller,"@Patch(':subOrderCode/status')",'status endpoint'],
 [detail,"'/seller/orders/'",'seller detail API usage'],
 [detail,"trackingCode",'seller shipping UI'],
];
for(const [src,token,label] of checks)if(!src.includes(token))throw new Error('Missing '+label);
const sourceFiles=[];const walk=d=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(p)&&!p.endsWith('.d.ts'))sourceFiles.push(p)}};
walk('services/api/src/orders');walk('apps/seller');sourceFiles.push('apps/web/components/order-detail-client.tsx');
for(const f of sourceFiles){const r=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,emitDecoratorMetadata:true}});for(const d of r.diagnostics??[])if(d.category===ts.DiagnosticCategory.Error)throw new Error(`${f}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`)}
console.log(`Seller orders verification passed: ${required.length} required files, ${checks.length} flow/security markers, ${sourceFiles.length} parsed sources.`);

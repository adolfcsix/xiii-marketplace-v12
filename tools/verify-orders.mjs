import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const ts=require('typescript');
const required=[
  'services/api/src/orders/order.schema.ts','services/api/src/orders/orders.dto.ts','services/api/src/orders/orders.service.ts','services/api/src/orders/orders.controller.ts','services/api/src/orders/orders.module.ts',
  'apps/web/components/orders-client.tsx','apps/web/components/order-detail-client.tsx','apps/web/app/account/orders/page.tsx','apps/web/app/account/orders/[orderCode]/page.tsx'
];
for(const f of required){if(!fs.existsSync(f)||fs.statSync(f).size<120)throw new Error('Missing/incomplete '+f)}
const service=fs.readFileSync('services/api/src/orders/orders.service.ts','utf8');
const controller=fs.readFileSync('services/api/src/orders/orders.controller.ts','utf8');
const listUi=fs.readFileSync('apps/web/components/orders-client.tsx','utf8');
const detailUi=fs.readFileSync('apps/web/components/order-detail-client.tsx','utf8');
const checks=[
  [service,"BUYER_CANCELLABLE = ['PENDING_PAYMENT', 'CONFIRMED']",'strict buyer cancel states'],
  [service,"type: 'RELEASE'",'cancel inventory release audit'],
  [service,"type: 'SALE'",'receipt inventory finalize audit'],
  [service,'this.restoreVoucher(order._id, session)','voucher restoration on cancel'],
  [service,"providerResponseCode: 'BUYER_CANCELLED'",'pending payment cancellation'],
  [service,"status: 'COMPLETED'",'confirm-received transition'],
  [controller,"@Post(':orderCode/cancel')",'cancel endpoint'],
  [controller,"@Post(':orderCode/confirm-received')",'confirm-received endpoint'],
  [listUi,"'/orders?'",'buyer order list API'],
  [detailUi,"'/payments/create'",'resume online payment'],
  [detailUi,"/confirm-received",'detail receipt action'],
];
for(const [src,token,label] of checks)if(!src.includes(token))throw new Error('Missing '+label);
const sourceFiles=[];const walk=d=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(p)&&!p.endsWith('.d.ts'))sourceFiles.push(p)}};
walk('services/api/src/orders');walk('apps/web/app/account/orders');sourceFiles.push('apps/web/components/orders-client.tsx','apps/web/components/order-detail-client.tsx','apps/web/components/site-header.tsx','apps/web/components/order-success-client.tsx');
for(const f of sourceFiles){const r=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,emitDecoratorMetadata:true}});for(const d of r.diagnostics??[])if(d.category===ts.DiagnosticCategory.Error)throw new Error(`${f}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`)}
console.log(`Orders verification passed: ${required.length} required files, ${checks.length} flow markers, ${sourceFiles.length} parsed sources.`);

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const ts=require('typescript');
const required=[
  'services/api/src/returns/return.schema.ts','services/api/src/returns/returns.dto.ts','services/api/src/returns/returns.controller.ts','services/api/src/returns/returns.service.ts','services/api/src/returns/returns.module.ts',
  'apps/web/components/returns-client.tsx','apps/web/components/new-return-client.tsx','apps/web/components/return-detail-client.tsx','apps/web/app/account/returns/page.tsx','apps/web/app/account/returns/new/page.tsx','apps/web/app/account/returns/[requestCode]/page.tsx',
  'apps/seller/components/seller-returns-client.tsx','apps/seller/components/seller-return-detail-client.tsx','apps/seller/app/returns/page.tsx','apps/seller/app/returns/[requestCode]/page.tsx',
  'apps/admin/components/admin-after-sales-client.tsx','apps/admin/app/after-sales/page.tsx','docs/AFTER_SALES.md'
];
for(const f of required){if(!fs.existsSync(f)||fs.statSync(f).size<50)throw new Error('Missing/incomplete '+f)}
const controller=fs.readFileSync('services/api/src/returns/returns.controller.ts','utf8');
const service=fs.readFileSync('services/api/src/returns/returns.service.ts','utf8');
const schema=fs.readFileSync('services/api/src/returns/return.schema.ts','utf8');
const orderSchema=fs.readFileSync('services/api/src/orders/order.schema.ts','utf8');
const paymentSchema=fs.readFileSync('services/api/src/payments/payment.schema.ts','utf8');
const seed=fs.readFileSync('services/api/src/database/seed.ts','utf8');
const checks=[
 [controller,"@Controller('returns')",'buyer return API'],[controller,"@Controller('seller/returns')",'seller return API'],[controller,"@Controller('admin/after-sales')",'admin after-sales API'],[controller,"@Roles('ADMIN','SUPER_ADMIN')",'admin RBAC'],
 [service,'RETURN_WINDOW_MS','return window'],[service,'RETURN_QUANTITY_EXCEEDS_PURCHASED','quantity guard'],[service,'session.withTransaction','transactions'],[service,"type:'RETURN'",'inventory return ledger'],[service,"status:'REFUND_PENDING'",'refund queue'],[service,'externalReference','real reconciliation reference'],[service,"'PARTIALLY_REFUNDED'",'partial refund accounting'],
 [schema,'sourceSubOrderStatus','inventory reversal source status'],[schema,'ReturnLineSchema','item-level return snapshot'],[orderSchema,'refundedAmount','order refund accumulator'],[paymentSchema,'refundedAmount','payment refund accumulator'],[seed,'XIII-DEMO-RETURN-001','seeded return test order']
];
for(const [src,token,label] of checks)if(!src.includes(token))throw new Error('Missing '+label);
const files=[];for(const root of ['services/api/src','apps/web','apps/seller','apps/admin']){const walk=d=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(p)&&!p.endsWith('.d.ts'))files.push(p)}};walk(root)}
for(const f of files){const r=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,emitDecoratorMetadata:true}});for(const d of r.diagnostics??[])if(d.category===ts.DiagnosticCategory.Error)throw new Error(`${f}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`)}
console.log(`After-sales verification passed: ${required.length} required files, ${checks.length} lifecycle/security markers, ${files.length} parsed sources.`);

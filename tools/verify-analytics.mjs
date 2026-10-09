import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const ts=require('typescript');
const required=[
  'services/api/src/analytics/analytics-event.schema.ts','services/api/src/analytics/analytics.dto.ts','services/api/src/analytics/analytics.service.ts','services/api/src/analytics/analytics.controller.ts','services/api/src/analytics/analytics.module.ts',
  'apps/seller/components/seller-analytics-client.tsx','apps/seller/app/analytics/page.tsx','apps/admin/components/admin-analytics-client.tsx','apps/admin/app/analytics/page.tsx','docs/ANALYTICS_REPORTS.md'
];
for(const f of required)if(!fs.existsSync(f)||fs.statSync(f).size<80)throw new Error('Missing/incomplete '+f);
const service=fs.readFileSync('services/api/src/analytics/analytics.service.ts','utf8');
const controller=fs.readFileSync('services/api/src/analytics/analytics.controller.ts','utf8');
const products=fs.readFileSync('services/api/src/products/products.service.ts','utf8');
const app=fs.readFileSync('services/api/src/app.module.ts','utf8');
const seller=fs.readFileSync('apps/seller/components/seller-analytics-client.tsx','utf8');
const admin=fs.readFileSync('apps/admin/components/admin-analytics-client.tsx','utf8');
const seed=fs.readFileSync('services/api/src/database/seed.ts','utf8');
const checks=[
  [controller,"@Get('seller/analytics')",'seller analytics route'],[controller,"@Get('admin/analytics')",'admin analytics route'],[controller,"@Roles('ADMIN', 'SUPER_ADMIN')",'admin RBAC'],[service,'ANALYTICS_RANGE_MAX_366_DAYS','range cap'],[service,"timezone: TZ",'timezone aggregation'],[service,'orderPerViewRate','product-view conversion metric'],[service,'retailInventoryValue','inventory analytics'],[service,'withdrawalRequested','finance analytics'],[service,'pendingProducts','admin operations queue'],[products,"type: 'PRODUCT_VIEW'",'product view event recording'],[app,'AnalyticsModule','app module wiring'],[seller,'Xuất CSV','seller report export'],[admin,'Xuất CSV','admin report export'],[seed,"db.collection('analyticsevents')",'analytics seed'],[seed,'SEED_PRODUCT_DETAIL','seed view events']
];
for(const [src,tok,label] of checks)if(!src.includes(tok))throw new Error('Missing '+label);
const files=[];for(const root of ['services/api/src','apps/web','apps/seller','apps/admin']){const walk=d=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(p)&&!p.endsWith('.d.ts'))files.push(p)}};walk(root)}
for(const f of files){const r=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,emitDecoratorMetadata:true}});for(const d of r.diagnostics??[])if(d.category===ts.DiagnosticCategory.Error)throw new Error(`${f}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`)}
console.log(`Analytics verification passed: ${required.length} required files, ${checks.length} behavior markers, ${files.length} parsed sources.`);

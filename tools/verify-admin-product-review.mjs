import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const ts=require('typescript');
const required=[
  'services/api/src/products/product-review.schema.ts','services/api/src/products/product.schema.ts','services/api/src/products/products.controller.ts','services/api/src/products/products.service.ts','services/api/src/products/products.dto.ts',
  'apps/admin/lib/client-api.ts','apps/admin/components/admin-shell.tsx','apps/admin/components/admin-dashboard-client.tsx','apps/admin/components/admin-products-client.tsx','apps/admin/components/admin-product-detail-client.tsx',
  'apps/admin/app/login/page.tsx','apps/admin/app/products/page.tsx','apps/admin/app/products/[id]/page.tsx','docs/ADMIN_PRODUCT_REVIEW.md'
];
for(const f of required){if(!fs.existsSync(f)||fs.statSync(f).size<80)throw new Error('Missing/incomplete '+f)}
const ctl=fs.readFileSync('services/api/src/products/products.controller.ts','utf8');
const service=fs.readFileSync('services/api/src/products/products.service.ts','utf8');
const schema=fs.readFileSync('services/api/src/products/product.schema.ts','utf8');
const admin=fs.readFileSync('apps/admin/components/admin-product-detail-client.tsx','utf8');
const seller=fs.readFileSync('apps/seller/components/seller-product-editor-client.tsx','utf8');
const checks=[
 [ctl,"@Get('admin/products')",'admin review list'],[ctl,"@Get('admin/products/summary')",'admin review summary'],[ctl,"@Post('admin/products/:id/approve')",'approve endpoint'],[ctl,"@Post('admin/products/:id/reject')",'reject endpoint'],[ctl,"@Roles('ADMIN', 'SUPER_ADMIN')",'admin RBAC'],
 [service,"status: 'PENDING_REVIEW'",'pending review guard'],[service,'session.withTransaction','transactional moderation'],[service,"action: 'APPROVED'",'approve audit event'],[service,"action: 'REJECTED'",'reject audit event'],[service,'PRODUCT_UNDER_REVIEW','seller edit lock'],
 [schema,'submittedForReviewAt','submission timestamp'],[schema,'rejectionReason','rejection reason'],
 [admin,"'/approve'",'admin approve UI'],[admin,"'/reject'",'admin reject UI'],[seller,'Rút về bản nháp để sửa','seller withdrawal UI']
];
for(const [src,token,label] of checks)if(!src.includes(token))throw new Error('Missing '+label);
const files=[];const walk=d=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(p)&&!p.endsWith('.d.ts'))files.push(p)}};
walk('services/api/src/products');walk('apps/admin');walk('apps/seller/components');
for(const f of files){const r=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,emitDecoratorMetadata:true}});for(const d of r.diagnostics??[])if(d.category===ts.DiagnosticCategory.Error)throw new Error(`${f}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`)}
console.log(`Admin product review verification passed: ${required.length} required files, ${checks.length} lifecycle/security markers, ${files.length} parsed sources.`);

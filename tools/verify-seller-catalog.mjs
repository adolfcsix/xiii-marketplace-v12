import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const ts=require('typescript');
const required=[
  'services/api/src/products/products.controller.ts','services/api/src/products/products.service.ts','services/api/src/products/products.dto.ts',
  'services/api/src/variants/variants.controller.ts','services/api/src/variants/variants.service.ts',
  'services/api/src/inventory/inventory.controller.ts','services/api/src/inventory/inventory.service.ts','services/api/src/inventory/inventory.dto.ts',
  'apps/seller/components/seller-products-client.tsx','apps/seller/components/seller-product-editor-client.tsx','apps/seller/components/seller-inventory-client.tsx',
  'apps/seller/app/products/page.tsx','apps/seller/app/products/new/page.tsx','apps/seller/app/products/[id]/page.tsx','apps/seller/app/inventory/page.tsx','docs/SELLER_CATALOG.md'
];
for(const f of required){if(!fs.existsSync(f)||fs.statSync(f).size<80)throw new Error('Missing/incomplete '+f)}
const product=fs.readFileSync('services/api/src/products/products.service.ts','utf8');
const productCtl=fs.readFileSync('services/api/src/products/products.controller.ts','utf8');
const inv=fs.readFileSync('services/api/src/inventory/inventory.service.ts','utf8');
const invCtl=fs.readFileSync('services/api/src/inventory/inventory.controller.ts','utf8');
const editor=fs.readFileSync('apps/seller/components/seller-product-editor-client.tsx','utf8');
const checks=[
 [productCtl,"@Post('seller/products/catalog')",'atomic catalog create route'],
 [productCtl,"@Get('seller/products/summary')",'seller product summary route'],
 [productCtl,"@Roles('SELLER', 'ADMIN', 'SUPER_ADMIN')",'seller catalog RBAC'],
 [product,'session.withTransaction','catalog transaction'],
 [product,"status: d.submitForReview ? 'PENDING_REVIEW' : 'DRAFT'",'seller moderation boundary'],
 [product,"p.status = 'HIDDEN'",'soft product archive'],
 [product,'this.inventories.create','catalog inventory model usage'],
 [invCtl,"@Get('summary')",'inventory summary route'],
 [inv,'expectedAvailable','optimistic inventory guard'],
 [inv,'INVENTORY_CONCURRENT_UPDATE','inventory conflict error'],
 [editor,"'/seller/products/catalog'",'new product editor API'],
 [editor,"'/seller/inventory/'",'SKU inventory editor API'],
];
for(const [src,token,label] of checks)if(!src.includes(token))throw new Error('Missing '+label);
const sourceFiles=[];const walk=d=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(p)&&!p.endsWith('.d.ts'))sourceFiles.push(p)}};
walk('services/api/src/products');walk('services/api/src/variants');walk('services/api/src/inventory');walk('apps/seller');
for(const f of sourceFiles){const r=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,emitDecoratorMetadata:true}});for(const d of r.diagnostics??[])if(d.category===ts.DiagnosticCategory.Error)throw new Error(`${f}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`)}
console.log(`Seller catalog verification passed: ${required.length} required files, ${checks.length} flow/security markers, ${sourceFiles.length} parsed sources.`);

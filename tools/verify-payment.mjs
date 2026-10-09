import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const ts=require('typescript');
const required=[
  'services/api/src/payments/payment.schema.ts','services/api/src/payments/payment.dto.ts','services/api/src/payments/payments.service.ts',
  'services/api/src/payments/payments.controller.ts','services/api/src/payments/payments.module.ts',
  'services/api/src/common/decorators/raw-response.decorator.ts','apps/web/components/payment-result-client.tsx','apps/web/app/payment-result/page.tsx'
];
for(const f of required){if(!fs.existsSync(f)||fs.statSync(f).size<120)throw new Error('Missing/incomplete '+f)}
const service=fs.readFileSync('services/api/src/payments/payments.service.ts','utf8');
const controller=fs.readFileSync('services/api/src/payments/payments.controller.ts','utf8');
const checkout=fs.readFileSync('services/api/src/checkout/checkout.service.ts','utf8');
const ui=fs.readFileSync('apps/web/components/checkout-client.tsx','utf8');
const checks=[
  [service,"this.hmac('sha256', secretKey","MoMo HMAC-SHA256"],
  [service,"this.hmac('sha512', secret","VNPAY HMAC-SHA512"],
  [service,'amount: order.totalAmount','trusted order amount'],
  [service,"type: 'RELEASE'",'inventory release audit'],
  [service,"status: 'PAID'",'paid order transition'],
  [service,"paymentExpiresAt: { $lte: new Date() }",'expiry sweep'],
  [controller,"@Post('webhooks/momo')",'MoMo IPN route'],
  [controller,"@Get('webhooks/vnpay')",'VNPAY IPN route'],
  [controller,'@RawResponse()','provider raw response'],
  [checkout,'paymentExpiresAt:','checkout expiry timestamp'],
  [ui,"'/payments/create'",'frontend payment create'],
  [ui,"providerEnabled('MOMO')",'credential-aware MoMo UI'],
  [ui,"providerEnabled('VNPAY')",'credential-aware VNPAY UI'],
];
for(const [src,token,label] of checks)if(!src.includes(token))throw new Error('Missing '+label);
if(ui.includes('process.env.MOMO_SECRET_KEY')||ui.includes('process.env.VNPAY_HASH_SECRET'))throw new Error('Server secret read attempted in browser implementation');
const sourceFiles=[];const walk=d=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(p)&&!p.endsWith('.d.ts'))sourceFiles.push(p)}};walk('services/api/src/payments');walk('apps/web/app/payment-result');sourceFiles.push('apps/web/components/payment-result-client.tsx','apps/web/components/checkout-client.tsx');
for(const f of sourceFiles){const r=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,emitDecoratorMetadata:true}});for(const d of r.diagnostics??[])if(d.category===ts.DiagnosticCategory.Error)throw new Error(`${f}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`)}
console.log(`Payment verification passed: ${required.length} required files, ${checks.length} security/flow markers, ${sourceFiles.length} parsed sources.`);

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve('services/api/src');
const required = [
  'auth/auth.service.ts','users/users.service.ts','sellers/sellers.service.ts','shops/shops.service.ts',
  'categories/categories.service.ts','brands/brands.service.ts','products/products.service.ts',
  'variants/variants.service.ts','inventory/inventory.service.ts','cart/cart.service.ts','checkout/checkout.service.ts','orders/orders.service.ts','payments/payments.service.ts','database/seed.ts'
];
for (const rel of required) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full) || fs.statSync(full).size < 150) throw new Error(`Missing/incomplete: ${rel}`);
}
const files=[];
const walk=(d)=>{ for(const name of fs.readdirSync(d)){ const p=path.join(d,name); const st=fs.statSync(p); if(st.isDirectory()) walk(p); else if(p.endsWith('.ts')) files.push(p); } };
walk(root);
let failures=[];
for (const file of files) {
  const result=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true,emitDecoratorMetadata:true}});
  for (const d of result.diagnostics ?? []) if (d.category===ts.DiagnosticCategory.Error) failures.push(`${file}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`);
}
if (failures.length) throw new Error(failures.join('\n'));
const endpointChecks={
  'auth/auth.controller.ts':["@Controller('auth')","@Post('register')","@Post('login')"],
  'sellers/sellers.controller.ts':["@Post('seller/application')","@Get('admin/seller-applications')"],
  'products/products.controller.ts':["@Get('products/:slug')","@Post('seller/products')"],
  'variants/variants.controller.ts':["@Post('seller/products/:productId/variants')","@Patch('seller/variants/:id')"],
  'inventory/inventory.controller.ts':["@Controller('seller/inventory')"],
  'cart/cart.controller.ts':["@Controller('cart')","@Post('items')","@Patch('items/:variantId')"],
  'checkout/checkout.controller.ts':["@Controller('checkout')","@Post('preview')","@Post('create')"],
  'orders/orders.controller.ts':["@Controller('orders')","@Get(':orderCode')"],
  'payments/payments.controller.ts':["@Controller('payments')","@Post('create')","@Post('webhooks/momo')","@Get('webhooks/vnpay')"]
};
for (const [rel,tokens] of Object.entries(endpointChecks)) {
  const src=fs.readFileSync(path.join(root,rel),'utf8');
  for (const token of tokens) if (!src.includes(token)) throw new Error(`Endpoint marker missing ${token} in ${rel}`);
}
console.log(`Phase 1 verification passed: ${files.length} TypeScript files, ${required.length} required modules.`);

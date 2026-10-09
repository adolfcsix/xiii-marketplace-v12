import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const ts=require('typescript');
const required=[
  'services/api/src/cms/home-banner.schema.ts','services/api/src/cms/home-section.schema.ts','services/api/src/cms/cms.dto.ts','services/api/src/cms/cms.service.ts','services/api/src/cms/cms.controller.ts','services/api/src/cms/cms.module.ts',
  'apps/admin/components/admin-cms-client.tsx','apps/admin/app/cms/page.tsx','docs/CMS_HOMEPAGE.md'
];
for(const f of required)if(!fs.existsSync(f)||fs.statSync(f).size<80)throw new Error('Missing/incomplete '+f);
const service=fs.readFileSync('services/api/src/cms/cms.service.ts','utf8');
const controller=fs.readFileSync('services/api/src/cms/cms.controller.ts','utf8');
const app=fs.readFileSync('services/api/src/app.module.ts','utf8');
const home=fs.readFileSync('apps/web/app/page.tsx','utf8');
const homeData=fs.readFileSync('apps/web/lib/home-data.ts','utf8');
const admin=fs.readFileSync('apps/admin/components/admin-cms-client.tsx','utf8');
const shell=fs.readFileSync('apps/admin/components/admin-shell.tsx','utf8');
const categories=fs.readFileSync('services/api/src/categories/categories.controller.ts','utf8');
const brands=fs.readFileSync('services/api/src/brands/brands.controller.ts','utf8');
const seed=fs.readFileSync('services/api/src/database/seed.ts','utf8');
const checks=[
  [controller,"@Get('cms/home')",'public CMS route'],[controller,"@Get('admin/cms/banners')",'admin banner list'],[controller,"@Post('admin/cms/banners')",'banner create'],[controller,"@Patch('admin/cms/banners/:id')",'banner update'],[controller,"@Get('admin/cms/sections')",'section list'],[service,'CMS_INVALID_SCHEDULE_WINDOW','schedule validation'],[service,"startAt: { $lte: now }",'start schedule filter'],[service,"endAt: { $gte: now }",'end schedule filter'],[app,'CmsModule','app module wiring'],[homeData,"api<HomeCms>('/cms/home')",'buyer CMS fetch'],[home,"sections.map",'dynamic section rendering'],[admin,'Homepage sections','admin CMS UI'],[shell,"'/cms','CMS & Homepage'",'admin navigation'],[categories,"@Get('admin/categories')",'admin categories'],[brands,"@Get('admin/brands')",'admin brands'],[seed,"db.collection('homebanners')",'banner seed'],[seed,"db.collection('homesections')",'section seed']
];
for(const [src,tok,label] of checks)if(!src.includes(tok))throw new Error('Missing '+label);
const files=[];for(const root of ['services/api/src','apps/web','apps/seller','apps/admin']){const walk=d=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(p)&&!p.endsWith('.d.ts'))files.push(p)}};walk(root)}
for(const f of files){const r=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,experimentalDecorators:true,emitDecoratorMetadata:true}});for(const d of r.diagnostics??[])if(d.category===ts.DiagnosticCategory.Error)throw new Error(`${f}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`)}
console.log(`CMS verification passed: ${required.length} required files, ${checks.length} behavior markers, ${files.length} parsed sources.`);

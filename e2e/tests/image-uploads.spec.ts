import {test,expect,type Page} from '@playwright/test';
import {URLS} from '../helpers/session';
test.skip(process.env.E2E_SHOPPING_FIXTURE!=='1','Uses local mock storage only; no real customer files are uploaded.');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afoIAAAAASUVORK5CYII=','base64');
const gif=Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
async function mock(page:Page,role:'seller'|'admin'){
 await page.addInitScript(role=>localStorage.setItem('xiii_'+role+'_access','qa-session'),role);
 const metadata:any[]=[];const multipart:string[]=[];
 await page.route('**/uploads/presign',route=>{const body=route.request().postDataJSON();metadata.push(body);return route.fulfill({json:{success:true,data:{method:'POST',uploadUrl:URLS[role]+'/mock-storage',fields:{'Content-Type':body.contentType,key:'qa'},publicUrl:'https://cdn.example.com/'+metadata.length+'/'+body.fileName}}});});
 await page.route('**/mock-storage',route=>{multipart.push(route.request().postDataBuffer()!.toString('latin1'));return route.fulfill({status:204});});
 return {metadata,multipart};
}
test('Seller corrects empty MIME and mismatched suffix without changing bytes; allows selecting same file again',async({page})=>{
 const m=await mock(page,'seller');await page.goto(URLS.seller+'/products/qa-product-0');
 const input=page.getByLabel('Upload ảnh sản phẩm');const file={name:'photo.jpeg',mimeType:'',buffer:png};
 await input.setInputFiles(file);await expect(page.locator('.seller-success')).toContainText('Đã tải 1/1 ảnh');
 expect(m.metadata[0]).toMatchObject({fileName:'photo.png',contentType:'image/png',sizeBytes:png.length,purpose:'PRODUCT_IMAGE'});
 expect(m.multipart[0]).toContain('filename="photo.png"');expect(m.multipart[0]).toContain('Content-Type: image/png');expect(m.multipart[0]).toContain(png.toString('latin1'));
 await input.setInputFiles(file);await expect.poll(()=>m.metadata.length).toBe(2);await expect(input).toBeEnabled();
 await expect(page.getByLabel('URL ảnh — mỗi dòng một ảnh')).toHaveValue(/https:\/\/cdn\.example\.com\/2\/photo\.png/);
});
test('Seller retains successful files and continues after invalid files in a batch',async({page})=>{
 const m=await mock(page,'seller');await page.goto(URLS.seller+'/products/qa-product-0');
 await page.getByLabel('Upload ảnh sản phẩm').setInputFiles([{name:'first.wrong',mimeType:'application/octet-stream',buffer:png},{name:'broken.png',mimeType:'image/png',buffer:Buffer.from('invalid')},{name:'last.png',mimeType:'image/png',buffer:gif}]);
 await expect(page.locator('.seller-success')).toContainText('Đã tải 2/3 ảnh');await expect(page.locator('.seller-alert')).toContainText('broken.png');
 expect(m.metadata.map(x=>x.fileName)).toEqual(['first.png','last.gif']);
 const urls=page.getByLabel('URL ảnh — mỗi dòng một ảnh');await expect(urls).toHaveValue(/\/1\/first\.png/);await expect(urls).toHaveValue(/\/2\/last\.gif/);
});
test('Seller rejects corrupt, HEIC and oversized input before presign',async({page})=>{
 const m=await mock(page,'seller');await page.goto(URLS.seller+'/products/qa-product-0');const input=page.getByLabel('Upload ảnh sản phẩm');
 await input.setInputFiles({name:'corrupt.png',mimeType:'image/png',buffer:png.subarray(0,20)});await expect(page.locator('.seller-alert')).toContainText('Ảnh bị hỏng');
 await input.setInputFiles({name:'phone.heic',mimeType:'image/heic',buffer:Buffer.from('HEIC')});await expect(page.locator('.seller-alert')).toContainText('HEIC/HEIF');
 await input.setInputFiles({name:'big.png',mimeType:'image/png',buffer:Buffer.alloc(10*1024*1024+1)});await expect(page.locator('.seller-alert')).toContainText('10 MB');expect(m.metadata).toHaveLength(0);
});
test('Seller reports storage failure and permits retry',async({page})=>{
 const m=await mock(page,'seller');await page.route('**/mock-storage',route=>route.fulfill({status:403}));await page.goto(URLS.seller+'/products/qa-product-0');const input=page.getByLabel('Upload ảnh sản phẩm');
 await input.setInputFiles({name:'retry.png',mimeType:'image/png',buffer:png});await expect(page.locator('.seller-alert')).toContainText('hết hạn');await expect(input).toBeEnabled();expect(m.metadata).toHaveLength(1);
});
test('Admin applies banner, mobile banner, category and brand images to the correct fields and purposes',async({page})=>{
 const m=await mock(page,'admin');await page.goto(URLS.admin+'/cms');
 for(const [label,field] of [['Upload banner','Image URL'],['Upload banner điện thoại','Mobile image URL']]){
  await page.getByLabel(label,{exact:true}).setInputFiles({name:'asset.jpg',mimeType:'image/jpeg',buffer:png});await expect(page.getByLabel(field,{exact:true})).toHaveValue(/asset\.png/);
 }
 await page.getByRole('button',{name:'Danh mục',exact:true}).click();await page.getByLabel('Upload ảnh',{exact:true}).setInputFiles({name:'category.gif',mimeType:'image/gif',buffer:gif});await expect(page.getByLabel('Ảnh URL',{exact:true})).toHaveValue(/category\.gif/);
 await page.getByRole('button',{name:'Thương hiệu',exact:true}).click();await page.getByLabel('Upload logo',{exact:true}).setInputFiles({name:'brand',mimeType:'',buffer:png});await expect(page.getByLabel('Logo URL',{exact:true})).toHaveValue(/brand\.png/);
 expect(m.metadata.map(x=>x.purpose)).toEqual(['CMS_BANNER','CMS_BANNER','CATEGORY_IMAGE','BRAND_LOGO']);
});
test('all five supported formats decode and preserve their complete original bytes, including animated GIF',async({page})=>{
 const {readFileSync}=await import('node:fs');const m=await mock(page,'seller');await page.goto(URLS.seller+'/products/qa-product-0');
 for(const [ext,mime] of [['jpg','image/jpeg'],['png','image/png'],['webp','image/webp'],['gif','image/gif'],['avif','image/avif']]){
  const buffer=readFileSync('e2e/fixtures/images/sample.'+ext);const count=m.metadata.length;
  await page.getByLabel('Upload ảnh sản phẩm').setInputFiles({name:'wrong.txt',mimeType:'application/octet-stream',buffer});
  await expect.poll(()=>m.multipart.length).toBe(count+1);await expect(page.getByLabel('Upload ảnh sản phẩm')).toBeEnabled();
  expect(m.metadata[count]).toMatchObject({fileName:'wrong.'+ext,contentType:mime,sizeBytes:buffer.length});expect(m.multipart[count]).toContain(buffer.toString('latin1'));
 }
});
test('Admin enforces per-purpose category and brand size limits before requesting storage',async({page})=>{
 const m=await mock(page,'admin');await page.goto(URLS.admin+'/cms');
 await page.getByRole('button',{name:'Danh mục',exact:true}).click();await page.getByLabel('Upload ảnh',{exact:true}).setInputFiles({name:'big.png',mimeType:'image/png',buffer:Buffer.alloc(8*1024*1024+1)});await expect(page.locator('.admin-alert')).toContainText('8 MB');
 await page.getByRole('button',{name:'Thương hiệu',exact:true}).click();await page.getByLabel('Upload logo',{exact:true}).setInputFiles({name:'big.png',mimeType:'image/png',buffer:Buffer.alloc(5*1024*1024+1)});await expect(page.locator('.admin-alert')).toContainText('5 MB');expect(m.metadata).toHaveLength(0);
});
test('saving and changing the Admin upload destination stay locked until the image finishes',async({page})=>{
 await mock(page,'admin');let complete:()=>void=()=>{};const pending=new Promise<void>(r=>complete=r);
 await page.route('**/mock-storage',async route=>{await pending;await route.fulfill({status:204});});await page.goto(URLS.admin+'/cms');
 await page.getByLabel('Upload banner',{exact:true}).setInputFiles({name:'wait.png',mimeType:'image/png',buffer:png});
 await expect(page.getByRole('button',{name:'Danh mục',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Tạo banner',exact:true})).toBeDisabled();
 complete();await expect(page.getByLabel('Image URL',{exact:true})).toHaveValue(/wait\.png/);await expect(page.getByRole('button',{name:'Danh mục',exact:true})).toBeEnabled();
});

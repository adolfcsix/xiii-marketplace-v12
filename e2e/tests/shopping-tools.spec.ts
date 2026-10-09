import { expect, test, type Page } from '@playwright/test';
import { URLS } from '../helpers/session';
test.skip(process.env.E2E_SHOPPING_FIXTURE !== '1', 'Run against e2e/fixtures/shopping-server.cjs with E2E_SHOPPING_FIXTURE=1; this suite never writes to real customer carts.');
const dialog=(page:Page)=>page.getByRole('dialog',{name:'Xem nhanh sản phẩm'});
async function choose(page:Page,index:number,slot='Áo'){
 await page.getByRole('group',{name:'Vị trí trong outfit'}).getByRole('button',{name:slot,exact:true}).click();
 await page.locator('.outfit-product-grid>button').filter({hasText:'XIII '+['tee-black','hoodie-gray','cargo-black','sneaker','cap','bag','chain','sweatshirt'][index]}).click();
 await dialog(page).getByRole('button',{name:'Chọn cho outfit',exact:true}).click();
 await expect(dialog(page)).toHaveCount(0);
}
test('Quick View selects a live variant, adds once and restores focus on Escape',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('xiii_access','qa-session'));
 const posts:any[]=[];
 await page.route('**/cart/items',async route=>{posts.push(route.request().postDataJSON());await new Promise(r=>setTimeout(r,150));await route.fulfill({json:{success:true,data:{}}});});
 await page.goto(URLS.buyer+'/');
 const trigger=page.locator('main .product-card').first().getByRole('button',{name:/^Xem nhanh /});
 await trigger.click();await dialog(page).getByLabel('Màu / kích cỡ').selectOption('qa-product-0-L');
 await dialog(page).getByRole('button',{name:'Thêm vào giỏ',exact:true}).dblclick();
 await expect(dialog(page).getByRole('status')).toContainText('Đã thêm vào giỏ');
 expect(posts).toEqual([{variantId:'qa-product-0-L',quantity:1}]);
 await page.keyboard.press('Escape');await expect(dialog(page)).toHaveCount(0);await expect(trigger).toBeFocused();
});
test('Quick View recovers from fetch failure and size advice applies the shop chart',async({page})=>{
 let fail=true;
 await page.route('**/products/tee-black',route=>fail?route.fulfill({status:503,json:{success:false,message:'Tạm gián đoạn'}}):route.continue());
 await page.goto(URLS.buyer+'/');await page.locator('main .product-card').first().getByRole('button',{name:/^Xem nhanh /}).click();
 await expect(dialog(page).getByRole('alert')).toContainText('Tạm gián đoạn');fail=false;
 await dialog(page).getByRole('button',{name:'Thử lại',exact:true}).click();
 await dialog(page).locator('.size-advisor summary').click();
 await dialog(page).getByLabel('Chiều cao (cm)').fill('170');await dialog(page).getByLabel('Cân nặng (kg)').fill('65');
 await dialog(page).getByLabel('Ưu tiên rộng khi nhiều size cùng phù hợp').check();
 await dialog(page).getByRole('button',{name:'Tìm size phù hợp',exact:true}).click();await expect(dialog(page)).toContainText('Size tham khảo: L');
 await dialog(page).getByRole('button',{name:'Chọn size L',exact:true}).click();await expect(dialog(page).getByLabel('Màu / kích cỡ')).toHaveValue('qa-product-0-L');
});
test('product size advice handles missing charts without inventing a size',async({page})=>{
 await page.goto(URLS.buyer+'/product/bag');await page.locator('main .size-advisor:visible summary').click();
 await expect(page.locator('main .size-advisor:visible')).toContainText('Shop chưa cung cấp bảng');
 await expect(page.getByLabel('Chiều cao (cm)')).toHaveCount(0);
});
test('outfit persists selected variants, totals live prices and retries only failed items',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('xiii_access','qa-session'));
 await page.goto(URLS.buyer+'/outfit');await choose(page,0);await choose(page,2,'Quần');
 await expect(page.locator('.outfit-summary')).toContainText('520.000₫');
 await page.reload();await expect(page.locator('.outfit-slot>strong')).toHaveCount(2);
 const posts:any[]=[];let fail=true;
 await page.route('**/cart/items',async route=>{const body=route.request().postDataJSON();posts.push(body);await route.fulfill(body.variantId==='qa-product-2-M'&&fail?{status:409,json:{success:false,message:'SKU vừa hết hàng'}}:{json:{success:true,data:{}}});});
 await page.getByRole('button',{name:'Thêm các món vào giỏ',exact:true}).click();await expect(page.locator('.outfit-notice')).toContainText('SKU vừa hết hàng');
 fail=false;await page.getByRole('button',{name:'Thêm các món vào giỏ',exact:true}).click();await expect(page.locator('.outfit-notice')).toContainText('Đã thêm các món');
 expect(posts.map(p=>p.variantId)).toEqual(['qa-product-0-M','qa-product-2-M','qa-product-2-M']);
 await expect(page.getByRole('button',{name:'Đã thêm vào giỏ',exact:true})).toBeDisabled();
});
test('outfit detects changed prices before posting cart items',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('xiii_access','qa-session'));
 await page.goto(URLS.buyer+'/outfit');await choose(page,0);
 let posts=0;await page.route('**/cart/items',route=>{posts++;return route.fulfill({json:{success:true,data:{}}});});
 await page.route('**/products/qa-product-0/variants',async route=>{const response=await route.fetch();const json=await response.json();json.data=json.data.map((v:any)=>({...v,price:v.price+10000}));await route.fulfill({json});});
 await page.getByRole('button',{name:'Thêm các món vào giỏ',exact:true}).click();await expect(page.locator('.outfit-notice')).toContainText('đã đổi giá');expect(posts).toBe(0);
});
test('unavailable saved selections are explained and untouched drafts survive failed loading',async({page})=>{
 const draft=JSON.stringify([{slug:'tee-black',variantId:'qa-product-0-M'},null,null,null]);
 await page.addInitScript(value=>localStorage.setItem('xiii-outfit-v2:guest',value),draft);
 await page.route('**/products/tee-black',route=>route.fulfill({status:503,json:{success:false,message:'Offline'}}));
 await page.goto(URLS.buyer+'/outfit');await expect(page.getByRole('region',{name:'Outfit của bạn'})).toContainText('chưa tải lại được');
 expect(await page.evaluate(()=>localStorage.getItem('xiii-outfit-v2:guest'))).toBe(draft);
});
test('outfit separates clothing categories and guests go to login with the draft intact',async({page})=>{
 await page.goto(URLS.buyer+'/outfit');await choose(page,0);await page.getByRole('group',{name:'Vị trí trong outfit'}).getByRole('button',{name:'Quần',exact:true}).click();await expect(page.locator('.outfit-product-grid>button').filter({hasText:'XIII tee-black'})).toHaveCount(0);await choose(page,2,'Quần');await expect(page.locator('.outfit-slot>strong')).toHaveCount(2);
 await page.getByRole('button',{name:'Thêm các món vào giỏ',exact:true}).click();await expect(page).toHaveURL(url=>url.pathname==='/login'&&url.searchParams.get('next')==='/outfit');
 expect(JSON.parse((await page.evaluate(()=>localStorage.getItem('xiii-outfit-v2:guest')))!)[0].variantId).toBe('qa-product-0-M');
});
test('mobile outfit and Quick View fit and remain operable',async({page})=>{
 await page.setViewportSize({width:320,height:740});await page.goto(URLS.buyer+'/outfit');await choose(page,0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.getByRole('button',{name:'Đổi lựa chọn áo',exact:true}).click();await expect(dialog(page)).toBeVisible();
 const box=(await dialog(page).boundingBox())!;expect(box.width).toBeLessThanOrEqual(320);
 await dialog(page).getByRole('button',{name:'Đóng xem nhanh'}).click();await expect(dialog(page)).toHaveCount(0);
});
test('Seller saves a chart without losing other attributes and rejects reversed ranges',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('xiii_seller_access','qa-session'));
 let payload:any;let writes=0;
 await page.route('**/seller/products/qa-product-0',async route=>{
  if(route.request().method()!=='PATCH'){await route.continue();return;}
  payload=route.request().postDataJSON();writes++;await route.fulfill({json:{success:true,data:{...payload,_id:'qa-product-0',status:'DRAFT'}}});
 });
 await page.goto(URLS.seller+'/products/qa-product-0');
 const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Bảng gợi ý kích cỡ',exact:true})});
 await panel.getByRole('button',{name:'+ Thêm dòng size',exact:true}).click();
 const row=panel.getByRole('group').last();await row.getByLabel('Size',{exact:true}).fill('XL');
 await row.getByLabel('Cao từ (cm)').fill('190');await row.getByLabel('Cao đến (cm)').fill('180');
 await row.getByLabel('Nặng từ (kg)').fill('75');await row.getByLabel('Nặng đến (kg)').fill('95');
 await page.getByRole('button',{name:'Lưu thông tin',exact:true}).click();await expect(page.locator('.seller-alert')).toContainText('Bảng size');expect(writes).toBe(0);
 await row.getByLabel('Cao đến (cm)').fill('200');await page.getByRole('button',{name:'Lưu thông tin',exact:true}).click();await expect(page.locator('.seller-success')).toContainText('Đã lưu');
 expect(payload.attributes.fit).toBe('Oversized');expect(payload.attributes.sizeChart).toHaveLength(3);expect(payload.attributes.sizeChart[2].size).toBe('XL');
});

test('editing an outfit item retains its selected variant',async({page})=>{
 await page.goto(URLS.buyer+'/outfit');await page.locator('.outfit-product-grid>button').first().click();
 await dialog(page).getByLabel('Màu / kích cỡ').selectOption('qa-product-0-L');
 await dialog(page).getByRole('button',{name:'Chọn cho outfit',exact:true}).click();
 await page.getByRole('button',{name:'Đổi lựa chọn áo',exact:true}).click();
 await expect(dialog(page).getByLabel('Màu / kích cỡ')).toHaveValue('qa-product-0-L');
});

test('editing another slot preserves saved references that could not reload',async({page})=>{
 const draft=JSON.stringify([{slug:'tee-black',variantId:'qa-product-0-L'},{slug:'cargo-black',variantId:'qa-product-2-M'},null,null]);
 await page.addInitScript(value=>localStorage.setItem('xiii-outfit-v2:guest',value),draft);
 await page.route('**/products/tee-black',route=>route.fulfill({status:503,json:{success:false,message:'Offline'}}));
 await page.goto(URLS.buyer+'/outfit');await expect(page.getByRole('region',{name:'Outfit của bạn'})).toContainText('chưa tải lại được');
 await choose(page,3,'Giày');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('xiii-outfit-v2:guest')!));
 expect(stored[0]).toEqual({slug:'tee-black',variantId:'qa-product-0-L'});
 expect(stored[2]).toEqual({slug:'sneaker',variantId:'qa-product-3-M'});
});

test('retry ignores stock changes of items already added successfully',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('xiii_access','qa-session'));
 await page.goto(URLS.buyer+'/outfit');await choose(page,0);await choose(page,2,'Quần');
 let phase=0;const posts:string[]=[];
 await page.route('**/cart/items',route=>{const body=route.request().postDataJSON();posts.push(body.variantId);if(body.variantId==='qa-product-2-M'&&phase===0){phase=1;return route.fulfill({status:409,json:{success:false,message:'Thử lại món thứ hai'}});}return route.fulfill({json:{success:true,data:{}}});});
 await page.route('**/products/qa-product-0/variants',async route=>{const response=await route.fetch();const json=await response.json();if(phase)json.data=json.data.map((v:any)=>({...v,available:0}));await route.fulfill({json});});
 await page.getByRole('button',{name:'Thêm các món vào giỏ',exact:true}).click();await expect(page.locator('.outfit-notice:visible')).toContainText('Thử lại món thứ hai');
 await page.getByRole('button',{name:'Thêm các món vào giỏ',exact:true}).click();await expect(page.locator('.outfit-notice:visible')).toContainText('Đã thêm các món');
 expect(posts).toEqual(['qa-product-0-M','qa-product-2-M','qa-product-2-M']);
});

test('size selection is locked while a Quick View cart request is pending',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('xiii_access','qa-session'));
 let release!:()=>void;const hold=new Promise<void>(resolve=>release=resolve);
 await page.route('**/cart/items',async route=>{await hold;await route.fulfill({json:{success:true,data:{}}});});
 await page.goto(URLS.buyer+'/');await page.locator('main .product-card').first().getByRole('button',{name:/^Xem nhanh /}).click();
 await dialog(page).locator('.size-advisor summary').click();await dialog(page).getByLabel('Chiều cao (cm)').fill('170');await dialog(page).getByLabel('Cân nặng (kg)').fill('65');
 await dialog(page).getByLabel('Ưu tiên rộng khi nhiều size cùng phù hợp').check();await dialog(page).getByRole('button',{name:'Tìm size phù hợp',exact:true}).click();
 try{await dialog(page).getByRole('button',{name:'Thêm vào giỏ',exact:true}).click();await expect(dialog(page).getByRole('button',{name:'Chọn size L',exact:true})).toBeDisabled();await expect(dialog(page).getByLabel('Màu / kích cỡ')).toBeDisabled();}finally{release();}
 await expect(dialog(page).getByRole('status').filter({hasText:'Đã thêm vào giỏ'})).toBeVisible();
});

test('pointer movement in Quick View does not tilt the card behind the modal',async({page})=>{
 await page.goto(URLS.buyer+'/');const card=page.locator('main .product-card:visible').first();
 await expect(page.getByRole('button',{name:'Tắt chuyển động'})).toBeEnabled();await card.scrollIntoViewIfNeeded();let movement=0;await expect.poll(async()=>{await card.hover({position:{x:30+(movement++%2),y:30}});return card.getAttribute('data-depth-active')}).toBe('true');
 await card.getByRole('button',{name:/^Xem nhanh /}).click();await dialog(page).getByRole('heading').hover();
 await expect(card).not.toHaveAttribute('data-depth-active','true');
});

test('a stalled preview request times out with a retry message',async({page})=>{
 await page.goto(URLS.buyer+'/');await page.clock.install();
 let release!:()=>void;const hold=new Promise<void>(resolve=>release=resolve);
 await page.route('**/products/tee-black',async route=>{await hold;await route.abort().catch(()=>{});});
 try{await page.locator('main .product-card:visible').first().getByRole('button',{name:/^Xem nhanh /}).click();await expect(dialog(page).getByRole('status')).toContainText('Đang tải');await page.clock.fastForward(16000);await expect(dialog(page).getByRole('alert')).toContainText('Kết nối quá chậm');}finally{release();}
 await page.unrouteAll({behavior:'wait'});
});

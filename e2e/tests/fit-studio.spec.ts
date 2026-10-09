import {expect,test,type Page} from '@playwright/test';
import {URLS} from '../helpers/session';
test.skip(process.env.E2E_SHOPPING_FIXTURE!=='1','Uses the local catalog fixture.');
async function choose(page:Page,slot:string,slug:string){
 await page.getByRole('group',{name:'Vị trí trong outfit'}).getByRole('button',{name:slot,exact:true}).click();
 await page.locator('.outfit-product-grid>button').filter({hasText:'XIII '+slug}).click();
 await page.getByRole('dialog',{name:'Xem nhanh sản phẩm'}).getByRole('button',{name:'Chọn cho outfit',exact:true}).click();
}
async function open(page:Page){await page.goto(URLS.buyer+'/outfit');await page.getByRole('button',{name:/Tuỳ chỉnh nhân vật/}).click();await expect(page.getByRole('button',{name:'Nam',exact:true})).toBeEnabled();}
test('four real SKUs equip on avatar, replacement/removal, saved look restores avatar and items',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 await expect(page.getByRole('img',{name:/Nhân vật phối đồ/})).toBeVisible();
 await choose(page,'Áo','hoodie-gray');await choose(page,'Quần','cargo-black');await choose(page,'Giày','sneaker');await choose(page,'Phụ kiện','chain');
 await expect(page.locator('.avatar-garment[data-selected=true]')).toHaveCount(4);
 await expect(page.locator('[data-garment="0"]')).toHaveAttribute('data-variant','qa-product-1-M');
 await page.getByRole('button',{name:'Nữ',exact:true}).click();await page.getByRole('button',{name:'Rộng',exact:true}).click();
 await page.getByRole('button',{name:'Màu da 3',exact:true}).click();await page.getByLabel('Đặt tên bộ phối',{exact:true}).fill('Đi chơi');await page.getByRole('button',{name:'Lưu bộ phối',exact:true}).click();
 await choose(page,'Áo','tee-black');await expect(page.locator('[data-garment="0"]')).toHaveAttribute('data-variant','qa-product-0-M');
 await page.getByRole('button',{name:'Gỡ quần',exact:true}).click();await expect(page.locator('.avatar-garment[data-selected=true]')).toHaveCount(3);
 await page.getByRole('button',{name:'Đi chơi ↗',exact:true}).click();await expect(page.locator('[data-garment="0"]')).toHaveAttribute('data-variant','qa-product-1-M');
 await page.reload();await page.getByRole('button',{name:/Tuỳ chỉnh nhân vật/}).click();await expect(page.locator('.avatar-garment[data-selected=true]')).toHaveCount(4);await expect(page.getByRole('button',{name:'Nữ',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Rộng',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.locator('.dressing-room').screenshot({path:'docs/qa/v16/fit-studio-desktop.png'});
 expect(errors).toEqual([]);
});
test('variant colour changes the drawn garment, custom overlay is supported',async({page})=>{
 await open(page);await choose(page,'Phụ kiện','bag');
 const layer=page.locator('[data-garment="3"]');await expect(layer.locator('rect')).toHaveAttribute('fill','#262a30');
 await page.getByRole('button',{name:'Đổi lựa chọn phụ kiện',exact:true}).click();await page.locator('.preview-choice select').selectOption('qa-product-5-White-M');await page.getByRole('button',{name:'Chọn cho outfit',exact:true}).click();await expect(layer.locator('rect')).toHaveAttribute('fill','#eee9df');
 await page.route('**/products/bag',route=>route.fulfill({json:{success:true,data:{_id:'qa-product-5',slug:'bag',name:'XIII bag',attributes:{outfitPreview:{overlays:{neutral:'/products/fallback.svg'}}}}}}));
 await page.getByRole('button',{name:'Đổi lựa chọn phụ kiện',exact:true}).click();await page.getByRole('button',{name:'Chọn cho outfit',exact:true}).click();await expect(layer.locator('image')).toHaveAttribute('href','/products/fallback.svg');
 await page.unroute('**/products/bag');await page.route('**/products/bag',route=>route.fulfill({json:{success:true,data:{_id:'qa-product-5',slug:'bag',name:'XIII bag',attributes:{outfitPreview:{overlays:{neutral:'/missing-outfit-art.png'}}}}}}));await page.getByRole('button',{name:'Đổi lựa chọn phụ kiện',exact:true}).click();await page.getByRole('button',{name:'Chọn cho outfit',exact:true}).click();await expect(layer.locator('image')).toHaveCount(0);await expect(layer.locator('rect')).toBeVisible();
});
test('saved outfits are isolated between guest and two accounts, keyboard and mobile fit',async({page})=>{
 await open(page);await choose(page,'Áo','tee-black');await page.getByLabel('Đặt tên bộ phối',{exact:true}).fill('Guest');await page.getByRole('button',{name:'Lưu bộ phối',exact:true}).click();
 await page.evaluate(()=>{localStorage.setItem('xiii_user',JSON.stringify({_id:'account-a'}));localStorage.setItem('xiii_access','fixture');window.dispatchEvent(new Event('storage'));});await expect(page.locator('.avatar-garment[data-selected=true]')).toHaveCount(0);await expect(page.getByRole('button',{name:'Guest ↗',exact:true})).toHaveCount(0);
 await choose(page,'Áo','hoodie-gray');await page.getByLabel('Đặt tên bộ phối',{exact:true}).fill('Account A');await page.getByRole('button',{name:'Lưu bộ phối',exact:true}).click();
 await page.evaluate(()=>{localStorage.setItem('xiii_user',JSON.stringify({_id:'account-b'}));window.dispatchEvent(new Event('storage'));});await expect(page.locator('.avatar-garment[data-selected=true]')).toHaveCount(0);await expect(page.getByRole('button',{name:'Account A ↗',exact:true})).toHaveCount(0);
 await page.evaluate(()=>{localStorage.removeItem('xiii_access');localStorage.removeItem('xiii_user');window.dispatchEvent(new Event('xiii-buyer-session-cleared'));});await expect(page.locator('[data-garment="0"]')).toHaveAttribute('data-variant','qa-product-0-M');await expect(page.getByRole('button',{name:'Guest ↗',exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Tuỳ chỉnh nhân vật/}).click();await page.getByRole('button',{name:'Nam',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Nam',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.locator('.dressing-room').scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'docs/qa/v16/fit-studio-mobile-'+width+'.png',fullPage:true});}
});
test('cart partial success retries only remaining items',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('xiii_access','fixture');localStorage.setItem('xiii_user',JSON.stringify({_id:'cart-user'}))});
 let fail=true;const posts:string[]=[];await page.route('**/cart/items',route=>{const id=route.request().postDataJSON().variantId;posts.push(id);return route.fulfill(id==='qa-product-2-M'&&fail?{status:409,json:{success:false,message:'Hết hàng'}}:{json:{success:true,data:{}}})});
 await open(page);await choose(page,'Áo','tee-black');await choose(page,'Quần','cargo-black');await page.getByRole('button',{name:'Thêm các món vào giỏ',exact:true}).click();await expect(page.locator('.outfit-notice')).toContainText('Hết hàng');fail=false;await page.getByRole('button',{name:'Thêm các món vào giỏ',exact:true}).click();await expect(page.locator('.outfit-notice')).toContainText('Đã thêm');expect(posts).toEqual(['qa-product-0-M','qa-product-2-M','qa-product-2-M']);
});
test('rounded raised buttons move smoothly and respect reduced motion',async({page})=>{
 await open(page);const button=page.getByRole('button',{name:'Nam',exact:true});expect(await button.evaluate(e=>parseFloat(getComputedStyle(e).borderRadius))).toBeGreaterThan(30);
 await button.hover();await expect.poll(()=>button.evaluate(e=>getComputedStyle(e).translate)).toBe('0px -3px');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('html')).toHaveAttribute('data-motion','off');await expect.poll(()=>button.evaluate(e=>getComputedStyle(e).translate)).toBe('none');await choose(page,'Áo','tee-black');expect(await page.locator('[data-garment="0"]').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
});
test('damaged avatar settings do not prevent a valid outfit restoring',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('xiii-outfit-v2:guest',JSON.stringify([{slug:'tee-black',variantId:'qa-product-0-M'},null,null,null]));localStorage.setItem('xiii-outfit-v2:guest:avatar','broken');localStorage.setItem('xiii-outfit-v2:guest:looks','broken');});
 await open(page);await expect(page.locator('[data-garment="0"]')).toHaveAttribute('data-variant','qa-product-0-M');await expect(page.getByRole('button',{name:'Trung tính',exact:true})).toHaveAttribute('aria-pressed','true');
});
test('reselecting an already added SKU does not add a duplicate',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('xiii_access','fixture');localStorage.setItem('xiii_user',JSON.stringify({_id:'cart-user'}))});
 let posts=0;await page.route('**/cart/items',route=>{posts++;return route.fulfill({json:{success:true,data:{}}})});
 await open(page);await choose(page,'Áo','tee-black');await page.getByRole('button',{name:'Thêm các món vào giỏ',exact:true}).click();await expect(page.getByRole('button',{name:'Đã thêm vào giỏ',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Đổi lựa chọn áo',exact:true}).click();await page.getByRole('button',{name:'Chọn cho outfit',exact:true}).click();await expect(page.getByRole('button',{name:'Đã thêm vào giỏ',exact:true})).toBeDisabled();expect(posts).toBe(1);
});

test('manual motion off removes transitions from rounded controls',async({page})=>{
 await page.goto(URLS.buyer+'/');await page.getByRole('button',{name:'Tắt chuyển động',exact:true}).click();await open(page);await expect(page.locator('html')).toHaveAttribute('data-motion','off');
 const button=page.getByRole('button',{name:'Nam',exact:true});await button.hover();expect(await button.evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');expect(await button.evaluate(e=>getComputedStyle(e).translate)).toBe('none');
});
test('changing account during a batch stops further cart writes',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('xiii_access','fixture');localStorage.setItem('xiii_user',JSON.stringify({_id:'cart-user'}))});
 const posts:string[]=[];let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 await page.route('**/cart/items',async route=>{posts.push(route.request().postDataJSON().variantId);await gate;await route.fulfill({json:{success:true,data:{}}}).catch(()=>{});});
 await open(page);await choose(page,'Áo','tee-black');await choose(page,'Quần','cargo-black');await page.getByRole('button',{name:'Thêm các món vào giỏ',exact:true}).click();await expect.poll(()=>posts.length).toBe(1);
 await page.evaluate(()=>{localStorage.setItem('xiii_user',JSON.stringify({_id:'other-account'}));window.dispatchEvent(new Event('storage'));});release();await expect(page.locator('.avatar-garment[data-selected=true]')).toHaveCount(0);await page.waitForTimeout(300);expect(posts).toEqual(['qa-product-0-M']);
});

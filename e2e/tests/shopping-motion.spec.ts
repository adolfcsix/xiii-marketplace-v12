import {expect,test,type Page} from '@playwright/test';
import {URLS} from '../helpers/session';
test.skip(process.env.E2E_SHOPPING_FIXTURE!=='1','Local catalog fixture and cart mocks only.');
async function ready(page:Page){await expect(page.locator('html')).toHaveAttribute('data-motion','on')}
async function spy(page:Page){await page.addInitScript(()=>{localStorage.setItem('xiii_access','qa-session');(window as any).flights=[];const original=Element.prototype.animate;Element.prototype.animate=function(...args:Parameters<Element['animate']>){if(this.classList.contains('cart-flight'))(window as any).flights.push({pointer:getComputedStyle(this).pointerEvents,top:this.matches(':popover-open'),hidden:this.getAttribute('aria-hidden')});return original.apply(this,args)}})}
async function choose(page:Page,index:number,slot='Áo'){
 await page.getByRole('group',{name:'Vị trí trong outfit'}).getByRole('button',{name:slot,exact:true}).click();await page.locator('.outfit-product-grid>button').filter({hasText:'XIII '+['tee-black','hoodie-gray','cargo-black','sneaker','cap','bag','chain','sweatshirt'][index]}).click();await page.getByRole('dialog',{name:'Xem nhanh sản phẩm'}).getByRole('button',{name:'Chọn cho outfit',exact:true}).click();
}
test('campaign layers have different offsets and reset with motion off',async({page})=>{
 await page.goto(URLS.buyer+'/');await ready(page);const hero=page.locator('main .street-hero');let n=0;
 await expect.poll(async()=>{await hero.hover({position:{x:200+n++%2,y:160}});return hero.getAttribute('data-depth-active')}).toBe('true');
 await expect.poll(async()=>{await hero.hover({position:{x:200+n++%2,y:160}});return hero.evaluate(e=>Math.abs(parseFloat((e as HTMLElement).style.getPropertyValue('--parallax-x')||'0')))}).toBeGreaterThan(1);
 const values=await hero.evaluate(e=>['.street-hero-media','.street-hero-copy','.hero-stamp'].map(s=>{const style=getComputedStyle(e.querySelector(s)!);return style.transform+' '+style.translate}));expect(new Set(values).size).toBe(3);
 await hero.screenshot({path:'docs/qa/threeui-v11/layered-hero.png'});
 await page.getByRole('button',{name:'Tắt chuyển động',exact:true}).click();await expect(hero).not.toHaveAttribute('data-depth-active','true');expect(await hero.locator('.street-hero-copy').evaluate(e=>getComputedStyle(e).translate)).toBe('none');
});
test('depth carousel uses actual adjacent photos and preserves lightbox keyboard navigation',async({page})=>{
 await page.goto(URLS.buyer+'/product/tee-black');await ready(page);const gallery=page.locator('.detail-gallery');const image=gallery.locator('.gallery-open img');await expect(gallery.locator('.detail-thumbs button')).toHaveCount(3);
 await gallery.getByRole('button',{name:'Ảnh tiếp theo',exact:true}).click();await expect(image).toHaveAttribute('src','/street/hoodie-gray.webp');
 await gallery.locator('.gallery-open').press('ArrowRight');await expect(image).toHaveAttribute('src','/street/cargo-black.webp');
 await gallery.locator('.gallery-open').click();const dialog=page.getByRole('dialog',{name:/Ảnh phóng to/});await expect(dialog).toBeVisible();await page.keyboard.press('ArrowRight');await expect(dialog.locator('img')).toHaveAttribute('src','/street/tee-black.webp');await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(gallery.locator('.gallery-open')).toBeFocused();
 await gallery.screenshot({path:'docs/qa/threeui-v11/depth-gallery.png'});
});
test('mobile swipe changes photo without opening lightbox or blocking vertical scroll',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(URLS.buyer+'/product/tee-black');const button=page.locator('.gallery-open:visible');await button.scrollIntoViewIfNeeded();
 await button.dispatchEvent('pointerdown',{pointerType:'touch',clientX:280,clientY:200});await button.dispatchEvent('pointerup',{pointerType:'touch',clientX:120,clientY:210});await button.dispatchEvent('click');
 await expect(button.locator('img')).toHaveAttribute('src','/street/hoodie-gray.webp');await expect(page.locator('.gallery-dialog')).not.toBeVisible();expect(await button.evaluate(e=>getComputedStyle(e).touchAction)).toBe('pan-y pinch-zoom');
 await button.dispatchEvent('pointerdown',{pointerType:'touch',clientX:200,clientY:150});await button.dispatchEvent('pointerup',{pointerType:'touch',clientX:210,clientY:280});await expect(button.locator('img')).toHaveAttribute('src','/street/hoodie-gray.webp');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('Quick View flight waits for success, sits above dialog and keeps focus and cleanup',async({page})=>{
 await spy(page);let release!:()=>void;const gate=new Promise<void>(r=>release=r);await page.route('**/cart/items',async route=>{await gate;await route.fulfill({json:{success:true,data:{}}})});
 await page.goto(URLS.buyer+'/');await ready(page);await page.locator('main .product-card').first().getByRole('button',{name:/Xem nhanh/}).click();const dialog=page.getByRole('dialog',{name:'Xem nhanh sản phẩm'}),add=dialog.locator('.street-button');await add.click();await expect(add).toHaveText('Đang thêm…');expect(await page.evaluate(()=>(window as any).flights.length)).toBe(0);release();
 await expect(dialog.getByRole('status')).toContainText('Đã thêm vào giỏ');await expect.poll(()=>page.evaluate(()=>(window as any).flights.length)).toBe(1);expect(await page.evaluate(()=>(window as any).flights[0])).toEqual({pointer:'none',top:true,hidden:'true'});await expect(add).toBeFocused();await expect(page.locator('.cart-flight')).toHaveCount(0);await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
});
test('failed cart write has no flight and retry still adds once',async({page})=>{
 await spy(page);let fail=true,posts=0;await page.route('**/cart/items',route=>{posts++;return route.fulfill(fail?{status:409,json:{success:false,message:'SKU hết hàng'}}:{json:{success:true,data:{}}})});await page.goto(URLS.buyer+'/product/tee-black');await ready(page);const add=page.getByRole('button',{name:'Thêm vào giỏ',exact:true});await add.click();await expect(page.getByRole('status').filter({hasText:'SKU hết hàng'})).toBeVisible();expect(await page.evaluate(()=>(window as any).flights.length)).toBe(0);fail=false;await add.click();await expect.poll(()=>page.evaluate(()=>(window as any).flights.length)).toBe(1);expect(posts).toBe(2);
});
test('reduced motion has static gallery and no cart flight',async({page})=>{
 await spy(page);await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/cart/items',route=>route.fulfill({json:{success:true,data:{}}}));await page.goto(URLS.buyer+'/product/tee-black');await expect(page.locator('html')).toHaveAttribute('data-motion','off');await page.getByRole('button',{name:'Ảnh tiếp theo',exact:true}).click();expect(await page.locator('.gallery-plane').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');await page.getByRole('button',{name:'Thêm vào giỏ',exact:true}).click();await expect(page.getByRole('status').filter({hasText:/Đã thêm XIII/})).toBeVisible();expect(await page.evaluate(()=>(window as any).flights.length)).toBe(0);
});
test('outfit avatar highlights selected SKU, preserves saved data and fits mobile',async({page})=>{
 await page.goto(URLS.buyer+'/outfit');await ready(page);await choose(page,0);await choose(page,2,'Quần');const stage=page.getByLabel('Bản xem bộ phối');await expect(stage.locator('.avatar-garment[data-selected=true]')).toHaveCount(2);const before=await page.evaluate(()=>localStorage.getItem('xiii-outfit-v2:guest'));await page.locator('.equipped-chips button').filter({hasText:'Áo'}).click();await expect(stage.locator('[data-garment="0"]')).toHaveAttribute('data-focused','true');expect(await page.evaluate(()=>localStorage.getItem('xiii-outfit-v2:guest'))).toBe(before);
 await page.setViewportSize({width:320,height:740});await stage.scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.getByRole('button',{name:'Gỡ áo',exact:true}).click();await expect(stage.locator('[data-focused=true]')).toHaveCount(0);await expect(stage.locator('.avatar-garment[data-selected=true]')).toHaveCount(1);await page.getByRole('button',{name:'Gỡ quần',exact:true}).click();await expect(stage.locator('.avatar-garment[data-selected=true]')).toHaveCount(0);await page.getByRole('button',{name:'Ẩn nhân vật',exact:true}).click();await expect(stage).toHaveCount(0);await expect(page.locator('.outfit-slot>strong')).toHaveCount(0);
});
test('outfit partial success celebrates only successful writes and retry skips them',async({page})=>{
 await spy(page);let fail=true;const posts:string[]=[];await page.route('**/cart/items',route=>{const id=route.request().postDataJSON().variantId;posts.push(id);return route.fulfill(id==='qa-product-2-M'&&fail?{status:409,json:{success:false,message:'SKU hết hàng'}}:{json:{success:true,data:{}}})});await page.goto(URLS.buyer+'/outfit');await ready(page);await choose(page,0);await choose(page,2,'Quần');await page.locator('.outfit-board').scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Thêm các món vào giỏ',exact:true}).click();await expect(page.locator('.outfit-notice')).toContainText('SKU hết hàng');await expect.poll(()=>page.evaluate(()=>(window as any).flights.length)).toBe(1);fail=false;await page.getByRole('button',{name:'Thêm các món vào giỏ',exact:true}).click();await expect(page.locator('.outfit-notice')).toContainText('Đã thêm các món');await expect.poll(()=>page.evaluate(()=>(window as any).flights.length)).toBe(2);expect(posts).toEqual(['qa-product-0-M','qa-product-2-M','qa-product-2-M']);
});

test('production image optimizer resizes a real public product WebP after the sharp security update',async({request})=>{
 const response=await request.get(URLS.buyer+'/_next/image?url=%2Fstreet%2Ftee-black.webp&w=640&q=75');expect(response.status()).toBe(200);expect(response.headers()['content-type']).toMatch(/^image\//);expect((await response.body()).length).toBeGreaterThan(1000);
});

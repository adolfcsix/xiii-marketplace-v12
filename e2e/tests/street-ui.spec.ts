import {expect,test} from '@playwright/test';
import {URLS} from '../helpers/session';
test('home renders a live catalog, new images and working collection filters',async({page})=>{
 await page.goto(URLS.buyer+'/');await expect(page.locator('.street-hero h1')).toHaveCount(1);await expect(page.locator('.street-hero h1')).toBeVisible();
 await expect(page.locator('.street-collection').first().locator('.product-card').first()).toBeVisible();
 await page.getByRole('button',{name:'Mới nhất',exact:true}).click();await expect(page.locator('.street-collection').first()).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.street-collection').first().locator('.product-card').first()).toBeVisible();
 await page.getByRole('button',{name:'Tất cả',exact:true}).click();await expect(page.getByRole('button',{name:'Tất cả',exact:true})).toHaveAttribute('aria-pressed','true');
 const response=await page.request.get(URLS.buyer+'/products/tee-black.svg');expect(response.ok()).toBe(true);expect(response.headers()['content-type']).toContain('image/webp');
});
test('collection recovers from a failed request and stale replies cannot replace the chosen filter',async({page})=>{
 await page.goto(URLS.buyer+'/');await expect(page.locator('.product-card').first()).toBeVisible();
 await page.route('**/products?**',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,message:'offline'})}));
 await page.getByRole('button',{name:'Mới nhất',exact:true}).click();await expect(page.getByText('Chưa tải được sản phẩm.',{exact:true})).toBeVisible();
 await page.unroute('**/products?**');await page.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(page.locator('.street-product-grid .product-card').first()).toBeVisible();
 await page.route('**/products?**',async route=>{const response=await route.fetch();await new Promise(resolve=>setTimeout(resolve,600));await route.fulfill({response});});
 await page.getByRole('button',{name:'Đang giảm giá',exact:true}).click();await page.getByRole('button',{name:'Tất cả',exact:true}).click();await expect(page.locator('.street-collection').first()).toHaveAttribute('aria-busy','false');await expect(page.getByRole('button',{name:'Tất cả',exact:true})).toHaveAttribute('aria-pressed','true');
 // Finish delayed handlers before closing the context, then verify stale replies stayed ignored.
 await page.unrouteAll({behavior:'wait'});await expect(page.getByRole('button',{name:'Tất cả',exact:true})).toHaveAttribute('aria-pressed','true');
});
test('motion can be paused, persists across reload, and follows reduced-motion settings',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(URLS.buyer+'/');
 await page.getByRole('button',{name:'Tắt chuyển động',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-motion','off');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-motion','off');
 expect(await page.locator('.ticker-track').evaluate(element=>getComputedStyle(element).animationName)).toBe('none');
 await page.getByRole('button',{name:'Bật chuyển động',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-motion','on');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('html')).toHaveAttribute('data-motion','off');
});
test('mobile home and both auth modes fit without yellow panels or hidden controls',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(URLS.buyer+'/');await expect(page.locator('.product-card').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await expect(page.getByRole('link',{name:'Khám phá ngay',exact:true})).toBeVisible();
 await page.goto(URLS.buyer+'/login');expect(await page.locator('.auth-editorial').evaluate(element=>getComputedStyle(element).backgroundColor)).toBe('rgb(22, 22, 22)');
 await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByLabel('Họ và tên')).toBeVisible();await expect(page.getByRole('button',{name:'Tạo tài khoản →',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

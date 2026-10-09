import {expect,test} from '@playwright/test';
import {URLS} from '../helpers/session';
test.skip(process.env.E2E_SHOPPING_FIXTURE!=='1','Local catalog fixture.');
test('buttons lift, press immediately, retain keyboard activation and honor motion off',async({page})=>{
 await page.goto(URLS.buyer+'/product/bag');await expect(page.locator('html')).toHaveAttribute('data-motion','on');
 const button=page.locator('.detail-size-options:visible button').first();await button.hover();
 await expect.poll(()=>button.evaluate(e=>getComputedStyle(e).translate)).toBe('0px -2px');
 await button.hover();await page.mouse.down();await expect.poll(()=>button.evaluate(e=>getComputedStyle(e).scale)).toBe('0.97');await page.mouse.up();
 await page.keyboard.press('Tab');await button.focus();expect(await button.evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');await button.press('Enter');await expect(button).toHaveAttribute('aria-pressed','true');
 await page.locator('.detail-buy-panel').screenshot({path:'docs/qa/button-feedback-v14/desktop.png'});
 await page.goto(URLS.buyer+'/');await page.getByRole('button',{name:'Tắt chuyển động',exact:true}).click();await page.goto(URLS.buyer+'/product/bag');await expect(page.locator('html')).toHaveAttribute('data-motion','off');await button.hover();expect(await button.evaluate(e=>getComputedStyle(e).translate)).toBe('none');
});
test('slow cart write shows busy feedback and blocks repeated submissions',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('xiii_access','qa-session'));
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);let posts=0;
 await page.route('**/cart/items',async route=>{posts++;await gate;await route.fulfill({json:{success:true,data:{}}})});
 await page.goto(URLS.buyer+'/product/bag');const add=page.locator('.detail-add:visible');await add.click();
 await expect(add).toHaveAttribute('aria-busy','true');await expect(add).toBeDisabled();await expect(add).toContainText('Đang thêm');await expect(page.locator('.detail-buy:visible')).toBeDisabled();
 expect(await add.evaluate(e=>getComputedStyle(e,'::after').content)).toBe('""');
 await add.evaluate(e=>(e as HTMLButtonElement).click());expect(posts).toBe(1);release();await expect(add).toHaveAttribute('aria-busy','false');await expect(add).toBeEnabled();
});
test('touch targets fit a narrow screen and reduced motion keeps feedback static',async({browser})=>{
 const context=await browser.newContext({viewport:{width:320,height:740},hasTouch:true,isMobile:true,reducedMotion:'reduce'});const page=await context.newPage();
 try{await page.goto(URLS.buyer+'/product/bag');await expect(page.locator('html')).toHaveAttribute('data-motion','off');
 const size=page.locator('.detail-size-options:visible button').first();const box=await size.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);await size.tap();await expect(size).toHaveAttribute('aria-pressed','true');
 expect(await size.evaluate(e=>getComputedStyle(e).translate)).toBe('none');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.locator('.detail-buy-panel').screenshot({path:'docs/qa/button-feedback-v14/mobile.png'});
 }finally{await context.close()}
});

import {expect,test} from '@playwright/test';
import {URLS} from '../helpers/session';
test('product gallery removes duplicate photos, opens a modal and restores keyboard focus',async({page})=>{
 await page.goto(URLS.buyer+'/product/xiii-basic-tee-black');
 await expect(page.locator('.detail-thumbs:visible button')).toHaveCount(1);
 const zoom=page.getByRole('button',{name:'Phóng to ảnh XIII Basic Tee - Black',exact:true});await zoom.click();
 const dialog=page.getByRole('dialog',{name:'Ảnh phóng to: XIII Basic Tee - Black',exact:true});await expect(dialog).toBeVisible();
 await expect(page.getByRole('button',{name:'Đóng ảnh phóng to',exact:true})).toBeFocused();
 expect(await dialog.locator('img').evaluate(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0)).toBe(true);
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(zoom).toBeFocused();
 await expect(page.getByRole('button',{name:'Giảm số lượng',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Tăng số lượng',exact:true}).click();await expect(page.getByRole('button',{name:'Giảm số lượng',exact:true})).toBeEnabled();
});
test('individual search filter removal preserves the other selections',async({page})=>{
 await page.goto(URLS.buyer+'/search?category=ao-thun&color=Black&size=M&priceMax=400000');
 await expect(page.locator('.product-card').first()).toBeVisible();
 await page.getByRole('link',{name:'Bỏ bộ lọc Màu: Black',exact:true}).click();
 await expect(page).toHaveURL(url=>url.searchParams.get('category')==='ao-thun'&&!url.searchParams.has('color'));
 expect(new URL(page.url()).searchParams.get('size')).toBe('M');expect(new URL(page.url()).searchParams.get('priceMax')).toBe('400000');
 await page.getByRole('link',{name:'Bỏ bộ lọc Size: M',exact:true}).click();await expect(page.locator('.active-filter-row:visible')).not.toContainText('Size: M');
 await page.getByRole('link',{name:'Xóa tất cả',exact:true}).click();await expect(page).toHaveURL(URLS.buyer+'/search');await expect(page.locator('.active-filter-row')).toHaveCount(0);
});
test('catalog, gallery and zoom fit small touch screens',async({page})=>{
 await page.setViewportSize({width:320,height:740});await page.goto(URLS.buyer+'/search');await expect(page.locator('.product-card').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.goto(URLS.buyer+'/product/xiii-basic-tee-black');await expect(page.locator('.detail-actions:visible')).toHaveCount(1);await expect(page.locator('.detail-actions:visible')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.getByRole('button',{name:'Phóng to ảnh XIII Basic Tee - Black',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 const bounds=await page.getByRole('dialog').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.width).toBeLessThanOrEqual(320);
 await page.getByRole('button',{name:'Đóng ảnh phóng to',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('tablet filters collapse and remain usable at 680px',async({page})=>{
 await page.setViewportSize({width:680,height:900});await page.goto(URLS.buyer+'/search');
 await expect(page.locator('.product-card').first()).toBeVisible();const filters=page.locator('.filter-disclosure:visible');await expect(filters).not.toHaveAttribute('open','');
 await page.locator('.filter-disclosure:visible > summary').click();await expect(filters).toHaveAttribute('open','');
 await expect(page.locator('.filter-sidebar:visible')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

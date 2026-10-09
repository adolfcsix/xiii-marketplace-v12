import { expect, test } from '@playwright/test';
import { URLS } from '../helpers/session';

test('product depth tracks mouse, clears on leave and preserves wishlist and navigation', async ({ page }) => {
 const errors: string[] = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.goto(URLS.buyer + '/');
 const card = page.locator('[data-depth=product]').first();
 await card.scrollIntoViewIfNeeded();
 const box = (await card.boundingBox())!;
 await page.mouse.move(box.x + box.width * .8, box.y + box.height * .25);
 await expect(card).toHaveAttribute('data-depth-active', 'true');
 await expect.poll(() => card.locator('.product-visual').evaluate(e => getComputedStyle(e).transform)).not.toBe('none');
 expect(await card.evaluate(e => e.style.getPropertyValue('--depth-y'))).not.toBe('0deg');
 const heart = card.getByRole('button', { name: /^Yêu thích / });
 await heart.click();
 await expect(card.getByRole('button', { name: /^Bỏ yêu thích / })).toHaveAttribute('aria-pressed', 'true');
 await page.mouse.move(1, 1);
 await expect(card).not.toHaveAttribute('data-depth-active', 'true');
 await card.locator('.product-name').click();
 await expect(page).toHaveURL(/\/product\//);
 expect(errors).toEqual([]);
});

test('global motion off and reduced motion neutralize depth', async ({ page }) => {
 await page.goto(URLS.buyer + '/');
 const hero = page.locator('main [data-depth=hero]:visible');
 await expect(page.getByRole('button',{name:'Tắt chuyển động',exact:true})).toBeEnabled();let movement=0;
 await expect.poll(async()=>{await hero.hover({position:{x:200+(movement++%2),y:200}});return hero.getAttribute('data-depth-active')}).toBe('true');
 await page.getByRole('button', { name: 'Tắt chuyển động', exact: true }).click();
 await expect(hero).not.toHaveAttribute('data-depth-active', 'true');
 expect(await hero.locator('.street-hero-copy').evaluate(e => getComputedStyle(e).transform)).toBe('none');
 await page.getByRole('button', { name: 'Bật chuyển động', exact: true }).click();
 await page.emulateMedia({ reducedMotion: 'reduce' });
 await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
 await hero.hover({ position: { x: 250, y: 180 } });
 await expect(hero).not.toHaveAttribute('data-depth-active', 'true');
});

test('orb tuning changes actual shader glow and resets selected values', async ({ page }) => {
 await page.goto(URLS.buyer + '/');
 await page.locator('.street-orb').scrollIntoViewIfNeeded();
 const speed = page.getByRole('slider', { name: /^Tốc độ/ });
 await speed.focus(); await speed.press('Home'); await speed.press('ArrowRight');
 await expect(speed).toHaveValue('0.25');
 const glow = page.getByRole('slider', { name: /^Ánh sáng/ });
 await glow.focus(); await glow.press('End');
 await expect(glow).toHaveValue('1.5');
 await expect.poll(() => page.locator('.energy-orb__shader').evaluate((c: HTMLCanvasElement) => {
  const gl = c.getContext('webgl'); if (!gl) return null;
  const p = gl.getParameter(gl.CURRENT_PROGRAM); return p ? gl.getUniform(p, gl.getUniformLocation(p, 'uGlow')) : null;
 })).toBe(1.5);
 await page.getByRole('button', { name: 'Tím', exact: true }).click();
 await page.getByRole('button', { name: 'Đặt lại hiệu ứng', exact: true }).click();
 await expect(speed).toHaveValue('0.65'); await expect(glow).toHaveValue('0.8');
 await expect(page.locator('.street-orb')).toHaveAttribute('data-palette', 'silver');
});

test('touch scrolling does not tilt cards and mobile controls fit', async ({ page }) => {
 await page.setViewportSize({ width: 320, height: 740 });
 await page.goto(URLS.buyer + '/');
 const card = page.locator('[data-depth=product]').first();
 await card.scrollIntoViewIfNeeded();
 await card.dispatchEvent('pointermove', { pointerType: 'touch', clientX: 200, clientY: 200 });
 await expect(card).not.toHaveAttribute('data-depth-active', 'true');
 await page.locator('.street-orb').scrollIntoViewIfNeeded();
 await expect(page.getByRole('slider', { name: /^Ánh sáng/ })).toBeVisible();
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('editorial depth leaves shopping links and product zoom usable', async ({ page }) => {
 await page.goto(URLS.buyer + '/');
 await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
 const productHref = await page.locator('main .product-card .product-name').first().getAttribute('href');
 const story = page.locator('main [data-depth=story]').first();
 await story.scrollIntoViewIfNeeded();
 await story.evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))); });
 const storyBox = (await story.boundingBox())!;
 await page.mouse.move(storyBox.x + 180, storyBox.y + 100, { steps: 3 });
 await expect(story).toHaveAttribute('data-depth-active', 'true');
 await story.click(); await expect(page).toHaveURL(/\/search\?/);
 await page.goto(URLS.buyer + productHref!);
 const gallery = page.locator('main [data-depth=gallery]:visible');
 await expect(gallery).toBeVisible({timeout:30_000});
 await gallery.hover({ position: { x: 200, y: 180 } });
 await expect(gallery).toHaveAttribute('data-depth-active', 'true');
 await gallery.getByRole('button', { name: /^Phóng to ảnh/ }).click();
 await expect(page.getByRole('dialog', { name: /^Ảnh phóng to/ })).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog', { name: /^Ảnh phóng to/ })).not.toBeVisible();
});

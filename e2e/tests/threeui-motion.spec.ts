import { expect, test } from '@playwright/test';
import { URLS } from '../helpers/session';

const sculpture = '.liquid-sculpture';

test('liquid hero paints locally and keeps shopping navigation usable', async ({ page }) => {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!['localhost','127.0.0.1'].includes(new URL(request.url()).hostname)) external.push(request.url()); });
  await page.goto(URLS.buyer + '/');
  await expect(page.locator(sculpture)).toHaveAttribute('data-ready', 'true');
  const painted = await page.locator(sculpture+' canvas').evaluate((canvas: HTMLCanvasElement) => new Promise<boolean>(resolve => requestAnimationFrame(() => {
    const gl = canvas.getContext('webgl')!;
    const pixel = new Uint8Array(4);
    gl.readPixels(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    resolve(pixel[3] > 0 && pixel[0]+pixel[1]+pixel[2] > 0);
  })));
  expect(painted).toBe(true);
  await page.getByRole('link',{name:'Khám phá ngay',exact:true}).click();
  await expect(page).toHaveURL(URLS.buyer+'/search');
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('glass controls respond to pointer and keyboard; saved state still works', async ({ page }) => {
  await page.goto(URLS.buyer+'/');
  await expect(page.locator('html')).toHaveAttribute('data-motion','on');
  const save=page.locator('.wishlist-button').first(); await save.scrollIntoViewIfNeeded();
  await save.hover(); await page.mouse.down();
  await expect(save).toHaveAttribute('data-liquid-down','true');
  await page.mouse.up(); await expect(save).toHaveAttribute('aria-pressed','true');
  await expect(save).not.toHaveAttribute('data-liquid-down','true');
  await save.focus(); await page.keyboard.press('Enter');
  await expect(save).toHaveAttribute('aria-pressed','false');
  expect(await save.evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');
});

test('motion preference persists and reduced motion disables liquid animation', async ({ page }) => {
  await page.goto(URLS.buyer+'/');
  await expect(page.locator(sculpture)).toHaveAttribute('data-ready','true');
  await page.getByRole('button',{name:'Tắt chuyển động',exact:true}).click();
  await expect(page.locator(sculpture)).toHaveAttribute('data-ready','false');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-motion','off');
  await expect(page.locator(sculpture)).toHaveAttribute('data-ready','false');
  await page.getByRole('button',{name:'Bật chuyển động',exact:true}).click();
  await expect(page.locator(sculpture)).toHaveAttribute('data-ready','true');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator(sculpture)).toHaveAttribute('data-ready','false');
  const cta=page.getByRole('link',{name:'Khám phá ngay',exact:true}); await cta.hover();
  expect(await cta.evaluate(e=>getComputedStyle(e).scale)).toBe('none');
});

test('unsupported WebGL leaves a static sculpture and working catalog', async ({ page }) => {
  await page.addInitScript(() => {
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:any[]){
      if(type==='webgl'||type==='webgl2') return null;
      return (original as any).call(this,type,...args);
    } as typeof original;
  });
  await page.goto(URLS.buyer+'/');
  await expect(page.locator(sculpture)).toHaveAttribute('data-ready','false');
  await expect(page.locator('.liquid-fallback')).toBeVisible();
  await expect(page.locator('.product-card').first()).toBeVisible();
  await page.getByRole('link',{name:'Khám phá ngay',exact:true}).click();
  await expect(page).toHaveURL(URLS.buyer+'/search');
});

test('small touch screens fit the controls and retain touch activation', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:320,height:740},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage();
  try {
    await page.goto(URLS.buyer+'/');
    await expect(page.locator(sculpture)).toHaveAttribute('data-ready','false');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    const actions=await page.locator('.hero-actions').boundingBox(),bottom=await page.locator('.street-hero-bottom').boundingBox();
    expect(actions!.y+actions!.height).toBeLessThan(bottom!.y);
    const save=page.locator('.wishlist-button').first();await save.tap();await expect(save).toHaveAttribute('aria-pressed','true');
    const box=await save.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
  } finally {await context.close();}
});

test('liquid renderer sleeps offscreen and recovers after WebGL context loss', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).liquidDraws=0;
    const original=WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays=function(...args:Parameters<typeof original>){
      if(this.canvas instanceof HTMLCanvasElement && this.canvas.closest('.liquid-sculpture')) (window as any).liquidDraws++;
      return original.apply(this,args);
    };
  });
  await page.goto(URLS.buyer+'/');
  await expect(page.locator(sculpture)).toHaveAttribute('data-ready','true');
  await expect.poll(()=>page.evaluate(()=>(window as any).liquidDraws)).toBeGreaterThan(2);
  const frames=()=>page.evaluate(()=>new Promise<void>(resolve=>{let n=0;const step=()=>{if(++n===8)resolve();else requestAnimationFrame(step)};requestAnimationFrame(step)}));
  await page.locator('.street-footer').scrollIntoViewIfNeeded();await frames();
  const asleep=await page.evaluate(()=>(window as any).liquidDraws);await frames();
  expect(await page.evaluate(()=>(window as any).liquidDraws)).toBe(asleep);
  await page.locator('.street-hero').scrollIntoViewIfNeeded();
  await expect.poll(()=>page.evaluate(()=>(window as any).liquidDraws)).toBeGreaterThan(asleep);
  await page.locator(sculpture+' canvas').evaluate((canvas:HTMLCanvasElement)=>{
    const extension=canvas.getContext('webgl')!.getExtension('WEBGL_lose_context')!;
    (window as any).restoreLiquid=()=>extension.restoreContext();extension.loseContext();
  });
  await expect(page.locator(sculpture)).toHaveAttribute('data-ready','false');
  await page.evaluate(()=>(window as any).restoreLiquid());
  await expect(page.locator(sculpture)).toHaveAttribute('data-ready','true');
});

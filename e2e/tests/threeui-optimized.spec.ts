import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {URLS} from '../helpers/session';
test.skip(process.env.E2E_SHOPPING_FIXTURE!=='1','Local catalog fixture only.');
mkdirSync('docs/qa/threeui-v10',{recursive:true});
const shader=(page:Page)=>page.locator('.street-orb .energy-orb__shader');
async function ready(page:Page){await page.locator('.street-orb').scrollIntoViewIfNeeded();await expect.poll(()=>shader(page).evaluate((c:HTMLCanvasElement)=>Boolean(c.getContext('webgl')?.getParameter(35725)))).toBe(true)}
async function value(page:Page,name:string){return shader(page).evaluate((c:HTMLCanvasElement,name)=>{const gl=c.getContext('webgl')!,p=gl.getParameter(gl.CURRENT_PROGRAM),v=gl.getUniform(p,gl.getUniformLocation(p,name));return v instanceof Float32Array?Array.from(v):v},name)}
test('mobile auto caps the real framebuffer to 1x while drawing the original sphere shader',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true});const page=await context.newPage();await page.goto(URLS.buyer+'/');await ready(page);
 const dimensions=await shader(page).evaluate((c:HTMLCanvasElement)=>({width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight,limit:Number(c.dataset.pixelBudget),fps:Number(c.dataset.frameLimit)}));
 expect(dimensions.width).toBeLessThanOrEqual(dimensions.cssWidth);expect(dimensions.width*dimensions.height).toBeLessThanOrEqual(160000);expect(dimensions.fps).toBe(30);
 await test.info().attach('mobile-framebuffer',{body:JSON.stringify({...dimensions,originalPixels:dimensions.cssWidth*dimensions.cssHeight*4,currentPixels:dimensions.width*dimensions.height}),contentType:'application/json'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.street-orb').screenshot({path:'docs/qa/threeui-v10/mobile-orb.png',style:'.street-header{visibility:hidden!important}'});await context.close();
});
test('quality switching resizes the same GPU program and survives reload',async({page})=>{
 await page.goto(URLS.buyer+'/');await ready(page);await shader(page).evaluate((c:HTMLCanvasElement)=>{const gl=c.getContext('webgl')!;(window as any).__qaProgram=gl.getParameter(gl.CURRENT_PROGRAM)});
 await page.getByLabel('Chất lượng 3D').selectOption('light');await expect(shader(page)).toHaveAttribute('data-frame-limit','30');
 await page.getByLabel('Chất lượng 3D').selectOption('detail');await expect(shader(page)).toHaveAttribute('data-frame-limit','60');
 expect(await shader(page).evaluate((c:HTMLCanvasElement)=>c.getContext('webgl')!.getParameter(35725)===(window as any).__qaProgram)).toBe(true);
 await page.reload();await ready(page);await expect(page.getByLabel('Chất lượng 3D')).toHaveValue('detail');await expect(shader(page)).toHaveAttribute('data-frame-limit','60');
});
test('speed changes and pause/resume keep shader phase continuous',async({page})=>{
 await page.goto(URLS.buyer+'/');await ready(page);await expect.poll(()=>value(page,'uT')).toBeGreaterThan(1);
 const before=await value(page,'uT');await page.getByRole('slider',{name:/^Tốc độ/}).press('End');await expect.poll(()=>value(page,'uT')).toBeGreaterThan(before);expect(await value(page,'uT')).toBeLessThan(before+.8);
 const paused=await value(page,'uT');await page.getByRole('button',{name:'Tạm dừng khối cầu 3D',exact:true}).click();await expect(shader(page)).toHaveCount(0);await page.waitForTimeout(250);await page.getByRole('button',{name:'Tiếp tục khối cầu 3D',exact:true}).click();await ready(page);
 const resumed=await value(page,'uT');expect(resumed).toBeGreaterThanOrEqual(paused-.05);expect(resumed).toBeLessThan(paused+.8);
});
test('mouse interaction rotates the shader surface and eases back to center on leaving',async({page})=>{
 await page.goto(URLS.buyer+'/');await ready(page);await page.locator('.street-orb-stage').hover({position:{x:350,y:70}});await expect.poll(async()=>Math.abs((await value(page,'uLook'))[0])).toBeGreaterThan(.1);
 await page.locator('.street-orb-copy h2').hover();await expect.poll(async()=>Math.abs((await value(page,'uLook'))[0])).toBeLessThan(.02);
 await page.getByRole('button',{name:'Tím',exact:true}).click();await page.locator('.street-orb-stage').hover({position:{x:350,y:100}});await expect.poll(async()=>Math.abs((await value(page,'uLook'))[0])).toBeGreaterThan(.1);
 await page.locator('.street-orb').screenshot({path:'docs/qa/threeui-v10/desktop-orb.png'});
});
test('light mode limits actual shader draw calls and leaves shopping controls operable',async({page})=>{
 await page.addInitScript(()=>{const draw=WebGLRenderingContext.prototype.drawArrays;(window as any).__qaDraws=0;WebGLRenderingContext.prototype.drawArrays=function(...args:any[]){if((this.canvas as HTMLCanvasElement).classList.contains('energy-orb__shader'))(window as any).__qaDraws++;return(draw as any).apply(this,args)}});
 await page.goto(URLS.buyer+'/');await ready(page);await page.getByLabel('Chất lượng 3D').selectOption('light');await expect(shader(page)).toHaveAttribute('data-frame-limit','30');const before=await page.evaluate(()=>(window as any).__qaDraws);await page.waitForTimeout(650);const draws=await page.evaluate(()=>(window as any).__qaDraws)-before;expect(draws).toBeGreaterThan(0);expect(draws).toBeLessThanOrEqual(23);
 await test.info().attach('light-draws',{body:JSON.stringify({durationMs:650,draws,limitFps:30}),contentType:'application/json'});await expect(page.locator('.street-orb').getByRole('link',{name:'Khám phá bộ sưu tập',exact:true})).toBeEnabled();
});
test('opening Quick View clears depth immediately without needing another pointer movement',async({page})=>{
 await page.goto(URLS.buyer+'/');const card=page.locator('main .product-card:visible').first();await expect(page.getByRole('button',{name:'Tắt chuyển động',exact:true})).toBeEnabled();let movement=0;await expect.poll(async()=>{await card.hover({position:{x:35+(movement++%2),y:35}});return card.getAttribute('data-depth-active')}).toBe('true');
 await card.getByRole('button',{name:/^Xem nhanh /}).click();await expect(page.getByRole('dialog',{name:'Xem nhanh sản phẩm'})).toBeVisible();await expect(card).not.toHaveAttribute('data-depth-active','true');
});
test('Constellation light mode caps retina buffers and throttles the authored Canvas loop',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('xiii-3d-quality','light'));await page.goto(URLS.buyer+'/');const canvas=page.frameLocator('.threeui-constellation iframe').locator('#constellationCanvas');await expect(canvas).toHaveAttribute('data-threeui-role','background');
 const size=await canvas.evaluate((c:HTMLCanvasElement)=>({width:c.width,cssWidth:c.clientWidth}));expect(size.width).toBeLessThanOrEqual(size.cssWidth);
 await canvas.evaluate(()=>{const clear=CanvasRenderingContext2D.prototype.clearRect;(window as any).__qaFrames=0;CanvasRenderingContext2D.prototype.clearRect=function(...args:any[]){(window as any).__qaFrames++;return(clear as any).apply(this,args)}});await page.waitForTimeout(650);const frames=await canvas.evaluate(()=>(window as any).__qaFrames);expect(frames).toBeGreaterThan(0);expect(frames).toBeLessThanOrEqual(23);await page.locator('.street-hero').screenshot({path:'docs/qa/threeui-v10/hero.png'});
});
test('unmounted Orb contexts are released and deliberate pause does not trigger a retry error',async({page})=>{
 await page.goto(URLS.buyer+'/');await ready(page);await shader(page).evaluate((c:HTMLCanvasElement)=>(window as any).__qaOldGl=c.getContext('webgl'));
 await page.getByRole('button',{name:'Tạm dừng khối cầu 3D',exact:true}).click();await expect(shader(page)).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>(window as any).__qaOldGl.isContextLost())).toBe(true);
 await expect(page.getByRole('button',{name:'Tiếp tục khối cầu 3D',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:'Khởi động lại khối cầu 3D'})).toHaveCount(0);await page.getByRole('button',{name:'Tiếp tục khối cầu 3D',exact:true}).click();await ready(page);
});

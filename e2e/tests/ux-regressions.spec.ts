import { expect, test } from '@playwright/test';
import { loginBuyer, loginRequest, submitLogin, URLS } from '../helpers/session';
const API=(process.env.E2E_API_URL||'http://localhost:4000/api/v1').replace(/\/$/,'');

test('search without price filters shows products and wishlist persists after reload',async({page})=>{
  await page.goto(URLS.buyer+'/search');
  const card=page.locator('.product-card').first();await expect(card).toBeVisible();
  const title=await card.locator('.product-name').textContent();
  await card.getByRole('button',{name:/^Yêu thích /}).click();
  await expect(card.getByRole('button',{name:/^Bỏ yêu thích /})).toHaveAttribute('aria-pressed','true');
  await page.goto(URLS.buyer+'/wishlist');await expect(page.locator('.product-name')).toContainText(title!);
  await page.reload();await expect(page.locator('.product-name')).toContainText(title!);
  await page.getByRole('button',{name:/^Bỏ yêu thích /}).click();
  await expect(page.getByText('Gu của bạn bắt đầu từ một trái tim.')).toBeVisible();
});

test('mobile catalog fits screen and wishlist is reachable',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto(URLS.buyer+'/search');
  await expect(page.locator('.product-card').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await expect(page.locator('.global-search:visible')).toHaveCount(1);await expect(page.locator('.global-search:visible')).toBeVisible();
  await page.getByRole('link',{name:'Yêu thích',exact:true}).click();await page.waitForURL('**/wishlist');
});

test('rapid add-to-cart clicks create one mutation',async({page})=>{
  await loginBuyer(page);let mutations=0;
  page.on('request',request=>{if(request.url().endsWith('/cart/items')&&request.method()==='POST')mutations++;});
  await page.goto(URLS.buyer+'/product/xiii-hoodie-gray');
  const button=page.getByRole('button',{name:'Thêm vào giỏ',exact:true});await expect(button).toBeEnabled();
  await button.evaluate((element:HTMLButtonElement)=>{element.click();element.click();element.click();});
  await expect(page.getByRole('status')).toContainText('Đã thêm');expect(mutations).toBe(1);
});

test('checkout disables placing an order while updated shipping quote is pending',async({page})=>{
  await loginBuyer(page);await page.goto(URLS.buyer+'/product/xiii-hoodie-gray');
  await page.getByRole('button',{name:'Mua ngay',exact:true}).click();await page.waitForURL(URLS.buyer+'/cart');
  await page.goto(URLS.buyer+'/checkout');
  const place=page.locator('.checkout-place');await expect(place).toBeEnabled();
  await page.route('**/checkout/preview',async route=>{
    const response=await route.fetch();await new Promise(resolve=>setTimeout(resolve,500));await route.fulfill({response});
  });
  await page.getByText('Hỏa tốc',{exact:true}).click();
  await expect(place).toHaveCount(0);await expect(place).toBeEnabled();
  await expect(page.locator('.checkout-option-grid label.selected')).toContainText('Hỏa tốc');
});

test('rotated refresh token is unique and previous token cannot be replayed',async({request})=>{
  const login=await loginRequest(request,API+'/auth/login',{email:'buyer@xiii.local',password:'Xiii12345!'});expect(login.ok()).toBe(true);
  const first=(await login.json()).data;
  const response=await request.post(API+'/auth/refresh',{data:{refreshToken:first.refreshToken}});expect(response.ok()).toBe(true);
  const second=(await response.json()).data;expect(second.refreshToken).not.toBe(first.refreshToken);
  expect((await request.post(API+'/auth/refresh',{data:{refreshToken:first.refreshToken}})).status()).toBe(401);
  const replies=await Promise.all([request.post(API+'/auth/refresh',{data:{refreshToken:second.refreshToken}}),request.post(API+'/auth/refresh',{data:{refreshToken:second.refreshToken}})]);
  expect(replies.map(r=>r.status()).sort()).toEqual([201,401]);
});

test('login rejects a protocol-relative redirect target',async({page})=>{
  await page.goto(URLS.buyer+'/login?next='+encodeURIComponent('//example.com'));
  await page.getByLabel('Email').fill('buyer@xiii.local');await page.getByLabel('Mật khẩu',{exact:true}).fill('Xiii12345!');
  await submitLogin(page,page.getByRole('button',{name:'Đăng nhập →',exact:true}));await page.waitForURL(URLS.buyer+'/');
});


test('home promo text and call to action do not overlap',async({page})=>{
  await page.goto(URLS.buyer+'/');
  const tiles=page.locator('.promo-tile');await expect(tiles).toHaveCount(3);
  for(let index=0;index<3;index++){
    const tile=tiles.nth(index);
    const bounds=await tile.evaluate(element=>{const heading=element.querySelector('strong')!.getBoundingClientRect();const cta=element.querySelector('i')!.getBoundingClientRect();return {headingBottom:heading.bottom,ctaTop:cta.top};});
    expect(bounds.ctaTop).toBeGreaterThanOrEqual(bounds.headingBottom);
  }
});


test('buyer can register and use the password visibility control',async({page})=>{
  await page.goto(URLS.buyer+'/login');await page.getByRole('button',{name:'Đăng ký',exact:true}).click();
  await page.getByLabel('Họ và tên').fill('Người mua kiểm thử');
  await page.getByLabel('Email').fill('ux-'+Date.now()+'@example.test');
  const password=page.getByLabel('Mật khẩu',{exact:true});await password.fill('Xiii12345!');
  await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click();await expect(password).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Ẩn mật khẩu',exact:true}).click();await expect(password).toHaveAttribute('type','password');
  await page.getByRole('button',{name:'Tạo tài khoản →',exact:true}).click();await page.waitForURL(URLS.buyer+'/');
  await expect(page.getByText('Tài khoản',{exact:true})).toBeVisible();
});

test('buyer can cancel a COD order and see the cancelled status',async({page})=>{
  await loginBuyer(page);await page.goto(URLS.buyer+'/product/xiii-hoodie-gray');
  await page.getByRole('button',{name:'Mua ngay',exact:true}).click();await page.waitForURL(URLS.buyer+'/cart');
  await page.getByRole('button',{name:'Tiếp tục thanh toán'}).click();await page.waitForURL(URLS.buyer+'/checkout');
  await expect(page.locator('.checkout-place')).toBeEnabled();await page.locator('.checkout-place').click();
  await page.waitForURL(/\/order-success\/XIII-/);
  const code=page.url().split('/order-success/')[1].split(/[?#]/)[0];
  await page.goto(URLS.buyer+'/account/orders/'+code);
  page.on('dialog',dialog=>dialog.accept(dialog.type()==='prompt'?'Kiểm thử hủy đơn':undefined));
  await page.getByRole('button',{name:'Hủy đơn',exact:true}).click();
  await expect(page.getByText('Đã hủy',{exact:true}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Hủy đơn',exact:true})).toHaveCount(0);
});

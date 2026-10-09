import { expect, Page, Locator, APIRequestContext } from '@playwright/test';

export const URLS = {
  buyer: process.env.E2E_WEB_URL || 'http://localhost:3000',
  seller: process.env.E2E_SELLER_URL || 'http://localhost:3001',
  admin: process.env.E2E_ADMIN_URL || 'http://localhost:3002',
};

export const ACCOUNT = {
  buyer: { email: 'buyer@xiii.local', password: 'Xiii12345!' },
  seller: { email: 'seller@xiii.local', password: 'Xiii12345!' },
  admin: { email: 'admin@xiii.local', password: 'Xiii12345!' },
};

// Respect the API's real authentication throttle when the full suite shares one IP.
export async function submitLogin(page: Page, button: Locator) {
  for (let attempt=0; attempt<2; attempt++) {
    const pending=page.waitForResponse(response=>response.url().endsWith('/auth/login')&&response.request().method()==='POST');
    await button.click();
    const response=await pending;
    if(response.status()!==429)return;
    await page.waitForTimeout(Math.min(60,Math.max(1,Number(response.headers()['retry-after'])||60))*1000);
    await expect(button).toBeEnabled();
  }
  throw new Error('Authentication remains rate limited after Retry-After');
}

export async function loginRequest(request: APIRequestContext, url: string, data: {email:string;password:string}) {
  let response=await request.post(url,{data});
  if(response.status()===429) {
    await new Promise(resolve=>setTimeout(resolve,Math.min(60,Math.max(1,Number(response.headers()['retry-after'])||60))*1000));
    response=await request.post(url,{data});
  }
  return response;
}

export async function loginBuyer(page: Page) {
  await page.goto(`${URLS.buyer}/login`);
  await page.getByLabel('Email').fill(ACCOUNT.buyer.email);
  await page.getByLabel('Mật khẩu',{exact:true}).fill(ACCOUNT.buyer.password);
  await submitLogin(page,page.getByRole('button', { name: 'Đăng nhập →', exact: true }));
  await page.waitForURL(`${URLS.buyer}/`);
  await expect.poll(async () => page.evaluate(() => Boolean(localStorage.getItem('xiii_access')))).toBe(true);
}

export async function loginSeller(page: Page) {
  await page.goto(`${URLS.seller}/login`);
  await page.getByLabel('Email').fill(ACCOUNT.seller.email);
  await page.getByLabel('Mật khẩu',{exact:true}).fill(ACCOUNT.seller.password);
  await submitLogin(page,page.getByRole('button', { name: 'Đăng nhập Seller Center' }));
  await page.waitForURL(`${URLS.seller}/`);
  await expect.poll(async () => page.evaluate(() => Boolean(localStorage.getItem('xiii_seller_access')))).toBe(true);
}

export async function loginAdmin(page: Page) {
  await page.goto(`${URLS.admin}/login`);
  await page.getByLabel('Email').fill(ACCOUNT.admin.email);
  await page.getByLabel('Mật khẩu',{exact:true}).fill(ACCOUNT.admin.password);
  await submitLogin(page,page.getByRole('button', { name: 'Đăng nhập Admin' }));
  await page.waitForURL(`${URLS.admin}/`);
  await expect.poll(async () => page.evaluate(() => Boolean(localStorage.getItem('xiii_admin_access')))).toBe(true);
}

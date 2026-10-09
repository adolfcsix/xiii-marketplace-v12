import { expect, Page, test } from '@playwright/test';
import { loginAdmin, loginBuyer, loginSeller, URLS } from '../helpers/session';

const API = (process.env.E2E_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');

async function expectRevoked(page: Page, refreshToken: string) {
  const response = await page.request.post(`${API}/auth/refresh`, { data: { refreshToken } });
  expect(response.status()).toBe(401);
}

test('buyer logout revokes refresh token, clears browser session and returns to login', async ({ page }) => {
  await loginBuyer(page);
  const refreshToken = await page.evaluate(() => localStorage.getItem('xiii_refresh'));
  expect(refreshToken).toBeTruthy();

  await page.getByText('Tài khoản', { exact: true }).click();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.waitForURL(`${URLS.buyer}/login`);
  await expect.poll(async () => page.evaluate(() => ({
    access: localStorage.getItem('xiii_access'),
    refresh: localStorage.getItem('xiii_refresh'),
    user: localStorage.getItem('xiii_user'),
  }))).toEqual({ access: null, refresh: null, user: null });
  await expectRevoked(page, refreshToken!);
});

test('seller logout revokes refresh token and disconnects local session', async ({ page }) => {
  await loginSeller(page);
  const refreshToken = await page.evaluate(() => localStorage.getItem('xiii_seller_refresh'));
  expect(refreshToken).toBeTruthy();

  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.waitForURL(`${URLS.seller}/login`);
  await expect.poll(async () => page.evaluate(() => ({
    access: localStorage.getItem('xiii_seller_access'),
    refresh: localStorage.getItem('xiii_seller_refresh'),
    user: localStorage.getItem('xiii_seller_user'),
  }))).toEqual({ access: null, refresh: null, user: null });
  await expectRevoked(page, refreshToken!);
});

test('admin logout revokes refresh token and clears admin session', async ({ page }) => {
  await loginAdmin(page);
  const refreshToken = await page.evaluate(() => localStorage.getItem('xiii_admin_refresh'));
  expect(refreshToken).toBeTruthy();

  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.waitForURL(`${URLS.admin}/login`);
  await expect.poll(async () => page.evaluate(() => ({
    access: localStorage.getItem('xiii_admin_access'),
    refresh: localStorage.getItem('xiii_admin_refresh'),
    user: localStorage.getItem('xiii_admin_user'),
  }))).toEqual({ access: null, refresh: null, user: null });
  await expectRevoked(page, refreshToken!);
});

test('invalid refresh token clears buyer session and redirects to login', async ({ page }) => {
  await loginBuyer(page);
  const accessToken = await page.evaluate(() => localStorage.getItem('xiii_access'));
  expect(accessToken).toBeTruthy();

  // Rotate the refresh credential outside the browser to make its saved copy
  // stale. Logout now proactively disconnects realtime and clears the session,
  // so it no longer leaves an authenticated browser for this retry scenario.
  const refreshToken = await page.evaluate(() => localStorage.getItem('xiii_refresh'));
  const rotation = await page.request.post(`${API}/auth/refresh`, { data: { refreshToken } });
  expect(rotation.ok()).toBeTruthy();

  await page.evaluate(() => localStorage.setItem('xiii_access', 'invalid-access-token'));
  await page.goto(`${URLS.buyer}/account/orders`);
  await page.waitForURL(/\/login\?next=/);
  await expect.poll(async () => page.evaluate(() => Boolean(localStorage.getItem('xiii_access') || localStorage.getItem('xiii_refresh')))).toBe(false);
});

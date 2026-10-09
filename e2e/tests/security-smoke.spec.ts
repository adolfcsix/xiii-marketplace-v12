import { expect, test } from '@playwright/test';
import { URLS } from '../helpers/session';

test('protected buyer page redirects unauthenticated users to login state', async ({ page }) => {
  await page.goto(`${URLS.buyer}/cart`);
  await expect(page.getByRole('heading', { name: 'Đăng nhập để xem giỏ hàng' })).toBeVisible();
});

test('seller and admin protected pages do not expose data without session', async ({ page }) => {
  await page.goto(`${URLS.seller}/orders`);
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByRole('heading', { name: 'Đăng nhập Seller Center' })).toBeVisible();

  await page.goto(`${URLS.admin}/orders`);
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeVisible();
});

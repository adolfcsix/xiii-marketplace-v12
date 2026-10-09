import { expect, test } from '@playwright/test';
import { loginAdmin, loginBuyer, loginSeller, URLS } from '../helpers/session';

test.describe.serial('XIII marketplace critical commerce flow', () => {
  let orderCode = '';
  let subOrderCode = '';

  test('buyer creates a COD order from product detail', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginBuyer(page);

    await page.goto(`${URLS.buyer}/product/xiii-hoodie-gray`);
    await expect(page.getByRole('heading', { name: 'XIII Hoodie - Gray', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: /Mua ngay/i }).click();
    await page.waitForURL(`${URLS.buyer}/cart`);
    await expect(page.getByText('XIII Hoodie - Gray', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Tiếp tục thanh toán' }).click();
    await page.waitForURL(`${URLS.buyer}/checkout`);
    await expect(page.getByRole('heading', { name: 'Hoàn tất đơn hàng' })).toBeVisible();
    await expect(page.getByText(/Demo Buyer · 0900000002/)).toBeVisible();
    await expect(page.getByText('Thanh toán khi nhận hàng (COD)')).toBeVisible();

    const placeOrder = page.locator('button.checkout-place');
    await expect(placeOrder).toBeEnabled();
    await placeOrder.click();
    await page.waitForURL(/\/order-success\/XIII-/);

    orderCode = decodeURIComponent(page.url().split('/order-success/')[1].split(/[?#]/)[0]);
    expect(orderCode).toMatch(/^XIII-/);
    await expect(page.getByText(orderCode, { exact: true })).toBeVisible();
    await expect(page.getByText(/COD ·/)).toBeVisible();

    const subCodeText = await page.locator('.success-shop header small').first().textContent();
    subOrderCode = (subCodeText || '').trim();
    expect(subOrderCode).toMatch(/^SUB-/);
    await context.close();
  });

  test('seller fulfils the created suborder through delivery', async ({ browser }) => {
    expect(orderCode).toBeTruthy();
    expect(subOrderCode).toBeTruthy();

    const context = await browser.newContext();
    const page = await context.newPage();
    await loginSeller(page);
    await page.goto(`${URLS.seller}/orders/${encodeURIComponent(subOrderCode)}`);
    await expect(page.getByRole('heading', { name: subOrderCode })).toBeVisible();
    await expect(page.getByText(`Master ${orderCode}`, { exact: false })).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Bắt đầu đóng gói' }).click();
    await expect(page.getByRole('button', { name: 'Đóng gói xong' })).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Đóng gói xong' }).click();
    await expect(page.getByRole('button', { name: 'Bàn giao vận chuyển' })).toBeVisible();

    await page.getByPlaceholder('VD: GHN123456789').fill('E2E-GHN-0001');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Bàn giao vận chuyển' }).click();
    await expect(page.getByText(/Đã lưu: GHN · E2E-GHN-0001/)).toBeVisible();

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Đánh dấu đã giao' }).click();
    await expect(page.getByText('Đã giao', { exact: true }).first()).toBeVisible();
    await context.close();
  });

  test('buyer confirms receipt and leaves a verified-purchase review', async ({ browser }) => {
    expect(orderCode).toBeTruthy();
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginBuyer(page);

    await page.goto(`${URLS.buyer}/account/orders/${encodeURIComponent(orderCode)}`);
    await expect(page.getByRole('heading', { name: orderCode })).toBeVisible();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Đã nhận hàng' }).click();
    await expect(page.getByText('Hoàn tất', { exact: true }).first()).toBeVisible();

    await page.goto(`${URLS.buyer}/account/reviews`);
    const hoodieCard = page.locator('article').filter({ hasText: 'XIII Hoodie - Gray' }).first();
    await expect(hoodieCard).toBeVisible();
    await hoodieCard.getByRole('button', { name: 'Đánh giá' }).click();
    await page.getByRole('radio', { name: '5 sao' }).check();
    await page.getByLabel('Nhận xét của bạn').fill('E2E: sản phẩm đúng mô tả, quy trình hoàn tất ổn định.');
    await page.getByRole('button', { name: 'Gửi đánh giá' }).click();
    await expect(hoodieCard).toHaveCount(0);

    await page.getByRole('button', { name: 'Đã đánh giá' }).click();
    await expect(page.locator('article').getByText('E2E: sản phẩm đúng mô tả, quy trình hoàn tất ổn định.', {exact:true})).toBeVisible();
    await expect(page.getByText(/Verified Purchase|Đã mua hàng/i).first()).toBeVisible();
    await context.close();
  });

  test('admin can trace the completed order and review', async ({ browser }) => {
    expect(orderCode).toBeTruthy();
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAdmin(page);

    await page.goto(`${URLS.admin}/orders`);
    await page.getByPlaceholder('Mã đơn / voucher…').fill(orderCode);
    await page.getByRole('button', { name: 'Tìm' }).click();
    const row = page.locator('tr').filter({ hasText: orderCode });
    await expect(row).toBeVisible();
    await expect(row).toContainText('COMPLETED');

    await page.goto(`${URLS.admin}/reviews`);
    await expect(page.getByText('E2E: sản phẩm đúng mô tả, quy trình hoàn tất ổn định.')).toBeVisible();
    await context.close();
  });
});

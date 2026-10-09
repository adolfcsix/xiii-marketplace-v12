import { expect, test } from '@playwright/test';
import { URLS } from '../helpers/session';

const orb = '.street-orb';
const shader = '.street-orb .energy-orb__shader';

test('3D orb draws WebGL pixels, changes palette and keeps its shopping link usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(URLS.buyer + '/');
  await expect(page.locator(shader)).toHaveCount(0);
  await page.locator(orb).scrollIntoViewIfNeeded();
  await expect(page.locator(shader)).toHaveCount(1);
  await expect.poll(() => page.locator(shader).evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl');
    return Boolean(gl?.getParameter(gl.CURRENT_PROGRAM));
  })).toBe(true);
  const state = await page.locator(shader).evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl')!;
    if (!gl) return { linked: false, alpha: 0 };
    const program = gl.getParameter(gl.CURRENT_PROGRAM);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const pixel = new Uint8Array(4);
    gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return { linked: Boolean(gl.getProgramParameter(program, gl.LINK_STATUS)), alpha: pixel[3] };
  });
  expect(state.linked).toBe(true);
  expect(state.alpha).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Tím', exact: true }).click();
  await expect(page.locator(orb)).toHaveAttribute('data-palette', 'violet');
  await expect.poll(() => page.locator(shader).evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext('webgl')!;
    return gl.getUniform(gl.getParameter(gl.CURRENT_PROGRAM), gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'uSaturation'));
  })).toBe(1);
  await page.locator(orb).getByRole('link', { name: 'Khám phá bộ sưu tập', exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === '/search' && url.searchParams.get('sort') === 'newest');
  expect(errors).toEqual([]);
});

test('pause, offscreen and hidden tab release the WebGL renderer', async ({ page }) => {
  await page.goto(URLS.buyer + '/');
  await page.locator(orb).scrollIntoViewIfNeeded();
  await expect(page.locator(shader)).toHaveCount(1);
  await page.getByRole('button', { name: 'Tạm dừng khối cầu 3D', exact: true }).click();
  await expect(page.locator(shader)).toHaveCount(0);
  await expect(page.locator('.street-orb-still')).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục khối cầu 3D', exact: true }).click();
  await expect(page.locator(shader)).toHaveCount(1);
  await page.locator('.street-footer').scrollIntoViewIfNeeded();
  await expect(page.locator(shader)).toHaveCount(0);
  await page.locator(orb).scrollIntoViewIfNeeded();
  await expect(page.locator(shader)).toHaveCount(1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator(shader)).toHaveCount(0);
});

test('reduced motion uses the still sphere without loading the WebGL component', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URLS.buyer + '/');
  await page.locator(orb).scrollIntoViewIfNeeded();
  await expect(page.locator('.street-orb-still')).toBeVisible();
  await expect(page.locator(shader)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tạm dừng khối cầu 3D', exact: true })).toBeDisabled();
});

test('unsupported WebGL still leaves the sphere and controls usable', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind: string, ...args: any[]) {
      if (kind.startsWith('webgl')) return null;
      return (getContext as any).call(this, kind, ...args);
    } as any;
  });
  await page.goto(URLS.buyer + '/');
  await page.locator(orb).scrollIntoViewIfNeeded();
  await expect(page.locator('.street-orb-still')).toBeVisible();
  await page.getByRole('button', { name: 'Tím', exact: true }).click();
  await expect(page.locator(orb)).toHaveAttribute('data-palette', 'violet');
  await expect(page.locator(orb).getByRole('link')).toBeVisible();
});

test('WebGL context loss falls back and can restart', async ({ page }) => {
  await page.goto(URLS.buyer + '/');
  await page.locator(orb).scrollIntoViewIfNeeded();
  await expect(page.locator(shader)).toHaveCount(1);
  await page.locator(shader).evaluate(element => element.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator(shader)).toHaveCount(0);
  await page.getByRole('button', { name: 'Khởi động lại khối cầu 3D', exact: true }).click();
  await expect(page.locator(shader)).toHaveCount(1);
});

test('3D section and controls fit a 320px screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(URLS.buyer + '/');
  await page.locator(orb).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Bạc', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tím', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const stage = await page.locator('.street-orb-stage').boundingBox();
  expect(stage!.width).toBeLessThanOrEqual(320);
});

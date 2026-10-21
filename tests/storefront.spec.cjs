const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // The storefront must remain usable when optional remote fonts are unavailable.
  await page.route(/https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, route => route.abort());
});

test('home renders the intact 41-product catalog', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#heroProductCount')).toHaveText('41');
  await expect(page.locator('#productGrid .product-card')).toHaveCount(41);
  await expect(page.locator('#resultsSummary')).toContainText('41');
});

test('search finds a product by its exact model', async ({ page }) => {
  await page.goto('/');
  await page.locator('#searchInput').fill('RKCBL146');
  await expect(page.locator('#resultsSummary')).toContainText('1');
  await expect(page.locator('#productGrid .product-card')).toHaveCount(1);
  await expect(page.locator('#productGrid .product-model')).toContainText('RKCBL146');
});

test('cart quantity, persistence and Escape keyboard behavior work', async ({ page }) => {
  await page.goto('/');
  const addButton = page.locator('#productGrid [data-add]').first();
  await addButton.click();
  await expect(page.locator('#cartDrawer')).toHaveClass(/open/);
  await expect(page.locator('#cartDrawer')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#closeCart')).toBeFocused();
  await expect(page.locator('#cartCount')).toHaveText('1');

  await page.locator('#cartItems [data-inc]').click();
  await expect(page.locator('#cartCount')).toHaveText('2');
  await page.keyboard.press('Escape');
  await expect(page.locator('#cartDrawer')).not.toHaveClass(/open/);
  await expect(page.locator('#cartDrawer')).toHaveAttribute('inert', '');
  await expect(addButton).toBeFocused();

  await page.reload();
  await expect(page.locator('#cartCount')).toHaveText('2');
});

test('quick view closes and returns keyboard focus to its trigger', async ({ page }) => {
  await page.goto('/');
  const viewButton = page.locator('#productGrid [data-view]').first();
  await viewButton.click();
  await expect(page.locator('#productModal')).toHaveClass(/show/);
  await expect(page.locator('#productModal button[data-close-modal]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#productModal')).not.toHaveClass(/show/);
  await expect(page.locator('#productModal')).toHaveAttribute('inert', '');
  await expect(viewButton).toBeFocused();
});

test('language toggle switches the storefront to English and LTR', async ({ page }) => {
  await page.goto('/');
  await page.locator('#langBtn').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('[data-i18n="shopTitle"]')).toHaveText('Shop ROCK products');
});

test('product detail page adds the selected item to the shared cart', async ({ page }) => {
  await page.goto('/product.html?id=rkcbl146');
  await expect(page.locator('#productLayout')).toBeVisible();
  await expect(page.locator('#detailName')).not.toBeEmpty();
  await page.locator('#detailAddButton').click();
  await expect(page).toHaveURL(/\/ROCK\/?(?:\?.*)?$/);
  await expect(page.locator('#cartDrawer')).toHaveClass(/open/);
  await expect(page.locator('#cartCount')).toHaveText('1');
});

test('unknown product id shows the not-found state safely', async ({ page }) => {
  await page.goto('/product.html?id=missing-test-product');
  await expect(page.locator('#productNotFound')).toBeVisible();
  await expect(page.locator('#productLayout')).toBeHidden();
});

test('ROCKY answers a local catalog query and closes with Escape', async ({ page }) => {
  await page.goto('/');
  await page.locator('#rockyLauncher').click();
  await expect(page.locator('#rockyPanel')).toBeVisible();
  await page.locator('#rockyInput').fill('أبغى شاحن');
  await page.locator('#rockyForm button[type="submit"]').click();
  await expect(page.locator('#rockyMessages .rocky-message').count()).resolves.toBeGreaterThanOrEqual(2);
  await page.keyboard.press('Escape');
  await expect(page.locator('#rockyPanel')).toBeHidden();
  await expect(page.locator('#rockyLauncher')).toHaveAttribute('aria-expanded', 'false');
});

test('mobile navigation is removed from keyboard flow while closed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const panel = page.locator('#mobilePanel');
  await expect(panel).toHaveAttribute('inert', '');
  await page.locator('#menuBtn').click();
  await expect(panel).toHaveClass(/open/);
  await expect(page.locator('#menuBtn')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(panel).not.toHaveClass(/open/);
  await expect(panel).toHaveAttribute('inert', '');
  await expect(page.locator('#menuBtn')).toHaveAttribute('aria-expanded', 'false');
});

test('order preparation remains local and does not alter catalog prices', async ({ page }) => {
  await page.goto('/');
  await page.locator('#productGrid [data-add]').first().click();
  await page.locator('#checkoutBtn').click();
  await page.locator('#customerName').fill('Test Customer');
  await page.locator('#customerPhone').fill('0500000000');
  await page.locator('#copyOrder').click();
  await expect(page.locator('#orderText')).toContainText('Test Customer');
  await expect(page.locator('#orderText')).toContainText('RKCBL146');
  await expect(page.locator('.order-privacy-note')).toContainText('لا يوجد دفع إلكتروني');
});

test('store pages load without uncaught JavaScript errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/', '/product.html?id=rkcbl146', '/policies.html', '/404.html']) {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
  }
  expect(errors, 'Uncaught JavaScript errors: ' + errors.join(' | ')).toEqual([]);
});

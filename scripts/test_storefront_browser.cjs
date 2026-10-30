'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseURL = process.env.ROCK_BASE_URL || 'http://127.0.0.1:4173';
const artifactDir = path.join(process.cwd(), '.artifacts', 'storefront');
fs.mkdirSync(artifactDir, { recursive: true });

async function visible(page, selector, message) {
  const locator = page.locator(selector);
  assert.equal(await locator.isVisible(), true, message || (selector + ' should be visible'));
}

async function noHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth
  }));
  assert.ok(metrics.document <= metrics.viewport + 1,
    label + ' has horizontal overflow: document ' + metrics.document + 'px > viewport ' + metrics.viewport + 'px');
}

async function waitForCatalog(page) {
  await page.waitForFunction(() => {
    const quality = window.ROCK_PRODUCT_IMAGE_QUALITY;
    return quality && Array.isArray(quality.visibleIds) && quality.visibleIds.length > 0;
  }, null, { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('#productGrid') !== null, null, { timeout: 15000 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const failedRequests = [];
  await page.addInitScript(() => {
    window.__rockFailedImageEvents = [];
    document.addEventListener('error', event => {
      const target = event.target;
      if (target instanceof HTMLImageElement) {
        window.__rockFailedImageEvents.push({ src: target.currentSrc || target.src, alt: target.alt });
      }
    }, true);
  });
  page.on('pageerror', error => errors.push(page.url() + ': ' + error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' }));

  try {
    // Desktop homepage: catalog, logo, and a reviewable baseline screenshot.
    await page.goto(baseURL + '/', { waitUntil: 'networkidle' });
    await waitForCatalog(page);
    await visible(page, '#rockyFlight', 'Rocky scroll character must be present on the homepage');
    const rockyAsset = await page.locator('#rockyFlight .rocky-flight__image').getAttribute('src');
    assert.equal(rockyAsset, 'assets/brand/rocky-mascot.svg', 'The official ROCKY mascot must replace the bee artwork');
    await page.locator('#collections').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#rockyFlight')?.dataset.landmark === 'collections',
      null, { timeout: 5000 });
    const rockyFlightTransform = await page.locator('#rockyFlight').evaluate(el => el.style.transform);
    assert.ok(rockyFlightTransform.includes('translate3d('), 'Rocky must receive a scroll-driven transform');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => window.scrollY === 0, null, { timeout: 3000 });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('html').getAttribute('dir'), 'rtl', 'Homepage should start in Arabic RTL');
    const approvedIds = await page.evaluate(() => window.ROCK_PRODUCT_IMAGE_QUALITY.visibleIds);
    assert.equal(await page.locator('#heroProductCount').textContent(), String(approvedIds.length), 'Hero count must match approved product photos');
    await visible(page, '#featuredCarousel', 'Featured products carousel must be visible below the header');
    const carouselSlides = await page.locator('#featuredTrack .featured-slide').count();
    assert.ok(carouselSlides >= 2 && carouselSlides <= 4, 'Featured carousel should show two to four approved products');
    const firstFeatured = await page.locator('#featuredTrack .featured-slide:not([hidden]) .featured-model b').textContent();
    await page.locator('#featuredNext').click();
    const secondFeatured = await page.locator('#featuredTrack .featured-slide:not([hidden]) .featured-model b').textContent();
    assert.notEqual(secondFeatured, firstFeatured, 'Next control should change the featured product');
    assert.equal(await page.locator('#featuredTrack .featured-slide:not([hidden])').count(), 1, 'Only the active slide should be exposed');
    await page.locator('#featuredPause').click();
    assert.equal(await page.locator('#featuredPause').getAttribute('aria-pressed'), 'true', 'Pause control should expose its state');
    await page.locator('#featuredPrev').click();
    assert.equal(await page.locator('#featuredPause').getAttribute('aria-pressed'), 'true', 'Manual navigation should not undo a user pause');
    await page.locator('#featuredPause').click();
    assert.equal(await page.locator('#featuredPause').getAttribute('aria-pressed'), 'false', 'Play control should resume the carousel');
    await page.locator('#productGrid [data-product-image]').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
    await page.waitForFunction(() => [...document.querySelectorAll('#productGrid [data-product-image]')].every(image => image.complete),
      { timeout: 15000 });
    assert.ok(await page.locator('#productGrid [data-product-image]').evaluateAll(images => images.every(image => image.naturalWidth > 0)),
      'Every shown product card must have a successfully loaded image');
    const listedIds = await page.locator('#productGrid [data-add]').evaluateAll(nodes => nodes.map(node => node.dataset.add));
    const failedImages = await page.evaluate(() => window.__rockFailedImageEvents || []);
    assert.deepEqual(listedIds, approvedIds,
      'Only products with clear, loadable white-background images should appear in the catalog. ' +
      'Broken image events: ' + JSON.stringify(failedImages.slice(0, 8)) +
      '; failed requests: ' + JSON.stringify(failedRequests.slice(0, 8)) +
      '; page errors: ' + errors.join(' | '));
    await visible(page, '.brand img', 'The original ROCK logo should remain visible');
    const logo = await page.locator('.brand img').evaluate(el => ({ complete: el.complete, width: el.naturalWidth }));
    assert.ok(logo.complete && logo.width > 0, 'The original ROCK logo asset should load');
    await visible(page, '.story-mark-logo', 'The ROCK logo should appear inside the brand-story tile');
    const storyLogo = await page.locator('.story-mark-logo').evaluate(el => ({ complete: el.complete, width: el.naturalWidth, alt: el.alt }));
    assert.ok(storyLogo.complete && storyLogo.width > 0 && storyLogo.alt === 'ROCK', 'The official logo must load in the story tile');
    await noHorizontalOverflow(page, 'desktop homepage');
    await page.screenshot({ path: path.join(artifactDir, '01-home-desktop.png'), fullPage: true });

    // Mobile homepage: menu state, category navigation, language switch and layout width.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await visible(page, '#featuredCarousel', 'Featured products carousel must remain visible on mobile');
    await noHorizontalOverflow(page, 'mobile featured carousel');
    await visible(page, '#menuBtn', 'Mobile menu button must be visible on small screens');
    await page.locator('#menuBtn').click();
    assert.equal(await page.locator('#menuBtn').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('#mobilePanel').getAttribute('aria-hidden'), 'false');
    await page.locator('#mobilePanel a[href="#collections"]').click();
    assert.equal(await page.locator('#menuBtn').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('#mobilePanel').getAttribute('aria-hidden'), 'true');

    await page.locator('.collection-power').click();
    const activePower = await page.locator('#categoryChips [data-cat="power"]').getAttribute('class');
    assert.ok(activePower.includes('active'), 'Power category tile should activate the matching catalog filter');
    await page.locator('#clearFiltersBtn').click();
    await waitForCatalog(page);
    await page.locator('#langBtn').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'Language switch should update document language');
    assert.equal(await page.locator('html').getAttribute('dir'), 'ltr', 'English should switch the document to LTR');
    assert.equal(await page.locator('#menuBtn').getAttribute('aria-label'), 'Open menu',
      'Mobile-menu accessible label should follow the selected language');
    await noHorizontalOverflow(page, 'mobile homepage');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(artifactDir, '02-home-mobile.png'), fullPage: true });

    // Cart flow: quantity controls, total and localized checkout form.
    await page.locator('#productGrid [data-add="rkcbl146"]').click();
    await visible(page, '#cartDrawer.open', 'Adding a product should open the cart drawer');
    assert.equal(await page.locator('#cartDrawer').getAttribute('aria-hidden'), 'false');
    assert.equal(await page.locator('#cartCount').textContent(), '1');
    assert.equal(await page.locator('#cartItems .cart-row').count(), 1);
    await page.screenshot({ path: path.join(artifactDir, '03-cart-mobile.png'), fullPage: false });

    await page.locator('#cartItems [data-inc]').first().click();
    assert.equal(await page.locator('#cartItems .qty span').first().textContent(), '2',
      'Increase quantity should update the visible quantity');
    assert.equal((await page.locator('#cartTotal').textContent()).trim(), '12.50 SAR',
      'Two of the first listed item (SAR 6.25) should total SAR 12.50');
    await page.locator('#cartItems [data-dec]').first().click();
    assert.equal(await page.locator('#cartItems .qty span').first().textContent(), '1');
    assert.equal((await page.locator('#cartTotal').textContent()).trim(), '6.25 SAR');

    await page.locator('#checkoutBtn').click();
    assert.equal(await page.locator('#cartDrawer').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.locator('#checkoutModal').getAttribute('aria-hidden'), 'false');
    assert.equal((await page.locator('label[for="customerName"] span').textContent()).trim(), 'Name');
    assert.equal((await page.locator('label[for="customerPhone"] span').textContent()).trim(), 'Mobile number');
    assert.equal((await page.locator('label[for="orderText"] span').textContent()).trim(), 'Order summary');
    await noHorizontalOverflow(page, 'mobile checkout');
    await page.screenshot({ path: path.join(artifactDir, '04-checkout-mobile.png'), fullPage: false });

    // Order details update live; nothing is shared until the customer confirms the summary.
    await page.locator('#customerName').fill('ROCK Test Customer');
    await page.locator('#customerPhone').fill('0501234567');
    await page.locator('#customerCity').fill('Jeddah');
    await page.locator('#customerAddress').fill('Pickup point');
    await page.locator('#customerNotes').fill('Playwright test note');
    assert.ok((await page.locator('#orderText').inputValue()).includes('ROCK Test Customer'),
      'Order preview should update as customer fields are entered');
    assert.equal(await page.locator('#orderConfirmation').isChecked(), false,
      'Order confirmation must be unchecked by default');
    await page.locator('#shareOrder').click();
    assert.equal(await page.locator('#orderConfirmation').evaluate(el => el.validity.valueMissing), true,
      'Sharing must require explicit confirmation that this is not a confirmed order');
    assert.equal(await page.evaluate(() => window.__rockSharedOrder === undefined), true,
      'Invalid order summary must not open the share sheet');
    await page.locator('#orderConfirmation').check();
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: async payload => { window.__rockSharedOrder = payload; } });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__rockCopiedOrder = text; } } });
    });
    await page.locator('#shareOrder').click();
    await page.waitForFunction(() => Boolean(window.__rockSharedOrder && window.__rockSharedOrder.text));
    assert.ok(await page.evaluate(() => window.__rockSharedOrder.text.includes('ROCK Test Customer')),
      'Share payload should include the reviewed customer details');
    assert.ok(await page.evaluate(() => window.__rockSharedOrder.text.includes('Playwright test note')),
      'Share payload should include optional order notes');
    await page.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); });
    await page.locator('#shareOrder').click();
    await page.waitForFunction(() => typeof window.__rockCopiedOrder === 'string');
    assert.ok(await page.evaluate(() => window.__rockCopiedOrder.includes('ROCK Test Customer')),
      'If the browser does not support native sharing, the order should fall back to copying');

    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#checkoutModal').getAttribute('aria-hidden'), 'true',
      'Escape should close the checkout dialog');
    assert.equal(await page.locator('body').evaluate(el => el.classList.contains('rock-dialog-open')), false,
      'Closing dialogs should restore background scrolling');

    // Product details: consistent header contrast, correct data, language switch, and responsive layout.
    await page.evaluate(() => { localStorage.setItem('rock-lang', 'ar'); localStorage.removeItem('rock-cart'); });
    await page.goto(baseURL + '/product.html?id=rkch720', { waitUntil: 'networkidle' });
    await visible(page, '#productLayout', 'A valid product id should show product details');
    assert.match(await page.locator('#detailName').textContent(), /شاحن حائط ROCK GaN بقدرة 20 واط/, 'Product page should initially use the Arabic catalog name');
    assert.equal((await page.locator('#detailPrice').textContent()).trim(), '15 ر.س', 'Product price should use the Arabic currency label before switching languages');
    const productHeader = await page.locator('.site-header').evaluate(el => getComputedStyle(el).backgroundColor);
    assert.match(productHeader, /rgba?\(255,\s*255,\s*255/, 'Product page header should use the shared white-first surface');
    const productNavColor = await page.locator('.product-nav a').first().evaluate(el => getComputedStyle(el).color);
    assert.notEqual(productNavColor, 'rgb(255, 255, 255)', 'Product navigation text must remain readable on the light header');
    const productLogo = await page.locator('.product-page-body .brand img').evaluate(el => ({ complete: el.complete, width: el.naturalWidth }));
    assert.ok(productLogo.complete && productLogo.width > 0, 'Product page logo should load after its navy tint is applied');
    await noHorizontalOverflow(page, 'mobile product page');
    await page.screenshot({ path: path.join(artifactDir, '05-product-mobile.png'), fullPage: true });

    await page.locator('#langBtn').click();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'Product page language switch should update document language');
    assert.equal(await page.locator('html').getAttribute('dir'), 'ltr', 'Product page English mode should use LTR direction');
    assert.equal((await page.locator('.product-nav a').first().textContent()).trim(), 'Shop',
      'Product page navigation should translate when the language changes');
    await page.locator('#langBtn').click();
    assert.equal(await page.locator('html').getAttribute('dir'), 'rtl', 'Product page should return to RTL when Arabic is selected');

    await visible(page, '#productMenuBtn', 'Product page should have a mobile navigation button');
    await page.locator('#productMenuBtn').click();
    assert.equal(await page.locator('#productMobilePanel').getAttribute('aria-hidden'), 'false');
    assert.equal(await page.locator('#productMenuBtn').getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#productMobilePanel').getAttribute('aria-hidden'), 'true');
    assert.equal(await page.locator('#productMenuBtn').getAttribute('aria-expanded'), 'false');

    // Desktop product detail screenshot and width check.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload({ waitUntil: 'networkidle' });
    await noHorizontalOverflow(page, 'desktop product page');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(artifactDir, '06-product-desktop.png'), fullPage: true });

    // A product detail add-to-cart must preserve the item and quantity before returning to the cart.
    await page.locator('#detailAddButton').click();
    await page.waitForURL(url => url.pathname.endsWith('/') && url.searchParams.get('cart') === '1', { timeout: 5000 });
    await visible(page, '#cartDrawer.open', 'Adding from product detail should return to an open cart');
    assert.equal(await page.locator('#cartItems .cart-row').count(), 1, 'Product detail add-to-cart should preserve one cart line');
    assert.equal(await page.locator('#cartCount').textContent(), '1', 'Product detail add-to-cart should update the cart count');
    await noHorizontalOverflow(page, 'cart opened from product detail');
    await page.screenshot({ path: path.join(artifactDir, '07-product-added-cart-desktop.png'), fullPage: false });

    assert.deepEqual(errors, [], 'Unexpected JavaScript page errors: ' + errors.join(' | '));
    console.log('ROCK browser regression passed: homepage, navigation, language, filters, cart totals, live order preview, explicit confirmation, share sheet and copy fallback, and product details.');
    console.log('Screenshots saved under ' + artifactDir);
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

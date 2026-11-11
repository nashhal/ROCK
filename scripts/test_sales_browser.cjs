'use strict';

const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const baseURL = process.env.ROCK_BASE_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseURL + '/sales/', { waitUntil: 'networkidle' });
    assert.equal(await page.title(), 'ROCK Sales | نظام المبيعات');
    assert.equal(await page.locator('#loginForm').isVisible(), true, 'Sales sign-in must be the initial screen');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,nofollow');
    await page.waitForFunction(() => document.querySelector('#loginMessage')?.textContent.length > 0, null, { timeout: 5000 });
    assert.match(await page.locator('#loginMessage').textContent(), /PHP\/MySQL|غير مهيأة/,
      'Static hosting should explain that the authenticated sales backend needs PHP/MySQL');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('#loginForm').isVisible(), true, 'The sign-in form must remain visible on mobile');
    const size = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth
    }));
    assert.ok(size.document <= size.viewport + 1,
      'Sales sign-in must not cause horizontal scrolling on a 390px phone: ' + JSON.stringify(size));
    assert.equal(await page.locator('#appView').isVisible(), false, 'The protected application must remain hidden before authentication');
    assert.deepEqual(errors, [], 'Sales portal must not emit JavaScript runtime errors');
    console.log('Sales portal desktop/mobile smoke test passed.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });

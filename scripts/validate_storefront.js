#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const requiredFiles = [
  'index.html', 'product.html', 'policies.html', '404.html',
  'styles.css', 'premium-refresh.css', 'white-modern.css', 'product-page.css',
  'app.js', 'products.js', 'product-page.js', 'policy-page.js',
  'rocky-assistant.js', 'rocky-assistant.css',
  'scripts/sync_drive_photos.py', 'assets/brand/rock-logo.svg',
  'assets/brand/rocky-mascot.svg', 'assets/brand/rocky-avatar.webp',
  'robots.txt', 'sitemap.xml'
];

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, file)), `Required file is missing: ${file}`);
}

// Guard the shared design system and its stylesheet wiring against accidental removal.
const designSystem = read('white-modern.css');
assert.ok(designSystem.includes('ROCK Design System v1'), 'Shared ROCK design-system section is missing');
for (const token of [
  '--rock-font-ar', '--rock-font-latin', '--rock-text-base',
  '--rock-leading-ar', '--rock-space-4', '--rock-content-width',
  '--rock-radius-md', '--rock-focus-ring'
]) {
  assert.ok(designSystem.includes(`${token}:`), `Design-system token is missing: ${token}`);
}
assert.ok(designSystem.includes('html[dir="rtl"] .hero h1'), 'Arabic hero typography refinement is missing');
for (const page of ['index.html', 'product.html', 'policies.html']) {
  assert.ok(read(page).includes('white-modern.css?v='), `Versioned design stylesheet link is missing in ${page}`);
}

const productsSource = read('products.js');
const productMatch = productsSource.match(/const\s+ROCK_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/);
assert.ok(productMatch, 'Could not parse ROCK_PRODUCTS catalog');
const products = JSON.parse(productMatch[1]);
assert.equal(products.length, 41, 'The original 41-product catalog must remain intact');

const ids = new Set();
const expectedImagePath = /^assets\/products\/[a-z0-9-]+\.webp$/i;
for (const product of products) {
  assert.ok(product.id && !ids.has(product.id), `Missing or duplicate product id: ${product.id}`);
  ids.add(product.id);
  assert.ok(product.model && product.nameAr && product.nameEn, `Required product text missing: ${product.id}`);
  assert.ok(Number.isFinite(product.price) && product.price >= 0, `Invalid product price: ${product.id}`);
  assert.match(product.image || '', expectedImagePath, `Invalid primary image path: ${product.id}`);
  assert.ok(fs.existsSync(path.join(root, product.image)), `Missing primary image: ${product.id} -> ${product.image}`);
  if (product.images !== undefined) {
    assert.ok(Array.isArray(product.images) && product.images.length > 0, `Invalid gallery list: ${product.id}`);
    assert.equal(new Set(product.images).size, product.images.length, `Duplicate gallery path: ${product.id}`);
    assert.equal(product.images[0], product.image, `Primary image must be first in gallery: ${product.id}`);
    for (const image of product.images) {
      assert.match(image, expectedImagePath, `Invalid gallery image path: ${product.id} -> ${image}`);
      assert.ok(fs.existsSync(path.join(root, image)), `Missing gallery image: ${product.id} -> ${image}`);
    }
  }
}

function cssBraceBalance(source, file) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  let comment = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (comment) {
      if (ch === '*' && next === '/') { comment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '*') { comment = true; i += 1; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      assert.ok(depth >= 0, `Unexpected closing brace in ${file}`);
    }
  }
  assert.equal(depth, 0, `Unbalanced CSS braces in ${file}`);
  assert.equal(quote, '', `Unclosed CSS string in ${file}`);
  assert.equal(comment, false, `Unclosed CSS comment in ${file}`);
}

const htmlFiles = ['index.html', 'product.html', 'policies.html', '404.html'];
for (const file of htmlFiles) {
  const html = read(file);
  assert.ok(!/\[\.\.\.\]/.test(html), `Truncated placeholder found in ${file}`);
  assert.ok(!/\\n\s*<link\b/.test(html), `Literal escaped newline before a link in ${file}`);

  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  for (const img of imgs) assert.match(img, /\balt\s*=/i, `Image without alt text in ${file}: ${img.slice(0, 100)}`);

  const idsInFile = new Set();
  for (const idMatch of html.matchAll(/\bid="([^"]+)"/g)) {
    assert.ok(!idsInFile.has(idMatch[1]), `Duplicate id="${idMatch[1]}" in ${file}`);
    idsInFile.add(idMatch[1]);
  }

  const seenStylesheets = new Set();
  for (const link of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi)) {
    const href = link[1];
    if (/^(?:https?:|data:)/i.test(href)) continue;
    const normalized = href.split(/[?#]/, 1)[0];
    assert.ok(!seenStylesheets.has(normalized), `Duplicate stylesheet ${normalized} in ${file}`);
    seenStylesheets.add(normalized);
  }

  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/gi)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:|javascript:)/i.test(href)) continue;
    const local = href.split(/[?#]/, 1)[0];
    if (!local) continue;
    const resolved = path.resolve(root, local);
    assert.ok(resolved === root || resolved.startsWith(root + path.sep), `Path escapes repository in ${file}: ${href}`);
    assert.ok(fs.existsSync(resolved), `Broken local asset/link in ${file}: ${href}`);
  }
}

const home = read('index.html');
assert.match(home, /<html\b[^>]*lang="ar"[^>]*dir="rtl"/i, 'Homepage must declare Arabic RTL');
const cspMatch = home.match(/Content-Security-Policy"\s+content="([^"]+)"/i);
assert.ok(cspMatch, 'Homepage CSP meta tag missing');
for (const directive of [
  "default-src 'self'", "script-src 'self'", "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:", "connect-src 'self'", "form-action 'self'", "upgrade-insecure-requests"
]) {
  assert.ok(cspMatch[1].includes(directive), `Homepage CSP directive missing: ${directive}`);
}
const jsonLd = home.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i);
assert.ok(jsonLd, 'Homepage JSON-LD missing');
assert.equal(JSON.parse(jsonLd[1]).name, 'ROCK', 'Homepage JSON-LD is invalid');

for (const file of ['index.html', 'product.html', 'policies.html']) {
  const html = read(file);
  assert.equal((html.match(/white-modern\.css/gi) || []).length, 1, `${file} must load the white-modern stylesheet exactly once`);
}
const sharedDesignStyles = ['index.html', 'product.html', 'policies.html'].map(file => {
  const match = read(file).match(/href="(white-modern\.css\?v=[^"]+)"/);
  assert.ok(match, `Versioned white-modern stylesheet reference missing in ${file}`);
  return match[1];
});
assert.equal(new Set(sharedDesignStyles).size, 1, 'All pages must use the same cache version for the shared design stylesheet');
for (const [page, script] of [['product.html','product-page.js'],['policies.html','policy-page.js']]) {
  const html = read(page);
  const copy = read(script);
  assert.ok(html.includes('data-i18n="brandTagline"'), `${page} must use the shared translatable brand tagline`);
  assert.ok(copy.includes("brandTagline:'ملحقات تقنية ليومك'"), `${script} missing the Arabic brand tagline`);
  assert.ok(copy.includes("brandTagline:'Everyday tech essentials'"), `${script} missing the English brand tagline`);
  assert.ok(copy.includes("announcement:'ROCK | ملحقات تقنية ليومك'"), `${script} announcement copy is inconsistent`);
  assert.ok(copy.includes("announcement:'ROCK | Everyday tech essentials'"), `${script} English announcement copy is inconsistent`);
}

const policies = read('policies.html');
assert.equal((policies.match(/premium-refresh\.css/gi) || []).length, 1, 'Policies page must load the refresh CSS only once');
const productPage = read('product.html');
assert.ok(!productPage.includes('id="detailPhotosLink"'), 'Product page must not expose a Drive-folder link');

const app = read('app.js');
// Language and mobile navigation operate on all matches, not a single element.
assert.ok(app.includes("document.querySelectorAll('[data-i18n]').forEach"), 'Language switching must update every translated element');
assert.ok(app.includes("document.querySelectorAll('[data-i18n-aria]').forEach"), 'Translated accessibility labels must update across the page');
assert.ok(app.includes("document.querySelectorAll('[data-mobile-link]').forEach"), 'Mobile navigation must bind every menu link');
assert.ok(!app.includes("$('[data-i18n]').forEach"), 'A single-element selector cannot be used with forEach for translations');
assert.ok(!app.includes("$('[data-i18n-aria]').forEach"), 'A single-element selector cannot be used with forEach for accessible labels');
assert.ok(!app.includes("$('[data-mobile-link]').forEach"), 'A single-element selector cannot be used with forEach for mobile navigation');
for (const key of ['pageTitle','openMenu','search','viewCart','closeAnnouncement','shopProducts','switchLanguage','powerLabel','audioLabel','driveLabel','lifeLabel','brandTagline','closingTitle','closingAccent']) {
  assert.ok(app.includes(`${key}:`), `Homepage translation is missing: ${key}`);
}
assert.ok(home.includes('data-i18n="powerLabel"') && home.includes('data-i18n="audioLabel"'), 'Homepage category labels must be translatable');
assert.ok(!home.includes('class="ticker"'), 'Legacy ticker should not return to the homepage');

// Cart, checkout and product-page interaction guards.
assert.match(home, /id="cartDrawer"[^>]*role="dialog"[^>]*aria-hidden="true"/, 'Cart drawer must be a labelled, initially hidden dialog');
assert.ok(home.includes('aria-controls="cartDrawer"') && home.includes('aria-expanded="false"'), 'Cart trigger must expose its relationship and closed state');
for (const key of ['emptyCartText','increaseQty','decreaseQty','closeDialog','customerNameLabel','customerPhoneLabel','customerCityLabel','customerAddressLabel','customerNotesLabel','orderSummaryLabel']) {
  assert.ok(app.includes(`${key}:`), `Cart/checkout translation is missing: ${key}`);
}
assert.ok(app.includes("t('emptyCartText')"), 'The cart empty state must use purpose-written localized copy');
assert.ok(app.includes('aria-label="${decreaseLabel}"') && app.includes('aria-label="${increaseLabel}"'), 'Quantity buttons must have accessible labels');
assert.ok(app.includes("drawer.setAttribute('aria-hidden','false')") && app.includes("drawer.setAttribute('aria-hidden','true')"), 'Cart open/closed state must update aria-hidden');
assert.ok(app.includes("document.body.classList.add('rock-dialog-open')"), 'Opening a dialog must prevent background scroll');
for (const id of ['customerNameLabel','customerPhoneLabel','customerCityLabel','customerAddressLabel','customerNotesLabel','orderSummaryLabel']) {
  assert.ok(home.includes(`data-i18n="${id}"`), `Checkout form label must be localized: ${id}`);
}
const productPageHtml = read('product.html');
const productScript = read('product-page.js');
assert.ok(productPageHtml.includes('id="productMenuBtn"') && productPageHtml.includes('id="productMobilePanel"'), 'Product page must include mobile navigation controls');
assert.ok(productScript.includes("productMobilePanel.querySelectorAll('[data-mobile-link]')"), 'Product mobile menu must close when a link is selected');
assert.ok(productScript.includes("document.querySelectorAll('[data-i18n-aria]')"), 'Product page must localize accessible labels');
assert.ok(productPageHtml.includes('data-i18n="brandTagline"'), 'Product footer brand tagline must be localized');
const productCss = read('white-modern.css');
for (const selector of ['Product details and cart polish', 'Dialog and hidden-state semantics', '#cartItems .cart-row', '.product-page-body .product-detail-layout', '.product-page-body .product-menu-btn']) {
  assert.ok(productCss.includes(selector), `Product/cart design rule is missing: ${selector}`);
}
assert.ok(productCss.includes('[hidden]{display:none!important}'), 'Hidden sections must remain hidden when component rules set display');
assert.ok(productCss.includes('#cartDrawer[aria-hidden="true"]'), 'Closed cart must be removed from pointer interaction and the tab flow');
assert.ok(productCss.includes('.modal[aria-hidden="true"]'), 'Closed modals must not remain interactive');
assert.ok(!/(^|[^$])\$\('\.modal'\)\.forEach/m.test(app), 'Modal close handler must iterate a collection, not a single element');
assert.ok(!/(^|[^$])\$\('#categoryChips \.chip'\)\.forEach/m.test(app), 'Category filter must iterate all chips');
assert.ok(app.includes("$('.modal').forEach(modal=>modal.classList.remove('show'))"), 'Modal close function must close all modal elements');
assert.ok(!app.includes("$(' .modal'.trim())"), 'Malformed modal selector found');
assert.ok(app.includes("$('.collection-card').forEach(b=>b.onclick=()=>{"), 'Collection cards must have click handlers');
assert.ok(app.includes("$('#categoryChips .chip').forEach"), 'Category collection selector is missing');
assert.match(app, /Maximum quantity reached|الحد الأقصى للكمية/, 'Cart must enforce its quantity limit');

for (const file of ['styles.css', 'premium-refresh.css', 'white-modern.css', 'product-page.css', 'rocky-assistant.css']) {
  const css = read(file);
  assert.ok(!/\[\.\.\.\]/.test(css), `Truncated CSS placeholder found in ${file}`);
  cssBraceBalance(css, file);
}
assert.match(read('premium-refresh.css'), /\.product-image\{[^}]*background:\s*#fff/i, 'Catalog tiles must keep a white image background');
assert.match(read('premium-refresh.css'), /:focus-visible\{outline:3px solid #086dc7/i, 'Keyboard focus indicator missing');
assert.match(read('premium-refresh.css'), /prefers-reduced-motion:\s*reduce/i, 'Reduced-motion support missing');

const sitemap = read('sitemap.xml');
for (const product of products) {
  const url = `https://nashhal.github.io/ROCK/product.html?id=${encodeURIComponent(product.id)}`;
  assert.ok(sitemap.includes(`<loc>${url}</loc>`), `Product missing from sitemap: ${product.id}`);
}
assert.ok(sitemap.includes('<loc>https://nashhal.github.io/ROCK/</loc>'), 'Homepage missing from sitemap');
assert.ok(read('robots.txt').includes('Sitemap: https://nashhal.github.io/ROCK/sitemap.xml'), 'Sitemap missing from robots.txt');

console.log(`ROCK validation passed: ${products.length} products, all local gallery images, HTML assets, CSP, sitemap and accessibility guards.`);

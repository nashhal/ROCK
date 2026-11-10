#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const schema = read('api/order-schema.php');
const publicApi = read('api/orders.php');
const adminApi = read('admin/orders-api.php');
const adminPage = read('admin/orders.php');
const adminUi = read('admin/orders-admin.js');
const storefront = read('orders-storefront.js');
const motionLoader = read('rock-experience.js');
const adminHome = read('admin/index.php');
const setupGuide = read('HOSTINGER-ADMIN-SETUP.md');

for (const table of ['rock_orders', 'rock_order_items', 'rock_order_status_history', 'rock_order_rate_limits']) {
  assert.ok(schema.includes('CREATE TABLE IF NOT EXISTS ' + table), 'Missing order table: ' + table);
}
assert.ok(schema.includes('ON DELETE CASCADE'), 'Order item/status history rows must be deleted with their parent order');
assert.ok(schema.includes('order_number VARCHAR(32) NOT NULL UNIQUE'), 'Order numbers must be unique');

assert.ok(publicApi.includes("$_SERVER['REQUEST_METHOD']") && publicApi.includes("'POST'"), 'Public order API must accept POST only');
assert.ok(publicApi.includes("str_contains($contentType, 'application/json')"), 'Public order API must require JSON');
assert.ok(publicApi.includes('HTTP_ORIGIN') && publicApi.includes('hash_equals'), 'Public order API must validate the request origin');
assert.ok(publicApi.includes('hash_hmac') && publicApi.includes('rock_order_rate_limits'), 'Public order API must use keyed IP rate limiting');
assert.ok(publicApi.includes('active = 1 AND image_approved = 1'), 'Orders must use only currently active, image-approved products');
assert.ok(publicApi.includes('number_format($totalCents / 100, 2'), 'Server must calculate the order total using database prices');
assert.ok(publicApi.includes('rock_order_status_history'), 'New orders must create an initial status-history record');
assert.ok(!publicApi.includes("$_POST['price']"), 'Public order input must not supply trusted prices');

assert.ok(adminApi.includes('rock_require_admin()') && adminApi.includes('rock_check_csrf()'), 'Order administration must enforce login and CSRF');
assert.ok(adminApi.includes('FOR UPDATE') && adminApi.includes('rock_order_status_history'), 'Status changes must be transactional and audited');
assert.ok(adminApi.includes('LIMIT 1200'), 'Order listing must be bounded');

assert.ok(adminPage.includes('noindex,nofollow') && adminPage.includes('meta name="csrf-token"'), 'Order admin page must be private and provide CSRF');
assert.ok(adminPage.includes('orders-admin.js') && adminPage.includes('statusFilter'), 'Order admin page must load its UI and filters');
assert.ok(adminHome.includes('href="orders.php"'), 'Main admin page must link to order management');
assert.ok(adminUi.includes('data-save-status') && adminUi.includes('update-status'), 'Admin UI must let staff update order statuses');
assert.ok(adminUi.includes('text/csv') && adminUi.includes('createObjectURL'), 'Admin UI must export the visible order list to CSV');

assert.ok(storefront.includes('api/products.php') && storefront.includes("payload.source !== 'hostinger-mysql'"), 'Storefront order submit button must be enabled only when the live Hostinger catalog is active');
assert.ok(storefront.includes('api/orders.php') && storefront.includes("JSON.stringify({ customer, items, website: '' })"), 'Checkout must send only cart identifiers/quantities and customer details');
assert.ok(storefront.includes('orderConfirmation') && storefront.includes('accepted = true'), 'Checkout must require explicit confirmation and prevent repeat submission');
assert.ok(motionLoader.includes('orders-storefront.js'), 'Homepage must load the storefront order integration');
assert.ok(setupGuide.includes('/admin/orders.php') && setupGuide.includes('keyed IP rate limit'), 'Hostinger guide must explain order administration and rate limiting');

console.log('ROCK order contract checks passed.');

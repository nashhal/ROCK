#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const bootstrap = read('api/bootstrap.php');
const editorialQuality = read('editorial-quality-v3.css');
const schema = read('api/order-schema.php');
const businessSchema = read('api/business-schema.php');
const publicSettings = read('api/store-settings.php');
const operationsApi = read('admin/operations-api.php');
const operationsPage = read('admin/operations.php');
const operationsUi = read('admin/operations.js');
const invoice = read('admin/invoice.php');
const home = read('index.html');
const editorial = read('editorial-overrides.css');
const publicApi = read('api/orders.php');
const adminApi = read('admin/orders-api.php');
const productAdminApi = read('admin/api.php');
const adminPage = read('admin/orders.php');
const adminUi = read('admin/orders-admin.js');
const storefront = read('orders-storefront.js');
const motionLoader = read('rock-experience.js');
const adminHome = read('admin/index.php');
const setupGuide = read('HOSTINGER-ADMIN-SETUP.md');
const installer = read('api/install.php');

for (const table of ['rock_orders', 'rock_order_items', 'rock_order_status_history', 'rock_order_rate_limits']) {
  assert.ok(schema.includes('CREATE TABLE IF NOT EXISTS ' + table), 'Missing order table: ' + table);
}
assert.ok(schema.includes('ON DELETE CASCADE'), 'Order item/status history rows must be deleted with their parent order');
assert.ok(bootstrap.includes('SELECT username, role, full_name, is_active FROM rock_admin_users WHERE id = ? LIMIT 1') && bootstrap.includes("hash_equals((string)($user['username'] ?? ''), $sessionUsername)"), 'Protected admin requests must revalidate active account identity and current role from the database');
assert.ok(schema.includes('order_number VARCHAR(32) NOT NULL UNIQUE'), 'Order numbers must be unique');

assert.ok(publicApi.includes("$_SERVER['REQUEST_METHOD']") && publicApi.includes("'POST'"), 'Public order API must accept POST only');
assert.ok(publicApi.includes("str_contains($contentType, 'application/json')"), 'Public order API must require JSON');
assert.ok(publicApi.includes('HTTP_ORIGIN') && publicApi.includes('hash_equals'), 'Public order API must validate the request origin');
assert.ok(publicApi.includes('hash_hmac') && publicApi.includes('rock_order_rate_limits'), 'Public order API must use keyed IP rate limiting');
assert.ok(publicApi.includes('active = 1 AND image_approved = 1'), 'Orders must use only currently active, image-approved products');
assert.ok(publicApi.includes('$totalCents += $lineCents') && publicApi.includes('FROM rock_products WHERE id = ? AND active = 1 AND image_approved = 1'), 'Server must calculate line totals from the approved database catalog');
assert.ok(publicApi.includes('$grandTotalCents = $subtotalCents + $shippingCents') && publicApi.includes('shipping_fee, total, payment_method'), 'Server must calculate shipping and the final total');
assert.ok(publicApi.includes('stock_reserved') === false, 'Public order submission must not reserve inventory before confirmation');
assert.ok(publicApi.includes('rock_order_status_history'), 'New orders must create an initial status-history record');
assert.ok(!publicApi.includes("$_POST['price']"), 'Public order input must not supply trusted prices');

assert.ok(adminApi.includes('rock_require_admin()') && adminApi.includes('rock_check_csrf()'), 'Order administration must enforce login and CSRF');
assert.ok(productAdminApi.includes("if ($method === 'GET' && $action === 'products') {\n        rock_require_roles(['admin', 'manager']);"), 'Sales representatives must not access the admin product API');
assert.ok(adminApi.includes('FOR UPDATE') && adminApi.includes('rock_order_status_history'), 'Status changes must be transactional and audited');
assert.ok(adminApi.includes('LIMIT 1200'), 'Order listing must be bounded');
assert.ok(adminApi.includes('rock_require_roles([\'sales_rep\'])') || adminApi.includes("$role === 'sales_rep'"), 'Sales reps must be scoped to orders assigned to them');
assert.ok(adminApi.includes("'confirmed', 'preparing', 'out_for_delivery'") && adminApi.includes('rock_inventory_movements') && adminApi.includes('stock_reserved'), 'Order confirmation and cancellation must reserve/release tracked stock and audit movements');
assert.ok(adminApi.includes('transitions =') && adminApi.includes('هذا الانتقال بين حالات الطلب غير مسموح'), 'Order status transitions must be validated');

assert.ok(adminPage.includes('noindex,nofollow') && adminPage.includes('meta name="csrf-token"'), 'Order admin page must be private and provide CSRF');
assert.ok(adminPage.includes('orders-admin.js') && adminPage.includes('statusFilter'), 'Order admin page must load its UI and filters');
assert.ok(adminHome.includes('href="orders.php"') && adminHome.includes('href="operations.php"'), 'Main admin page must link to order and operations management');
assert.ok(publicSettings.includes('shippingDefaultSar') && publicSettings.includes('paymentMethods'), 'Public checkout settings endpoint must expose configured shipping and payment options');
assert.ok(businessSchema.includes('rock_customers') && businessSchema.includes('rock_inventory_movements') && businessSchema.includes('rock_store_settings'), 'Operations schema must create customer, inventory log and settings tables');
assert.ok(businessSchema.includes('rock_ensure_column') && businessSchema.includes('stock_quantity') && businessSchema.includes('role'), 'Operations schema must apply additive migrations for stock and staff roles');
assert.ok(adminUi.includes('data-save-status') && adminUi.includes('update-status'), 'Admin UI must let staff update order statuses');
assert.ok(adminUi.includes("if (!button || !$('#ordersList')) return;"), 'Orders UI must safely handle an incomplete Hostinger setup page');
assert.ok(adminUi.includes('text/csv') && adminUi.includes('createObjectURL'), 'Admin UI must export the visible order list to CSV');

assert.ok(storefront.includes('api/products.php') && storefront.includes("payload.source !== 'hostinger-mysql'"), 'Storefront order submit button must be enabled only when the live Hostinger catalog is active');
assert.ok(storefront.includes('api/orders.php') && storefront.includes('JSON.stringify({ customer, items, paymentMethod: paymentSelect.value, website: honeypot.value })'), 'Checkout must submit cart identifiers/quantities, customer details and the selected allowed payment method');
assert.ok(storefront.includes('api/store-settings.php') && storefront.includes('actions.parentElement.insertBefore(paymentLabel, actions)'), 'Checkout must load settings and insert payment choice before action controls without DOM hierarchy errors');
assert.ok(storefront.includes('orderConfirmation') && storefront.includes('accepted = true'), 'Checkout must require explicit confirmation and prevent repeat submission');
assert.ok(storefront.includes("honeypot.name = 'website'") && storefront.includes('website: honeypot.value'), 'Checkout must submit the real hidden honeypot field');
assert.ok(motionLoader.includes('orders-storefront.js'), 'Homepage must load the storefront order integration');
assert.ok(setupGuide.includes('/admin/orders.php') && setupGuide.includes('keyed IP rate limit'), 'Hostinger guide must explain order administration and rate limiting');
assert.ok(installer.includes('minlength=\"48\"') && installer.includes('strlen($configToken) < 48'), 'Installer must require a 48-character setup token');

assert.ok(operationsPage.includes('data-view="inventory"') && operationsPage.includes('data-view="customers"') && operationsPage.includes('data-view="reports"'), 'Operations workspace must expose inventory, customers and reports');
assert.ok(operationsPage.includes('data-view="staff"') && operationsPage.includes('data-view="settings"'), 'Admin workspace must expose staff and store settings');
assert.ok(operationsApi.includes('update-stock') && operationsApi.includes('save-staff') && operationsApi.includes('save-settings'), 'Operations API must support stock, staff and settings changes');
assert.ok(operationsApi.includes("if (!in_array($role, ['admin', 'manager'], true))") && operationsApi.includes('ليست لديك صلاحية للوصول إلى مساحة العمليات.'), 'Operations API must block sales representatives from customer, inventory, overview and report data');
assert.ok(operationsApi.includes('rock_require_roles([\'admin\'])') && operationsApi.includes('rock_require_roles([\'admin\', \'manager\'])'), 'Operations API must separate administrator and manager capabilities');
assert.ok(operationsUi.includes('exportCsv') && operationsUi.includes('updateStock') && operationsUi.includes('loadCustomers'), 'Operations UI must support inventory edits, customer exports and reports');
assert.ok(invoice.includes('window.print()') && invoice.includes('noindex,nofollow'), 'Order document must be private and printable to PDF');
assert.ok(editorial.includes('.hero.section-shell,.hero') && editorial.includes('.service-strip.section-shell') && editorial.includes('#productGrid .product-card'), 'Editorial layer must style the product-first hero, trust band and catalog');
assert.ok(home.includes('editorial-quality-v3.css?v=20261111-rock-quality-v3') && editorialQuality.includes('--rock-space-8') && editorialQuality.includes('#productGrid .product-action-btn') && editorialQuality.includes('@media(prefers-reduced-motion:reduce)'), 'Shared Editorial quality layer must define spacing, refined product actions and reduced-motion support');
assert.ok(home.includes('editorial-overrides.css?v='), 'Homepage must load the Editorial design layer');
assert.ok(setupGuide.includes('Operations workspace and inventory') && setupGuide.includes('Print / PDF'), 'Hostinger guide must document operations and order documents');
console.log('ROCK order and operations contract checks passed.');

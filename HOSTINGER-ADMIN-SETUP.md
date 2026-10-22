# ROCK — Hostinger Product Admin

This repository contains the static ROCK storefront plus an optional PHP/MySQL backend. GitHub Pages can host the static catalog and manual share/copy request flow only; it cannot execute PHP, persist live orders, or run the admin. On a PHP-enabled Hostinger deployment, the storefront reads `api/products.php` and can submit order requests into MySQL.

## Included features

- Session-protected admin at `/admin/`.
- First-time installer at `/api/install.php` (must be removed after successful setup).
- Secure login with password hashing, CSRF protection, HttpOnly/SameSite session cookies and temporary login throttling.
- Add, edit and delete product records, update SAR prices, switch listing visibility and upload main product photos.
- Image uploads are checked for raster file type, minimum dimensions, aspect ratio, predominately white background and actual image detail. Accepted uploads are normalized to 600×600 WebP on white.
- The first installation imports the existing `products.js` catalog. Initial listing status comes from `data/product-image-quality.js`, so rejected photos remain hidden without altering existing prices.
- Server-recorded order requests, item/price snapshots, idempotency protection, basic submission rate limits, and an admin Orders workspace.
- A manual shipping quote field; the order cannot be confirmed until a shipping price is saved. Final totals are not set before shipping is quoted.
- Optional stock tracking per product. Leave the quantity blank to mark stock as untracked; tracked stock is reserved when an order is confirmed and restored if it is cancelled before shipping.

The admin manages the Hostinger database only. It does not change `products.js` on GitHub or automatically push Hostinger edits back to GitHub.

## Hostinger setup

1. In Hostinger hPanel, create a MySQL database and user under **Databases**. Assign that user all privileges on the new database. Record the exact host, database name, username and password shown by hPanel.
2. Upload the **built GitHub Pages artifact**, not only the raw source files. Get it from the successful `Deploy to GitHub Pages` run → **Artifacts** → `github-pages`. Download the artifact ZIP, extract it; if it contains `artifact.tar`, extract that TAR too. Upload the resulting contents directly into `public_html` so that `index.html`, `products.js`, `data/product-image-quality.js`, `api/`, `admin/` and `assets/` are in the expected places.
3. In Hostinger File Manager, copy `api/config.example.php` to `api/config.php`. Edit the new `config.php` and enter the database credentials. Replace `setup_token` with a random secret of at least 48 characters. Keep `config.php` private and never commit it to GitHub. `api/.htaccess` denies direct HTTP access to that file on Apache/LiteSpeed.
4. In a browser, open `https://YOUR-DOMAIN/api/install.php`. Enter the same setup token, choose your first admin username, and choose a strong password of at least 12 characters. The installer creates the tables, imports the existing products and keeps only image-approved products active. Existing catalog prices are imported as stored.
5. Once the installer says it succeeded, **delete `api/install.php`** from File Manager immediately.
6. If this database was already set up with the earlier product-admin-only version, open `https://YOUR-DOMAIN/api/migrate-orders.php`, enter the same setup token, submit the form, verify the success response, and then **delete `api/migrate-orders.php` immediately**. This upgrade adds the new order tables and stock columns without replacing product rows or prices. New installations do not need this step because `api/install.php` now creates the order tables.
7. Open `https://YOUR-DOMAIN/admin/`, sign in, and manage products. When adding a product, enter a stable ID such as `rock-charger-65w`, its model, both names, category and price, and upload a clear white-background product photo. New products require an approved image before they can be displayed. Optionally enter a stock quantity and low-stock threshold; leave stock blank if you do not track it.
8. In the admin, open **الطلبات** to review requests. Enter and save the actual shipping fee before moving a request from `new` to `confirmed`. Confirmation atomically checks/decrements any tracked stock. Cancelling a confirmed/preparing order restores tracked quantities. Order status is not payment status.
9. Open the public storefront in another tab and refresh it. The Hostinger API sends current approved products with cache disabled; a hard refresh may be needed if the browser cached older CSS/JS.
## Order/payment caveats

- The public form can record a **request** only when deployed on this configured PHP/MySQL host. It does not charge a card, verify payment, or send WhatsApp/SMS/email notifications.
- New requests use the database product price and save a snapshot of each line item. Shipping and final total remain unset until an admin records the actual shipping fee.
- The admin does not provide a manual "mark paid" control. `not_configured` is deliberately not represented as paid. Add a real payment provider only after obtaining provider credentials and implementing/test-verifying signed callbacks and refunds.
- The backend does not yet call a courier, calculate live shipping rates, send outbound notifications, generate tax-compliant invoices, or keep a full movement ledger for inventory adjustments. Treat it as order intake and basic product/inventory management, not as a substitute for those integrations.
- The request form's fallback on `https://nashhal.github.io/ROCK/` remains a manual share/copy flow, because GitHub Pages cannot execute PHP. To save orders into MySQL, the live website must be served from the PHP-enabled domain.

## Useful checks

- The hosting PHP version should be PHP 8.1 or later.
- Required PHP extensions: `pdo_mysql`, `gd` with WebP support, `fileinfo` and `mbstring`.
- PHP must be allowed to write to `uploads/products/`; the API creates this folder when the first valid product image is uploaded.
- Enable HTTPS/SSL in Hostinger before using the admin sign-in.
- If the catalog API returns a temporary-unavailable response, check Hostinger PHP error logs and confirm the database credentials and installation marker.
- Admin endpoints use same-origin requests and CSRF tokens. Do not enable public CORS for this API.

## Local validation

The GitHub Actions workflow lints the PHP files and runs the image acceptance tests. The PHP image tests require GD with WebP support.

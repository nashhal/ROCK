# ROCK — Hostinger Product and Order Management

The storefront keeps a static GitHub Pages fallback. On a PHP-enabled Hostinger account, the live catalog and order endpoints use PHP 8.1+ and MySQL. The public storefront displays its database-backed order-submission button only when the live Hostinger catalog is responding; static hosting continues to use the existing copy/share order flow.

## Included features

- Session-protected product administration at `/admin/`.
- Session-protected order management at `/admin/orders.php`.
- First-time database installer at `/api/install.php` (delete it after successful setup).
- Secure admin login with password hashing, CSRF protection, HttpOnly/SameSite session cookies and temporary login throttling.
- Add, edit and delete product records, update SAR prices, switch listing visibility and upload main product photos.
- Image uploads are checked for raster file type, minimum dimensions, aspect ratio, predominantly white background and actual image detail. Accepted uploads are normalized to 600×600 WebP on white.
- The first installation imports the existing `products.js` catalog. Initial listing status comes from the generated `data/product-image-quality.js` manifest, so rejected photos remain hidden without altering existing prices.
- Storefront customers can submit an order request. The server re-reads product names and prices from MySQL, calculates totals itself, and stores an order-numbered snapshot of the order and its line items.
- Staff can search and filter orders, view customer/order details, update order status, and export the visible order list as CSV.
- Supported order statuses: new, waiting for representative, contacting, confirmed, preparing, out for delivery, delivered, failed delivery, and cancelled.
- New order tables are created idempotently the first time the orders API or order-management page is opened. This includes existing installations; product and admin tables are not overwritten.
- Public order submissions use same-origin checks, a keyed IP rate limit and a hidden honeypot field. No payment is collected by this order-request flow.

The product admin manages the Hostinger database only. It does not change `products.js` on GitHub or automatically push Hostinger edits back to GitHub.

## Hostinger setup

1. In Hostinger hPanel, create a MySQL database and user under **Databases**. Assign that user the privileges needed to create and update tables on the new database. Record the exact host, database name, username and password shown by hPanel.
2. Upload the **built GitHub Pages artifact**, not only the raw source files. Get it from the successful `Deploy to GitHub Pages` run → **Artifacts** → `github-pages`. Download the artifact ZIP, extract it; if it contains `artifact.tar`, extract that TAR too. Upload the resulting contents directly into `public_html` so that `index.html`, `products.js`, `data/product-image-quality.js`, `api/`, `admin/`, `orders-storefront.js` and `assets/` are in the expected places.
3. In Hostinger File Manager, copy `api/config.example.php` to `api/config.php`. Edit the new `config.php` and enter the database credentials. Replace `setup_token` with a random secret of at least 48 characters. Keep `config.php` private and never commit it to GitHub. `api/.htaccess` denies direct HTTP access to this file on Apache/LiteSpeed.
4. In a browser, open `https://YOUR-DOMAIN/api/install.php`. Enter the same setup token, choose your first admin username, and choose a strong password of at least 12 characters. The installer creates the tables, imports the existing products and keeps only image-approved products active. Existing catalog prices are imported as stored.
5. Once the installer says it succeeded, **delete `api/install.php`** from File Manager immediately.
6. Open `https://YOUR-DOMAIN/admin/`, sign in, and manage products. When adding a product, enter a stable ID such as `rock-charger-65w`, its model, both names, category and price, and upload a clear white-background product photo. New products require an approved image before they can be displayed.
7. Open `https://YOUR-DOMAIN/admin/orders.php` while signed in. The order tables will be created automatically if they do not yet exist. The public storefront will then show **Send order to ROCK** when `api/products.php` returns the live MySQL catalog.
8. Open the public storefront in another tab and refresh it. The Hostinger API sends current approved products with cache disabled; a hard refresh may be needed if the browser cached older CSS/JS.

## Important operating notes

- The order API saves the current database price, not the price sent by a browser. A product must remain active and have an approved image to be ordered.
- Customer name, phone, city and optional address/notes are stored with the order. Restrict access to the admin page and apply the store's approved privacy/retention policy before accepting real customer data.
- The request workflow does not take online payments, reserve stock, send WhatsApp messages automatically, or confirm delivery fees. Staff must contact the customer and confirm price, availability and delivery.
- The CSV export contains customer contact details. Download it only to an authorized device and handle it as customer data.
- Existing static GitHub Pages deployments cannot execute PHP. Do not expect order saving to work until the PHP files and MySQL database are installed on Hostinger and the storefront uses that Hostinger domain.

## Useful checks

- PHP version: 8.1 or later.
- Required PHP extensions: `pdo_mysql`, `gd` with WebP support, `fileinfo` and `mbstring`.
- PHP must be allowed to write to `uploads/products/`; the API creates this folder when the first valid product image is uploaded.
- Enable HTTPS/SSL in Hostinger before using the admin sign-in.
- If the catalog API returns a temporary-unavailable response, check Hostinger PHP error logs and confirm the database credentials and installation marker.
- Admin endpoints use same-origin requests and CSRF tokens. Do not enable public CORS for this API.

## Local validation

The GitHub Actions workflow lints the PHP files, runs image and order-contract checks, and executes the responsive storefront browser suite.

# ROCK — Hostinger Product Admin

This repository remains a static storefront on GitHub Pages. The optional Hostinger PHP/MySQL layer adds live product management on a PHP-enabled hosting account. On Hostinger, the public storefront reads `api/products.php`; on static hosts the JavaScript automatically falls back to the approved static catalog.

## Included features

- Session-protected admin at `/admin/`.
- First-time installer at `/api/install.php` (must be removed after successful setup).
- Secure login with password hashing, CSRF protection, HttpOnly/SameSite session cookies and temporary login throttling.
- Add, edit and delete product records, update SAR prices, switch listing visibility and upload main product photos.
- Image uploads are checked for raster file type, minimum dimensions, aspect ratio, predominately white background and actual image detail. Accepted uploads are normalized to 600×600 WebP on white.
- The first installation imports the existing `products.js` catalog. Initial listing status comes from the generated `data/product-image-quality.js` manifest, so rejected photos remain hidden without altering existing prices.

The admin manages the Hostinger database only. It does not change `products.js` on GitHub or automatically push Hostinger edits back to GitHub.

## Hostinger setup

1. In Hostinger hPanel, create a MySQL database and user under **Databases**. Assign that user all privileges on the new database. Record the exact host, database name, username and password shown by hPanel.
2. Upload the **built GitHub Pages artifact**, not only the raw source files. Get it from the successful `Deploy to GitHub Pages` run → **Artifacts** → `github-pages`. Download the artifact ZIP, extract it; if it contains `artifact.tar`, extract that TAR too. Upload the resulting contents directly into `public_html` so that `index.html`, `products.js`, `data/product-image-quality.js`, `api/`, `admin/` and `assets/` are in the expected places.
3. In Hostinger File Manager, copy `api/config.example.php` to `api/config.php`. Edit the new `config.php` and enter the database credentials. Replace `setup_token` with a random secret of at least 48 characters. Keep `config.php` private and never commit it to GitHub. `api/.htaccess` denies direct HTTP access to that file on Apache/LiteSpeed.
4. In a browser, open `https://YOUR-DOMAIN/api/install.php`. Enter the same setup token, choose your first admin username, and choose a strong password of at least 12 characters. The installer creates the tables, imports the existing products and keeps only image-approved products active. Existing catalog prices are imported as stored.
5. Once the installer says it succeeded, **delete `api/install.php`** from File Manager immediately.
6. Open `https://YOUR-DOMAIN/admin/`, sign in, and manage products. When adding a product, enter a stable ID such as `rock-charger-65w`, its model, both names, category and price, and upload a clear white-background product photo. New products require an approved image before they can be displayed.
7. Open the public storefront in another tab and refresh it. The Hostinger API sends current approved products with cache disabled; a hard refresh may be needed if the browser cached older CSS/JS.

## Useful checks

- The hosting PHP version should be PHP 8.1 or later.
- Required PHP extensions: `pdo_mysql`, `gd` with WebP support, and `fileinfo`.
- PHP must be allowed to write to `uploads/products/`; the API creates this folder when the first valid product image is uploaded.
- Enable HTTPS/SSL in Hostinger before using the admin sign-in.
- If the catalog API returns a temporary-unavailable response, check Hostinger PHP error logs and confirm the database credentials and installation marker.
- Admin endpoints use same-origin requests and CSRF tokens. Do not enable public CORS for this API.

## Local validation

The GitHub Actions workflow lints the PHP files and runs the image acceptance tests. The PHP image tests require GD with WebP support.

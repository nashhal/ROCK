# ROCK — Power your everyday

ROCK storefront for everyday technology accessories across charging, power, car and audio.

## Live site
https://nashhal.github.io/ROCK/

## Project structure
The repository is a static storefront. Production UI is intentionally dependency-light.

- HTML pages: `index.html`, `product.html`, `checkout.html`, `policies.html`, `support.html`
- Homepage styles: `rock-rebuild.css`, `rock-original-colors.css`
- Product/commerce styles: `styles.css`, `rock-vnext.css`, `global-commerce.css`, `product-page.css`, `checkout.css`, `world-class.css`
- Runtime scripts: `script.js`, `catalog-pricing.js`, `excel-catalog-only.js`, `image-fix.js`, `global-commerce.js`, `rock-performance.js`, `rock-i18n.js`, `product-page.js`, `product-linker.js`, `seo-layer.js`, `checkout.js`
- Store configuration: `config/store.config.js`
- Product assets: `assets/products/`
- Brand assets: `rock_logo (1).svg`, `assets/rock-symbol.svg`, `assets/rock-wordmark.svg`
- Deployment validation: `.github/workflows/pages.yml`

## Current storefront
- Arabic RTL storefront with English toggle
- Responsive desktop and mobile layout
- Product catalog with verified local product images
- Product detail pages and shareable product URLs
- Search, category filters, sorting and cart drawer
- Market and currency selector with preview conversion rates
- Official ROCK logo assets only
- Monochrome ROCK visual identity: black, off-white, white and muted gray
- GitHub Pages deployment with HTML, asset, image and JavaScript validation
- JSON-LD, canonical and SEO layers

## Production commerce boundary
The current public site is a frontend/MVP. Checkout, payment, inventory, customer accounts, tax, international shipping and order APIs remain integration points and are not represented as live backend services.

## Brand
POWER YOUR EVERYDAY.

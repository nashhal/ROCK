# ROCK — Power your everyday

ROCK storefront for everyday technology accessories across charging, power, car and audio.

## Live site
https://nashhal.github.io/ROCK/

## Project structure
The repository is a static storefront. Production UI is kept intentionally dependency-light:

- HTML pages: `index.html`, `product.html`, `checkout.html`, `policies.html`, `support.html`
- Core styles: `styles.css`, `brand-system.css`, `logo-system.css`, `rock-global.css`, `rock-cards.css`, `rock-vnext.css`
- Commerce/UI styles: `global-commerce.css`, `product-page.css`, `checkout.css`, `world-class.css`
- Runtime scripts: `script.js`, `catalog-pricing.js`, `excel-catalog-only.js`, `image-fix.js`, `global-commerce.js`, `rock-performance.js`, `rock-i18n.js`, `product-page.js`, `product-linker.js`, `seo-layer.js`, `rock-identity.js`, `world-class.js`, `checkout.js`
- Store configuration: `config/store.config.js`
- Product assets: `assets/products/`
- Deployment validation: `.github/workflows/pages.yml`

## Current storefront
- Arabic RTL storefront with English toggle
- Responsive desktop and mobile layout
- Product catalog with verified local product images
- Product detail pages and shareable product URLs
- Search, category filters, sorting and cart drawer
- Market and currency selector with preview conversion rates
- Official ROCK logo system with a clean single-brand header
- Monochrome ROCK visual identity: black, off-white, white and muted gray
- GitHub Pages deployment with HTML, asset, image and JavaScript validation
- JSON-LD, canonical and SEO layers

## Production commerce boundary
The current public site is a frontend/MVP. Checkout, payment, inventory, customer accounts, tax, international shipping and order APIs remain integration points and are not represented as live backend services.

## Brand
POWER YOUR EVERYDAY.

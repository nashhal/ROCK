# ROCK Global E-Commerce Architecture

## Current storefront layer
- Static storefront remains the presentation layer.
- Catalog data remains compatible with the existing `script.js` + catalog integration.
- `config/store.config.js` is the single global storefront configuration.
- `global-commerce.js` owns market, locale and currency preferences.
- `global-commerce.css` owns the market selector UI.
- `image-fix.js` bootstraps the global commerce layer without requiring a full rewrite of the existing storefront.

## Target production architecture

```text
ROCK Web / PWA
   |
   +-- Experience: Arabic / English / future locales
   +-- Market: country / shipping region
   +-- Currency: display currency
   +-- Catalog API --------------------+
   |                                   |
   +-- Customer / Account              |
   +-- Cart / Checkout                 |
   +-- Payment Provider <--------------+
   +-- Tax / Duties Engine
   +-- Shipping / Tracking
   +-- Order Management
   +-- Inventory / ERP
   +-- Analytics / CRM
```

## Domain responsibilities

### Catalog
The catalog owns product identity, model, barcode/SKU, localized name/description, images, specifications, pricing rules, availability and market eligibility.

### Pricing
Store base prices in a backend-owned currency. Convert only for display. Production checkout must calculate the final payable amount server-side and must not trust browser prices.

### Markets
A market determines country, currency, shipping zone, tax behavior, legal copy and available payment methods. The current configuration includes Saudi Arabia, GCC markets, United States and United Kingdom as expansion targets.

### Checkout
The current static site uses email-based order capture. Production checkout should replace that with a server endpoint that creates an order, calculates final totals, creates a payment session, verifies payment server-side and returns an order reference.

### Shipping
Shipping belongs to a backend service so that country restrictions, service levels, tracking numbers and delivery estimates are not hard-coded into the browser.

### Security
Never expose payment secrets, tax credentials, shipping credentials or privileged API keys in frontend JavaScript. The browser should call only public/authorized endpoints.

## Production API contract

```text
GET  /api/catalog?market=SA&locale=en-SA
GET  /api/products/:id
POST /api/cart/quote
POST /api/checkout/session
GET  /api/orders/:id
POST /api/orders/:id/cancel
GET  /api/shipping/quote
GET  /api/shipping/track/:trackingNumber
```

## Rollout sequence

1. Connect a real catalog source and normalize SKUs.
2. Add a backend price service and server-side FX.
3. Add customer accounts and persistent carts.
4. Add payment provider and webhook verification.
5. Add shipping quotes and tracking.
6. Add tax/duty calculation by market.
7. Connect inventory/ERP and order management.
8. Move markets from preview configuration to production configuration.
9. Add country-specific legal pages, domains/subdomains and localized SEO.

## Important boundary
The repository is now structured for global commerce, but payment, taxes, inventory, shipping and orders are intentionally still marked as backend capabilities. Their presence in configuration does not mean they are live production services.

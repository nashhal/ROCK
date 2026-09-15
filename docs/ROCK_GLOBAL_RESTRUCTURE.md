# ROCK — Global E-Commerce Restructure

## Brand direction
ROCK is positioned as a focused everyday-tech brand, not a generic accessories marketplace.

**Brand promise:** POWER YOUR EVERYDAY

**Core product world:** Charging · Power · Car · Audio

**Visual language:** industrial premium, monochrome, warm paper surfaces, strong typography, restrained signal-green accent only for states/highlights.

## What the current storefront already has
- Strong editorial homepage concept.
- Product catalog and cart.
- Arabic-first presentation with English toggle.
- Market/currency preview layer.
- GitHub Pages CI validation and CodeQL.
- Product imagery and catalog pricing integration.

## Gaps found in the current architecture
1. The storefront is still a static presentation rather than a production commerce platform.
2. Product cards are not backed by dedicated, crawlable product URLs.
3. Checkout is not a real payment/order flow yet.
4. Prices are incomplete for part of the catalog and some products remain request-only.
5. Inventory, orders, customers, returns and shipping are not connected to a backend.
6. Market/currency conversion is a front-end preview and must not be treated as production FX.
7. Product structured data should be attached to individual purchasable product pages.
8. Product discovery needs richer filtering, sorting, breadcrumbs and compatibility/use-case paths.
9. Reviews, delivery estimates and post-purchase tracking are missing.
10. The brand story is stronger than the current transactional information architecture; the commerce journey needs to become equally clear.

## Target information architecture
Home
- Hero / brand promise
- Shop by category
- Shop by need
- Featured products
- Proof / trust
- Brand story

Shop
- All products
- Charging
- Power banks
- Cables
- Car
- Audio

Product
- Gallery
- Price / availability
- Key specs
- Compatibility
- Delivery estimate
- Warranty / returns
- Reviews
- Related products

Commerce
- Cart
- Guest checkout
- Shipping
- Payment
- Order confirmation
- Order tracking

Account
- Sign in
- Orders
- Addresses
- Saved products

Support
- Warranty
- Returns
- Shipping
- Contact
- FAQ

## Target backend boundaries
Frontend/static presentation should consume stable APIs for:
- catalog
- pricing
- inventory
- customers
- checkout
- payment
- orders
- shipping
- tax

No secret keys or authoritative price/tax/FX logic belong in browser JavaScript.

## UX principles adopted from current ecommerce research
- Product pages are the main decision surface and need richer, clearer information.
- Mobile is a primary commerce experience, not a compressed desktop layout.
- Search/filter/sort must expose meaningful product attributes.
- Checkout should be linear and predictable with prominent guest checkout.
- Delivery cost and timing should be visible before the final payment step.
- Product pages should expose structured data suitable for merchant listings.

## Phased delivery
### Phase 1 — Brand + storefront foundation
- Keep ROCK visual identity consistent.
- Clean navigation and category taxonomy.
- Establish dedicated product URL architecture.
- Add technical SEO foundation.
- Normalize product metadata.

### Phase 2 — Commerce backend
- PostgreSQL or equivalent production database.
- Product/catalog service.
- Customer service.
- Cart service.
- Checkout service.
- Order service.
- Inventory service.

### Phase 3 — Payments + fulfillment
- Saudi payment methods first.
- International payment methods after market validation.
- Shipping carrier abstraction.
- Tracking and delivery estimates.
- Returns/refunds workflow.

### Phase 4 — Globalization
- Locale-aware URLs.
- Server-side currency/FX.
- Tax calculation by destination.
- Market-specific catalog and availability.
- International shipping rules.

### Phase 5 — Growth
- Reviews.
- Product recommendations.
- Bundles.
- Email lifecycle.
- Analytics and conversion experiments.
- B2B/wholesale portal.

## Research basis
The restructure was informed by current ecommerce UX research from Baymard, current official Google Search documentation for merchant/product structured data, and competitive inspection of established accessory brands such as UGREEN and Belkin.

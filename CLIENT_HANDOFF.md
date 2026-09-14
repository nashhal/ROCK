# ROCK — Client Handoff

## Delivery status
Final client storefront version for GitHub Pages.

## Visual system
- Unified product-card surface: `#f3f3f1`
- Unified border system with one neutral line color
- Desktop grid: 4 columns
- Tablet grid: 2 columns
- Mobile grid: 2 columns
- Fixed visual-area heights per breakpoint
- Consistent product title, description, price and action alignment
- Official supplied ROCK logo retained

## Functional scope
- Arabic RTL storefront with English toggle
- Product search and category filters
- Catalog sorting
- Product detail modal
- Wishlist state in localStorage
- Cart drawer and quantity controls
- Email-based order handoff
- Responsive navigation
- Local product imagery

## Delivery safeguards
- GitHub Pages workflow validates required files
- Product image references are checked before deployment
- JavaScript syntax is checked before deployment
- GitHub Actions dependencies are pinned to commit SHAs
- CodeQL workflow is enabled

## Important commercial note
The current storefront is a static GitHub Pages site. Prices for catalog items are currently shown as `السعر عند الطلب` where the catalog does not contain a confirmed selling price. Checkout opens an email draft rather than processing payment on-site.

## Final URL
https://nashhal.github.io/ROCK/

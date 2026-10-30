# ROCK Storefront — Design Review and Implementation Report
**Date:** 30 October 2026  
**Scope:** Homepage typography, spacing, page rhythm, product cards, responsive behavior, and featured-product presentation.

## Executive summary
The storefront already uses the intended ROCK palette and two suitable typefaces: IBM Plex Sans Arabic for Arabic content and Inter for Latin text and model codes. The main design issue was not the choice of fonts; it was the number of successive CSS layers and repeated component overrides. The homepage loads styles.css, premium-refresh.css, and white-modern.css, with later rules changing the same hero, card, and responsive selectors. That made visual consistency harder to maintain.

This update keeps the existing brand identity, logo, product data, product prices, filtering, cart, and language behavior. It adds a final homepage refinement layer and converts the two static product tiles into an accessible featured-product carousel.

## Findings from the source review
| Area | Finding | Design impact |
|---|---|---|
| Font system | Inter and IBM Plex Sans Arabic are already imported, but legacy selectors still set independent sizes, tracking, and line heights. | Arabic and English hierarchy can feel uneven between sections. |
| CSS structure | The same hero, product grid, card, and mobile selectors are redefined across several files and multiple times within the white-first stylesheet. | Small adjustments can be overridden later, increasing regression risk. |
| Page width | Layout rules used several nearby maximum widths and different horizontal gutters. | Section edges and navigation/content alignment can feel inconsistent. |
| Vertical rhythm | Hero, catalog, collections, and story sections used separate spacing values. | The page can feel compressed or overly long depending on viewport. |
| Product cards | Product image, title, price, and action dimensions were tuned in more than one place. | Card alignment and touch-target sizing needed a final shared rule set. |
| Motion | A legacy ticker style existed but the homepage intentionally did not use it. | A purposeful product showcase is more useful than decorative continuous text. |

## Applied design rules
- Arabic typography: IBM Plex Sans Arabic, approximately 15.5px base size, 1.82 body line-height, and normal letter spacing for Arabic headings.
- English typography: Inter, approximately 15px base size, with tighter heading tracking reserved for Latin text.
- Content width: 1240px maximum, with fluid side gutters.
- Section spacing: approximately 64–96px on larger screens and 52px on compact screens.
- Product cards: consistent 16px corners, 15px desktop inner padding, readable title line-height, and action controls with at least 40–42px height.
- Responsive catalog: four columns on wide screens, three on medium screens, and two on mobile, without horizontal overflow.
- Existing navy, electric-blue, white, and neutral-gray palette is retained.

## Featured product carousel
The two fixed hero product cards have been replaced by a data-driven carousel that selects products from the approved product catalog. It displays the product image, category, model, localized product name, catalog price, and links to the existing product detail page and cart action.

Behavior and accessibility:
- Automatic transition every 5.6 seconds.
- Previous, next, and direct slide controls.
- Pause/play control with an announced state.
- Pauses while hovered or focused, and when the document is hidden.
- Honors the operating system's reduced-motion preference.
- Arabic RTL and English LTR labels are localized.
- Inactive slides are hidden from the accessibility tree and keyboard interaction.
- The carousel uses existing catalog data; no product price or product record is changed.

## Files changed
- index.html: added the accessible carousel structure inside the existing hero composition, directly below the site header.
- app.js: added catalog-driven slide rendering, localized controls, autoplay lifecycle, reduced-motion handling, and cart actions.
- white-modern.css: added the final design refinement layer and responsive carousel styling.
- scripts/validate_storefront.js: added static guards for the carousel and design layer.
- scripts/test_storefront_browser.cjs: added browser checks for slide navigation, pause state, and mobile overflow.

## Validation
The repository's GitHub Actions pipeline runs source validation and Playwright browser regression checks before deployment. Carousel-specific checks are now included. Final deployment should be considered successful only after that workflow passes.

## Deliberately unchanged
The official ROCK logo, brand palette, product catalog, product names, listed prices, image allowlist logic, cart data, product pages, and ordering workflow were not intentionally changed.
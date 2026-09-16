/* ROCK storefront repair — restores the sellable catalog after pricing/enrichment scripts run. */
(() => {
  'use strict';

  const PRICE_PATCH = {
    rkch720: 15,
    rkch735: 20,
    rkch765: 40,
    pods700: 79,
    eb200: 59,
    eb710: 44,
    s1: 50,
    a5pro: 65,
    ro0546t: 14,
    aux139: 7,
    y6: 39,
    es09: 12,
    rph1003: 20,
    rph0878: 48,
    ram0037: 28,
    w31: 15,
    pen: 39,
    'laptop-bag': 28,
    trimmer: 40
  };

  const SELLABLE = (product) => {
    if (!product || typeof product !== 'object') return false;
    const image = String(product.image || '').trim();
    const price = Number(product.price);
    if (!image || image.includes('catalog-placeholder.svg')) return false;
    if (!Number.isFinite(price) || price <= 0) return false;
    if (product.id === 'rkch765' || /\b65W\b/i.test(String(product.name || ''))) return false;
    return true;
  };

  function getProducts() {
    try {
      return typeof products !== 'undefined' && Array.isArray(products) ? products : [];
    } catch (_) {
      return [];
    }
  }

  function restoreCatalog() {
    const catalog = getProducts();
    if (!catalog.length) return false;

    catalog.forEach((product) => {
      if (PRICE_PATCH[product.id] != null && (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0)) {
        product.price = PRICE_PATCH[product.id];
      }
      if (String(product.image || '').startsWith('assets/products/')) product.imageVerified = true;
    });

    const unique = [];
    const seen = new Set();
    for (const product of catalog) {
      if (!SELLABLE(product) || seen.has(product.id)) continue;
      seen.add(product.id);
      unique.push(product);
    }

    catalog.length = 0;
    unique.forEach((product) => catalog.push(product));

    return catalog.length > 0;
  }

  function removeLegacyHeroCards() {
    const selectors = [
      '[data-legacy-hero-card]',
      '.legacy-hero-card',
      '.hero-card-legacy',
      '.rock-system-card'
    ];
    selectors.forEach((selector) => document.querySelectorAll(selector).forEach((node) => node.remove()));

    document.querySelectorAll('.category-card').forEach((card) => {
      const text = (card.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^01\s+ROCK\s+SYSTEM$/i.test(text) || /^POWER$/i.test(text)) card.remove();
    });
  }

  function render() {
    if (typeof renderProducts === 'function') {
      try { renderProducts(); } catch (_) { /* keep the storefront usable */ }
    }
    if (typeof renderCart === 'function') {
      try { renderCart(); } catch (_) { /* cart is optional */ }
    }
  }

  function repair() {
    restoreCatalog();
    removeLegacyHeroCards();
    render();
  }

  function start() {
    repair();
    [50, 150, 400, 900, 1800].forEach((delay) => setTimeout(repair, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

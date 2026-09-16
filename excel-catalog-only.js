/* ROCK catalog gate — only sellable, priced products with real committed images are visible. */
(() => {
  'use strict';

  const pricePatch = {
    rkch720: 15,
    rkch735: 20,
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

  const getCatalog = () => {
    try {
      return Array.isArray(window.products) ? window.products : products;
    } catch (_) {
      return [];
    }
  };

  const isSellable = (p) => {
    if (!p || typeof p !== 'object') return false;

    const image = typeof p.image === 'string' ? p.image.trim() : '';
    if (!image || image.includes('catalog-placeholder.svg')) return false;

    const numericPrice = Number(p.price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return false;

    // Keep the customer-facing catalog aligned with the currently approved range.
    if (p.id === 'rkch765' || /\b65W\b/i.test(String(p.name || ''))) return false;

    return true;
  };

  function prepareCatalog() {
    const catalog = getCatalog();
    if (!catalog.length) return [];

    catalog.forEach((product) => {
      if (pricePatch[product.id] != null && (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0)) {
        product.price = pricePatch[product.id];
      }

      // Original committed product images are valid storefront assets.
      if (typeof product.image === 'string' && product.image.startsWith('assets/products/')) {
        product.imageVerified = true;
      }
    });

    const kept = [];
    const seen = new Set();
    for (const product of catalog) {
      if (!isSellable(product) || seen.has(product.id)) continue;
      seen.add(product.id);
      kept.push(product);
    }

    catalog.length = 0;
    kept.forEach((product) => catalog.push(product));
    return catalog;
  }

  function redraw() {
    try {
      if (typeof renderProducts === 'function') renderProducts();
    } catch (_) {}

    try {
      if (typeof renderCart === 'function') renderCart();
    } catch (_) {}
  }

  function repairCatalog() {
    const catalog = prepareCatalog();
    if (catalog.length) redraw();
  }

  function start() {
    repairCatalog();
    // Some storefront enhancement scripts initialize after the base catalog.
    // Re-apply once more so late initialization cannot leave an empty product grid.
    [100, 400, 1000, 2000].forEach((delay) => setTimeout(repairCatalog, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

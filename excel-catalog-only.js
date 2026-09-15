/* ROCK catalog gate — keep the full catalog visible. */
(() => {
  'use strict';

  const catalog = Array.isArray(window.products) ? window.products : products;
  const kept = catalog.filter((p) => {
    if (!p || typeof p !== 'object') return false;
    const image = typeof p.image === 'string' ? p.image.trim() : '';
    return !!image && !image.includes('catalog-placeholder.svg');
  });

  /* Do not silently replace the catalog with a smaller barcode allowlist. */
  if (kept.length >= 1 && kept.length !== catalog.length) {
    catalog.length = 0;
    kept.forEach((product) => catalog.push(product));
  }

  if (typeof renderProducts === 'function') renderProducts();
  if (typeof renderCart === 'function') renderCart();
})();

/* ROCK catalog gate — only sellable, priced products are visible. */
(() => {
  'use strict';

  const catalog = Array.isArray(window.products) ? window.products : products;
  const kept = catalog.filter((p) => {
    if (!p || typeof p !== 'object') return false;

    const image = typeof p.image === 'string' ? p.image.trim() : '';
    if (!image || image.includes('catalog-placeholder.svg')) return false;

    const price = typeof p.price === 'string' ? p.price.trim() : p.price;
    const numericPrice = Number(price);
    return Number.isFinite(numericPrice) && numericPrice > 0;
  });

  /* Do not show catalog-only products until a real selling price exists. */
  catalog.length = 0;
  kept.forEach((product) => catalog.push(product));

  if (typeof renderProducts === 'function') renderProducts();
  if (typeof renderCart === 'function') renderCart();
})();
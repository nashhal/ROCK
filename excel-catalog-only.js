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
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return false;

    // The 65W charger should not be shown in the customer-facing catalog.
    if (p.id === 'rkch765' || /\b65W\b/i.test(String(p.name || ''))) return false;

    return true;
  });

  catalog.length = 0;
  kept.forEach((product) => catalog.push(product));

  if (typeof renderProducts === 'function') renderProducts();
  if (typeof renderCart === 'function') renderCart();
})();

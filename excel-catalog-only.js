/* ROCK catalog gate — keep the verified 2026 catalog visible without blanking the store. */
(() => {
  'use strict';

  const wanted = new Set([
    '850079508156','850079508002','850079508170','850079508163','850079508149','6942433009752',
    '850079508101','850079508118','850079508125','6942433007802','6974282124669','6975653086586',
    '0002020070285','0020210110153','6942433007826','6942433007833','6942433007789','6942433007741','6942433002012',
    '6942433007352','6942433007345','1120200120090','2509232512513','850079508187','6975653083929','6942433007338',
    '6975653088580','6971680474976','6942433001251','6941402735197','6942433005488','6942433006003','6975653084131',
    '6942433000049','6942433007383','6822154851697','6815213515838','6815213515821','6815213515845','6815213515814','6658741587843'
  ]);

  const catalog = Array.isArray(window.products) ? window.products : products;
  const unique = new Map();
  catalog.forEach((p) => {
    if (!p) return;
    const barcode = p.barcode == null ? '' : String(p.barcode).trim();
    const image = typeof p.image === 'string' ? p.image.trim() : '';
    const usableImage = image && !image.includes('catalog-placeholder.svg');
    if (wanted.has(barcode) && usableImage && !unique.has(barcode)) unique.set(barcode, p);
  });

  /* Do not leave the store empty when the catalog metadata is incomplete. */
  const kept = [];
  wanted.forEach((barcode) => {
    const product = unique.get(barcode);
    if (product) kept.push(product);
  });

  if (kept.length >= 1) {
    catalog.length = 0;
    kept.forEach((product) => catalog.push(product));
  }

  if (typeof renderProducts === 'function') renderProducts();
  if (typeof renderCart === 'function') renderCart();
})();

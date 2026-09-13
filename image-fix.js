(() => {
  'use strict';

  const PAGES_BASE = '/ROCK/';
  const RAW_BASE = 'https://raw.githubusercontent.com/nashhal/ROCK/main/';
  const VERSION = '20260913-11';

  function normalizeProductPath(src) {
    if (!src) return null;
    const clean = String(src).split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
    if (!clean.startsWith('assets/products/')) return null;
    return clean;
  }

  function repairImage(img) {
    const path = normalizeProductPath(img.getAttribute('src')) || normalizeProductPath(img.dataset.rockImage);
    if (!path) return;

    img.dataset.rockImage = path;
    img.loading = 'lazy';
    img.decoding = 'async';

    const pageUrl = `${PAGES_BASE}${path}?v=${VERSION}`;
    const rawUrl = `${RAW_BASE}${path}?v=${VERSION}`;

    // Always use the GitHub Pages URL first so the store remains self-contained.
    if (img.src !== new URL(pageUrl, window.location.origin).href) {
      img.src = pageUrl;
    }

    if (!img.dataset.rockFallbackBound) {
      img.dataset.rockFallbackBound = '1';
      img.addEventListener('error', () => {
        if (img.dataset.rockFallbackUsed === '1') {
          img.style.visibility = 'hidden';
          return;
        }
        img.dataset.rockFallbackUsed = '1';
        img.src = rawUrl;
      }, { once: false });
    }
  }

  function repairAll() {
    document.querySelectorAll('img.product-image').forEach(repairImage);
  }

  // renderProducts() runs during page startup and again after filters/search changes.
  // Observe the product grid so every newly-created image is repaired automatically.
  const grid = document.getElementById('productGrid');
  if (grid) {
    new MutationObserver(repairAll).observe(grid, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', repairAll);
  window.addEventListener('load', repairAll);
  setTimeout(repairAll, 250);
  setTimeout(repairAll, 1000);
})();

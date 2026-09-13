(() => {
  'use strict';

  const RAW_BASE = 'https://raw.githubusercontent.com/nashhal/ROCK/main/';
  const VERSION = '20260913-12';

  function normalizeProductPath(src) {
    if (!src) return null;
    const clean = String(src).split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
    if (!clean.startsWith('assets/products/')) return null;
    return clean;
  }

  function buildPageUrl(path) {
    // Resolve relative to the actual deployed page so this works on any
    // GitHub Pages project path or custom domain without hard-coding /ROCK/.
    const url = new URL(path, document.baseURI);
    url.search = `v=${VERSION}`;
    return url.href;
  }

  function repairImage(img) {
    const path = normalizeProductPath(img.getAttribute('src')) || normalizeProductPath(img.dataset.rockImage);
    if (!path) return;

    img.dataset.rockImage = path;
    img.loading = 'lazy';
    img.decoding = 'async';

    const pageUrl = buildPageUrl(path);
    const rawUrl = `${RAW_BASE}${path}?v=${VERSION}`;

    if (img.src !== pageUrl) img.src = pageUrl;

    if (!img.dataset.rockFallbackBound) {
      img.dataset.rockFallbackBound = '1';
      img.addEventListener('error', () => {
        if (img.dataset.rockFallbackUsed === '1') return;
        img.dataset.rockFallbackUsed = '1';
        img.src = rawUrl;
      }, { once: false });
    }
  }

  function repairAll() {
    document.querySelectorAll('img.product-image').forEach(repairImage);
  }

  function watchGrid() {
    const grid = document.getElementById('productGrid');
    if (!grid || grid.dataset.rockImageObserver) return;
    grid.dataset.rockImageObserver = '1';
    new MutationObserver(repairAll).observe(grid, { childList: true, subtree: true });
    repairAll();
  }

  document.addEventListener('DOMContentLoaded', () => {
    watchGrid();
    repairAll();
  });
  window.addEventListener('load', () => {
    watchGrid();
    repairAll();
  });
  setTimeout(() => { watchGrid(); repairAll(); }, 250);
  setTimeout(() => { watchGrid(); repairAll(); }, 1000);
})();

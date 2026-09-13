(() => {
  'use strict';

  // Product backgrounds are normalized during GitHub Pages deployment.
  // This client file only keeps presentation consistent and avoids canvas re-processing.
  function applyProductSurface() {
    document.querySelectorAll('img.product-image').forEach((img) => {
      img.style.background = 'transparent';
      img.style.mixBlendMode = 'normal';
      img.decoding = 'async';
    });
  }

  function start() {
    applyProductSurface();
    const grid = document.getElementById('productGrid');
    if (grid && !grid.dataset.rockSurfaceObserver) {
      grid.dataset.rockSurfaceObserver = '1';
      new MutationObserver(applyProductSurface).observe(grid, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

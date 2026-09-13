(() => {
  'use strict';

  // Product backgrounds are normalized during GitHub Pages deployment.
  // This client file also wires the mobile bottom navigation so its controls
  // remain functional without touching the main catalog script.
  function applyProductSurface() {
    document.querySelectorAll('img.product-image').forEach((img) => {
      img.style.background = 'transparent';
      img.style.mixBlendMode = 'normal';
      img.decoding = 'async';
    });
  }

  function wireMobileNavigation() {
    document.querySelectorAll('.mobile-bottom-nav [data-jump]').forEach((button) => {
      if (button.dataset.rockNavWired) return;
      button.dataset.rockNavWired = '1';
      button.addEventListener('click', () => {
        const target = document.querySelector(button.dataset.jump);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const mobileSearch = document.getElementById('mobileSearch');
    if (mobileSearch && !mobileSearch.dataset.rockNavWired) {
      mobileSearch.dataset.rockNavWired = '1';
      mobileSearch.addEventListener('click', () => {
        const overlay = document.getElementById('searchOverlay');
        const input = document.getElementById('overlaySearch');
        if (overlay) overlay.classList.add('open');
        input?.focus();
      });
    }

    const mobileCart = document.getElementById('mobileCart');
    if (mobileCart && !mobileCart.dataset.rockNavWired) {
      mobileCart.dataset.rockNavWired = '1';
      mobileCart.addEventListener('click', () => {
        document.getElementById('cartBtn')?.click();
      });
    }

    syncMobileCartCount();
  }

  function syncMobileCartCount() {
    const source = document.getElementById('cartCount');
    const target = document.getElementById('mobileCartCount');
    if (source && target) target.textContent = source.textContent || '0';
  }

  function start() {
    applyProductSurface();
    wireMobileNavigation();

    const grid = document.getElementById('productGrid');
    if (grid && !grid.dataset.rockSurfaceObserver) {
      grid.dataset.rockSurfaceObserver = '1';
      new MutationObserver(() => {
        applyProductSurface();
        wireMobileNavigation();
      }).observe(grid, { childList: true, subtree: true });
    }

    const count = document.getElementById('cartCount');
    if (count && !count.dataset.rockCountObserver) {
      count.dataset.rockCountObserver = '1';
      new MutationObserver(syncMobileCartCount).observe(count, { childList: true, characterData: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

(() => {
  'use strict';

  // Product surfaces and mobile controls are kept here so catalog rendering
  // remains isolated from the visual/interaction fixes.
  function applyProductSurface() {
    document.querySelectorAll('img.product-image').forEach((img) => {
      img.style.background = 'transparent';
      img.style.mixBlendMode = 'normal';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        img.closest('.product-media')?.classList.add('image-missing');
      }, { once: true });
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

  function repairFeaturedProduct() {
    const button = document.querySelector('.add-demo[data-product="ROCK Power 20K"]');
    if (!button || typeof findProduct !== 'function' || typeof addToCart !== 'function') return;

    // The feature copy describes a 20,000mAh / 22.5W bank. Use the matching
    // catalog item instead of the old demo-only name that did not exist.
    const featured = findProduct('y18') || products?.find((p) =>
      p.category === 'power' && p.specs?.some(([k, v]) => k === 'Capacity' && /20000/.test(v))
    );
    if (!featured) return;

    button.dataset.product = featured.id;
    if (button.dataset.rockFeaturedWired) return;
    button.dataset.rockFeaturedWired = '1';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      addToCart(featured.id);
    }, true);
  }

  function wireModalDismissal() {
    document.querySelectorAll('.modal-backdrop').forEach((modal) => {
      if (modal.dataset.rockDismissWired) return;
      modal.dataset.rockDismissWired = '1';
      modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.classList.remove('open');
      });
    });
  }

  function start() {
    applyProductSurface();
    wireMobileNavigation();
    repairFeaturedProduct();
    wireModalDismissal();

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
      new MutationObserver(syncMobileCartCount).observe(count, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

(() => {
  'use strict';

  function applyProductSurface() {
    document.querySelectorAll('img.product-image').forEach((img) => {
      img.style.background = 'transparent';
      img.style.mixBlendMode = 'normal';
      img.style.objectFit = 'contain';
      img.style.objectPosition = 'center center';
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
      mobileCart.addEventListener('click', () => document.getElementById('cartBtn')?.click());
    }
    syncMobileCartCount();
  }

  function syncMobileCartCount() {
    const source = document.getElementById('cartCount');
    const target = document.getElementById('mobileCartCount');
    if (source && target) target.textContent = source.textContent || '0';
  }

  function repairExcelCategories() {
    const card = document.querySelector('.category-card[data-filter-link="protection"]');
    if (!card) return;
    card.dataset.filterLink = 'car';
    const title = card.querySelector('h3');
    const desc = card.querySelector('p');
    const number = card.querySelector('span');
    if (number) number.textContent = '02';
    if (title) title.textContent = 'السيارة';
    if (desc) desc.textContent = 'شواحن وملحقات السيارة';
  }

  function repairFeaturedProduct() {
    const button = document.querySelector('.add-demo');
    const featured = typeof findProduct === 'function' ? findProduct('rkch765') : null;
    if (!button || !featured || typeof addToCart !== 'function') return;

    const section = document.getElementById('featured');
    const heading = section?.querySelector('.feature-copy h2');
    const copy = section?.querySelector('.feature-copy > p:not(.eyebrow)');
    const specs = section?.querySelectorAll('.feature-specs strong');
    const labels = section?.querySelectorAll('.feature-specs span');
    const screen = section?.querySelector('.pb-screen');
    const brand = section?.querySelector('.pb-brand');

    if (heading) heading.innerHTML = 'القوة<br><em>65W في جيبك</em>';
    if (copy) copy.textContent = 'شاحن ROCK RKCH765 GaN بقدرة 65W وثلاثة مخارج للشحن السريع في المنزل والسفر.';
    if (specs?.length >= 3) {
      specs[0].textContent = '65';
      specs[1].textContent = '3';
      specs[2].textContent = 'GaN';
    }
    if (labels?.length >= 3) {
      labels[0].textContent = 'W MAX';
      labels[1].textContent = 'OUTPUTS';
      labels[2].textContent = 'FAST CHARGE';
    }
    if (screen) screen.textContent = '65W';
    if (brand) brand.textContent = 'ROCK';

    button.dataset.product = featured.id;
    button.innerHTML = 'أضف إلى السلة <span>+</span>';
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

  function loadScriptOnce(src, marker) {
    if (document.querySelector(`script[data-rock-script="${marker}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.dataset.rockScript = marker;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadCatalog() {
    try {
      await loadScriptOnce('catalog-pricing.js?v=20260914-3', 'catalog-pricing');
      await loadScriptOnce('excel-catalog-only.js?v=20260914-2', 'excel-catalog-only');
      repairExcelCategories();
      repairFeaturedProduct();
      applyProductSurface();
      renderProducts?.();
      renderCart?.();
    } catch (error) {
      console.error('ROCK catalog load failed:', error);
    }
  }

  function start() {
    applyProductSurface();
    wireMobileNavigation();
    wireModalDismissal();
    loadCatalog();

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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
(() => {
  'use strict';

  const STYLE_ID = 'rock-product-surface-v2';
  const wired = new WeakSet();

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .product-media{background:#E8EEF5!important;isolation:isolate!important;overflow:hidden!important;position:relative!important;display:grid!important;place-items:center!important}
      .product-media::before{content:none!important}
      .product-image{position:relative!important;z-index:1!important;display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important;margin:0!important;background:transparent!important;mix-blend-mode:normal!important;filter:none!important}
      .product-media.image-missing{display:grid!important;place-items:center!important;background:linear-gradient(135deg,#E8EEF5,#F5F7FA)!important}
      .product-media.image-missing::after{content:'ROCK'!important;font:900 24px Montserrat,sans-serif!important;letter-spacing:-.08em!important;color:#0B1F3A!important;opacity:.55!important}
      .product-card{content-visibility:auto;contain-intrinsic-size:420px 520px}
      .product-grid{contain:layout style}
    `;
    document.head.appendChild(style);
  }

  function applyProductImages(root = document) {
    installStyles();
    root.querySelectorAll('img.product-image').forEach((img) => {
      if (wired.has(img)) return;
      wired.add(img);
      img.loading = img.closest('.product-card')?.querySelector('.product-image') === img ? 'lazy' : 'lazy';
      img.decoding = 'async';
      img.fetchPriority = 'low';
      img.addEventListener('error', () => {
        img.closest('.product-media')?.classList.add('image-missing');
      }, { once: true });
    });
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
    if (heading) heading.innerHTML = 'القوة<br><em>65W في جيبك</em>';
    if (copy) copy.textContent = 'شاحن ROCK RKCH765 GaN بقدرة 65W وثلاثة مخارج للشحن السريع في المنزل والسفر.';
    if (specs?.length >= 3) { specs[0].textContent = '65'; specs[1].textContent = '3'; specs[2].textContent = 'GaN'; }
    if (labels?.length >= 3) { labels[0].textContent = 'W MAX'; labels[1].textContent = 'OUTPUTS'; labels[2].textContent = 'FAST CHARGE'; }
    button.dataset.product = featured.id;
    if (!button.dataset.rockFeaturedWired) {
      button.dataset.rockFeaturedWired = '1';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        addToCart(featured.id);
      }, true);
    }
  }

  function wireMobileNavigation() {
    document.querySelectorAll('.mobile-bottom-nav [data-jump]').forEach((button) => {
      if (button.dataset.rockNavWired) return;
      button.dataset.rockNavWired = '1';
      button.addEventListener('click', () => {
        document.querySelector(button.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function start() {
    installStyles();
    applyProductImages();
    wireMobileNavigation();
    repairFeaturedProduct();

    const grid = document.getElementById('productGrid');
    if (grid && !grid.dataset.rockImageObserver) {
      grid.dataset.rockImageObserver = '1';
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          mutation.addedNodes?.forEach((node) => {
            if (node.nodeType === 1) applyProductImages(node);
          });
        }
      });
      observer.observe(grid, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

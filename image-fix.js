(() => {
  'use strict';

  const STYLE_ID = 'rock-product-image-surface-v3';
  const wired = new WeakSet();
  const IMAGE_VERSION = '20260915-3';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* The storefront cards use .product-visual, not .product-media. */
      .product-card .product-visual{
        position:relative!important;
        display:grid!important;
        place-items:center!important;
        overflow:hidden!important;
        isolation:isolate!important;
      }
      .product-card .product-visual::before{
        z-index:0!important;
      }
      .product-card .product-visual::after{
        z-index:0!important;
        pointer-events:none!important;
      }
      .product-card .product-image{
        position:relative!important;
        z-index:3!important;
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
        width:92%!important;
        height:92%!important;
        max-width:100%!important;
        max-height:100%!important;
        object-fit:contain!important;
        object-position:center!important;
        margin:0!important;
        padding:0!important;
        background:transparent!important;
        mix-blend-mode:normal!important;
        filter:none!important;
      }
      .product-card .product-visual .product-art{
        z-index:1!important;
      }
      .product-card .product-visual.image-ready .product-art{
        opacity:0!important;
        visibility:hidden!important;
        pointer-events:none!important;
      }
      .product-card .product-visual.image-ready::after{
        opacity:.18!important;
      }
      .product-card .product-visual.image-missing .product-image{
        display:none!important;
      }
      .product-card .product-visual.image-missing .product-art{
        opacity:1!important;
        visibility:visible!important;
      }
    `;
    document.head.appendChild(style);
  }

  function withCacheBust(src) {
    const value = String(src || '');
    if (!value || /^data:/i.test(value)) return value;
    try {
      const url = new URL(value, document.baseURI);
      url.searchParams.set('rock', IMAGE_VERSION);
      return url.href;
    } catch (_) {
      return value.includes('?') ? `${value}&rock=${IMAGE_VERSION}` : `${value}?rock=${IMAGE_VERSION}`;
    }
  }

  function markReady(img) {
    const visual = img.closest('.product-visual, .product-media');
    if (!visual) return;
    visual.classList.remove('image-missing');
    visual.classList.add('image-ready');
  }

  function markMissing(img) {
    const visual = img.closest('.product-visual, .product-media');
    if (!visual) return;
    visual.classList.remove('image-ready');
    visual.classList.add('image-missing');
  }

  function applyProductImages(root = document) {
    installStyles();
    root.querySelectorAll?.('img.product-image').forEach((img) => {
      if (wired.has(img)) return;
      wired.add(img);

      const original = img.getAttribute('src') || img.src;
      const busted = withCacheBust(original);
      if (busted && busted !== img.src) img.src = busted;

      img.loading = 'lazy';
      img.decoding = 'async';
      img.fetchPriority = 'auto';
      img.setAttribute('draggable', 'false');

      const visual = img.closest('.product-visual, .product-media');
      if (visual) visual.classList.remove('image-ready', 'image-missing');

      const ready = () => markReady(img);
      const failed = () => markMissing(img);
      img.addEventListener('load', ready, { once: true });
      img.addEventListener('error', failed, { once: true });

      if (img.complete) {
        if (img.naturalWidth > 0) ready();
        else failed();
      }
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

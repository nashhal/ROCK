(() => {
  'use strict';

  const STYLE_ID = 'rock-product-image-surface-v5';
  const wired = new WeakSet();
  const IMAGE_VERSION = '20260915-5';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .product-card .product-visual,
      .product-card .product-media{
        position:relative!important;
        display:grid!important;
        place-items:center!important;
        overflow:hidden!important;
        isolation:isolate!important;
      }
      .product-card .product-image{
        position:relative!important;
        z-index:4!important;
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
      .product-card .product-visual .product-art{z-index:1!important}
      .product-card .product-visual.image-ready .product-art{
        opacity:0!important;
        visibility:hidden!important;
        pointer-events:none!important;
      }
      .product-card .product-visual.image-missing .product-image{display:none!important}
      .product-card .product-visual.image-missing .product-art{
        opacity:1!important;
        visibility:visible!important;
      }
    `;
    document.head.appendChild(style);
  }

  function cacheBust(src) {
    if (!src || /^data:/i.test(src)) return src;
    try {
      const url = new URL(src, document.baseURI);
      url.searchParams.set('rock', IMAGE_VERSION);
      return url.href;
    } catch (_) {
      return src.includes('?') ? `${src}&rock=${IMAGE_VERSION}` : `${src}?rock=${IMAGE_VERSION}`;
    }
  }

  function normalizeProductPath(src) {
    const value = String(src || '').trim();
    if (!value) return '';
    if (/^(https?:|data:|blob:)/i.test(value)) return value;
    const clean = value.replace(/^\.\//, '').replace(/^\//, '');
    if (clean.startsWith('assets/products/')) return clean;
    const filename = clean.split('/').pop();
    if (/^[A-Za-z0-9._-]+\.webp$/i.test(filename)) return `assets/products/${filename}`;
    return value;
  }

  function visualFor(img) {
    return img.closest('.product-visual, .product-media, .product-art') || img.parentElement;
  }

  function markReady(img) {
    const visual = visualFor(img);
    if (!visual) return;
    visual.classList.remove('image-missing');
    visual.classList.add('image-ready');
  }

  function markMissing(img) {
    const visual = visualFor(img);
    if (!visual) return;
    visual.classList.remove('image-ready');
    visual.classList.add('image-missing');
  }

  function findCardProductId(card) {
    return card.getAttribute('data-product')
      || card.getAttribute('data-id')
      || card.querySelector('[data-product]')?.getAttribute('data-product')
      || card.querySelector('[data-id]')?.getAttribute('data-id')
      || '';
  }

  function ensureImage(card) {
    if (!card || card.nodeType !== 1) return;

    let img = card.querySelector('img.product-image, img[data-product-image], .product-image img, img');
    const productId = findCardProductId(card);
    let product = null;

    if (productId && typeof findProduct === 'function') {
      try { product = findProduct(productId); } catch (_) {}
    }

    const declaredImage = product?.image
      || img?.getAttribute('data-src')
      || img?.getAttribute('data-product-image')
      || img?.getAttribute('src');
    const imagePath = normalizeProductPath(declaredImage);

    if (!img && imagePath) {
      const visual = card.querySelector('.product-visual, .product-media, .product-art');
      if (visual) {
        img = document.createElement('img');
        img.className = 'product-image';
        img.alt = product?.name || 'ROCK product';
        visual.prepend(img);
      }
    }

    if (!img || !imagePath) return;

    img.classList.add('product-image');
    if (productId) img.dataset.productId = productId;
    if (product?.name && !img.alt) img.alt = product.name;
    img.loading = 'eager';
    img.decoding = 'async';
    img.fetchPriority = 'high';
    img.draggable = false;

    const finalSrc = cacheBust(imagePath);
    const current = img.getAttribute('src') || '';
    if (current !== finalSrc) img.setAttribute('src', finalSrc);

    if (wired.has(img)) {
      if (img.complete && img.naturalWidth > 0) markReady(img);
      return;
    }
    wired.add(img);

    img.addEventListener('load', () => markReady(img));
    img.addEventListener('error', () => {
      if (!img.dataset.rockRetried) {
        img.dataset.rockRetried = '1';
        img.setAttribute('src', imagePath);
        return;
      }
      markMissing(img);
    });

    if (img.complete) {
      if (img.naturalWidth > 0) markReady(img);
      else markMissing(img);
    }
  }

  function scan(root = document) {
    installStyles();
    const cards = root.querySelectorAll?.('.product-card') || [];
    cards.forEach(ensureImage);
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
    scan();
    wireMobileNavigation();

    const grid = document.getElementById('productGrid');
    if (grid && !grid.dataset.rockImageObserver) {
      grid.dataset.rockImageObserver = '1';
      const observer = new MutationObserver(() => scan(grid));
      observer.observe(grid, { childList: true, subtree: true });
    }

    [100, 500, 1200, 2500].forEach((delay) => setTimeout(() => scan(), delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

(() => {
  'use strict';

  const RAW_BASE = 'https://raw.githubusercontent.com/nashhal/ROCK/main/';
  const VERSION = '20260913-23';
  const active = new Map();
  let rafId = 0;

  function normalize(src) {
    if (!src) return null;
    const clean = String(src).split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
    return clean.startsWith('assets/products/') ? clean : null;
  }

  function pageUrl(path) {
    const u = new URL(path, document.baseURI);
    u.search = `v=${VERSION}`;
    return u.href;
  }

  function injectVisualStyles() {
    if (document.getElementById('rock-product-visual-system')) return;
    const style = document.createElement('style');
    style.id = 'rock-product-visual-system';
    style.textContent = `
      /* ROCK product visuals: clean palette + real Y-axis spin controlled by JS. */
      .product-visual {
        background: linear-gradient(145deg, var(--paper, #f3f3f1), var(--accent2, #ecece9)) !important;
        perspective: 1200px;
        perspective-origin: 50% 50%;
      }
      .product-art.has-catalog-image {
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        transform: none !important;
        transform-style: preserve-3d;
        isolation: isolate;
      }
      .product-art.has-catalog-image .product-image {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: contain !important;
        object-position: center !important;
        transform-origin: center center !important;
        transform-style: preserve-3d !important;
        backface-visibility: visible !important;
        -webkit-backface-visibility: visible !important;
        will-change: transform;
        filter: saturate(.94) contrast(1.02) drop-shadow(0 18px 24px rgba(16,16,16,.14));
        mix-blend-mode: normal !important;
      }
      .product-card:hover .product-art.has-catalog-image .product-image,
      .product-card:focus-within .product-art.has-catalog-image .product-image {
        filter: saturate(1) contrast(1.04) drop-shadow(0 25px 30px rgba(16,16,16,.20));
      }
    `;
    document.head.appendChild(style);
  }

  function repair(img) {
    const path = normalize(img.getAttribute('src')) || normalize(img.dataset.rockImage);
    if (!path) return;
    img.dataset.rockImage = path;
    img.loading = 'lazy';
    img.decoding = 'async';

    const url = pageUrl(path);
    const raw = `${RAW_BASE}${path}?v=${VERSION}`;
    if (img.src !== url) img.src = url;

    if (!img.dataset.rockSpinBound) {
      img.dataset.rockSpinBound = '1';
      active.set(img, { angle: Math.random() * 360, speed: 0.22 + Math.random() * 0.08 });
      img.addEventListener('error', () => {
        if (img.dataset.rockFallbackUsed === '1') return;
        img.dataset.rockFallbackUsed = '1';
        img.src = raw;
      });
    }
  }

  function tick() {
    active.forEach((state, img) => {
      if (!img.isConnected) {
        active.delete(img);
        return;
      }
      const card = img.closest('.product-card');
      const paused = !!card && (card.matches(':hover') || card.matches(':focus-within'));
      if (!paused && getComputedStyle(img).display !== 'none') {
        state.angle = (state.angle + state.speed) % 360;
        img.style.setProperty('transform', `perspective(1200px) rotateY(${state.angle}deg)`, 'important');
      }
    });
    rafId = requestAnimationFrame(tick);
  }

  function apply() {
    injectVisualStyles();
    document.querySelectorAll('img.product-image').forEach(repair);
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function observe() {
    const grid = document.getElementById('productGrid');
    if (!grid || grid.dataset.rockFinalObserver) return;
    grid.dataset.rockFinalObserver = '1';
    new MutationObserver(apply).observe(grid, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', () => { apply(); observe(); });
  window.addEventListener('load', () => { apply(); observe(); });
  setTimeout(() => { apply(); observe(); }, 300);
  setTimeout(() => { apply(); observe(); }, 1200);
})();

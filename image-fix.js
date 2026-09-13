(() => {
  'use strict';

  const RAW_BASE = 'https://raw.githubusercontent.com/nashhal/ROCK/main/';
  const VERSION = '20260913-21';

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

  function inject() {
    if (document.getElementById('rock-final-product-system')) return;
    const style = document.createElement('style');
    style.id = 'rock-final-product-system';
    style.textContent = `
      /* ROCK product-photo system: true Y-axis 3D turn + palette harmony. */
      .product-visual {
        background: linear-gradient(145deg, var(--paper, #f3f3f1), var(--accent2, #ecece9)) !important;
        perspective: 1100px;
        perspective-origin: 50% 50%;
      }
      .product-art.has-catalog-image {
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        transform: none !important;
        perspective: 1100px;
        transform-style: preserve-3d;
      }
      .product-art.has-catalog-image .product-image {
        transform: translateZ(0) rotateY(0deg) !important;
        transform-origin: center center !important;
        transform-style: preserve-3d;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        will-change: transform, filter;
        animation: rockProductTurn 6.8s cubic-bezier(.45,0,.55,1) infinite !important;
        filter: saturate(.94) contrast(1.02) drop-shadow(0 18px 24px rgba(16,16,16,.14));
        mix-blend-mode: multiply;
      }
      @keyframes rockProductTurn {
        0%   { transform: translateZ(0) rotateY(0deg) scale(1); }
        20%  { transform: translateZ(8px) rotateY(72deg) scale(1.015); }
        50%  { transform: translateZ(0) rotateY(180deg) scale(.96); }
        80%  { transform: translateZ(8px) rotateY(288deg) scale(1.015); }
        100% { transform: translateZ(0) rotateY(360deg) scale(1); }
      }
      .product-card:nth-child(3n) .product-art.has-catalog-image .product-image { animation-duration: 7.6s !important; }
      .product-card:nth-child(4n) .product-art.has-catalog-image .product-image { animation-duration: 8.4s !important; }
      .product-card:hover .product-art.has-catalog-image .product-image,
      .product-card:focus-within .product-art.has-catalog-image .product-image {
        animation-play-state: paused !important;
        transform: translateZ(10px) rotateY(0deg) scale(1.04) !important;
        filter: saturate(1) contrast(1.04) drop-shadow(0 25px 30px rgba(16,16,16,.20));
      }
      @media (max-width: 900px) {
        .product-art.has-catalog-image .product-image { animation-duration: 7.6s !important; }
      }
      @media (max-width: 560px) {
        .product-art.has-catalog-image .product-image { animation-duration: 8.2s !important; }
      }
      @media (prefers-reduced-motion: reduce) {
        .product-art.has-catalog-image .product-image {
          animation: none !important;
          transform: translateZ(0) rotateY(0deg) scale(1) !important;
        }
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
    if (!img.dataset.rockFallbackBound) {
      img.dataset.rockFallbackBound = '1';
      img.addEventListener('error', () => {
        if (img.dataset.rockFallbackUsed === '1') return;
        img.dataset.rockFallbackUsed = '1';
        img.src = raw;
      });
    }
  }

  function apply() {
    inject();
    document.querySelectorAll('img.product-image').forEach(repair);
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

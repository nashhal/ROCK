(() => {
  'use strict';

  const RAW_BASE = 'https://raw.githubusercontent.com/nashhal/ROCK/main/';
  const VERSION = '20260913-15';

  function normalizeProductPath(src) {
    if (!src) return null;
    const clean = String(src).split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
    return clean.startsWith('assets/products/') ? clean : null;
  }

  function buildPageUrl(path) {
    const url = new URL(path, document.baseURI);
    url.search = `v=${VERSION}`;
    return url.href;
  }

  function classifyMotion(art, img) {
    if (!art) return;
    const card = art.closest('.product-card');
    const label = (card?.querySelector('.product-category')?.textContent || '').toLowerCase();
    const name = (card?.querySelector('.product-info h3')?.textContent || '').toLowerCase();
    const source = `${label} ${name} ${img?.dataset.rockImage || ''}`;

    art.classList.remove('rock-spin-slow','rock-spin-medium','rock-spin-fast','rock-spin-power','rock-spin-cable');

    let type = 'rock-spin-slow';
    if (/cable|wired|كيبل|سلك/.test(source)) type = 'rock-spin-cable';
    else if (/charger|شاحن|adapter|محول/.test(source)) type = 'rock-spin-medium';
    else if (/power.?bank|battery|باور|بطارية|energy/.test(source)) type = 'rock-spin-power';
    else if (/earphone|headphone|audio|سماعة|صوت/.test(source)) type = 'rock-spin-medium';
    else if (/fast|gaming|speaker/.test(source)) type = 'rock-spin-fast';

    art.classList.add(type);
  }

  function injectMotionStyles() {
    if (document.getElementById('rock-product-spin-styles')) return;
    const style = document.createElement('style');
    style.id = 'rock-product-spin-styles';
    style.textContent = `
      /* ROCK: visible 3D product spin */
      .product-art.has-catalog-image .product-image {
        transform-origin: center center !important;
        transform-style: preserve-3d;
        backface-visibility: visible;
        will-change: transform;
        animation-timing-function: linear !important;
        animation-iteration-count: infinite !important;
        transition: filter .35s ease, scale .35s ease;
      }

      .product-art.has-catalog-image.rock-spin-slow .product-image {
        animation: rockProductSpin 9s linear infinite;
      }
      .product-art.has-catalog-image.rock-spin-medium .product-image {
        animation: rockProductSpin 7s linear infinite;
      }
      .product-art.has-catalog-image.rock-spin-fast .product-image {
        animation: rockProductSpin 5s linear infinite;
      }
      .product-art.has-catalog-image.rock-spin-power .product-image {
        animation: rockProductSpin 8s linear infinite;
      }
      .product-art.has-catalog-image.rock-spin-cable .product-image {
        animation: rockProductSpin 11s linear infinite;
      }

      @keyframes rockProductSpin {
        from { transform: perspective(900px) rotateY(0deg) scale(1); }
        to   { transform: perspective(900px) rotateY(360deg) scale(1); }
      }

      .product-card:hover .product-art.has-catalog-image .product-image,
      .product-card:focus-within .product-art.has-catalog-image .product-image {
        animation-play-state: paused;
        transform: perspective(900px) rotateY(18deg) scale(1.06) !important;
        filter: drop-shadow(0 22px 28px rgba(0,0,0,.2));
      }

      .product-card:active .product-art.has-catalog-image .product-image {
        transform: perspective(900px) rotateY(8deg) scale(1.025) !important;
      }

      @media (max-width: 900px) {
        .product-art.has-catalog-image.rock-spin-slow .product-image { animation-duration: 10s; }
        .product-art.has-catalog-image.rock-spin-medium .product-image { animation-duration: 8s; }
        .product-art.has-catalog-image.rock-spin-fast .product-image { animation-duration: 6s; }
        .product-art.has-catalog-image.rock-spin-power .product-image { animation-duration: 9s; }
        .product-art.has-catalog-image.rock-spin-cable .product-image { animation-duration: 12s; }
      }

      @media (prefers-reduced-motion: reduce) {
        .product-art.has-catalog-image .product-image {
          animation: none !important;
          transform: none !important;
        }
      }
    `;
    document.head.appendChild(style);
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

    const art = img.closest('.product-art');
    if (art) classifyMotion(art, img);

    if (!img.dataset.rockFallbackBound) {
      img.dataset.rockFallbackBound = '1';
      img.addEventListener('error', () => {
        if (img.dataset.rockFallbackUsed === '1') return;
        img.dataset.rockFallbackUsed = '1';
        img.src = rawUrl;
      });
    }
  }

  function repairAll() {
    injectMotionStyles();
    document.querySelectorAll('img.product-image').forEach(repairImage);
  }

  function watchGrid() {
    const grid = document.getElementById('productGrid');
    if (!grid || grid.dataset.rockImageObserver) return;
    grid.dataset.rockImageObserver = '1';
    new MutationObserver(repairAll).observe(grid, { childList: true, subtree: true });
    repairAll();
  }

  document.addEventListener('DOMContentLoaded', () => { watchGrid(); repairAll(); });
  window.addEventListener('load', () => { watchGrid(); repairAll(); });
  setTimeout(() => { watchGrid(); repairAll(); }, 250);
  setTimeout(() => { watchGrid(); repairAll(); }, 1000);
})();

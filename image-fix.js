(() => {
  'use strict';

  const RAW_BASE = 'https://raw.githubusercontent.com/nashhal/ROCK/main/';
  const VERSION = '20260913-13';

  function normalizeProductPath(src) {
    if (!src) return null;
    const clean = String(src).split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
    if (!clean.startsWith('assets/products/')) return null;
    return clean;
  }

  function buildPageUrl(path) {
    // Resolve relative to the actual deployed page so this works on any
    // GitHub Pages project path or custom domain without hard-coding /ROCK/.
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

    art.classList.remove(
      'rock-motion-default',
      'rock-motion-charger',
      'rock-motion-cable',
      'rock-motion-audio',
      'rock-motion-power',
      'rock-motion-car',
      'rock-motion-protection',
      'rock-motion-speaker',
      'rock-motion-bag'
    );

    let type = 'default';
    if (/charger|شاحن|adapter|محول/.test(source)) type = 'charger';
    else if (/cable|wired|كيبل|سلك/.test(source)) type = 'cable';
    else if (/earphone|headphone|audio|سماعة|صوت/.test(source)) type = 'audio';
    else if (/power.?bank|battery|باور|بطارية|energy/.test(source)) type = 'power';
    else if (/car|vehicle|سيارة|سيارات/.test(source)) type = 'car';
    else if (/case|protection|حماية|cover/.test(source)) type = 'protection';
    else if (/speaker|مكبر|سبيكر/.test(source)) type = 'speaker';
    else if (/bag|حقيبة|backpack/.test(source)) type = 'bag';

    art.classList.add(`rock-motion-${type}`);
  }

  function injectMotionStyles() {
    if (document.getElementById('rock-product-motion-styles')) return;
    const style = document.createElement('style');
    style.id = 'rock-product-motion-styles';
    style.textContent = `
      /* ROCK Product Motion System — restrained, premium, category-aware */
      .product-art.has-catalog-image .product-image {
        transform-origin: 50% 58%;
        will-change: transform, filter;
        backface-visibility: hidden;
        transition: transform .65s cubic-bezier(.22,.61,.36,1), filter .65s ease;
      }

      .product-art.has-catalog-image.rock-motion-default .product-image {
        animation: rockFloat 5.8s ease-in-out infinite;
      }

      .product-art.has-catalog-image.rock-motion-charger .product-image {
        animation: rockCharger 5.2s ease-in-out infinite;
      }

      .product-art.has-catalog-image.rock-motion-cable .product-image {
        animation: rockCable 6.6s ease-in-out infinite;
      }

      .product-art.has-catalog-image.rock-motion-audio .product-image {
        animation: rockAudio 5.6s ease-in-out infinite;
      }

      .product-art.has-catalog-image.rock-motion-power .product-image {
        animation: rockPower 6s ease-in-out infinite;
      }

      .product-art.has-catalog-image.rock-motion-car .product-image {
        animation: rockCar 6.4s ease-in-out infinite;
      }

      .product-art.has-catalog-image.rock-motion-protection .product-image {
        animation: rockProtection 5.9s ease-in-out infinite;
      }

      .product-art.has-catalog-image.rock-motion-speaker .product-image {
        animation: rockSpeaker 5.4s ease-in-out infinite;
      }

      .product-art.has-catalog-image.rock-motion-bag .product-image {
        animation: rockBag 6.2s ease-in-out infinite;
      }

      .product-card:hover .product-art.has-catalog-image .product-image {
        animation-play-state: paused;
        transform: translateY(-7px) scale(1.045) rotate(0deg);
        filter: drop-shadow(0 24px 28px rgba(0,0,0,.18));
      }

      .product-card:active .product-art.has-catalog-image .product-image {
        transform: translateY(-2px) scale(1.015) rotate(0deg);
      }

      @keyframes rockFloat {
        0%,100% { transform: translate3d(0,0,0) rotate(-.45deg) scale(1); }
        50% { transform: translate3d(0,-8px,0) rotate(.45deg) scale(1.015); }
      }

      @keyframes rockCharger {
        0%,100% { transform: translate3d(0,0,0) rotate(-1deg) scale(.985); }
        50% { transform: translate3d(1px,-6px,0) rotate(1deg) scale(1.025); }
      }

      @keyframes rockCable {
        0%,100% { transform: translate3d(-2px,1px,0) rotate(-1.4deg) scale(1); }
        50% { transform: translate3d(4px,-5px,0) rotate(1.4deg) scale(1.025); }
      }

      @keyframes rockAudio {
        0%,100% { transform: translate3d(0,1px,0) rotate(-.7deg) scale(1); }
        50% { transform: translate3d(0,-9px,0) rotate(.7deg) scale(1.02); }
      }

      @keyframes rockPower {
        0%,100% { transform: translate3d(0,0,0) rotate(-1.1deg) scale(.99); }
        50% { transform: translate3d(2px,-7px,0) rotate(1.1deg) scale(1.025); }
      }

      @keyframes rockCar {
        0%,100% { transform: translate3d(-3px,0,0) rotate(-.6deg) scale(1); }
        50% { transform: translate3d(5px,-4px,0) rotate(.6deg) scale(1.025); }
      }

      @keyframes rockProtection {
        0%,100% { transform: translate3d(0,0,0) rotate(-.35deg) scale(1); }
        50% { transform: translate3d(0,-6px,0) rotate(.35deg) scale(1.018); }
      }

      @keyframes rockSpeaker {
        0%,100% { transform: translate3d(0,0,0) scale(1); }
        50% { transform: translate3d(0,-6px,0) scale(1.025); }
      }

      @keyframes rockBag {
        0%,100% { transform: translate3d(-2px,0,0) rotate(-.6deg) scale(1); }
        50% { transform: translate3d(3px,-5px,0) rotate(.6deg) scale(1.018); }
      }

      @media (prefers-reduced-motion: reduce) {
        .product-art.has-catalog-image .product-image {
          animation: none !important;
          transition: none !important;
        }
        .product-card:hover .product-art.has-catalog-image .product-image {
          transform: scale(1.02) !important;
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
      }, { once: false });
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

  document.addEventListener('DOMContentLoaded', () => {
    watchGrid();
    repairAll();
  });
  window.addEventListener('load', () => {
    watchGrid();
    repairAll();
  });
  setTimeout(() => { watchGrid(); repairAll(); }, 250);
  setTimeout(() => { watchGrid(); repairAll(); }, 1000);
})();

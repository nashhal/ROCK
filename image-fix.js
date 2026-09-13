(() => {
  'use strict';

  const RAW_BASE = 'https://raw.githubusercontent.com/nashhal/ROCK/main/';
  const VERSION = '20260913-14';

  function normalizeProductPath(src) {
    if (!src) return null;
    const clean = String(src).split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
    if (!clean.startsWith('assets/products/')) return null;
    return clean;
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

    art.classList.remove(
      'rock-motion-default','rock-motion-charger','rock-motion-cable','rock-motion-audio',
      'rock-motion-power','rock-motion-car','rock-motion-protection','rock-motion-speaker','rock-motion-bag'
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
      /* ROCK Product Motion System
         Uses individual transform properties so legacy transform: none !important
         cannot cancel the motion. */
      .product-art.has-catalog-image .product-image {
        transform-origin: 50% 58% !important;
        translate: 0 0;
        rotate: 0deg;
        scale: 1;
        will-change: translate, rotate, scale, filter;
        backface-visibility: hidden;
        transition: translate .55s cubic-bezier(.22,.61,.36,1), rotate .55s cubic-bezier(.22,.61,.36,1), scale .55s cubic-bezier(.22,.61,.36,1), filter .55s ease;
      }

      .rock-motion-default .product-image { animation: rockFloat 5.8s ease-in-out infinite; }
      .rock-motion-charger .product-image { animation: rockCharger 5.1s ease-in-out infinite; }
      .rock-motion-cable .product-image { animation: rockCable 6.4s ease-in-out infinite; }
      .rock-motion-audio .product-image { animation: rockAudio 5.4s ease-in-out infinite; }
      .rock-motion-power .product-image { animation: rockPower 5.8s ease-in-out infinite; }
      .rock-motion-car .product-image { animation: rockCar 6.2s ease-in-out infinite; }
      .rock-motion-protection .product-image { animation: rockProtection 5.7s ease-in-out infinite; }
      .rock-motion-speaker .product-image { animation: rockSpeaker 5.2s ease-in-out infinite; }
      .rock-motion-bag .product-image { animation: rockBag 6s ease-in-out infinite; }

      .product-card:hover .product-art.has-catalog-image .product-image,
      .product-card:focus-within .product-art.has-catalog-image .product-image {
        animation-play-state: paused;
        translate: 0 -8px;
        rotate: 0deg;
        scale: 1.05;
        filter: drop-shadow(0 24px 28px rgba(0,0,0,.18));
      }

      .product-card:active .product-art.has-catalog-image .product-image {
        translate: 0 -2px;
        scale: 1.015;
      }

      @keyframes rockFloat {
        0%,100% { translate: 0 0; rotate: -.45deg; scale: 1; }
        50% { translate: 0 -9px; rotate: .45deg; scale: 1.018; }
      }

      @keyframes rockCharger {
        0%,100% { translate: 0 0; rotate: -1.2deg; scale: .985; }
        50% { translate: 1px -7px; rotate: 1.2deg; scale: 1.03; }
      }

      @keyframes rockCable {
        0%,100% { translate: -3px 1px; rotate: -1.6deg; scale: 1; }
        50% { translate: 6px -5px; rotate: 1.6deg; scale: 1.025; }
      }

      @keyframes rockAudio {
        0%,100% { translate: 0 1px; rotate: -.8deg; scale: 1; }
        50% { translate: 0 -10px; rotate: .8deg; scale: 1.022; }
      }

      @keyframes rockPower {
        0%,100% { translate: 0 0; rotate: -1.1deg; scale: .99; }
        50% { translate: 2px -7px; rotate: 1.1deg; scale: 1.03; }
      }

      @keyframes rockCar {
        0%,100% { translate: -3px 0; rotate: -.7deg; scale: 1; }
        50% { translate: 6px -5px; rotate: .7deg; scale: 1.025; }
      }

      @keyframes rockProtection {
        0%,100% { translate: 0 0; rotate: -.4deg; scale: 1; }
        50% { translate: 0 -7px; rotate: .4deg; scale: 1.02; }
      }

      @keyframes rockSpeaker {
        0%,100% { translate: 0 0; scale: 1; }
        50% { translate: 0 -7px; scale: 1.028; }
      }

      @keyframes rockBag {
        0%,100% { translate: -2px 0; rotate: -.7deg; scale: 1; }
        50% { translate: 4px -6px; rotate: .7deg; scale: 1.02; }
      }

      @media (prefers-reduced-motion: reduce) {
        .product-art.has-catalog-image .product-image {
          animation: none !important;
          transition: none !important;
          translate: 0 0 !important;
          rotate: 0deg !important;
          scale: 1 !important;
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

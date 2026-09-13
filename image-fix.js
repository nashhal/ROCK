(() => {
  'use strict';

  const RAW_BASE = 'https://raw.githubusercontent.com/nashhal/ROCK/main/';
  const VERSION = '20260913-15';
  const rotatingImages = new Set();
  let rotationStarted = false;

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

  function injectSpinStyles() {
    if (document.getElementById('rock-product-spin-styles')) return;
    const style = document.createElement('style');
    style.id = 'rock-product-spin-styles';
    style.textContent = `
      .product-visual { perspective: 1000px; perspective-origin: 50% 50%; }
      .product-art.has-catalog-image .product-image {
        transform-origin: 50% 50% !important;
        transform-style: preserve-3d !important;
        backface-visibility: visible !important;
        will-change: transform;
      }
    `;
    document.head.appendChild(style);
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

    img.dataset.rockSpinReady = '1';
    rotatingImages.add(img);

    if (!img.dataset.rockFallbackBound) {
      img.dataset.rockFallbackBound = '1';
      img.addEventListener('error', () => {
        if (img.dataset.rockFallbackUsed === '1') return;
        img.dataset.rockFallbackUsed = '1';
        img.src = rawUrl;
      });
    }
  }

  function renderSpin(now) {
    if (!rotationStarted) return;
    const seconds = now / 1000;
    rotatingImages.forEach((img) => {
      if (!img.isConnected || !img.dataset.rockSpinReady) {
        rotatingImages.delete(img);
        return;
      }
      const rect = img.getBoundingClientRect();
      const inViewport = rect.bottom > -120 && rect.top < window.innerHeight + 120;
      if (!inViewport) return;

      const art = img.closest('.product-art');
      const source = `${art?.className || ''} ${img.alt || ''}`.toLowerCase();
      let cycle = 7.5;
      if (/charger|شاحن/.test(source)) cycle = 6.5;
      else if (/cable|wired|كيبل|سلك/.test(source)) cycle = 8.5;
      else if (/earphone|headphone|audio|سماعة|صوت/.test(source)) cycle = 7.8;
      else if (/power|battery|باور|بطارية/.test(source)) cycle = 7.2;
      else if (/car|vehicle|سيارة/.test(source)) cycle = 8.2;

      const phase = ((seconds + (img.dataset.rockSpinOffset || 0)) % cycle) / cycle;
      const angle = phase * 360;
      const bob = Math.sin(phase * Math.PI * 2) * 2;
      const scale = 1 + Math.sin(phase * Math.PI * 2) * 0.008;
      img.style.setProperty(
        'transform',
        `perspective(900px) translate3d(0, ${bob.toFixed(2)}px, 0) rotateY(${angle.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
        'important'
      );
    });

    requestAnimationFrame(renderSpin);
  }

  function startSpin() {
    if (rotationStarted) return;
    rotationStarted = true;
    requestAnimationFrame(renderSpin);
  }

  function repairAll() {
    injectSpinStyles();
    document.querySelectorAll('img.product-image').forEach((img) => {
      if (!img.dataset.rockSpinOffset) img.dataset.rockSpinOffset = String(Math.random() * 3);
      repairImage(img);
    });
    startSpin();
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

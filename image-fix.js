(() => {
  'use strict';

  const VERSION = '20260913-transparent-1';
  const processed = new WeakSet();

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function normalize(src) {
    if (!src) return null;
    const clean = String(src).split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
    return clean.startsWith('assets/products/') ? clean : null;
  }

  function assetUrl(path) {
    const url = new URL(path, document.baseURI);
    url.search = `v=${VERSION}`;
    return url.href;
  }

  function injectStyles() {
    if (document.getElementById('rock-product-surface')) return;
    const style = document.createElement('style');
    style.id = 'rock-product-surface';
    style.textContent = `
      .product-card {
        background: #ecece9 !important;
        border: 1px solid #d8d8d3 !important;
      }
      .product-visual {
        background: #e7e7e3 !important;
        isolation: isolate !important;
      }
      .product-visual::after {
        width: 150px !important;
        height: 150px !important;
        background: rgba(120,120,114,.08) !important;
        filter: blur(34px) !important;
        z-index: 0 !important;
      }
      .product-art.has-catalog-image {
        width: min(100%, 230px) !important;
        height: 230px !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        transform: none !important;
        overflow: visible !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        position: relative !important;
        z-index: 2 !important;
      }
      .product-art.has-catalog-image::before,
      .product-art.has-catalog-image::after { content: none !important; display: none !important; }
      .product-art.has-catalog-image .product-image {
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        padding: 12px !important;
        box-sizing: border-box !important;
        object-fit: contain !important;
        object-position: center !important;
        display: block !important;
        position: relative !important;
        z-index: 2 !important;
        transform: none !important;
        filter: drop-shadow(0 18px 20px rgba(16,16,16,.10)) !important;
        mix-blend-mode: normal !important;
      }
      .rock-transparent-source { background: transparent !important; }
      @media (max-width: 900px) {
        .product-art.has-catalog-image { height: 200px !important; }
      }
      @media (max-width: 560px) {
        .product-art.has-catalog-image { height: 165px !important; max-width: 190px !important; }
        .product-art.has-catalog-image .product-image { padding: 8px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function sourcePath(img) {
    return normalize(img.dataset.rockImage) || normalize(img.getAttribute('src'));
  }

  function isNearWhite(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max >= 245 && (max - min) <= 12;
  }

  function processImage(img) {
    if (processed.has(img)) return;
    const art = img.closest('.product-art.has-catalog-image');
    if (!art) return;
    const path = sourcePath(img);
    if (!path) return;
    processed.add(img);
    img.dataset.rockImage = path;
    img.classList.add('rock-transparent-source');

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => {
      try {
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const w = Math.max(1, Math.round(image.naturalWidth * scale));
        const h = Math.max(1, Math.round(image.naturalHeight * scale));
        const source = document.createElement('canvas');
        source.width = w;
        source.height = h;
        const ctx = source.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, w, h);
        const frame = ctx.getImageData(0, 0, w, h);
        const pixels = frame.data;
        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const push = (x, y) => {
          if (x < 0 || y < 0 || x >= w || y >= h) return;
          const p = y * w + x;
          if (visited[p]) return;
          const i = p * 4;
          if (!isNearWhite(pixels[i], pixels[i + 1], pixels[i + 2])) return;
          visited[p] = 1;
          queue[tail++] = p;
        };

        for (let x = 0; x < w; x++) {
          push(x, 0);
          push(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          push(0, y);
          push(w - 1, y);
        }

        while (head < tail) {
          const p = queue[head++];
          const x = p % w;
          const y = (p / w) | 0;
          pixels[p * 4 + 3] = 0;
          push(x - 1, y);
          push(x + 1, y);
          push(x, y - 1);
          push(x, y + 1);
        }

        // Softly remove near-white pixels just inside the detected edge.
        for (let i = 0; i < w * h; i++) {
          const di = i * 4;
          if (visited[i]) continue;
          const r = pixels[di], g = pixels[di + 1], b = pixels[di + 2];
          if (isNearWhite(r, g, b)) {
            let adjacent = false;
            const x = i % w;
            const y = (i / w) | 0;
            if (x > 0 && visited[i - 1]) adjacent = true;
            else if (x + 1 < w && visited[i + 1]) adjacent = true;
            else if (y > 0 && visited[i - w]) adjacent = true;
            else if (y + 1 < h && visited[i + w]) adjacent = true;
            if (adjacent) pixels[di + 3] = Math.min(pixels[di + 3], 35);
          }
        }

        ctx.putImageData(frame, 0, 0);
        img.src = source.toDataURL('image/webp', 0.92);
        img.dataset.rockProcessed = VERSION;
        img.dataset.rockOriginal = assetUrl(path);
      } catch (error) {
        processed.delete(img);
        console.warn('[ROCK images] transparent processing failed', error);
      }
    };
    image.onerror = () => {
      processed.delete(img);
      console.warn('[ROCK images] failed to load', path);
    };
    image.src = assetUrl(path);
  }

  function processAll() {
    injectStyles();
    document.querySelectorAll('img.product-image').forEach(processImage);
  }

  function observe() {
    const grid = document.getElementById('productGrid');
    if (!grid || grid.dataset.rockImageObserver === '1') return;
    grid.dataset.rockImageObserver = '1';
    new MutationObserver(processAll).observe(grid, { childList: true, subtree: true });
  }

  function start() {
    processAll();
    observe();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener('load', start, { once: true });
  setTimeout(start, 300);
  setTimeout(start, 1000);
})();

(() => {
  'use strict';

  const RAW_BASE = 'https://raw.githubusercontent.com/nashhal/ROCK/main/';
  const VERSION = '20260913-30';
  const models = new Map();
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

  function injectStyles() {
    if (document.getElementById('rock-real-3d-product-system')) return;
    const style = document.createElement('style');
    style.id = 'rock-real-3d-product-system';
    style.textContent = `
      /* ROCK: product presentation is a real 3D DOM object with front, back and thickness. */
      .product-visual {
        background: var(--paper, #f3f3f1) !important;
        perspective: 1400px;
        perspective-origin: 50% 48%;
      }

      .product-art.has-catalog-image {
        background: var(--paper, #f3f3f1) !important;
        border: 1px solid rgba(16,16,16,.06) !important;
        box-shadow: inset 0 1px rgba(255,255,255,.78) !important;
        transform: none !important;
        transform-style: preserve-3d !important;
        overflow: hidden !important;
        isolation: isolate;
      }

      .rock-3d-stage {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        perspective: 1400px;
        perspective-origin: 50% 45%;
        overflow: visible;
        touch-action: pan-y;
        cursor: grab;
      }
      .rock-3d-stage:active { cursor: grabbing; }

      .rock-3d-model {
        position: relative;
        width: 78%;
        height: 78%;
        max-width: 330px;
        max-height: 330px;
        transform-style: preserve-3d;
        transform-origin: 50% 50%;
        will-change: transform;
        filter: drop-shadow(0 24px 26px rgba(16,16,16,.14));
      }

      .rock-3d-face,
      .rock-3d-side {
        position: absolute;
        backface-visibility: visible;
        -webkit-backface-visibility: visible;
        transform-style: preserve-3d;
      }

      .rock-3d-face {
        inset: 0;
        border-radius: 20px;
        background: var(--paper, #f3f3f1);
        overflow: hidden;
        display: grid;
        place-items: center;
      }
      .rock-3d-face.front {
        transform: translateZ(9px);
        box-shadow: 0 0 0 1px rgba(16,16,16,.045), inset 0 1px rgba(255,255,255,.72);
      }
      .rock-3d-face.back {
        transform: rotateY(180deg) translateZ(9px);
        background-position: center;
        background-repeat: no-repeat;
        background-size: contain;
        box-shadow: inset 0 1px rgba(255,255,255,.22), inset 0 -1px rgba(0,0,0,.08);
      }

      .rock-3d-face .product-image {
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: contain !important;
        object-position: center !important;
        display: block !important;
        transform: none !important;
        backface-visibility: visible !important;
        -webkit-backface-visibility: visible !important;
        filter: drop-shadow(0 18px 20px rgba(16,16,16,.10));
        mix-blend-mode: normal !important;
      }

      .rock-3d-side { background: linear-gradient(180deg,#c7c7c3,#969692 52%,#73736f); opacity: .98; }
      .rock-3d-side.top { left: 0; right: 0; top: 0; height: 18px; transform-origin: top; transform: rotateX(90deg); border-radius: 12px 12px 0 0; }
      .rock-3d-side.bottom { left: 0; right: 0; bottom: 0; height: 18px; transform-origin: bottom; transform: rotateX(-90deg); border-radius: 0 0 12px 12px; }
      .rock-3d-side.left { top: 0; bottom: 0; left: 0; width: 18px; transform-origin: left; transform: rotateY(-90deg); border-radius: 12px 0 0 12px; }
      .rock-3d-side.right { top: 0; bottom: 0; right: 0; width: 18px; transform-origin: right; transform: rotateY(90deg); border-radius: 0 12px 12px 0; }

      .rock-3d-glow {
        position: absolute;
        inset: 8%;
        border-radius: 30px;
        pointer-events: none;
        background: radial-gradient(circle at 35% 20%, rgba(255,255,255,.72), transparent 42%);
        transform: translateZ(20px);
        mix-blend-mode: screen;
        opacity: .35;
      }

      .rock-3d-reflection {
        position: absolute;
        left: 16%;
        right: 16%;
        bottom: -8px;
        height: 18px;
        border-radius: 50%;
        background: rgba(16,16,16,.16);
        filter: blur(13px);
        transform: translateZ(-4px);
      }

      @media (max-width: 900px) {
        .rock-3d-model { width: 82%; height: 82%; }
      }
      @media (max-width: 560px) {
        .rock-3d-model { width: 86%; height: 86%; }
      }
    `;
    document.head.appendChild(style);
  }

  function createModel(img, path) {
    if (img.dataset.rock3dBound === '1') return models.get(img);

    const stage = document.createElement('div');
    stage.className = 'rock-3d-stage';
    stage.setAttribute('aria-label', 'عرض ثلاثي الأبعاد للمنتج');

    const model = document.createElement('div');
    model.className = 'rock-3d-model';

    const front = document.createElement('div');
    front.className = 'rock-3d-face front';
    const back = document.createElement('div');
    back.className = 'rock-3d-face back';
    back.style.backgroundImage = `url("${pageUrl(path)}")`;

    const sides = ['top', 'bottom', 'left', 'right'].map((side) => {
      const el = document.createElement('div');
      el.className = `rock-3d-side ${side}`;
      return el;
    });

    const glow = document.createElement('div');
    glow.className = 'rock-3d-glow';
    const reflection = document.createElement('div');
    reflection.className = 'rock-3d-reflection';

    img.parentNode.insertBefore(stage, img);
    front.appendChild(img);
    model.append(front, back, ...sides, glow, reflection);
    stage.appendChild(model);

    const state = {
      angle: -18 + Math.random() * 26,
      speed: 0.42 + Math.random() * 0.12,
      dragging: false,
      lastX: 0,
      velocity: 0,
      model
    };

    stage.addEventListener('pointerdown', (e) => {
      state.dragging = true;
      state.lastX = e.clientX;
      state.velocity = 0;
      stage.setPointerCapture?.(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!state.dragging) return;
      const delta = e.clientX - state.lastX;
      state.lastX = e.clientX;
      state.angle += delta * 0.8;
      state.velocity = delta * 0.45;
    });
    const release = () => { state.dragging = false; };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('lostpointercapture', release);

    img.dataset.rock3dBound = '1';
    img.dataset.rockImage = path;
    models.set(img, state);
    return state;
  }

  function repair(img) {
    const path = normalize(img.getAttribute('src')) || normalize(img.dataset.rockImage);
    if (!path || img.dataset.rock3dBound === '1') return;

    const url = pageUrl(path);
    img.loading = 'lazy';
    img.decoding = 'async';
    if (img.src !== url) img.src = url;

    img.addEventListener('error', () => {
      if (img.dataset.rockFallbackUsed === '1') return;
      img.dataset.rockFallbackUsed = '1';
      img.src = `${RAW_BASE}${path}?v=${VERSION}`;
    });

    createModel(img, path);
  }

  function tick() {
    models.forEach((state, img) => {
      if (!img.isConnected) {
        models.delete(img);
        return;
      }
      if (state.dragging) {
        state.velocity *= 0.92;
      } else {
        state.angle += state.speed + state.velocity;
        state.velocity *= 0.94;
      }
      state.model.style.transform = `rotateX(-4deg) rotateY(${state.angle}deg)`;
    });
    rafId = requestAnimationFrame(tick);
  }

  function apply() {
    injectStyles();
    document.querySelectorAll('img.product-image').forEach(repair);
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function observe() {
    const grid = document.getElementById('productGrid');
    if (!grid || grid.dataset.rock3dObserver) return;
    grid.dataset.rock3dObserver = '1';
    new MutationObserver(apply).observe(grid, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', () => { apply(); observe(); });
  window.addEventListener('load', () => { apply(); observe(); });
  setTimeout(() => { apply(); observe(); }, 300);
  setTimeout(() => { apply(); observe(); }, 1200);
})();

(() => {
  'use strict';

  const RAW_BASE = 'https://raw.githubusercontent.com/nashhal/ROCK/main/';
  const VERSION = '20260913-24';
  const objects = new Map();
  let raf = 0;

  function normalize(src) {
    if (!src) return null;
    const clean = String(src).split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
    return clean.startsWith('assets/products/') ? clean : null;
  }

  function assetUrl(path) {
    const u = new URL(path, document.baseURI);
    u.search = `v=${VERSION}`;
    return u.href;
  }

  function injectStyles() {
    if (document.getElementById('rock-true-3d-system')) return;
    const style = document.createElement('style');
    style.id = 'rock-true-3d-system';
    style.textContent = `
      .product-visual {
        background: var(--paper, #f3f3f1) !important;
        perspective: 1400px !important;
        perspective-origin: 50% 48% !important;
      }
      .product-art.has-catalog-image {
        position: relative !important;
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        transform-style: preserve-3d !important;
        perspective: 1400px !important;
        overflow: visible !important;
      }
      .rock-3d-stage {
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
        display: grid !important;
        place-items: center !important;
        perspective: 1400px !important;
        perspective-origin: 50% 50% !important;
        isolation: isolate !important;
      }
      .rock-3d-model {
        position: relative !important;
        width: min(82%, 330px) !important;
        height: min(82%, 330px) !important;
        transform-style: preserve-3d !important;
        will-change: transform !important;
        touch-action: pan-y !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        cursor: grab !important;
      }
      .rock-3d-model:active { cursor: grabbing !important; }
      .rock-3d-face {
        position: absolute !important;
        inset: 0 !important;
        display: grid !important;
        place-items: center !important;
        border-radius: 18px !important;
        overflow: hidden !important;
        backface-visibility: hidden !important;
        -webkit-backface-visibility: hidden !important;
      }
      .rock-3d-front {
        transform: translateZ(18px) !important;
        background: #fff !important;
        box-shadow: 0 24px 40px rgba(16,16,16,.15), inset 0 0 0 1px rgba(16,16,16,.04) !important;
      }
      .rock-3d-back {
        transform: rotateY(180deg) translateZ(18px) !important;
        background: linear-gradient(145deg, #e9e9e6, #c9c9c4) !important;
        box-shadow: inset 0 0 0 1px rgba(16,16,16,.08) !important;
      }
      .rock-3d-side {
        position: absolute !important;
        background: linear-gradient(180deg, #d8d8d4, #9b9b95) !important;
        border-radius: 8px !important;
        box-shadow: inset 0 0 0 1px rgba(16,16,16,.06) !important;
      }
      .rock-3d-side.left  { width: 36px !important; height: 100% !important; left: 50% !important; top: 0 !important; transform: translateX(-100%) rotateY(-90deg) !important; transform-origin: right center !important; }
      .rock-3d-side.right { width: 36px !important; height: 100% !important; left: 50% !important; top: 0 !important; transform: translateX(0) rotateY(90deg) !important; transform-origin: left center !important; }
      .rock-3d-side.top   { width: 100% !important; height: 36px !important; left: 0 !important; top: 50% !important; transform: translateY(-100%) rotateX(90deg) !important; transform-origin: center bottom !important; }
      .rock-3d-side.bottom{ width: 100% !important; height: 36px !important; left: 0 !important; top: 50% !important; transform: translateY(0) rotateX(-90deg) !important; transform-origin: center top !important; }
      .rock-3d-face img {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        object-position: center !important;
        display: block !important;
        border-radius: 16px !important;
        pointer-events: none !important;
        user-select: none !important;
        -webkit-user-drag: none !important;
        filter: saturate(.98) contrast(1.01) !important;
      }
      .rock-3d-badge {
        position: absolute !important;
        bottom: 12px !important;
        left: 12px !important;
        z-index: 5 !important;
        padding: 5px 8px !important;
        border-radius: 999px !important;
        background: rgba(16,16,16,.72) !important;
        color: #fff !important;
        font: 700 8px/1 Montserrat, sans-serif !important;
        letter-spacing: .12em !important;
        pointer-events: none !important;
      }
      .rock-3d-ground {
        position: absolute !important;
        width: 58% !important;
        height: 14% !important;
        bottom: 9% !important;
        left: 21% !important;
        border-radius: 50% !important;
        background: rgba(16,16,16,.14) !important;
        filter: blur(14px) !important;
        transform: rotateX(70deg) translateZ(-12px) !important;
        pointer-events: none !important;
      }
      .product-card:hover .rock-3d-model { filter: drop-shadow(0 30px 24px rgba(16,16,16,.12)); }
      @media (max-width: 560px) {
        .rock-3d-model { width: min(86%, 280px) !important; height: min(86%, 280px) !important; }
      }
      @media (prefers-reduced-motion: reduce) {
        .rock-3d-model { transition: none !important; }
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
    const url = assetUrl(path);
    const raw = `${RAW_BASE}${path}?v=${VERSION}`;
    if (!img.src || !img.src.includes(`v=${VERSION}`)) img.src = url;
    if (!img.dataset.rockFallbackBound) {
      img.dataset.rockFallbackBound = '1';
      img.addEventListener('error', () => {
        if (img.dataset.rockFallbackUsed === '1') return;
        img.dataset.rockFallbackUsed = '1';
        img.src = raw;
      });
    }
  }

  function build(img) {
    const art = img.closest('.product-art.has-catalog-image');
    if (!art || art.dataset.rock3dBuilt === '1') return;
    repair(img);

    const stage = document.createElement('div');
    stage.className = 'rock-3d-stage';
    const model = document.createElement('div');
    model.className = 'rock-3d-model';
    const front = document.createElement('div');
    front.className = 'rock-3d-face rock-3d-front';
    const back = document.createElement('div');
    back.className = 'rock-3d-face rock-3d-back';
    const backImg = img.cloneNode(false);
    backImg.src = assetUrl(img.dataset.rockImage);
    backImg.dataset.rockMirror = '1';
    back.appendChild(backImg);
    front.appendChild(img);
    model.append(front, back);
    ['left','right','top','bottom'].forEach(side => {
      const el = document.createElement('div');
      el.className = `rock-3d-side ${side}`;
      model.appendChild(el);
    });
    const badge = document.createElement('span');
    badge.className = 'rock-3d-badge';
    badge.textContent = '360° 3D';
    const ground = document.createElement('div');
    ground.className = 'rock-3d-ground';
    model.appendChild(badge);
    stage.append(ground, model);
    art.replaceChildren(stage);
    art.dataset.rock3dBuilt = '1';
    objects.set(model, { angle: 0, pitch: 0, target: 0, targetPitch: 0, dragging: false, x: 0 });

    let startX = 0, startY = 0, startAngle = 0, startPitch = 0;
    const down = ev => {
      const p = ev.touches ? ev.touches[0] : ev;
      state.dragging = true;
      state.x = p.clientX;
      startX = p.clientX;
      startY = p.clientY;
      startAngle = state.target;
      startPitch = state.targetPitch;
      model.setPointerCapture?.(ev.pointerId);
    };
    const move = ev => {
      if (!state.dragging) return;
      const p = ev.touches ? ev.touches[0] : ev;
      state.target = startAngle + (p.clientX - startX) * 0.55;
      state.targetPitch = Math.max(-14, Math.min(14, startPitch - (p.clientY - startY) * 0.16));
      if (ev.cancelable) ev.preventDefault();
    };
    const up = () => { state.dragging = false; };
    const state = objects.get(model);
    model.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up, { passive: true });
    model.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up, { passive: true });
  }

  function process() {
    injectStyles();
    document.querySelectorAll('img.product-image').forEach(img => {
      repair(img);
      build(img);
    });
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    objects.forEach((state, model) => {
      if (!model.isConnected) {
        objects.delete(model);
        return;
      }
      if (!state.dragging) state.target += 0.16;
      state.angle += (state.target - state.angle) * 0.12;
      state.pitch += (state.targetPitch - state.pitch) * 0.12;
      model.style.transform = `rotateX(${state.pitch}deg) rotateY(${state.angle}deg) translateZ(0)`;
    });
    raf = requestAnimationFrame(tick);
  }

  function observe() {
    const grid = document.getElementById('productGrid');
    if (!grid || grid.dataset.rock3dObserver) return;
    grid.dataset.rock3dObserver = '1';
    new MutationObserver(process).observe(grid, { childList: true, subtree: true });
  }

  const start = () => { process(); observe(); };
  document.addEventListener('DOMContentLoaded', start);
  window.addEventListener('load', start);
  setTimeout(start, 400);
  setTimeout(start, 1200);
})();

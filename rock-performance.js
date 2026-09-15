/* ROCK Performance Layer — reduces input, scroll and search work without changing catalog data. */
(() => {
  'use strict';

  const productSearch = document.getElementById('productSearch');
  const overlaySearch = document.getElementById('overlaySearch');
  const nav = document.getElementById('nav');
  const parallaxEls = [...document.querySelectorAll('.parallax')];

  const rafThrottle = (fn) => {
    let queued = false;
    let lastArgs;
    return (...args) => {
      lastArgs = args;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        fn(...lastArgs);
      });
    };
  };

  const debounced = (fn, delay = 180) => {
    let timer = 0;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), delay);
    };
  };

  let searchTimer = 0;
  const runSearch = (value) => {
    if (typeof window.renderProducts !== 'function') return;
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      const normalized = String(value || '');
      const input = document.getElementById('productSearch');
      if (input && input.value !== normalized) input.value = normalized;
      window.rockSearchQuery = normalized;
      window.renderProducts();
    }, 160);
  };

  const searchHandler = (event) => {
    event.stopImmediatePropagation();
    runSearch(event.target.value);
  };

  /* Capture phase replaces the original per-keystroke renderer. */
  productSearch?.addEventListener('input', searchHandler, true);
  overlaySearch?.addEventListener('input', (event) => {
    event.stopImmediatePropagation();
    const value = event.target.value;
    if (productSearch) productSearch.value = value;
    runSearch(value);
  }, true);

  let scrollTop = 0;
  window.addEventListener('scroll', () => {
    scrollTop = window.scrollY;
  }, { passive: true, capture: true });
  window.addEventListener('scroll', rafThrottle(() => {
    if (nav) nav.classList.toggle('scrolled', scrollTop > 30);
  }), { passive: true });

  if (parallaxEls.length && window.matchMedia('(hover:hover)').matches) {
    let pointer = { x: 0, y: 0 };
    const updateParallax = rafThrottle(() => {
      parallaxEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const x = (pointer.x - (rect.left + rect.width / 2)) * 0.006;
        const y = (pointer.y - (rect.top + rect.height / 2)) * 0.004;
        el.style.transform = `translate3d(${x}px,${y}px,0)`;
      });
    });
    window.addEventListener('mousemove', (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      updateParallax();
    }, { passive: true, capture: true });
  }

  /* Prevent uncontrolled repeated rendering during bursty UI actions. */
  window.ROCK_PERF = Object.freeze({
    rafThrottle,
    debounced
  });
})();

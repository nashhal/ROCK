(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function decorate() {
    $$('.product-card[data-id]').forEach(card => {
      if (card.dataset.rockProductUrl) return;
      const id = card.dataset.id;
      const link = document.createElement('a');
      link.className = 'product-url-overlay';
      link.href = `product.html?product=${encodeURIComponent(id)}`;
      link.setAttribute('aria-label', `عرض تفاصيل ${$('h3', card)?.textContent?.trim() || 'المنتج'}`);
      link.textContent = '';
      card.appendChild(link);
      card.dataset.rockProductUrl = '1';
    });
  }

  function start() {
    decorate();
    const grid = $('#productGrid');
    if (!grid) return;
    new MutationObserver(decorate).observe(grid, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();

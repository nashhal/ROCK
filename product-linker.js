(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function installStyle() {
    if (document.getElementById('rock-product-link-style')) return;
    const style = document.createElement('style');
    style.id = 'rock-product-link-style';
    style.textContent = `.product-card{position:relative}.product-url-overlay{position:absolute;inset:0;z-index:2;border-radius:inherit;background:transparent}.product-card .product-add,.product-card .favorite-btn{position:relative;z-index:3}`;
    document.head.appendChild(style);
  }

  function decorate() {
    installStyle();
    $$('.product-card[data-id]').forEach(card => {
      if (card.dataset.rockProductUrl) return;
      const id = card.dataset.id;
      const link = document.createElement('a');
      link.className = 'product-url-overlay';
      link.href = `product.html?product=${encodeURIComponent(id)}`;
      link.setAttribute('aria-label', `عرض تفاصيل ${$('h3', card)?.textContent?.trim() || 'المنتج'}`);
      link.setAttribute('title', 'عرض تفاصيل المنتج');
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

/* ROCK World-Class Experience Runtime
 * Enhances the existing storefront without replacing its catalog engine.
 */
(() => {
  'use strict';

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = `world-class.css?v=${Date.now()}`;
  document.head.appendChild(css);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function enrichCatalogSearch() {
    if (!Array.isArray(window.products) && typeof products === 'undefined') return;
    const catalog = Array.isArray(window.products) ? window.products : products;
    catalog.forEach(p => {
      if (!p || p.__rockSearchEnriched) return;
      const extra = [p.model, p.barcode, p.category, ...(p.specs || []).flat()].filter(Boolean).join(' ');
      p.desc = `${p.desc || ''} ${extra}`.trim();
      p.__rockSearchEnriched = true;
    });
  }

  function normalizeCards() {
    $$('.product-card').forEach(card => {
      const id = card.dataset.id || card.dataset.product;
      if (!id) return;
      card.dataset.product = id;
      card.setAttribute('data-state', 'ready');
      card.setAttribute('aria-label', card.querySelector('h3')?.textContent?.trim() || 'ROCK product');
      const img = $('img.product-image', card);
      if (img) {
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', () => card.dataset.state = 'image-error', { once: true });
        img.addEventListener('load', () => card.dataset.state = 'ready', { once: true });
      }
      if (!$('.rock-wc-status', card)) {
        const status = document.createElement('span');
        status.className = 'rock-wc-status';
        status.innerHTML = '<i></i><span>بيانات المنتج من كتالوج ROCK</span>';
        $('.product-info', card)?.appendChild(status);
      }
    });
  }

  function addTrustStrip() {
    if ($('#rockWcTrust') || !$('#shop')) return;
    const wrap = document.createElement('div');
    wrap.id = 'rockWcTrust';
    wrap.className = 'rock-wc-trust';
    wrap.innerHTML = `
      <article><b>صور أصلية</b><span>صور الكتالوج الأصلية محفوظة دون إعادة قص أثناء النشر.</span></article>
      <article><b>معلومات أوضح</b><span>الموديل والمواصفات والبحث بالمرجع متاحة عند وجودها.</span></article>
      <article><b>دعم مباشر</b><span>الدعم والطلب والاستفسار في مسار واضح قبل الشراء.</span></article>
      <article><b>تجربة موثوقة</b><span>حالات التحميل والخطأ والصور مهيأة بدل ترك واجهة فارغة.</span></article>`;
    $('.store-tools', $('#shop'))?.after(wrap);
  }

  function addPolicyLinks() {
    const footer = $('.footer');
    if (!footer || $('#rockWcPolicies')) return;
    const wrap = document.createElement('div');
    wrap.id = 'rockWcPolicies';
    wrap.className = 'rock-wc-policy-links';
    wrap.innerHTML = '<a href="policies.html#shipping">الشحن</a><a href="policies.html#returns">الإرجاع</a><a href="policies.html#warranty">الضمان</a><a href="policies.html#privacy">الخصوصية</a><a href="support.html">الدعم</a>';
    $('.footer-top', footer)?.appendChild(wrap);
  }

  function interceptCheckout() {
    const btn = $('#checkoutBtn');
    if (!btn || btn.dataset.rockCheckout) return;
    btn.dataset.rockCheckout = '1';
    btn.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href = 'checkout.html';
    }, true);
  }

  function addCardActions() {
    $$('.product-card').forEach(card => {
      if ($('.rock-wc-card-actions', card)) return;
      const id = card.dataset.id || card.dataset.product;
      if (!id) return;
      const box = document.createElement('div');
      box.className = 'rock-wc-card-actions';
      box.innerHTML = `<a class="primary" href="product.html?product=${encodeURIComponent(id)}">التفاصيل</a>`;
      $('.product-bottom', card)?.before(box);
    });
  }

  function addImageZoom() {
    if ($('#rockWcImageModal')) return;
    const modal = document.createElement('div');
    modal.id = 'rockWcImageModal';
    modal.className = 'rock-wc-modal';
    modal.innerHTML = '<div class="rock-wc-modal-card" role="dialog" aria-modal="true" aria-label="تكبير صورة المنتج"><button class="rock-wc-modal-close" type="button" aria-label="إغلاق">×</button><div class="rock-wc-zoom"><img alt=""></div></div>';
    document.body.appendChild(modal);
    const close = () => modal.classList.remove('open');
    $('.rock-wc-modal-close', modal).onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('click', e => {
      const img = e.target.closest('.product-card img.product-image');
      if (!img || !img.currentSrc) return;
      e.preventDefault();
      const target = $('.rock-wc-zoom img', modal);
      target.src = img.currentSrc || img.src;
      target.alt = img.alt || 'ROCK product';
      modal.classList.add('open');
    });
  }

  function addAccessibility() {
    $$('img').forEach(img => {
      if (!img.alt) img.alt = 'ROCK product image';
    });
    $$('button, a, input, select').forEach(el => {
      if (!el.getAttribute('aria-label') && !el.textContent.trim() && (el.tagName === 'BUTTON' || el.tagName === 'A')) {
        el.setAttribute('aria-label', 'ROCK control');
      }
    });
  }

  function boot() {
    enrichCatalogSearch();
    normalizeCards();
    addTrustStrip();
    addPolicyLinks();
    interceptCheckout();
    addCardActions();
    addImageZoom();
    addAccessibility();

    const grid = $('#productGrid');
    if (grid) {
      const observer = new MutationObserver(() => {
        enrichCatalogSearch();
        normalizeCards();
        addCardActions();
      });
      observer.observe(grid, { childList: true, subtree: true });
    }
    setTimeout(() => { enrichCatalogSearch(); normalizeCards(); addCardActions(); }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();

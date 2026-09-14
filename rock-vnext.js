/* ROCK Storefront vNext — UX, accessibility and storefront polish */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function addSkipLink() {
    if ($('.skip-link')) return;
    const a = document.createElement('a');
    a.className = 'skip-link';
    a.href = '#shop';
    a.textContent = document.documentElement.lang === 'en' ? 'Skip to products' : 'تجاوز إلى المنتجات';
    document.body.prepend(a);
  }

  function improveDocumentMeta() {
    const meta = (name, content) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    meta('robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    meta('application-name', 'ROCK');
    meta('apple-mobile-web-app-capable', 'yes');
    meta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  }

  function ensureSectionIds() {
    const main = $('main');
    if (main) main.setAttribute('tabindex', '-1');
    $$('.product-card').forEach(card => {
      if (!card.hasAttribute('tabindex')) card.tabIndex = -1;
      const image = $('.product-image', card);
      if (image && !image.alt) {
        const name = $('h3', card)?.textContent?.trim();
        if (name) image.alt = name;
      }
    });
  }

  function addResultsBar() {
    const tools = $('.store-tools');
    const grid = $('#productGrid');
    if (!tools || !grid || $('#rockResultsBar')) return;
    const bar = document.createElement('div');
    bar.id = 'rockResultsBar';
    bar.className = 'rock-results-bar';
    bar.setAttribute('aria-live', 'polite');
    bar.innerHTML = '<span class="rock-results-count"><strong id="rockResultsCount">0</strong> <span id="rockResultsLabel">منتج</span></span><button class="rock-reset" id="rockReset" type="button">إعادة الضبط</button>';
    tools.insertAdjacentElement('afterend', bar);
    $('#rockReset').addEventListener('click', () => {
      const search = $('#productSearch');
      if (search) search.value = '';
      const overlaySearch = $('#overlaySearch');
      if (overlaySearch) overlaySearch.value = '';
      const all = $('#filterPills button[data-filter="all"]');
      all?.click();
      if (typeof window.renderProducts === 'function') window.renderProducts();
    });
  }

  function updateResultsBar() {
    const grid = $('#productGrid');
    const countEl = $('#rockResultsCount');
    const labelEl = $('#rockResultsLabel');
    const reset = $('#rockReset');
    if (!grid || !countEl || !labelEl) return;
    const count = $$('.product-card', grid).length;
    countEl.textContent = String(count);
    const en = document.documentElement.lang === 'en';
    labelEl.textContent = en ? (count === 1 ? 'product' : 'products') : 'منتج';
    const hasQuery = Boolean($('#productSearch')?.value?.trim() || $('#overlaySearch')?.value?.trim());
    const active = $('.filter-pills button.active');
    const hasFilter = active && active.dataset.filter !== 'all';
    reset?.classList.toggle('visible', hasQuery || hasFilter);
  }

  function addTrustBlocks() {
    const shop = $('#shop');
    const bar = $('#rockResultsBar');
    if (!shop || !bar || $('#rockVnextUsp')) return;
    const usp = document.createElement('div');
    usp.id = 'rockVnextUsp';
    usp.className = 'rock-usp';
    const en = document.documentElement.lang === 'en';
    const items = en ? [
      ['✓','Curated catalog','Only verified catalog items are shown'],
      ['↗','Saudi delivery','Prepared for local ordering'],
      ['R','ROCK support','Clear help after purchase'],
      ['⌕','Easy discovery','Search, filters and sorting']
    ] : [
      ['✓','كتالوج مختار','عرض المنتجات الموثقة فقط'],
      ['↗','شحن داخل السعودية','تجهيز الطلبات محليًا'],
      ['R','دعم ROCK','خدمة واضحة بعد الشراء'],
      ['⌕','اكتشاف أسهل','بحث وفلاتر وترتيب']
    ];
    usp.innerHTML = items.map(x => `<div class="rock-usp-card"><div class="rock-usp-icon">${x[0]}</div><div><strong>${x[1]}</strong><span>${x[2]}</span></div></div>`).join('');
    bar.insertAdjacentElement('afterend', usp);
  }

  function improveImages() {
    $$('.product-image').forEach((img) => {
      img.loading = img.closest('.product-card') ? 'lazy' : (img.loading || 'eager');
      img.decoding = 'async';
      img.setAttribute('fetchpriority', img.closest('.hero') ? 'high' : 'auto');
      if (!img.alt) img.alt = img.closest('.product-card') ? ($('h3', img.closest('.product-card'))?.textContent || 'ROCK product') : 'ROCK product';
      img.addEventListener('error', () => img.setAttribute('aria-hidden', 'true'), { once: true });
    });
  }

  function improveProductActions() {
    $$('.product-add').forEach(btn => {
      if (!btn.getAttribute('aria-label')) {
        const card = btn.closest('.product-card');
        const name = $('h3', card)?.textContent?.trim() || 'المنتج';
        btn.setAttribute('aria-label', `أضف ${name} إلى السلة`);
      }
    });
    $$('.favorite-btn').forEach(btn => {
      if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'إضافة المنتج للمفضلة');
    });
  }

  function installObserver() {
    const grid = $('#productGrid');
    if (!grid || grid.dataset.rockVnextObserver) return;
    grid.dataset.rockVnextObserver = '1';
    const observer = new MutationObserver(() => {
      ensureSectionIds();
      improveImages();
      improveProductActions();
      updateResultsBar();
    });
    observer.observe(grid, { childList: true, subtree: true });
  }

  function fixCarCopy() {
    const isEn = document.documentElement.lang === 'en';
    $$('#collections .category-card').forEach((card, i) => {
      if (i === 1) {
        const title = $('h3', card), desc = $('p', card);
        if (title) title.textContent = isEn ? 'Car' : 'السيارة';
        if (desc) desc.textContent = isEn ? 'Car chargers and everyday accessories' : 'شواحن وملحقات السيارة';
        card.dataset.filterLink = 'car';
      }
    });
    const filters = $$('#filterPills button');
    const car = filters.find(b => b.dataset.filter === 'car');
    if (car) car.textContent = isEn ? 'Car' : 'السيارة';
  }

  function polishLanguageButton() {
    const btn = $('#langBtn');
    if (!btn) return;
    btn.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية');
  }

  function watchLanguage() {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      addSkipLink();
      polishLanguageButton();
      fixCarCopy();
      addTrustBlocks();
      updateResultsBar();
    });
    observer.observe(html, { attributes: true, attributeFilter: ['lang', 'dir'] });
  }

  function init() {
    improveDocumentMeta();
    addSkipLink();
    ensureSectionIds();
    addResultsBar();
    addTrustBlocks();
    fixCarCopy();
    improveImages();
    improveProductActions();
    polishLanguageButton();
    updateResultsBar();
    installObserver();
    watchLanguage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

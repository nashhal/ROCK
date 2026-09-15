/* ROCK Global Commerce Runtime
 * Keeps the static storefront compatible while introducing market, locale and currency layers.
 */
(() => {
  'use strict';
  const cfg = window.ROCK_CONFIG;
  if (!cfg) return;

  const STORAGE_KEY = 'rock-market-preferences';
  const fallback = { locale: cfg.storefront.defaultLocale, market: cfg.storefront.defaultMarket, currency: cfg.storefront.defaultCurrency };
  const read = () => {
    try { return { ...fallback, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; } catch { return { ...fallback }; }
  };
  const write = state => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} };
  const clamp = (value, list, fallbackValue) => list.includes(value) ? value : fallbackValue;
  let state = read();
  state.locale = clamp(state.locale, cfg.storefront.supportedLocales, fallback.locale);
  state.market = clamp(state.market, cfg.storefront.supportedMarkets, fallback.market);
  state.currency = clamp(state.currency, cfg.storefront.supportedCurrencies, fallback.currency);

  const money = amount => {
    if (amount == null || Number.isNaN(Number(amount))) return state.locale.startsWith('ar') ? 'السعر عند الطلب' : 'Price on request';
    const factor = Number(cfg.fx[state.currency] || 1);
    const converted = Number(amount) * factor;
    const meta = cfg.currency[state.currency] || cfg.currency[cfg.storefront.defaultCurrency];
    try {
      return new Intl.NumberFormat(meta.locale, { style: 'currency', currency: state.currency, maximumFractionDigits: meta.minorUnit }).format(converted);
    } catch { return `${converted.toFixed(2)} ${state.currency}`; }
  };

  const setText = (selector, ar, en) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = state.locale.startsWith('en') ? en : ar;
  };

  function syncShell() {
    const english = state.locale.startsWith('en');
    document.documentElement.lang = english ? 'en' : 'ar';
    document.documentElement.dir = english ? 'ltr' : 'rtl';
    document.body.dataset.market = state.market;
    document.body.dataset.currency = state.currency;
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
      langBtn.textContent = english ? 'AR' : 'EN';
      langBtn.setAttribute('aria-label', english ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية');
      langBtn.title = `${english ? 'Language' : 'اللغة'}: ${state.locale}`;
    }

    setText('.desktop-nav a[href="#shop"]', 'المتجر', 'Shop');
    setText('.desktop-nav a[href="#collections"]', 'التصنيفات', 'Collections');
    setText('.desktop-nav a[href="#featured"]', 'الأكثر طلبًا', 'Featured');
    setText('.desktop-nav a[href="#why"]', 'لماذا ROCK', 'Why ROCK');
    setText('.hero-actions .btn-primary', 'استكشف المنتجات ↗', 'Explore products ↗');
    setText('.text-link[href="#story"]', 'اكتشف ROCK', 'Discover ROCK');
    setText('#filterToggle', 'الفلاتر +', 'Filters +');
    setText('#sortProducts option[value="featured"]', 'الأكثر تميزًا', 'Featured');
    setText('#sortProducts option[value="price-low"]', 'السعر: الأقل', 'Price: low to high');
    setText('#sortProducts option[value="price-high"]', 'السعر: الأعلى', 'Price: high to low');
    setText('#sortProducts option[value="name"]', 'الاسم', 'Name');
    setText('.service-band a', 'الدعم والضمان ↗', 'Support & warranty ↗');
    setText('.contact-actions .btn-primary', 'تصفح المنتجات ↗', 'Browse products ↗');
    setText('#checkoutBtn', 'إتمام الطلب →', 'Checkout →');
    refreshPrices();
  }

  function refreshPrices() {
    if (typeof window.renderProducts === 'function' && window.__rockGlobalCommerceRefreshing !== true) {
      window.__rockGlobalCommerceRefreshing = true;
      try { window.renderProducts(); } finally { window.__rockGlobalCommerceRefreshing = false; }
    }
    const currency = state.currency;
    document.querySelectorAll('[data-rock-sar]').forEach(el => { el.textContent = money(Number(el.dataset.rockSar)); });
    const total = document.getElementById('cartTotal');
    if (total && window.__rockCartTotalSar != null) total.textContent = money(window.__rockCartTotalSar);
    document.querySelectorAll('.rock-market-chip').forEach(el => { el.textContent = `${state.market} · ${currency}`; });
  }

  function addMarketChrome() {
    if (document.getElementById('rockMarketChrome')) return;
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;
    const wrap = document.createElement('div');
    wrap.id = 'rockMarketChrome';
    wrap.className = 'rock-market-chrome';
    wrap.innerHTML = `<button type="button" class="rock-market-btn" id="rockMarketBtn" aria-haspopup="dialog" aria-expanded="false"><span>🌐</span><b class="rock-market-chip">${state.market} · ${state.currency}</b></button>`;
    navActions.insertBefore(wrap, navActions.firstChild);
    const panel = document.createElement('div');
    panel.id = 'rockMarketPanel';
    panel.className = 'rock-market-panel';
    panel.innerHTML = `<div class="rock-market-panel-head"><strong>${state.locale.startsWith('en') ? 'Shopping preferences' : 'تفضيلات التسوق'}</strong><button type="button" id="rockMarketClose" aria-label="Close">×</button></div><label>${state.locale.startsWith('en') ? 'Market' : 'السوق'}<select id="rockMarketSelect">${cfg.storefront.supportedMarkets.map(x => `<option value="${x}" ${x===state.market?'selected':''}>${x}</option>`).join('')}</select></label><label>${state.locale.startsWith('en') ? 'Currency' : 'العملة'}<select id="rockCurrencySelect">${cfg.storefront.supportedCurrencies.map(x => `<option value="${x}" ${x===state.currency?'selected':''}>${x}</option>`).join('')}</select></label><small>${state.locale.startsWith('en') ? 'Displayed currency uses reference rates for preview. Payment and tax rates belong to the production backend.' : 'الأسعار بعملات أخرى للعرض التجريبي فقط. الدفع والضرائب وأسعار الصرف الفعلية تكون من النظام الخلفي عند الإطلاق.'}</small>`;
    document.body.appendChild(panel);
    const button = document.getElementById('rockMarketBtn');
    const close = () => { panel.classList.remove('open'); button.setAttribute('aria-expanded', 'false'); };
    button.addEventListener('click', () => { panel.classList.toggle('open'); button.setAttribute('aria-expanded', panel.classList.contains('open') ? 'true' : 'false'); });
    document.getElementById('rockMarketClose').addEventListener('click', close);
    document.addEventListener('click', e => { if (!panel.contains(e.target) && !wrap.contains(e.target)) close(); });
    document.getElementById('rockMarketSelect').addEventListener('change', e => { state.market = e.target.value; write(state); syncShell(); });
    document.getElementById('rockCurrencySelect').addEventListener('change', e => { state.currency = e.target.value; write(state); syncShell(); });
  }

  function hookLanguageButton() {
    const btn = document.getElementById('langBtn');
    if (!btn || btn.dataset.rockGlobalWired) return;
    btn.dataset.rockGlobalWired = '1';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      state.locale = state.locale.startsWith('ar') ? 'en-SA' : 'ar-SA';
      write(state);
      syncShell();
    }, true);
  }

  function expose() {
    window.ROCK_COMMERCE = Object.freeze({ get state() { return { ...state }; }, money, setMarket: m => { state.market = clamp(m, cfg.storefront.supportedMarkets, fallback.market); write(state); syncShell(); }, setCurrency: c => { state.currency = clamp(c, cfg.storefront.supportedCurrencies, fallback.currency); write(state); syncShell(); } });
  }

  function boot() {
    addMarketChrome();
    hookLanguageButton();
    expose();
    syncShell();
    window.setTimeout(() => syncShell(), 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();

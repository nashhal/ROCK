/* ROCK Global Commerce Runtime
 * Adds market, locale and currency layers without replacing the current storefront.
 */
(() => {
  'use strict';
  const cfg = window.ROCK_CONFIG;
  if (!cfg) return;
  const STORAGE_KEY = 'rock-market-preferences';
  const fallback = { locale: cfg.storefront.defaultLocale, market: cfg.storefront.defaultMarket, currency: cfg.storefront.defaultCurrency };
  const read = () => { try { return { ...fallback, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; } catch { return { ...fallback }; } };
  const write = value => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {} };
  const valid = (value, list, fb) => list.includes(value) ? value : fb;
  let state = read();
  state.locale = valid(state.locale, cfg.storefront.supportedLocales, fallback.locale);
  state.market = valid(state.market, cfg.storefront.supportedMarkets, fallback.market);
  state.currency = valid(state.currency, cfg.storefront.supportedCurrencies, fallback.currency);

  const isEn = () => state.locale.startsWith('en');
  const money = amount => {
    if (amount == null || Number.isNaN(Number(amount))) return isEn() ? 'Price on request' : 'السعر عند الطلب';
    const factor = Number(cfg.fx[state.currency] || 1);
    const converted = Number(amount) * factor;
    const meta = cfg.currency[state.currency] || cfg.currency.SAR;
    try { return new Intl.NumberFormat(meta.locale, { style: 'currency', currency: state.currency, maximumFractionDigits: meta.minorUnit }).format(converted); }
    catch { return `${converted.toFixed(2)} ${state.currency}`; }
  };

  function setText(selector, ar, en) {
    const el = document.querySelector(selector);
    if (el) el.textContent = isEn() ? en : ar;
  }

  function syncShell() {
    document.documentElement.lang = isEn() ? 'en' : 'ar';
    document.documentElement.dir = isEn() ? 'ltr' : 'rtl';
    document.body.dataset.market = state.market;
    document.body.dataset.currency = state.currency;
    const langBtn = document.getElementById('langBtn');
    if (langBtn) { langBtn.textContent = isEn() ? 'AR' : 'EN'; langBtn.setAttribute('aria-label', isEn() ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'); }
    setText('.desktop-nav a[href="#shop"]', 'المتجر', 'Shop');
    setText('.desktop-nav a[href="#collections"]', 'التصنيفات', 'Collections');
    setText('.desktop-nav a[href="#featured"]', 'الأكثر طلبًا', 'Featured');
    setText('.desktop-nav a[href="#why"]', 'لماذا ROCK', 'Why ROCK');
    setText('.hero-actions .btn-primary', 'استكشف المنتجات ↗', 'Explore products ↗');
    setText('.text-link[href="#story"]', 'اكتشف ROCK', 'Discover ROCK');
    setText('#filterToggle', 'الفلاتر +', 'Filters +');
    setText('#checkoutBtn', 'إتمام الطلب →', 'Checkout →');
    refreshPrices();
    const panel = document.getElementById('rockMarketPanel');
    if (panel) panel.remove();
    addMarketChrome();
  }

  function convertPriceText(el) {
    if (!el || el.dataset.rockPriceCurrency === state.currency) return;
    const source = el.dataset.rockSar || el.textContent.replace(/[^0-9.]/g, '');
    const numeric = Number(source);
    if (!numeric || Number.isNaN(numeric)) return;
    el.dataset.rockSar = String(numeric);
    el.dataset.rockPriceCurrency = state.currency;
    el.textContent = money(numeric);
  }

  function refreshPrices() {
    document.querySelectorAll('.product-price').forEach(convertPriceText);
    document.querySelectorAll('[data-rock-sar]').forEach(el => convertPriceText(el));
    const total = document.getElementById('cartTotal');
    if (total && !/request|طلب/.test(total.textContent.toLowerCase())) convertPriceText(total);
    document.querySelectorAll('.cart-row small').forEach(el => {
      if (el.dataset.rockPriceCurrency === state.currency) return;
      const m = el.textContent.match(/([0-9]+(?:\.[0-9]+)?)/);
      if (m) {
        el.dataset.rockPriceCurrency = state.currency;
        el.textContent = el.textContent.replace(m[1], money(Number(m[1])));
      }
    });
    document.querySelectorAll('.rock-market-chip').forEach(el => { el.textContent = `${state.market} · ${state.currency}`; });
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
    panel.innerHTML = `<div class="rock-market-panel-head"><strong>${isEn() ? 'Shopping preferences' : 'تفضيلات التسوق'}</strong><button type="button" id="rockMarketClose" aria-label="Close">×</button></div><label>${isEn() ? 'Market' : 'السوق'}<select id="rockMarketSelect">${cfg.storefront.supportedMarkets.map(x => `<option value="${x}" ${x===state.market?'selected':''}>${x}</option>`).join('')}</select></label><label>${isEn() ? 'Currency' : 'العملة'}<select id="rockCurrencySelect">${cfg.storefront.supportedCurrencies.map(x => `<option value="${x}" ${x===state.currency?'selected':''}>${x}</option>`).join('')}</select></label><small>${isEn() ? 'Currencies are a storefront preview. Production FX, tax and payment rates must come from the backend.' : 'تغيير العملة هنا للعرض فقط. أسعار الصرف والضرائب والدفع الفعلية يجب أن تأتي من النظام الخلفي عند الإطلاق.'}</small>`;
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
      state.locale = isEn() ? 'ar-SA' : 'en-SA';
      write(state);
      syncShell();
    }, true);
  }

  function expose() {
    window.ROCK_COMMERCE = Object.freeze({
      get state() { return { ...state }; },
      money,
      setMarket(market) { state.market = valid(market, cfg.storefront.supportedMarkets, fallback.market); write(state); syncShell(); },
      setCurrency(currency) { state.currency = valid(currency, cfg.storefront.supportedCurrencies, fallback.currency); write(state); syncShell(); }
    });
  }

  function boot() {
    addMarketChrome();
    hookLanguageButton();
    expose();
    syncShell();
    const observer = new MutationObserver(() => refreshPrices());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();

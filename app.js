(() => {
  'use strict';

  const rawProducts = Array.isArray(window.ROCK_PRODUCTS) ? window.ROCK_PRODUCTS : [];
  const products = rawProducts.filter(p => p && Number.isFinite(Number(p.price)) && p.image && p.id && p.model);

  const translations = {
    ar: {
      shop: 'المتجر',
      featured: 'المختارات',
      aboutNav: 'عن ROCK',
      catalogPriced: 'المنتجات المتاحة بأسعار الكتالوج',
      heroLead: 'إكسسوارات تقنية مصممة لترافق يومك — من الطاقة والشحن إلى الصوت وحلول السيارة. اختيارات ROCK الأصلية، بموديلات واضحة وأسعار مأخوذة من الكتالوج.',
      discover: 'اكتشف المجموعة',
      exploreFeatured: 'استكشف المختارات',
      pricedProducts: 'منتج مسعّر',
      mainCategories: 'فئات رئيسية',
      currency: 'العملة',
      featuredTitle: 'مختارات تستحق الانتباه',
      featuredLead: 'مجموعة منتقاة من منتجات ROCK الأعلى سعرًا في قائمة الكتالوج الحالية، مع الحفاظ على الموديل والسعر والصورة الأصلية لكل منتج.',
      collectionTitle: 'كل ما تحتاجه، في مكان واحد',
      search: 'ابحث باسم المنتج أو الموديل',
      sortFeatured: 'مختارة',
      sortLow: 'الأقل سعرًا',
      sortHigh: 'الأعلى سعرًا',
      aboutTitle: 'أصلي من المصدر.<br>واضح في كل تفصيلة.',
      aboutLead: 'تجربة ROCK تبدأ من المنتج نفسه: هوية العلامة الأصلية، صور المنتجات من الكتالوج، موديل محدد، وسعر واضح. واجهة بسيطة، محتوى دقيق، وتجربة شراء مصممة لتكون سريعة وواضحة.',
      catalogFooter: 'بيانات المنتجات المعروضة هنا مرتبطة بكتالوج ROCK المستخدم للموقع، مع الاعتماد على المنتجات التي يتوفر لها سعر واضح.',
      saudiArabia: 'Saudi Arabia',
      cart: 'السلة',
      yourCart: 'سلتك',
      total: 'الإجمالي',
      continueOrder: 'المتابعة إلى الطلب',
      checkoutNote: 'واجهة المتجر مهيأة للربط بالدفع والشحن.',
      cartEmpty: 'السلة فارغة حاليًا',
      noResults: 'لم نعثر على منتج مطابق. جرّب اسمًا أو موديلًا مختلفًا.',
      noProducts: 'لا توجد منتجات متاحة حاليًا.',
      all: 'الكل',
      power: 'الطاقة والشحن',
      audio: 'الصوت',
      car: 'السيارة',
      lifestyle: 'أسلوب الحياة',
      addToCart: 'إضافة إلى السلة',
      added: 'تمت إضافة المنتج إلى السلة',
      emptyCheckout: 'أضف منتجًا إلى السلة قبل المتابعة.',
      orderReady: 'السلة جاهزة. اربط زر الطلب بخدمة الدفع أو الطلب الخاصة بمتجرك.'
    },
    en: {
      shop: 'Shop',
      featured: 'Featured',
      aboutNav: 'About ROCK',
      catalogPriced: 'Products available with catalog pricing',
      heroLead: 'Technology accessories built for everyday life — from power and charging to audio and car solutions. Original ROCK selections with clear models and catalog-based pricing.',
      discover: 'Explore the collection',
      exploreFeatured: 'View featured',
      pricedProducts: 'priced products',
      mainCategories: 'main categories',
      currency: 'currency',
      featuredTitle: 'A selection worth noticing',
      featuredLead: 'A curated selection of the highest-priced products in the current ROCK catalog list, keeping each model, price and original product image clear.',
      collectionTitle: 'Everything you need, in one place',
      search: 'Search by product or model',
      sortFeatured: 'Featured',
      sortLow: 'Lowest price',
      sortHigh: 'Highest price',
      aboutTitle: 'Original by source.<br>Clear in every detail.',
      aboutLead: 'The ROCK experience starts with the product itself: original brand identity, catalog product imagery, a defined model and a clear price. Simple interface, precise content and a fast shopping experience.',
      catalogFooter: 'Product data shown here is connected to the ROCK catalog used for this storefront, with only products that have clear pricing included.',
      saudiArabia: 'Saudi Arabia',
      cart: 'Cart',
      yourCart: 'Your cart',
      total: 'Total',
      continueOrder: 'Continue to order',
      checkoutNote: 'Storefront prepared for payment and shipping integration.',
      cartEmpty: 'Your cart is empty',
      noResults: 'No matching product found. Try another name or model.',
      noProducts: 'No products are currently available.',
      all: 'All',
      power: 'Power',
      audio: 'Audio',
      car: 'Car',
      lifestyle: 'Lifestyle',
      addToCart: 'Add to cart',
      added: 'Product added to cart',
      emptyCheckout: 'Add a product to the cart before continuing.',
      orderReady: 'Your cart is ready. Connect the order button to your preferred payment or ordering service.'
    }
  };

  const categories = ['all', 'power', 'audio', 'car', 'lifestyle'];
  const categoryLabels = key => ({
    all: translations[state.lang].all,
    power: translations[state.lang].power,
    audio: translations[state.lang].audio,
    car: translations[state.lang].car,
    lifestyle: translations[state.lang].lifestyle
  })[key];

  const safeCart = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem('rock-cart-v2') || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return Object.fromEntries(Object.entries(parsed).filter(([id, qty]) =>
        products.some(p => p.id === id) && Number.isInteger(Number(qty)) && Number(qty) > 0
      ).map(([id, qty]) => [id, Number(qty)]));
    } catch {
      return {};
    }
  };

  const state = {
    query: '',
    category: 'all',
    sort: 'featured',
    lang: 'ar',
    cart: safeCart()
  };

  const $ = id => document.getElementById(id);
  const el = {
    grid: $('catalogGrid'), featured: $('featuredGrid'), chips: $('chips'), search: $('search'), sort: $('sort'), empty: $('empty'),
    total: $('productTotal'), count: $('cartCount'), items: $('cartItems'), cartTotal: $('cartTotal'), drawer: $('cartDrawer'),
    overlay: $('cartOverlay'), lang: $('langBtn'), year: $('year'), menu: $('menuBtn'), cartBtn: $('cartBtn'), closeCart: $('closeCart'),
    checkoutBtn: $('checkoutBtn'), checkoutNote: $('checkoutNote')
  };

  const money = value => {
    const amount = Number(value) || 0;
    return new Intl.NumberFormat(state.lang === 'ar' ? 'en-SA' : 'en-SA', {
      style: 'currency', currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(amount);
  };

  const name = product => state.lang === 'ar' ? product.nameAr : product.nameEn;
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[char]));
  const persist = () => localStorage.setItem('rock-cart-v2', JSON.stringify(state.cart));

  function applyStaticTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(node => {
      const key = node.dataset.i18n;
      if (translations[state.lang][key] !== undefined) node.innerHTML = translations[state.lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
      const key = node.dataset.i18nPlaceholder;
      if (translations[state.lang][key] !== undefined) node.placeholder = translations[state.lang][key];
    });
    el.sort.querySelectorAll('option[data-i18n]').forEach(option => {
      const key = option.dataset.i18n;
      if (translations[state.lang][key] !== undefined) option.textContent = translations[state.lang][key];
    });
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    el.lang.textContent = state.lang === 'ar' ? 'EN' : 'AR';
    el.lang.setAttribute('aria-label', state.lang === 'ar' ? 'Change language' : 'تغيير اللغة');
    el.cartBtn.setAttribute('aria-label', translations[state.lang].cart);
    el.closeCart.setAttribute('aria-label', state.lang === 'ar' ? 'إغلاق' : 'Close');
  }

  function visible() {
    let output = products.filter(product => state.category === 'all' || product.category === state.category);
    const query = state.query.trim().toLowerCase();
    if (query) output = output.filter(product => `${product.nameAr || ''} ${product.nameEn || ''} ${product.model}`.toLowerCase().includes(query));
    if (state.sort === 'low') output.sort((a, b) => Number(a.price) - Number(b.price));
    if (state.sort === 'high') output.sort((a, b) => Number(b.price) - Number(a.price));
    return output;
  }

  function card(product) {
    return `<article class="product-card">
      <div class="product-media">
        <img loading="lazy" src="${esc(product.image)}" alt="${esc(name(product))}" onerror="this.closest('.product-card')?.remove()">
        <span class="price">${money(product.price)}</span>
      </div>
      <div class="product-info">
        <span class="model">${esc(product.model)}</span>
        <h3 class="product-name">${esc(name(product))}</h3>
        <div class="product-bottom">
          <strong class="product-price">${money(product.price)}</strong>
          <button class="add" type="button" data-add="${esc(product.id)}" aria-label="${esc(translations[state.lang].addToCart)}">+</button>
        </div>
      </div>
    </article>`;
  }

  function feature(product, index) {
    const label = name(product).replace(/^ROCK\s*/i, '');
    return `<article class="featured-card"><span class="meta">0${index + 1} / ${esc(product.model)}</span><span class="mark"></span><div><div class="name">${esc(label)}</div><div class="price">${money(product.price)}</div></div></article>`;
  }

  function renderCategories() {
    el.chips.innerHTML = categories.map(key => `<button type="button" class="chip ${state.category === key ? 'active' : ''}" data-cat="${key}">${esc(categoryLabels(key))}</button>`).join('');
  }

  function updateMobileNav() {
    let nav = document.querySelector('.mobile-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'mobile-nav';
      nav.setAttribute('aria-label', 'Mobile navigation');
      document.body.appendChild(nav);
    }
    nav.innerHTML = `<a href="#shop">${esc(translations[state.lang].shop)}</a><a href="#featured">${esc(translations[state.lang].featured)}</a><a href="#about">${esc(translations[state.lang].aboutNav)}</a>`;
  }

  function renderCart() {
    const lines = Object.entries(state.cart)
      .map(([id, quantity]) => {
        const product = products.find(item => item.id === id);
        return product ? { product, quantity } : null;
      }).filter(Boolean);

    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const total = lines.reduce((sum, line) => sum + line.quantity * Number(line.product.price), 0);
    el.count.textContent = count;
    el.cartTotal.textContent = money(total);
    el.items.innerHTML = lines.length ? lines.map(({ product, quantity }) => `<div class="cart-line">
      <img src="${esc(product.image)}" alt="${esc(name(product))}">
      <div><h4>${esc(name(product))}</h4><small>${money(product.price)} × ${quantity}</small></div>
      <div class="qty"><button type="button" data-dec="${esc(product.id)}" aria-label="Decrease quantity">−</button><span>${quantity}</span><button type="button" data-inc="${esc(product.id)}" aria-label="Increase quantity">+</button></div>
    </div>`).join('') : `<div class="empty">${esc(translations[state.lang].cartEmpty)}</div>`;
    bindCartControls();
    el.checkoutBtn.disabled = lines.length === 0;
    el.checkoutBtn.setAttribute('aria-disabled', String(lines.length === 0));
    el.checkoutBtn.style.opacity = lines.length ? '1' : '.55';
  }

  function bindCartControls() {
    document.querySelectorAll('[data-inc]').forEach(button => button.onclick = () => changeQuantity(button.dataset.inc, 1));
    document.querySelectorAll('[data-dec]').forEach(button => button.onclick = () => changeQuantity(button.dataset.dec, -1));
  }

  function add(productId) {
    if (!products.some(product => product.id === productId)) return;
    state.cart[productId] = (state.cart[productId] || 0) + 1;
    persist();
    renderCart();
    openCart();
    el.checkoutNote.textContent = translations[state.lang].added;
  }

  function changeQuantity(productId, delta) {
    if (!state.cart[productId]) return;
    state.cart[productId] += delta;
    if (state.cart[productId] <= 0) delete state.cart[productId];
    persist();
    renderCart();
  }

  function openCart() {
    el.drawer.classList.add('open');
    el.overlay.classList.add('open');
    document.body.classList.add('lock');
  }

  function closeCart() {
    el.drawer.classList.remove('open');
    el.overlay.classList.remove('open');
    document.body.classList.remove('lock');
    el.menu?.setAttribute('aria-expanded', 'false');
  }

  function closeMobileNav() {
    const nav = document.querySelector('.mobile-nav');
    nav?.classList.remove('open');
    el.menu?.setAttribute('aria-expanded', 'false');
  }

  function render() {
    applyStaticTranslations();
    renderCategories();
    const output = visible();
    el.grid.innerHTML = output.map(card).join('');
    el.empty.hidden = output.length > 0;
    el.empty.textContent = output.length ? '' : (state.query || state.category !== 'all' ? translations[state.lang].noResults : translations[state.lang].noProducts);
    const featured = [...products].sort((a, b) => Number(b.price) - Number(a.price)).slice(0, 4);
    el.featured.innerHTML = featured.map(feature).join('');
    el.total.textContent = products.length;
    renderCart();
    updateMobileNav();
    bindProductControls();
  }

  function bindProductControls() {
    document.querySelectorAll('[data-cat]').forEach(button => button.onclick = () => { state.category = button.dataset.cat; render(); });
    document.querySelectorAll('[data-add]').forEach(button => button.onclick = () => add(button.dataset.add));
  }

  el.search?.addEventListener('input', event => { state.query = event.target.value; render(); });
  el.sort?.addEventListener('change', event => { state.sort = event.target.value; render(); });
  el.cartBtn?.addEventListener('click', openCart);
  el.closeCart?.addEventListener('click', closeCart);
  el.overlay?.addEventListener('click', closeCart);

  el.checkoutBtn?.addEventListener('click', () => {
    const count = Object.values(state.cart).reduce((sum, quantity) => sum + Number(quantity), 0);
    el.checkoutNote.textContent = count ? translations[state.lang].orderReady : translations[state.lang].emptyCheckout;
  });

  el.lang?.addEventListener('click', () => {
    state.lang = state.lang === 'ar' ? 'en' : 'ar';
    const mobileNav = document.querySelector('.mobile-nav');
    const wasOpen = mobileNav?.classList.contains('open');
    render();
    if (wasOpen) mobileNav?.classList.add('open');
  });

  el.menu?.addEventListener('click', () => {
    const nav = document.querySelector('.mobile-nav');
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    el.menu.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('.mobile-nav a');
    if (link) closeMobileNav();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeCart();
      closeMobileNav();
    }
  });

  el.year.textContent = new Date().getFullYear();
  if (!products.length) console.warn('ROCK: no valid products found in ROCK_PRODUCTS');
  render();
})();

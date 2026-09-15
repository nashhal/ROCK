(() => {
  'use strict';
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const id = params.get('product');
  const product = typeof findProduct === 'function' ? findProduct(id) : null;
  const $ = (s) => document.querySelector(s);

  const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const localizedCategory = (category, en) => ({power:en?'Charging & Power':'الشحن والطاقة',car:en?'Car':'السيارة',audio:en?'Audio':'الصوت',holder:en?'Holders':'الحوامل',lifestyle:en?'Lifestyle':'أسلوب الحياة'})[category] || category;
  const money = (value) => window.ROCK_COMMERCE?.money ? window.ROCK_COMMERCE.money(value) : (value == null ? (root.lang === 'en' ? 'Price on request' : 'السعر عند الطلب') : `${value} ر.س`);

  function relatedProducts() {
    if (!product || !Array.isArray(products)) return [];
    return products.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4);
  }

  function renderRelated(list, en) {
    const target = $('#relatedProducts');
    if (!target) return;
    target.innerHTML = list.map(p => `<a class="related-card" href="product.html?product=${encodeURIComponent(p.id)}"><div class="related-image"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></div><div><span>${esc(p.label || localizedCategory(p.category,en))}</span><h3>${esc(p.name)}</h3><strong>${esc(money(p.price))}</strong></div></a>`).join('');
  }

  function addJsonLd() {
    if (!product) return;
    const canonical = new URL(`product.html?product=${encodeURIComponent(product.id)}`, location.href).href;
    const data = {
      '@context':'https://schema.org',
      '@type':'Product',
      name: product.name,
      image: [new URL(product.image, location.href).href],
      description: product.desc,
      sku: product.barcode || product.model || product.id,
      mpn: product.model || product.id,
      brand: {'@type':'Brand', name:'ROCK'},
      url: canonical,
      category: localizedCategory(product.category, false)
    };
    if (product.price != null) data.offers = {
      '@type':'Offer', url:canonical, priceCurrency:'SAR', price:String(product.price), availability:'https://schema.org/InStock', itemCondition:'https://schema.org/NewCondition'
    };
    const tag = document.createElement('script'); tag.type='application/ld+json'; tag.textContent=JSON.stringify(data); document.head.appendChild(tag);
  }

  function updateMeta(en) {
    if (!product) return;
    const title = `${product.name} | ROCK`;
    const desc = product.desc || product.name;
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = desc;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel='canonical'; document.head.appendChild(canonical); }
    canonical.href = new URL(`product.html?product=${encodeURIComponent(product.id)}`, location.href).href;
  }

  function syncLanguage(en) {
    $('#productLang').textContent = en ? 'AR' : 'EN';
    $('#productLang').setAttribute('aria-label', en ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية');
    $('.product-topbar nav a:nth-child(1)').textContent = en ? 'Shop' : 'المتجر';
    $('.product-topbar nav a:nth-child(2)').textContent = en ? 'Collections' : 'التصنيفات';
    $('.product-topbar nav a:nth-child(3)').textContent = en ? 'Support' : 'الدعم';
    $('.pdp-contact').textContent = en ? 'Ask about this product ↗' : 'اسأل عن المنتج ↗';
    document.querySelector('.pdp-gallery-note').textContent = en ? 'ROCK / PRODUCT DETAIL' : 'ROCK / PRODUCT DETAIL';
  }

  function render() {
    const en = root.lang === 'en';
    if (!product) {
      $('#productRoot').innerHTML = `<div class="pdp-missing"><p class="eyebrow">ROCK / 404</p><h1>${en ? 'Product not found' : 'المنتج غير موجود'}</h1><p>${en ? 'The requested catalog item could not be found.' : 'المنتج المطلوب غير موجود في الكتالوج المنشور.'}</p><a class="pdp-add" href="index.html#shop">${en ? 'Back to shop' : 'العودة للمتجر'}</a></div>`;
      return;
    }
    $('#productBreadcrumb').innerHTML = `<a href="index.html">ROCK</a><span>›</span><a href="index.html#shop">${esc(en ? 'Shop' : 'المتجر')}</a><span>›</span><span>${esc(product.label || localizedCategory(product.category,en))}</span>`;
    $('#productBadge').textContent = product.badge || 'ROCK';
    const image = $('#productImage'); image.src=product.image; image.alt=product.name;
    $('#productCategory').textContent = product.label || localizedCategory(product.category,en);
    $('#productName').textContent = product.name;
    $('#productModel').textContent = product.model ? `MODEL ${product.model}` : '';
    $('#productPrice').textContent = money(product.price);
    $('#productStatus span').textContent = en ? (product.price != null ? 'Available in the published catalog' : 'Price on request in the published catalog') : (product.price != null ? 'متوفر وفق الكتالوج المنشور' : 'السعر عند الطلب وفق الكتالوج المنشور');
    $('#productDescription').textContent = product.desc || '';
    $('#productSpecs').innerHTML = (product.specs || []).map(([label,value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
    $('#productBestFor').innerHTML = (product.bestFor || []).map(x => `<span>${esc(x)}</span>`).join('') || `<span>${en ? 'Everyday use' : 'الاستخدام اليومي'}</span>`;
    $('#addToCart').onclick = () => { if (typeof addToCart === 'function') addToCart(product.id); };
    renderRelated(relatedProducts(), en);
    updateMeta(en); addJsonLd(); syncLanguage(en);
  }

  function toggleLanguage() {
    const en = root.lang !== 'en';
    root.lang = en ? 'en' : 'ar'; root.dir = en ? 'ltr' : 'rtl';
    document.body.dataset.locale = root.lang;
    render();
  }

  document.getElementById('productLang')?.addEventListener('click', toggleLanguage);
  render();
})();

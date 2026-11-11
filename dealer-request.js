(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const words = {
    ar: {
      nav:'للشركات والموزعين',eyebrow:'ROCK / BUSINESS',title:'توريد ROCK لأعمالك.',
      intro:'جهّز قائمة موديلاتك وكمياتها، ثم أنشئ طلب تسعير واحدًا لمراجعته ومشاركته.',
      point1:'تحديد دقيق برقم الموديل والباركود.',point2:'قائمة موحدة بالمنتجات والكميات من سلتك.',
      point3:'مراجعة السعر والتوفر وشروط التوريد قبل الاعتماد.',catalogLink:'العودة إلى الكتالوج ↗',
      formTitle:'بيانات المنشأة',company:'اسم المنشأة أو المتجر',contact:'مسؤول التواصل',
      phone:'رقم الجوال',city:'المدينة',volume:'حجم الطلب المتوقع',volumeChoose:'اختر تقديرًا',
      volumeTrial:'طلب تجريبي',volume50:'50–200 قطعة',volume200:'201–500 قطعة',
      volume500:'أكثر من 500 قطعة',volumeRecurring:'توريد دوري',needs:'الفئات أو الموديلات المطلوبة (اختياري)',
      prepare:'إنشاء طلب التسعير',privacy:'يُنشأ الطلب داخل المتصفح ولا يُرسل تلقائيًا. الأسعار المدرجة ليست عرض جملة معتمدًا؛ يلزم تأكيد سعر الجملة والتوفر وشروط التوريد.',
      preview:'معاينة طلب التسعير',share:'مشاركة الطلب',copy:'نسخ الطلب',requestTitle:'طلب تسعير تجاري من ROCK',
      companyKey:'المنشأة',contactKey:'مسؤول التواصل',phoneKey:'الجوال',cityKey:'المدينة',
      volumeKey:'حجم الطلب المتوقع',needsKey:'الاحتياجات',productsKey:'المنتجات المختارة',
      noProducts:'لم تُضف منتجات إلى السلة. أضف الموديلات المطلوبة أولًا أو اذكرها في خانة الاحتياجات.',
      volumeNotSet:'غير محدد',unit:'قطعة',listedSubtotal:'إجمالي الأسعار المدرجة',disclaimer:'الأسعار المدرجة استرشادية وليست عرض سعر جملة معتمدًا. يجب تأكيد السعر النهائي والتوفر والتوصيل وشروط التوريد.',
      copied:'تم نسخ طلب التسعير.',shared:'تم فتح مشاركة الطلب.',copyFailed:'تعذّر النسخ؛ حدّد النص وانسخه يدويًا.'
    },
    en: {
      nav:'For distributors',eyebrow:'ROCK / BUSINESS',title:'ROCK supply for your business.',
      intro:'Build a list of models and quantities, then prepare one quotation request to review and share.',
      point1:'Accurate product identification by model and barcode.',point2:'One itemized list from your current bag.',
      point3:'Review pricing, availability and supply terms before approval.',catalogLink:'Back to catalog',
      formTitle:'Business details',company:'Business or store name',contact:'Contact person',
      phone:'Mobile number',city:'City',volume:'Expected order volume',volumeChoose:'Choose an estimate',
      volumeTrial:'Initial trial order',volume50:'50–200 units',volume200:'201–500 units',
      volume500:'Over 500 units',volumeRecurring:'Recurring supply',needs:'Requested categories or models (optional)',
      prepare:'Prepare quotation request',privacy:'The request is created in your browser and is not sent automatically. Listed prices are not an approved wholesale quotation; wholesale pricing, availability and supply terms must be confirmed.',
      preview:'Quotation request preview',share:'Share request',copy:'Copy request',requestTitle:'ROCK business quotation request',
      companyKey:'Business',contactKey:'Contact person',phoneKey:'Mobile',cityKey:'City',
      volumeKey:'Expected order volume',needsKey:'Requested items',productsKey:'Selected products',
      noProducts:'No items are in your bag. Add the requested models first or list them in the needs field.',
      volumeNotSet:'Not specified',unit:'units',listedSubtotal:'Listed catalog subtotal',disclaimer:'Listed prices are indicative and are not a confirmed wholesale quotation. Final price, availability, delivery and supply terms must be confirmed.',
      copied:'Quotation request copied.',shared:'Share sheet opened.',copyFailed:'Could not copy; select and copy the text manually.'
    }
  };
  let lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
  const t = key => words[lang][key] || key;
  const money = value => {
    const amount = Number(value);
    return (Number.isInteger(amount) ? String(amount) : amount.toFixed(2)) + (lang === 'ar' ? ' ر.س' : ' SAR');
  };
  function applyLanguage() {
    lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
    document.querySelectorAll('[data-b2b]').forEach(node => { node.textContent = t(node.dataset.b2b); });
    const result = $('#dealerRequestResult');
    if (result) result.hidden = true;
  }
  function cartRows() {
    let cart = [];
    try {
      const value = JSON.parse(localStorage.getItem('rock-cart') || '[]');
      if (Array.isArray(value)) cart = value;
    } catch {}
    const products = Array.isArray(globalThis.ROCK_PRODUCTS) ? globalThis.ROCK_PRODUCTS : [];
    return cart.map(row => {
      const product = products.find(item => item && item.id === row.id);
      const qty = Number(row.qty);
      return product && Number.isSafeInteger(qty) && qty > 0 ? { product, qty: Math.min(qty, 99) } : null;
    }).filter(Boolean);
  }
  function buildRequest() {
    const form = $('#dealerRequestForm');
    const value = name => String(form.elements[name]?.value || '').trim();
    const rows = cartRows();
    const volume = $('#dealerVolume');
    const selectedVolume = volume.value ? volume.selectedOptions[0].textContent.trim() : t('volumeNotSet');
    let subtotal = 0;
    const lines = rows.map(({ product, qty }) => {
      const price = Number(product.price);
      const lineTotal = price * qty;
      subtotal += lineTotal;
      return [
        (lang === 'ar' ? product.nameAr : product.nameEn),
        'Model: ' + product.model,
        'Barcode: ' + (product.barcode || '—'),
        qty + ' ' + t('unit') + ' × ' + money(price) + ' = ' + money(lineTotal)
      ].join(' | ');
    });
    return [
      t('requestTitle'),'------------------------------',
      t('companyKey') + ': ' + value('company'),
      t('contactKey') + ': ' + (value('contact') || t('volumeNotSet')),
      t('phoneKey') + ': ' + value('phone'),
      t('cityKey') + ': ' + (value('city') || t('volumeNotSet')),
      t('volumeKey') + ': ' + selectedVolume,
      t('needsKey') + ': ' + (value('needs') || t('volumeNotSet')),
      '------------------------------',t('productsKey'),
      ...(lines.length ? lines : [t('noProducts')]),
      '------------------------------',
      t('listedSubtotal') + ': ' + money(subtotal),
      t('disclaimer')
    ].join('\n');
  }
  async function copyRequest() {
    const form = $('#dealerRequestForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const output = $('#dealerRequestText');
    output.value = buildRequest(); output.focus(); output.select();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(output.value);
        $('#dealerFeedback').textContent = t('copied'); return;
      }
    } catch {}
    try {
      $('#dealerFeedback').textContent = document.execCommand('copy') ? t('copied') : t('copyFailed');
    } catch { $('#dealerFeedback').textContent = t('copyFailed'); }
  }
  async function shareRequest() {
    const form = $('#dealerRequestForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const text = buildRequest(); $('#dealerRequestText').value = text;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('requestTitle'), text });
        $('#dealerFeedback').textContent = t('shared'); return;
      } catch (error) { if (error && error.name === 'AbortError') return; }
    }
    await copyRequest();
  }
  const form = $('#dealerRequestForm');
  if (!form) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    $('#dealerRequestText').value = buildRequest();
    $('#dealerRequestResult').hidden = false;
    $('#dealerRequestText').focus({ preventScroll: true });
    $('#dealerFeedback').textContent = '';
  });
  $('#dealerCopyRequest').addEventListener('click', copyRequest);
  $('#dealerShareRequest').addEventListener('click', shareRequest);
  const approved = new Set(Array.isArray(globalThis.ROCK_PRODUCT_IMAGE_QUALITY?.visibleIds) ? globalThis.ROCK_PRODUCT_IMAGE_QUALITY.visibleIds : []);
  const products = Array.isArray(globalThis.ROCK_PRODUCTS) ? globalThis.ROCK_PRODUCTS : [];
  document.querySelectorAll('.collection-card').forEach(card => {
    const target = card.querySelector('[data-collection-art]');
    const product = products.find(item => item.category === card.dataset.collection && approved.has(item.id));
    if (!target || !product || !/^assets\/products\/[a-z0-9-]+\.webp$/i.test(product.image || '')) return;
    const image = document.createElement('img');
    image.src = product.image; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async';
    image.setAttribute('aria-hidden', 'true');
    image.addEventListener('error', () => image.remove(), { once: true });
    target.appendChild(image);
  });
  applyLanguage();
  new MutationObserver(applyLanguage).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();

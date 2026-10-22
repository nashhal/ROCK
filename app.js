(async () => {
  const staticProducts = Array.isArray(globalThis.ROCK_PRODUCTS) ? globalThis.ROCK_PRODUCTS : [];
  let catalogProducts = staticProducts;
  let liveCatalog = false;
  // Hostinger can serve the PHP/MySQL catalog. GitHub Pages remains a static fallback.
  try {
    const response = await fetch(new URL('api/products.php', document.baseURI).toString(), {
      credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }
    });
    if (response.ok && (response.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
      const payload = await response.json();
      if (Array.isArray(payload.products)) {
        catalogProducts = payload.products;
        liveCatalog = true;
      }
    }
  } catch { /* Static storefront fallback is intentional. */ }
  const photoQuality = globalThis.ROCK_PRODUCT_IMAGE_QUALITY;
  const approvedPhotoIds = new Set(photoQuality && Array.isArray(photoQuality.visibleIds) ? photoQuality.visibleIds : []);
  const products = liveCatalog
    ? catalogProducts.filter(product => product && product.imageApproved === true && product.active !== false)
    : staticProducts.filter(product => approvedPhotoIds.has(product.id));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  function storageGet(key, fallback=''){ try { const value = localStorage.getItem(key); return value === null ? fallback : value; } catch { return fallback; } }
  function storageSet(key, value){ try { localStorage.setItem(key, value); return true; } catch { return false; } }
  const initialLang = storageGet('rock-lang', 'ar');
  const state = { lang: initialLang === 'en' ? 'en' : 'ar', cat: 'all', query: '', sort: 'featured', minPrice: '', maxPrice: '', cart: safeCart(), activeProduct: null, orderKey: '', orderSubmitted: false };
  let cartReturnFocus = null;
  let modalReturnFocus = null;

  const copy = {
    ar: {
      pageTitle:'ROCK | ملحقات تقنية للشحن والصوت والسيارة',
      openMenu:'فتح القائمة',search:'بحث',viewCart:'عرض السلة',closeAnnouncement:'إخفاء الشريط',shopProducts:'تصفح المنتجات',switchLanguage:'تغيير اللغة',
      powerLabel:'الشحن والطاقة',audioLabel:'الصوت والسماعات',driveLabel:'إكسسوارات السيارة',lifeLabel:'إكسسوارات يومية',
      brandTagline:'فجر جديد مع روك',closingTitle:'فجر جديد',closingAccent:'مع روك.',
      catAll:'الكل',catPower:'الطاقة والشحن',catAudio:'الصوت',catDrive:'السيارة',catLifestyle:'أسلوب الحياة',
      sortFeatured:'ترتيب المتجر',sortLow:'السعر: من الأقل للأعلى',sortHigh:'السعر: من الأعلى للأقل',sortName:'الاسم',
      resultsPrefix:'عدد النتائج:',priceRange:'نطاق السعر',minPrice:'من',maxPrice:'إلى',clearFilters:'مسح الفلاتر',sortBy:'ترتيب حسب',priceLabel:'السعر',modelLabel:'الموديل',modelMissing:'غير محدد',
      shopIntro:'ابحث باسم المنتج أو الموديل، وراجع السعر قبل الاختيار.',viewProduct:'عرض المنتج',quickView:'نظرة سريعة',addToBag:'أضف للسلة',details:'التفاصيل',photoPending:'صورة المنتج قيد التجهيز',outOfStock:'نفد المخزون',
      trustProductTitle:'ابدأ بالموديل',trustProductText:'أسماء الموديلات واضحة لتسهيل المقارنة.',
      trustPriceTitle:'السعر أمامك',trustPriceText:'الأسعار المدرجة بالريال السعودي.',
      trustOrderTitle:'راجع طلبك أولًا',trustOrderText:'أنشئ ملخص الطلب وراجعه قبل مشاركته.',
      storeInfo:'معلومات المتجر',customerNameLabel:'الاسم',customerPhoneLabel:'رقم الجوال',customerCityLabel:'المدينة',
      customerAddressLabel:'العنوان أو نقطة الاستلام',customerNotesLabel:'ملاحظات (اختياري)',orderSummaryLabel:'ملخص الطلب',
      orderPrivacy:'لن تُرسل بياناتك تلقائيًا. عند النسخ أو المشاركة ستتضمن الرسالة البيانات التي أدخلتها؛ راجع المحتوى واختر الجهة المستلمة بنفسك. لا يوجد دفع إلكتروني.',
      shippingNote:'الشحن والدفع غير محسوبين في هذا الملخص.',orderHeader:'طلب ROCK',customer:'العميل',phone:'الجوال',city:'المدينة',address:'العنوان/الاستلام',notes:'ملاحظات',copyFailed:'تعذّر النسخ. حدّد النص وانسخه يدويًا.',submitOrder:'تسجيل الطلب',orderReceived:'تم تسجيل طلبك مبدئيًا برقم:',orderSaved:'تم التسجيل',orderNotFinal:'لم يتم تأكيد الدفع أو التوصيل؛ سيتواصل المتجر لتأكيد التفاصيل.',orderPrivacyLive:'سيُرسل زر «تسجيل الطلب» بياناتك إلى قاعدة بيانات المتجر لاستلام الطلب. لا يوجد دفع إلكتروني، ويجب تأكيد التوفر والشحن والسعر النهائي.',
      announcement:'ROCK | فجر جديد مع روك',shop:'المتجر',collections:'التصنيفات',story:'عن ROCK',bag:'السلة',eyebrow:'إكسسوارات تقنية ليومك',hero1:'فجر جديد',hero2:'مع روك.',heroText:'تصفّح إكسسوارات ROCK للشحن والصوت والسيارة، وقارن الموديلات والأسعار في مكان واحد.',shopNow:'تصفّح المنتجات',featuredBtn:'استكشف الفئات',products:'منتجًا',categories:'فئات',currency:'بالريال السعودي',catalog:'الكتالوج',shopTitle:'اختر ما يناسبك من ROCK',filter:'تصفية',collectionsLabel:'المجموعات',collectionsTitle:'تصفّح حسب الفئة',collectionsNote:'من المكتب إلى الطريق',powerText:'الشحن والطاقة',audioText:'السماعات والصوت',driveText:'ملحقات للسيارة',lifeText:'إكسسوارات يومية',storyTitle:'اختيار أوضح. استخدام أسهل.',storyText:'نعرض موديل المنتج وسعره بوضوح، لتتمكن من المقارنة واختيار ما تحتاجه دون تعقيد.',backTop:'العودة للبداية ↗',clearCart:'تفريغ السلة',bagTitle:'سلتك',total:'مجموع المنتجات',productsSubtotal:'مجموع المنتجات قبل الشحن',checkout:'تجهيز الطلب',continue:'متابعة التسوق',addCart:'أضف إلى السلة',orderTitle:'طلبك جاهز',orderText:'راجع التفاصيل ثم انسخ الطلب لإرساله عبر القناة التي تستخدمها.',copyOrder:'نسخ تفاصيل الطلب',shareOrder:'مشاركة الطلب',shared:'تمت مشاركة تفاصيل الطلب',orderConfirmationLabel:'أؤكد أنني راجعت الملخص وأفهم أنه ليس طلبًا مؤكدًا، وأن السعر والتوفر والتوصيل تحتاج إلى تأكيد.',done:'تم',noResults:'لا توجد نتائج',noResultsSub:'جرّب كلمة بحث أو تصنيفًا آخر',added:'تمت الإضافة إلى السلة',cleared:'تم تفريغ السلة',copied:'تم نسخ تفاصيل الطلب',empty:'السلة فارغة',emptyCartText:'لا توجد منتجات في السلة بعد. أضف منتجًا للمتابعة.',increaseQty:'زيادة الكمية',decreaseQty:'تقليل الكمية',closeDialog:'إغلاق النافذة',navigationMenu:'قائمة التنقل',sar:'ر.س'
    },
    en: {
      pageTitle:'ROCK | Charging, audio and car accessories',
      openMenu:'Open menu',search:'Search',viewCart:'View cart',closeAnnouncement:'Dismiss announcement',shopProducts:'Browse products',switchLanguage:'Switch language',
      powerLabel:'POWER',audioLabel:'AUDIO',driveLabel:'CAR',lifeLabel:'EVERYDAY',
      brandTagline:'A new dawn with ROCK',closingTitle:'A new dawn',closingAccent:'with ROCK.',
      catAll:'All',catPower:'Power',catAudio:'Audio',catDrive:'Drive',catLifestyle:'Lifestyle',
      sortFeatured:'Store order',sortLow:'Price: low to high',sortHigh:'Price: high to low',sortName:'Name',
      resultsPrefix:'Results:',priceRange:'Price range',minPrice:'Min',maxPrice:'Max',clearFilters:'Clear filters',sortBy:'Sort by',priceLabel:'Price',modelLabel:'Model',modelMissing:'Not specified',
      shopIntro:'Search by product name or model, then review the listed price before choosing.',viewProduct:'View product',quickView:'Quick view',addToBag:'Add to bag',details:'Details',photoPending:'Product photo pending',outOfStock:'Out of stock',
      trustProductTitle:'Start with the model',trustProductText:'Clear model names make comparison easier.',
      trustPriceTitle:'Prices at a glance',trustPriceText:'Listed prices are shown in Saudi riyals.',
      trustOrderTitle:'Review your request',trustOrderText:'Prepare and review an order summary before sharing it.',
      storeInfo:'Store information',customerNameLabel:'Name',customerPhoneLabel:'Mobile number',customerCityLabel:'City',
      customerAddressLabel:'Address or pickup point',customerNotesLabel:'Notes (optional)',orderSummaryLabel:'Order summary',
      orderPrivacy:'Your details are not sent automatically. Copying or sharing includes the information you entered in the message; review its contents and choose the recipient yourself. No online payment is processed.',
      shippingNote:'Shipping and payment are not included in this summary.',orderHeader:'ROCK order request',customer:'Customer',phone:'Mobile',city:'City',address:'Address/pickup',notes:'Notes',copyFailed:'Could not copy. Select the text and copy it manually.',submitOrder:'Submit order request',orderReceived:'Your request was recorded with reference:',orderSaved:'Recorded',orderNotFinal:'Payment and delivery are not confirmed; the store must verify the details.',orderPrivacyLive:'Submit order sends your details to the store database. Online payment is not enabled; stock, shipping, and the final total still need confirmation.',
      announcement:'ROCK | A new dawn with ROCK',shop:'Shop',collections:'Collections',story:'About ROCK',bag:'Bag',eyebrow:'Everyday tech essentials',hero1:'A new dawn',hero2:'with ROCK.',heroText:'Explore ROCK charging, audio and car accessories. Compare model names and listed prices in one place.',shopNow:'Browse products',featuredBtn:'Explore categories',products:'products',categories:'categories',currency:'Saudi riyals',catalog:'catalog',shopTitle:'Find your ROCK essentials',filter:'Filter',collectionsLabel:'collections',collectionsTitle:'Browse by category',collectionsNote:'From desk to road',powerText:'Charging and power',audioText:'Audio accessories',driveText:'Car accessories',lifeText:'Everyday accessories',storyTitle:'Clear choices. Easier everyday use.',storyText:'Product model names and listed prices are presented clearly, so you can compare options and choose what you need without extra clutter.',backTop:'Back to top ↗',clearCart:'Clear bag',bagTitle:'Your bag',total:'Products subtotal',productsSubtotal:'Products subtotal (before shipping)',checkout:'Prepare order',continue:'Continue shopping',addCart:'Add to bag',orderTitle:'Your order is ready',orderText:'Review the details, then copy the order to send through your preferred channel.',copyOrder:'Copy order details',shareOrder:'Share order',shared:'Order details shared',orderConfirmationLabel:'I have reviewed this summary and understand it is not a confirmed order; price, availability and delivery must be confirmed.',done:'Done',noResults:'No results',noResultsSub:'Try another search or category.',added:'Added to bag',cleared:'Bag cleared',copied:'Order details copied',empty:'Your bag is empty',emptyCartText:'Your bag is empty for now. Add a product to continue.',increaseQty:'Increase quantity',decreaseQty:'Decrease quantity',closeDialog:'Close dialog',navigationMenu:'Navigation menu',sar:'SAR'
    }
  };

  function safeCart(){
    try {
      const raw = JSON.parse(localStorage.getItem('rock-cart') || '[]');
      if (!Array.isArray(raw)) return [];
      const validIds = new Set(products.map(p => p.id));
      return raw.filter(item => item && validIds.has(item.id) && Number.isSafeInteger(item.qty) && item.qty > 0)
        .map(item => ({ id: item.id, qty: Math.min(99, item.qty) }));
    } catch { return []; }
  }
  function t(k){return copy[state.lang][k] || k}
  function name(p){return state.lang==='ar'?p.nameAr:p.nameEn}
  function catLabel(c){return ({power:t('catPower'),audio:t('catAudio'),car:t('catDrive'),lifestyle:t('catLifestyle')})[c]||c}
  function money(v){const n=Number(v);const shown=Number.isInteger(n)?String(n):n.toFixed(2);return `${shown} ${t('sar')}`}

  function updateHeroProducts(){
    const preferredIds=['pods700','rkch765'];
    const featured=preferredIds.map(id=>products.find(product=>product.id===id)).filter(Boolean);
    for(const product of products){
      if(featured.length>=2)break;
      if(!featured.some(item=>item.id===product.id))featured.push(product);
    }
    const cards=$$('.hero-visual .visual-card');
    cards.forEach((card,index)=>{
      const product=featured[index];
      if(!product){card.hidden=true;return}
      const image=card.querySelector('img');
      const label=card.querySelector('span');
      if(image){image.src=safeImage(product.image);image.alt=name(product);image.loading='eager'}
      if(label)label.textContent=product.model&&product.model!=='—'?product.model:(product.barcode||'ROCK');
      card.hidden=false;
    });
    const visual=$('.hero-visual');
    if(visual)visual.hidden=featured.length===0;
    const categories=$('.hero-meta > div:nth-child(2) strong');
    if(categories)categories.textContent=String(new Set(products.map(product=>product.category)).size);
  }

  function applyLanguage(){
    document.title = t('pageTitle');
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (key === 'shopNow') {
        const textNode = [...el.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.nodeValue = t(key) + ' ';
        else el.prepend(document.createTextNode(t(key) + ' '));
      } else {
        el.textContent = t(key);
      }
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    $('#langBtn').textContent = state.lang === 'ar' ? 'EN' : 'AR';
    updateHeroProducts();
    $('#searchInput').placeholder = state.lang === 'ar' ? 'ابحث عن موديل أو منتج' : 'Search model or product';
    $('#searchInput').setAttribute('aria-label', state.lang === 'ar' ? 'ابحث باسم المنتج أو الموديل' : 'Search by product name or model');
    $('#sortSelect').setAttribute('aria-label', t('sortBy'));
    $('#minPrice').placeholder = state.lang === 'ar' ? 'من' : 'Min';
    $('#maxPrice').placeholder = state.lang === 'ar' ? 'إلى' : 'Max';
    $('#minPrice').setAttribute('aria-label', state.lang === 'ar' ? 'أقل سعر بالريال السعودي' : 'Minimum price in Saudi riyals');
    $('#maxPrice').setAttribute('aria-label', state.lang === 'ar' ? 'أعلى سعر بالريال السعودي' : 'Maximum price in Saudi riyals');
    updateOrderModeLabels();
    render();
    renderCart();
  }
  function updateOrderModeLabels(){
    const shareButton=$('#shareOrder');
    if(shareButton)shareButton.textContent=state.orderSubmitted?t('orderSaved'):(liveCatalog?t('submitOrder'):t('shareOrder'));
    const privacy=$('.order-privacy-note span');
    if(privacy)privacy.textContent=liveCatalog?t('orderPrivacyLive'):t('orderPrivacy');
  }
  function filtered(){
    const q=state.query.trim().toLowerCase();
    const min=state.minPrice===''?null:Number(state.minPrice);
    const max=state.maxPrice===''?null:Number(state.maxPrice);
    let arr=products.filter(p=>
      (state.cat==='all'||p.category===state.cat) &&
      (!q||`${p.model} ${p.barcode||''} ${p.nameAr} ${p.nameEn} ${p.descriptionEn||''}`.toLowerCase().includes(q)) &&
      (min===null||(Number.isFinite(min)&&p.price>=min)) &&
      (max===null||(Number.isFinite(max)&&p.price<=max))
    );
    if(state.sort==='low')arr.sort((a,b)=>a.price-b.price); else if(state.sort==='high')arr.sort((a,b)=>b.price-a.price); else if(state.sort==='name')arr.sort((a,b)=>name(a).localeCompare(name(b)));
    return arr;
  }
  function render(){
    const grid = $('#productGrid');
    const arr = filtered();
    grid.innerHTML = '';
    $('#emptyState').hidden = arr.length > 0;
    const summary=$('#resultsSummary');
    if(summary)summary.textContent=`${t('resultsPrefix')} ${arr.length}`;
    const clearButton=$('#clearFiltersBtn');
    if(clearButton)clearButton.disabled=state.cat==='all'&&!state.query.trim()&&state.sort==='featured'&&state.minPrice===''&&state.maxPrice==='';
    arr.forEach((p, i) => {
      const detailUrl = 'product.html?id=' + encodeURIComponent(p.id);
      const image = safeImage(p.image);
      const card = document.createElement('article');
      card.className = 'product-card';
      card.style.animationDelay = `${Math.min(i, 12) * 25}ms`;
      const modelText = p.model && p.model !== '—' ? p.model : t('modelMissing');
      const available = p.inStock !== false;
      card.innerHTML = `
        <a class="product-image product-image-link" href="${detailUrl}" aria-label="${esc(t('viewProduct'))}: ${esc(name(p))}">
          ${image ? `<img data-product-image loading="lazy" src="${esc(image)}" alt="${esc(name(p))}" width="480" height="360">` : `<span class="product-photo-placeholder" role="img" aria-label="${esc(t('photoPending'))}"><strong>ROCK</strong><small>${esc(t('photoPending'))}</small></span>`}
          <span class="product-tag">${esc(catLabel(p.category))}</span>
        </a>
        <div class="product-info">
          <div class="product-model-row"><span class="product-field-label">${esc(t('modelLabel'))}</span><span class="product-model" dir="ltr">${esc(modelText)}</span></div>
          <a class="product-title-link" href="${detailUrl}"><div class="product-name">${esc(name(p))}</div></a>
          <div class="product-price-row"><span class="price-label">${esc(t('priceLabel'))}</span><span class="price">${money(p.price)}</span></div>
          ${available ? '' : `<div class="stock-flag is-out">${esc(t('outOfStock'))}</div>`}
          <div class="product-actions">
            <button class="product-action-btn product-action-view" data-view="${esc(p.id)}" aria-label="${esc(t('quickView'))}: ${esc(name(p))}" title="${esc(t('quickView'))}"><span>${esc(t('quickView'))}</span><span aria-hidden="true">↗</span></button>
            <button class="product-action-btn product-action-add" data-add="${esc(p.id)}" ${available ? '' : 'disabled'} aria-label="${esc(available ? t('addToBag') : t('outOfStock'))}: ${esc(name(p))}" title="${esc(available ? t('addToBag') : t('outOfStock'))}"><span>${esc(available ? t('addToBag') : t('outOfStock'))}</span><span aria-hidden="true">＋</span></button>
          </div>
        </div>`;
      grid.appendChild(card);
      const cardImage = card.querySelector('[data-product-image]');
      if (cardImage) cardImage.addEventListener('error', () => {
        // A photo that cannot load is not a suitable listing image: remove its card.
        card.remove();
        const remaining = grid.querySelectorAll('.product-card').length;
        if (summary) summary.textContent = `${t('resultsPrefix')} ${remaining}`;
        const countNode = $('#heroProductCount');
        if (countNode) countNode.textContent = String(remaining);
        $('#emptyState').hidden = remaining > 0;
      }, { once: true });
    });
    grid.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => add(button.dataset.add)));
    grid.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => openProduct(button.dataset.view)));
  }
  function safeImage(path){
    return typeof path === 'string' && /^(?:assets|uploads)\/products\/[a-z0-9_-]+\.webp$/i.test(path)
      ? path : '';
  }
  function esc(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function add(id){
    const product = products.find(item => item.id === id);
    if (!product) return;
    if (product.inStock === false) { toast(t('outOfStock')); return; }
    const row = state.cart.find(item => item.id === id);
    if (row && row.qty >= 99) {
      toast(state.lang === 'ar' ? 'وصلت إلى الحد الأقصى للكمية' : 'Maximum quantity reached');
      return;
    }
    if (row) row.qty += 1;
    else state.cart.push({ id, qty: 1 });
    persist();
    renderCart();
    toast(t('added'));
    openCart();
  }
  function persist(){storageSet('rock-cart',JSON.stringify(state.cart));updateCount()}
  function updateCount(){const n=state.cart.reduce((s,i)=>s+i.qty,0);$('#cartCount').textContent=n}
  function renderCart(){
    updateCount();
    const wrap=$('#cartItems');
    if(!state.cart.length){
      wrap.innerHTML=`<div class="empty-state"><strong>${t('empty')}</strong><span>${t('emptyCartText')}</span></div>`;
      $('#cartTotal').textContent=money(0);
      $('#checkoutBtn').disabled=true;
      return;
    }

    $('#checkoutBtn').disabled=false;
    let total=0;
    wrap.innerHTML='';
    state.cart.forEach(item=>{
      const p=products.find(x=>x.id===item.id);
      if(!p)return;
      total+=p.price*item.qty;
      const row=document.createElement('div');
      row.className='cart-row';
      const cartImage=safeImage(p.image);
      const decreaseLabel=esc(t('decreaseQty')+' '+name(p));
      const increaseLabel=esc(t('increaseQty')+' '+name(p));
      row.innerHTML=`${cartImage ? `<img data-cart-image src="${esc(cartImage)}" alt="${esc(name(p))}" loading="lazy" width="76" height="76">` : '<span class="cart-image-placeholder" aria-hidden="true">ROCK</span>'}
        <div>
          <h4>${esc(name(p))}</h4>
          <p>${esc(p.model)} · ${money(p.price)}</p>
          <div class="qty">
            <button type="button" data-dec="${esc(p.id)}" aria-label="${decreaseLabel}">−</button>
            <span aria-live="polite" aria-atomic="true">${item.qty}</span>
            <button type="button" data-inc="${esc(p.id)}" aria-label="${increaseLabel}" ${item.qty>=99?'disabled':''}>+</button>
          </div>
        </div>
        <strong>${money(p.price*item.qty)}</strong>`;
      const cartImg=row.querySelector('[data-cart-image]');
      if(cartImg)cartImg.addEventListener('error',()=>{
        const placeholder=document.createElement('span');
        placeholder.className='cart-image-placeholder';
        placeholder.textContent='ROCK';
        cartImg.replaceWith(placeholder);
      },{once:true});
      wrap.appendChild(row);
    });
    wrap.querySelectorAll('[data-dec]').forEach(button=>button.onclick=()=>changeQty(button.dataset.dec,-1));
    wrap.querySelectorAll('[data-inc]').forEach(button=>button.onclick=()=>changeQty(button.dataset.inc,1));
    $('#cartTotal').textContent=money(total);
  }
  function changeQty(id,d){const row=state.cart.find(x=>x.id===id);if(!row)return;row.qty=Math.min(99,row.qty+d);if(row.qty<=0)state.cart=state.cart.filter(x=>x.id!==id);persist();renderCart()}
  function openCart(){
    const drawer=$('#cartDrawer');
    if(!drawer.classList.contains('open'))cartReturnFocus=document.activeElement;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden','false');
    $('#cartBtn').setAttribute('aria-expanded','true');
    $('#overlay').classList.add('show');
    document.body.classList.add('rock-dialog-open');
    $('#closeCart').focus({preventScroll:true});
  }
  function closeCart(restoreFocus=true){
    const drawer=$('#cartDrawer');
    const wasOpen=drawer.classList.contains('open');
    if(!wasOpen)return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden','true');
    $('#cartBtn').setAttribute('aria-expanded','false');
    if(!$$('.modal.show').length)$('#overlay').classList.remove('show');
    if(!$$('.modal.show').length)document.body.classList.remove('rock-dialog-open');
    const target=cartReturnFocus;
    cartReturnFocus=null;
    if(restoreFocus&&target&&target.isConnected&&typeof target.focus==='function')target.focus({preventScroll:true});
  }
  function openModal(id){
    const modal=$('#'+id);
    if(!modal)return;
    modalReturnFocus=document.activeElement;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    $('#overlay').classList.add('show');
    document.body.classList.add('rock-dialog-open');
    const closeButton=modal.querySelector('[data-close-modal]');
    if(closeButton)closeButton.focus({preventScroll:true});
  }
  function closeModals(restoreFocus=true){
    const opened=$$('.modal.show');
    if(!opened.length)return;
    const orderWasOpen=opened.some(modal=>modal.id==='checkoutModal');
    opened.forEach(modal=>{
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden','true');
    });
    if(!$('#cartDrawer').classList.contains('open')){
      $('#overlay').classList.remove('show');
      document.body.classList.remove('rock-dialog-open');
    }
    if(orderWasOpen){
      $('#orderDetailsForm').reset();
      $('#orderText').value='';
    }
    const target=modalReturnFocus;
    modalReturnFocus=null;
    if(restoreFocus&&target&&target.isConnected&&typeof target.focus==='function')target.focus({preventScroll:true});
  }
  function openProduct(id){
    const p=products.find(x=>x.id===id); if(!p)return; state.activeProduct=p;
    const modalImage=$('#modalImage'), image=safeImage(p.image), imageWrap=modalImage.parentElement;
    modalImage.hidden=!image; imageWrap.classList.toggle('image-pending',!image);
    imageWrap.dataset.placeholder=t('photoPending'); modalImage.alt=name(p);
    if(image){modalImage.src=image;modalImage.onerror=()=>{modalImage.hidden=true;imageWrap.classList.add('image-pending')};}
    else modalImage.removeAttribute('src');
    $('#modalModel').textContent=p.model;$('#modalName').textContent=name(p);$('#modalPrice').textContent=money(p.price);
    $('#modalAdd').disabled = p.inStock === false;
    $('#modalAdd').textContent = t(p.inStock === false ? 'outOfStock' : 'addToBag');
    openModal('productModal')
  }
  function checkout(){
    if(!state.cart.length) return;
    $('#orderDetailsForm').reset();
    state.orderKey = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') ? globalThis.crypto.randomUUID() : ('rock-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    state.orderSubmitted = false;
    $('#shareOrder').disabled = false;
    $('#copyOrder').disabled = false;
    updateOrderModeLabels();
    $('#orderText').value = buildOrderText(true);
    closeCart();
    openModal('checkoutModal');
    $('#customerName').focus();
  }
  $('#orderDetailsForm').addEventListener('input', event => {
    if(event.target.id !== 'orderText') $('#orderText').value = buildOrderText(true);
  });
  function buildOrderText(includeCustomer=true){
    let total = 0;
    const lines = state.cart.map(item => {
      const p = products.find(product => product.id === item.id);
      if (!p) return '';
      const lineTotal = p.price * item.qty;
      total += lineTotal;
      return `${name(p)} | ${p.model} | ${item.qty} × ${money(p.price)} = ${money(lineTotal)}`;
    }).filter(Boolean);
    const parts = [t('orderHeader'), ...lines, '----------------', `${t('productsSubtotal')}: ${money(total)}`, t('shippingNote')];
    if(includeCustomer){
      parts.push('----------------');
      parts.push(`${t('customer')}: ${$('#customerName').value.trim()}`);
      parts.push(`${t('phone')}: ${$('#customerPhone').value.trim()}`);
      parts.push(`${t('city')}: ${$('#customerCity').value.trim()}`);
      parts.push(`${t('address')}: ${$('#customerAddress').value.trim()}`);
      const note = $('#customerNotes').value.trim();
      if(note) parts.push(`${t('notes')}: ${note}`);
    }
    return parts.join('\n');
  }
  async function copyOrder(){
    const form = $('#orderDetailsForm');
    if(!form.checkValidity()){ form.reportValidity(); return; }
    $('#orderText').value = buildOrderText(true);
    $('#orderText').focus();
    $('#orderText').select();
    try {
      if(navigator.clipboard && window.isSecureContext){
        await navigator.clipboard.writeText($('#orderText').value);
        toast(t('copied'));
        return;
      }
    } catch {}
    try {
      if(document.execCommand('copy')) toast(t('copied'));
      else toast(t('copyFailed'));
    } catch { toast(t('copyFailed')); }
  }
  async function submitOrder(){
    const form=$('#orderDetailsForm');
    if(state.orderSubmitted)return;
    if(!form.checkValidity()){form.reportValidity();return;}
    if(!liveCatalog){toast(t('orderPrivacy'));return;}
    const button=$('#shareOrder');
    button.disabled=true;
    const formData=new FormData(form);
    const payload={
      customerName:String(formData.get('customerName')||''),
      customerPhone:String(formData.get('customerPhone')||''),
      customerCity:String(formData.get('customerCity')||''),
      customerAddress:String(formData.get('customerAddress')||''),
      customerNotes:String(formData.get('customerNotes')||''),
      website:String(formData.get('website')||''),
      confirmation:formData.get('orderConfirmation')==='on',
      idempotencyKey:state.orderKey,
      items:state.cart.map(item=>({id:item.id,qty:item.qty}))
    };
    try{
      const response=await fetch(new URL('api/orders.php',document.baseURI).toString(),{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json','Content-Type':'application/json','Idempotency-Key':state.orderKey},
        body:JSON.stringify(payload)
      });
      const type=(response.headers.get('content-type')||'').toLowerCase();
      const result=type.includes('application/json')?await response.json():{};
      if(!response.ok||result.ok!==true)throw new Error(result.error||'تعذر تسجيل الطلب؛ لم يتم تأكيد استلامه.');
      state.orderSubmitted=true;
      state.cart=[];
      persist();
      renderCart();
      $('#orderText').value=[t('orderReceived')+' '+result.orderNumber,t('orderNotFinal'),t('productsSubtotal')+': '+money(result.subtotal)].join('\n');
      button.disabled=true;
      $('#copyOrder').disabled=false;
      updateOrderModeLabels();
      toast(t('orderReceived')+' '+result.orderNumber);
    }catch(error){
      button.disabled=false;
      toast(error && error.message ? error.message : 'تعذر تسجيل الطلب؛ لم يتم تأكيد استلامه.');
    }
  }
  async function shareOrder(){
    const form = $('#orderDetailsForm');
    if(liveCatalog){await submitOrder();return;}
    if(!form.checkValidity()){ form.reportValidity(); return; }
    const text = buildOrderText(true);
    $('#orderText').value = text;
    if(typeof navigator.share === 'function'){
      try {
        await navigator.share({title:t('orderHeader'),text});
        toast(t('shared'));
        return;
      } catch(error) {
        if(error && error.name === 'AbortError') return;
      }
    }
    await copyOrder();
  }
  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(window.__rockToast);window.__rockToast=setTimeout(()=>el.classList.remove('show'),1800)}

  $('#langBtn').onclick=()=>{state.lang=state.lang==='ar'?'en':'ar';storageSet('rock-lang',state.lang);applyLanguage()};
  $('#cartBtn').onclick=openCart;$('#closeCart').onclick=closeCart;$('#continueBtn').onclick=closeCart;$('#overlay').onclick=()=>{closeCart();closeModals()};
  $('#searchBtn').onclick=()=>{$('#searchInput').focus();document.querySelector('#shop').scrollIntoView({behavior:'smooth'})};
  $('#filtersBtn').onclick=()=>$('#shopToolbar').classList.toggle('open');
  $('#searchInput').oninput=e=>{state.query=e.target.value;render()};$('#sortSelect').onchange=e=>{state.sort=e.target.value;render()};
  $('#minPrice').oninput=e=>{state.minPrice=e.target.value;render()};
  $('#maxPrice').oninput=e=>{state.maxPrice=e.target.value;render()};
  $('#clearFiltersBtn').onclick=()=>{
    state.cat='all';state.query='';state.sort='featured';state.minPrice='';state.maxPrice='';
    $('#searchInput').value='';$('#sortSelect').value='featured';$('#minPrice').value='';$('#maxPrice').value='';
    $$('#categoryChips .chip').forEach(x=>x.classList.toggle('active',x.dataset.cat==='all'));
    render();
  };
  $('#categoryChips').querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{$$('#categoryChips .chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.cat=b.dataset.cat;render()});
  $$('.collection-card').forEach(b=>b.onclick=()=>{state.cat=b.dataset.collection;$$('#categoryChips .chip').forEach(x=>x.classList.toggle('active',x.dataset.cat===state.cat));document.querySelector('#shop').scrollIntoView({behavior:'smooth'});render()});
  $('#viewFeatured').onclick=()=>document.querySelector('#collections').scrollIntoView({behavior:'smooth'});
  $('#closingShop').onclick=()=>document.querySelector('#shop').scrollIntoView({behavior:'smooth'});
  const scrollTopButton=$('#scrollTopBtn');
  if(scrollTopButton)scrollTopButton.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
  const clearCartButton=$('#clearCartBtn');
  if(clearCartButton)clearCartButton.onclick=()=>{state.cart=[];persist();renderCart();toast(t('cleared'))};
  $('#checkoutBtn').onclick=checkout;$('#copyOrder').onclick=copyOrder;$('#shareOrder').onclick=shareOrder;$('#doneOrder').onclick=()=>{closeModals();$('#orderDetailsForm').reset();$('#orderText').value='';state.orderKey='';state.orderSubmitted=false;updateOrderModeLabels()};$('#modalAdd').onclick=()=>{if(state.activeProduct)add(state.activeProduct.id);closeModals()};
  $$('[data-close-modal]').forEach(b=>b.onclick=closeModals);
  $('#menuBtn').onclick=()=>{
    const expanded=$('#mobilePanel').classList.toggle('open');
    $('#menuBtn').setAttribute('aria-expanded',String(expanded));
    $('#mobilePanel').setAttribute('aria-hidden',String(!expanded));
  };
  document.querySelectorAll('[data-mobile-link]').forEach(a=>a.onclick=()=>{
    $('#mobilePanel').classList.remove('open');
    $('#mobilePanel').setAttribute('aria-hidden','true');
    $('#menuBtn').setAttribute('aria-expanded','false');
  });
  $('.announcement-close').onclick=()=>$('.announcement').remove();$('#year').textContent=new Date().getFullYear();const productCountNode=$('#heroProductCount');if(productCountNode)productCountNode.textContent=String(products.length);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      closeCart();
      closeModals();
      $('#mobilePanel').classList.remove('open');
      $('#mobilePanel').setAttribute('aria-hidden','true');
      $('#menuBtn').setAttribute('aria-expanded','false');
      return;
    }
    if(e.key==='Tab'){
      const activeDialog = $('#checkoutModal').classList.contains('show') ? $('#checkoutModal') :
        ($('#productModal').classList.contains('show') ? $('#productModal') :
        ($('#cartDrawer').classList.contains('open') ? $('#cartDrawer') : null));
      if(!activeDialog) return;
      const nodes = [...activeDialog.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')].filter(el=>el.offsetParent!==null);
      if(!nodes.length) return;
      const first=nodes[0], last=nodes[nodes.length-1];
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    }
  });

  window.addEventListener('rock:assistant-add', event => {
    const detail = event.detail;
    if (!detail || typeof detail.respond !== 'function') return;
    const product = products.find(item => item.id === detail.id);
    if (!product || product.inStock === false) {
      detail.respond(false);
      if (product) toast(t('outOfStock'));
      return;
    }
    const nextCart = state.cart.map(item => ({ id: item.id, qty: item.qty }));
    const row = nextCart.find(item => item.id === product.id);
    if (row && row.qty >= 99) { detail.respond(false); toast(state.lang === 'ar' ? 'وصلت للحد الأقصى للكمية' : 'Maximum quantity reached'); return; }
    if (row) row.qty += 1; else nextCart.push({ id: product.id, qty: 1 });
    if (!storageSet('rock-cart', JSON.stringify(nextCart))) { detail.respond(false); return; }
    state.cart = nextCart;
    renderCart();
    toast(t('added'));
    openCart();
    detail.respond(true);
  });

  applyLanguage();
  const params = new URLSearchParams(window.location.search);
  if(params.get('cart') === '1'){ openCart(); window.history.replaceState({}, '', window.location.pathname + window.location.hash); }
})();

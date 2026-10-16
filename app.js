(() => {
  const products = Array.isArray(globalThis.ROCK_PRODUCTS) ? globalThis.ROCK_PRODUCTS : [];
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  function storageGet(key, fallback=''){ try { const value = localStorage.getItem(key); return value === null ? fallback : value; } catch { return fallback; } }
  function storageSet(key, value){ try { localStorage.setItem(key, value); return true; } catch { return false; } }
  const initialLang = storageGet('rock-lang', 'ar');
  const state = { lang: initialLang === 'en' ? 'en' : 'ar', cat: 'all', query: '', sort: 'featured', cart: safeCart(), activeProduct: null };

  const copy = {
    ar: {
      catAll:'الكل',catPower:'الطاقة والشحن',catAudio:'الصوت',catDrive:'السيارة',catLifestyle:'أسلوب الحياة',
      sortFeatured:'ترتيب المتجر',sortLow:'السعر: من الأقل للأعلى',sortHigh:'السعر: من الأعلى للأقل',sortName:'الاسم',
      viewProduct:'عرض المنتج',quickView:'نظرة سريعة',addToBag:'إضافة إلى السلة',details:'التفاصيل',
      trustProductTitle:'كتالوج حسب الموديل',trustProductText:'تعرّف على موديل ROCK قبل الاختيار.',
      trustPriceTitle:'أسعار واضحة',trustPriceText:'تصفّح الأسعار المعروضة بالريال السعودي.',
      trustOrderTitle:'راجع قبل الإرسال',trustOrderText:'جهّز ملخص الطلب لمراجعته ونسخه.',
      storeInfo:'معلومات المتجر',customerNameLabel:'الاسم',customerPhoneLabel:'رقم الجوال',customerCityLabel:'المدينة',
      customerAddressLabel:'العنوان أو نقطة الاستلام',customerNotesLabel:'ملاحظات (اختياري)',orderSummaryLabel:'ملخص الطلب',
      orderPrivacy:'لا يوجد دفع إلكتروني أو إرسال تلقائي في هذه النسخة. لا تدخل بيانات البطاقة البنكية.',
      orderHeader:'طلب ROCK',customer:'العميل',phone:'الجوال',city:'المدينة',address:'العنوان/الاستلام',notes:'ملاحظات',copyFailed:'تعذّر النسخ. حدّد النص وانسخه يدويًا.',
      announcement:'تقنية يومية بتفاصيل محسوبة',shop:'المتجر',collections:'التصنيفات',story:'عن ROCK',bag:'السلة',eyebrow:'مصمم للاستخدام اليومي',hero1:'أقل ضجيجًا.',hero2:'أكثر ROCK.',heroText:'شحن وصوت وحلول للسيارة وأدوات للحياة اليومية، مختارة في تجربة شراء واحدة واضحة.',shopNow:'تسوق الآن',featuredBtn:'استكشف المختارات',products:'منتجًا',categories:'فئات',currency:'أسعار واضحة',catalog:'الكتالوج',shopTitle:'منتجات للاستخدام الحقيقي',filter:'تصفية',collectionsLabel:'المجموعات',collectionsTitle:'اختر حسب يومك',collectionsNote:'من المكتب إلى الطريق',powerText:'طاقة وشحن',audioText:'صوتك في كل مكان',driveText:'حلول للسيارة',lifeText:'تفاصيل يومية',storyTitle:'تقنية واضحة. حضور مختلف.',storyText:'ROCK ليست مجموعة من الأجهزة المتشابهة. هي طريقة أبسط لاختيار ما تحتاجه: موديل واضح، سعر واضح، وصورة المنتج الحقيقي أمامك.',backTop:'العودة للبداية ↗',clearCart:'تفريغ السلة',bagTitle:'سلتك',total:'الإجمالي',checkout:'تجهيز الطلب',continue:'متابعة التسوق',addCart:'أضف إلى السلة',orderTitle:'طلبك جاهز',orderText:'راجع التفاصيل ثم انسخ الطلب لإرساله عبر القناة التي تستخدمها.',copyOrder:'نسخ تفاصيل الطلب',done:'تم',noResults:'لا توجد نتائج',noResultsSub:'جرّب كلمة بحث أو تصنيفًا آخر',added:'تمت الإضافة إلى السلة',cleared:'تم تفريغ السلة',copied:'تم نسخ تفاصيل الطلب',empty:'السلة فارغة',sar:'ر.س'
    },
    en: {
      catAll:'All',catPower:'Power',catAudio:'Audio',catDrive:'Drive',catLifestyle:'Lifestyle',
      sortFeatured:'Store order',sortLow:'Price: low to high',sortHigh:'Price: high to low',sortName:'Name',
      viewProduct:'View product',quickView:'Quick view',addToBag:'Add to bag',details:'Details',
      trustProductTitle:'Model-first catalog',trustProductText:'Identify the ROCK model before choosing.',
      trustPriceTitle:'Clear listed prices',trustPriceText:'Browse prices shown in Saudi riyals.',
      trustOrderTitle:'Review before sharing',trustOrderText:'Prepare an order summary to review and copy.',
      storeInfo:'Store information',customerNameLabel:'Name',customerPhoneLabel:'Mobile number',customerCityLabel:'City',
      customerAddressLabel:'Address or pickup point',customerNotesLabel:'Notes (optional)',orderSummaryLabel:'Order summary',
      orderPrivacy:'This version has no online payment or automatic order submission. Do not enter bank card details.',
      orderHeader:'ROCK order request',customer:'Customer',phone:'Mobile',city:'City',address:'Address/pickup',notes:'Notes',copyFailed:'Could not copy. Select the text and copy it manually.',
      announcement:'Everyday technology, considered.',shop:'Shop',collections:'Collections',story:'About ROCK',bag:'Bag',eyebrow:'Built for everyday use',hero1:'Less noise.',hero2:'More ROCK.',heroText:'Power, audio, drive and everyday essentials brought together in one clear shopping experience.',shopNow:'Shop now',featuredBtn:'Explore picks',products:'products',categories:'categories',currency:'clear pricing',catalog:'catalog',shopTitle:'Made for real life',filter:'Filter',collectionsLabel:'collections',collectionsTitle:'Choose your everyday',collectionsNote:'From desk to road',powerText:'Power & charging',audioText:'Sound everywhere',driveText:'For the road',lifeText:'Everyday details',storyTitle:'Clear tech. Distinct presence.',storyText:'ROCK is not a shelf of interchangeable gadgets. It is a simpler way to choose what fits: clear model, clear price, real product imagery.',backTop:'Back to top ↗',clearCart:'Clear bag',bagTitle:'Your bag',total:'Total',checkout:'Prepare order',continue:'Continue shopping',addCart:'Add to bag',orderTitle:'Your order is ready',orderText:'Review the details, then copy the order to send through your preferred channel.',copyOrder:'Copy order details',done:'Done',noResults:'No results',noResultsSub:'Try another search or category.',added:'Added to bag',cleared:'Bag cleared',copied:'Order details copied',empty:'Your bag is empty',sar:'SAR'
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

  function applyLanguage(){
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (key === 'shopNow') {
        const textNode = [...el.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) textNode.nodeValue = t(key) + ' ';
        else el.prepend(document.createTextNode(t(key) + ' '));
      } else {
        el.textContent = t(key);
      }
    });
    $('#langBtn').textContent = state.lang === 'ar' ? 'EN' : 'AR';
    $('#searchInput').placeholder = state.lang === 'ar' ? 'ابحث عن موديل أو منتج' : 'Search model or product';
    render();
    renderCart();
  }
  function filtered(){
    const q=state.query.trim().toLowerCase();
    let arr=products.filter(p=>(state.cat==='all'||p.category===state.cat)&&(!q||`${p.model} ${p.barcode||''} ${p.nameAr} ${p.nameEn} ${p.descriptionEn||''}`.toLowerCase().includes(q)));
    if(state.sort==='low')arr.sort((a,b)=>a.price-b.price); else if(state.sort==='high')arr.sort((a,b)=>b.price-a.price); else if(state.sort==='name')arr.sort((a,b)=>name(a).localeCompare(name(b)));
    return arr;
  }
  function render(){
    const grid = $('#productGrid');
    const arr = filtered();
    grid.innerHTML = '';
    $('#emptyState').hidden = arr.length > 0;
    arr.forEach((p, i) => {
      const detailUrl = 'product.html?id=' + encodeURIComponent(p.id);
      const image = safeImage(p.image);
      const card = document.createElement('article');
      card.className = 'product-card';
      card.style.animationDelay = `${Math.min(i, 12) * 25}ms`;
      card.innerHTML = `
        <a class="product-image product-image-link" href="${detailUrl}" aria-label="${esc(t('viewProduct'))}: ${esc(name(p))}">
          <img loading="lazy" src="${esc(image)}" alt="${esc(name(p))}" width="480" height="480">
          <span class="product-tag">${esc(catLabel(p.category))}</span>
        </a>
        <div class="product-info">
          <div class="product-model">${esc(p.model)}</div>
          <a class="product-title-link" href="${detailUrl}"><div class="product-name">${esc(name(p))}</div></a>
          <div class="product-bottom">
            <span class="price">${money(p.price)}</span>
            <div class="product-actions">
              <button class="mini-btn" data-view="${esc(p.id)}" aria-label="${esc(t('quickView'))}" title="${esc(t('quickView'))}">i</button>
              <button class="mini-btn primary" data-add="${esc(p.id)}" aria-label="${esc(t('addToBag'))}" title="${esc(t('addToBag'))}">＋</button>
            </div>
          </div>
          <a class="product-detail-link" href="${detailUrl}">${esc(t('details'))} <span aria-hidden="true">↗</span></a>
        </div>`;
      grid.appendChild(card);
    });
    grid.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => add(button.dataset.add)));
    grid.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => openProduct(button.dataset.view)));
  }
  function safeImage(path){
    return typeof path === 'string' && /^assets\/products\/[a-z0-9-]+\.webp$/i.test(path)
      ? path : 'assets/brand/rock-logo.svg';
  }
  function esc(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function add(id){
    const row=state.cart.find(x=>x.id===id); if(row)row.qty++; else state.cart.push({id,qty:1}); persist(); renderCart(); toast(t('added')); openCart();
  }
  function persist(){storageSet('rock-cart',JSON.stringify(state.cart));updateCount()}
  function updateCount(){const n=state.cart.reduce((s,i)=>s+i.qty,0);$('#cartCount').textContent=n}
  function renderCart(){
    updateCount(); const wrap=$('#cartItems');
    if(!state.cart.length){wrap.innerHTML=`<div class="empty-state"><strong>${t('empty')}</strong><span>${t('noResultsSub')}</span></div>`;$('#cartTotal').textContent=money(0);$('#checkoutBtn').disabled=true;return}
    $('#checkoutBtn').disabled=false; let total=0; wrap.innerHTML='';
    state.cart.forEach(item=>{const p=products.find(x=>x.id===item.id);if(!p)return; total+=p.price*item.qty; const row=document.createElement('div');row.className='cart-row';row.innerHTML=`<img src="${p.image}" alt="${esc(name(p))}"><div><h4>${esc(name(p))}</h4><p>${esc(p.model)} · ${money(p.price)}</p><div class="qty"><button data-dec="${p.id}">−</button><span>${item.qty}</span><button data-inc="${p.id}">+</button></div></div><strong>${money(p.price*item.qty)}</strong>`;wrap.appendChild(row)});
    wrap.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>changeQty(b.dataset.dec,-1));wrap.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>changeQty(b.dataset.inc,1));$('#cartTotal').textContent=money(total);
  }
  function changeQty(id,d){const row=state.cart.find(x=>x.id===id);if(!row)return;row.qty=Math.min(99,row.qty+d);if(row.qty<=0)state.cart=state.cart.filter(x=>x.id!==id);persist();renderCart()}
  function openCart(){ $('#cartDrawer').classList.add('open');$('#overlay').classList.add('show'); }
  function closeCart(){ $('#cartDrawer').classList.remove('open');$('#overlay').classList.remove('show'); }
  function openModal(id){$('#'+id).classList.add('show');$('#overlay').classList.add('show')}
  function closeModals(){
    const orderWasOpen = $('#checkoutModal').classList.contains('show');
    $('.modal').forEach(modal=>modal.classList.remove('show'));
    $('#overlay').classList.remove('show');
    if(orderWasOpen){
      $('#orderDetailsForm').reset();
      $('#orderText').value='';
    }
  }
  function openProduct(id){const p=products.find(x=>x.id===id);if(!p)return;state.activeProduct=p;$('#modalImage').src=p.image;$('#modalImage').alt=name(p);$('#modalModel').textContent=p.model;$('#modalName').textContent=name(p);$('#modalPrice').textContent=money(p.price);openModal('productModal')}
  function checkout(){
    if(!state.cart.length) return;
    $('#orderDetailsForm').reset();
    $('#orderText').value = buildOrderText(false);
    closeCart();
    openModal('checkoutModal');
    $('#customerName').focus();
  }
  function buildOrderText(includeCustomer=true){
    let total = 0;
    const lines = state.cart.map(item => {
      const p = products.find(product => product.id === item.id);
      if (!p) return '';
      const lineTotal = p.price * item.qty;
      total += lineTotal;
      return `${name(p)} | ${p.model} | ${item.qty} × ${money(p.price)} = ${money(lineTotal)}`;
    }).filter(Boolean);
    const parts = [t('orderHeader'), ...lines, '----------------', `${t('total')}: ${money(total)}`];
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
  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(window.__rockToast);window.__rockToast=setTimeout(()=>el.classList.remove('show'),1800)}

  $('#langBtn').onclick=()=>{state.lang=state.lang==='ar'?'en':'ar';storageSet('rock-lang',state.lang);applyLanguage()};
  $('#cartBtn').onclick=openCart;$('#closeCart').onclick=closeCart;$('#continueBtn').onclick=closeCart;$('#overlay').onclick=()=>{closeCart();closeModals()};
  $('#searchBtn').onclick=()=>{$('#searchInput').focus();document.querySelector('#shop').scrollIntoView({behavior:'smooth'})};
  $('#filtersBtn').onclick=()=>$('#shopToolbar').classList.toggle('open');
  $('#searchInput').oninput=e=>{state.query=e.target.value;render()};$('#sortSelect').onchange=e=>{state.sort=e.target.value;render()};
  $('#categoryChips').querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{$$('#categoryChips .chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.cat=b.dataset.cat;render()});
  $$('.collection-card').forEach(b=>b.onclick=()=>{state.cat=b.dataset.collection;$$('#categoryChips .chip').forEach(x=>x.classList.toggle('active',x.dataset.cat===state.cat));document.querySelector('#shop').scrollIntoView({behavior:'smooth'});render()});
  $('#viewFeatured').onclick=()=>{state.sort='featured';$('#sortSelect').value='featured';document.querySelector('#shop').scrollIntoView({behavior:'smooth'});render()};
  $('#closingShop').onclick=()=>document.querySelector('#shop').scrollIntoView({behavior:'smooth'});
  $('#scrollTopBtn').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
  $('#clearCartBtn').onclick=()=>{state.cart=[];persist();renderCart();toast(t('cleared'))};
  $('#checkoutBtn').onclick=checkout;$('#copyOrder').onclick=copyOrder;$('#doneOrder').onclick=()=>{closeModals();$('#orderDetailsForm').reset();$('#orderText').value=''};$('#modalAdd').onclick=()=>{if(state.activeProduct)add(state.activeProduct.id);closeModals()};
  $$('[data-close-modal]').forEach(b=>b.onclick=closeModals);
  $('#menuBtn').onclick=()=>$('#mobilePanel').classList.toggle('open');$$('[data-mobile-link]').forEach(a=>a.onclick=()=>$('#mobilePanel').classList.remove('open'));
  $('.announcement-close').onclick=()=>$('.announcement').remove();$('#year').textContent=new Date().getFullYear();const productCountNode=$('#heroProductCount');if(productCountNode)productCountNode.textContent=String(products.length);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeCart();closeModals();$('#mobilePanel').classList.remove('open');return;}
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

  applyLanguage();
  const params = new URLSearchParams(window.location.search);
  if(params.get('cart') === '1'){ openCart(); window.history.replaceState({}, '', window.location.pathname + window.location.hash); }
})();

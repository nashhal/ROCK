(() => {
  const products = Array.isArray(globalThis.ROCK_PRODUCTS) ? globalThis.ROCK_PRODUCTS : [];
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const state = { lang: localStorage.getItem('rock-lang') || 'ar', cat: 'all', query: '', sort: 'featured', cart: safeCart(), activeProduct: null };

  const copy = {
    ar: {
      announcement:'تقنية يومية بتفاصيل محسوبة',shop:'المتجر',collections:'التصنيفات',story:'عن ROCK',bag:'السلة',eyebrow:'مصمم للاستخدام اليومي',hero1:'أقل ضجيجًا.',hero2:'أكثر ROCK.',heroText:'شحن وصوت وحلول للسيارة وأدوات للحياة اليومية، مختارة في تجربة شراء واحدة واضحة.',shopNow:'تسوق الآن',featuredBtn:'استكشف المختارات',products:'منتجًا',categories:'فئات',currency:'أسعار واضحة',catalog:'الكتالوج',shopTitle:'منتجات للاستخدام الحقيقي',filter:'تصفية',collectionsLabel:'المجموعات',collectionsTitle:'اختر حسب يومك',collectionsNote:'من المكتب إلى الطريق',powerText:'طاقة وشحن',audioText:'صوتك في كل مكان',driveText:'حلول للسيارة',lifeText:'تفاصيل يومية',storyTitle:'تقنية واضحة. حضور مختلف.',storyText:'ROCK ليست مجموعة من الأجهزة المتشابهة. هي طريقة أبسط لاختيار ما تحتاجه: موديل واضح، سعر واضح، وصورة المنتج الحقيقي أمامك.',backTop:'العودة للبداية ↗',clearCart:'تفريغ السلة',bagTitle:'سلتك',total:'الإجمالي',checkout:'تجهيز الطلب',continue:'متابعة التسوق',addCart:'أضف إلى السلة',orderTitle:'طلبك جاهز',orderText:'راجع التفاصيل ثم انسخ الطلب لإرساله عبر القناة التي تستخدمها.',copyOrder:'نسخ تفاصيل الطلب',done:'تم',noResults:'لا توجد نتائج',noResultsSub:'جرّب كلمة بحث أو تصنيفًا آخر',added:'تمت الإضافة إلى السلة',cleared:'تم تفريغ السلة',copied:'تم نسخ تفاصيل الطلب',empty:'السلة فارغة',sar:'ر.س'
    },
    en: {
      announcement:'Everyday technology, considered.',shop:'Shop',collections:'Collections',story:'About ROCK',bag:'Bag',eyebrow:'Built for everyday use',hero1:'Less noise.',hero2:'More ROCK.',heroText:'Power, audio, drive and everyday essentials brought together in one clear shopping experience.',shopNow:'Shop now',featuredBtn:'Explore picks',products:'products',categories:'categories',currency:'clear pricing',catalog:'catalog',shopTitle:'Made for real life',filter:'Filter',collectionsLabel:'collections',collectionsTitle:'Choose your everyday',collectionsNote:'From desk to road',powerText:'Power & charging',audioText:'Sound everywhere',driveText:'For the road',lifeText:'Everyday details',storyTitle:'Clear tech. Distinct presence.',storyText:'ROCK is not a shelf of interchangeable gadgets. It is a simpler way to choose what fits: clear model, clear price, real product imagery.',backTop:'Back to top ↗',clearCart:'Clear bag',bagTitle:'Your bag',total:'Total',checkout:'Prepare order',continue:'Continue shopping',addCart:'Add to bag',orderTitle:'Your order is ready',orderText:'Review the details, then copy the order to send through your preferred channel.',copyOrder:'Copy order details',done:'Done',noResults:'No results',noResultsSub:'Try another search or category.',added:'Added to bag',cleared:'Bag cleared',copied:'Order details copied',empty:'Your bag is empty',sar:'SAR'
    }
  };

  function safeCart(){ try{const x=JSON.parse(localStorage.getItem('rock-cart')||'[]');return Array.isArray(x)?x.filter(i=>i&&i.id&&Number.isFinite(i.qty)&&i.qty>0):[]}catch{return []} }
  function t(k){return copy[state.lang][k] || k}
  function name(p){return state.lang==='ar'?p.nameAr:p.nameEn}
  function catLabel(c){return ({power:'POWER',audio:'AUDIO',car:'DRIVE',lifestyle:'LIFESTYLE'})[c]||c}
  function money(v){return `${Number(v).toFixed(0)} ${t('sar')}`}

  function applyLanguage(){
    document.documentElement.lang=state.lang; document.documentElement.dir=state.lang==='ar'?'rtl':'ltr';
    $$('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
    $('#langBtn').textContent=state.lang==='ar'?'EN':'AR';
    $('#searchInput').placeholder=state.lang==='ar'?'ابحث عن موديل أو منتج':'Search model or product';
    $$('.mobile-panel a').forEach((a,i)=>a.textContent=[t('shop'),t('collections'),t('story')][i]);
    render(); renderCart();
  }
  function filtered(){
    const q=state.query.trim().toLowerCase();
    let arr=products.filter(p=>(state.cat==='all'||p.category===state.cat)&&(!q||`${p.model} ${p.nameAr} ${p.nameEn}`.toLowerCase().includes(q)));
    if(state.sort==='low')arr.sort((a,b)=>a.price-b.price); else if(state.sort==='high')arr.sort((a,b)=>b.price-a.price); else if(state.sort==='name')arr.sort((a,b)=>name(a).localeCompare(name(b)));
    return arr;
  }
  function render(){
    const grid=$('#productGrid'), arr=filtered(); grid.innerHTML=''; $('#emptyState').hidden=arr.length>0;
    arr.forEach((p,i)=>{
      const card=document.createElement('article'); card.className='product-card'; card.style.animationDelay=`${Math.min(i,12)*25}ms`;
      card.innerHTML=`<div class="product-image"><img loading="lazy" src="${p.image}" alt="${esc(name(p))}"><span class="product-tag">${catLabel(p.category)}</span></div><div class="product-info"><div class="product-model">${esc(p.model)}</div><div class="product-name">${esc(name(p))}</div><div class="product-bottom"><span class="price">${money(p.price)}</span><div class="product-actions"><button class="mini-btn" data-view="${p.id}" aria-label="View">＋</button><button class="mini-btn primary" data-add="${p.id}" aria-label="Add">↗</button></div></div></div>`;
      grid.appendChild(card);
    });
    grid.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>add(b.dataset.add)));
    grid.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>openProduct(b.dataset.view)));
  }
  function esc(v){return String(v).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&#92;','"':'&quot;'}[m]))}
  function add(id){
    const row=state.cart.find(x=>x.id===id); if(row)row.qty++; else state.cart.push({id,qty:1}); persist(); renderCart(); toast(t('added')); openCart();
  }
  function persist(){localStorage.setItem('rock-cart',JSON.stringify(state.cart));updateCount()}
  function updateCount(){const n=state.cart.reduce((s,i)=>s+i.qty,0);$('#cartCount').textContent=n}
  function renderCart(){
    updateCount(); const wrap=$('#cartItems');
    if(!state.cart.length){wrap.innerHTML=`<div class="empty-state"><strong>${t('empty')}</strong><span>${t('noResultsSub')}</span></div>`;$('#cartTotal').textContent=money(0);$('#checkoutBtn').disabled=true;return}
    $('#checkoutBtn').disabled=false; let total=0; wrap.innerHTML='';
    state.cart.forEach(item=>{const p=products.find(x=>x.id===item.id);if(!p)return; total+=p.price*item.qty; const row=document.createElement('div');row.className='cart-row';row.innerHTML=`<img src="${p.image}" alt="${esc(name(p))}"><div><h4>${esc(name(p))}</h4><p>${esc(p.model)} · ${money(p.price)}</p><div class="qty"><button data-dec="${p.id}">−</button><span>${item.qty}</span><button data-inc="${p.id}">+</button></div></div><strong>${money(p.price*item.qty)}</strong>`;wrap.appendChild(row)});
    wrap.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>changeQty(b.dataset.dec,-1));wrap.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>changeQty(b.dataset.inc,1));$('#cartTotal').textContent=money(total);
  }
  function changeQty(id,d){const row=state.cart.find(x=>x.id===id);if(!row)return;row.qty+=d;if(row.qty<=0)state.cart=state.cart.filter(x=>x.id!==id);persist();renderCart()}
  function openCart(){ $('#cartDrawer').classList.add('open');$('#overlay').classList.add('show'); }
  function closeCart(){ $('#cartDrawer').classList.remove('open');$('#overlay').classList.remove('show'); }
  function openModal(id){$('#'+id).classList.add('show');$('#overlay').classList.add('show')}
  function closeModals(){$$('.modal').forEach(m=>m.classList.remove('show'));$('#overlay').classList.remove('show')}
  function openProduct(id){const p=products.find(x=>x.id===id);if(!p)return;state.activeProduct=p;$('#modalImage').src=p.image;$('#modalImage').alt=name(p);$('#modalModel').textContent=p.model;$('#modalName').textContent=name(p);$('#modalPrice').textContent=money(p.price);openModal('productModal')}
  function checkout(){
    if(!state.cart.length)return;let total=0;const lines=state.cart.map(item=>{const p=products.find(x=>x.id===item.id);if(!p)return '';total+=p.price*item.qty;return `${name(p)} | ${p.model} | ${item.qty} × ${money(p.price)}`}).filter(Boolean);$('#orderText').value=`ROCK\n${lines.join('\n')}\n----------------\n${t('total')}: ${money(total)}`;closeCart();openModal('checkoutModal')
  }
  async function copyOrder(){try{await navigator.clipboard.writeText($('#orderText').value);toast(t('copied'))}catch{const a=$('#orderText');a.select();document.execCommand('copy');toast(t('copied'))}}
  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(window.__rockToast);window.__rockToast=setTimeout(()=>el.classList.remove('show'),1800)}

  $('#langBtn').onclick=()=>{state.lang=state.lang==='ar'?'en':'ar';localStorage.setItem('rock-lang',state.lang);applyLanguage()};
  $('#cartBtn').onclick=openCart;$('#closeCart').onclick=closeCart;$('#continueBtn').onclick=closeCart;$('#overlay').onclick=()=>{closeCart();closeModals()};
  $('#searchBtn').onclick=()=>{$('#searchInput').focus();document.querySelector('#shop').scrollIntoView({behavior:'smooth'})};
  $('#filtersBtn').onclick=()=>$('#shopToolbar').classList.toggle('open');
  $('#searchInput').oninput=e=>{state.query=e.target.value;render()};$('#sortSelect').onchange=e=>{state.sort=e.target.value;render()};
  $('#categoryChips').querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{$$('#categoryChips .chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.cat=b.dataset.cat;render()});
  $$('.collection-card').forEach(b=>b.onclick=()=>{state.cat=b.dataset.collection;$$('#categoryChips .chip').forEach(x=>x.classList.toggle('active',x.dataset.cat===state.cat));document.querySelector('#shop').scrollIntoView({behavior:'smooth'});render()});
  $('#viewFeatured').onclick=()=>{state.sort='high';$('#sortSelect').value='high';document.querySelector('#shop').scrollIntoView({behavior:'smooth'});render()};
  $('#closingShop').onclick=()=>document.querySelector('#shop').scrollIntoView({behavior:'smooth'});
  $('#scrollTopBtn').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
  $('#clearCartBtn').onclick=()=>{state.cart=[];persist();renderCart();toast(t('cleared'))};
  $('#checkoutBtn').onclick=checkout;$('#copyOrder').onclick=copyOrder;$('#doneOrder').onclick=closeModals;$('#modalAdd').onclick=()=>{if(state.activeProduct)add(state.activeProduct.id);closeModals()};
  $$('[data-close-modal]').forEach(b=>b.onclick=closeModals);
  $('#menuBtn').onclick=()=>$('#mobilePanel').classList.toggle('open');$$('[data-mobile-link]').forEach(a=>a.onclick=()=>$('#mobilePanel').classList.remove('open'));
  $('.announcement-close').onclick=()=>$('.announcement').remove();$('#year').textContent=new Date().getFullYear();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCart();closeModals();$('#mobilePanel').classList.remove('open')}});
  document.addEventListener('click',e=>{const img=e.target.closest('.product-image');if(img){const card=img.closest('.product-card');const btn=card?.querySelector('[data-view]');if(btn)openProduct(btn.dataset.view)}});
  applyLanguage();
})();

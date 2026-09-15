/* ROCK English Experience — completes the storefront translation without changing catalog data. */
(() => {
  'use strict';

  const english = {
    navShop: 'Shop', navCollections: 'Collections', navFeatured: 'Featured', navWhy: 'Why ROCK',
    explore: 'Explore products ↗', discover: 'Discover ROCK', filters: 'Filters +', checkout: 'Checkout →',
    announcement: ['Fast delivery in Saudi Arabia','Trusted warranty','Secure checkout','POWER YOUR EVERYDAY'],
    heroEyebrow: 'ROCK / EVERYDAY TECH', heroTitle: 'Tech<br><em>that moves</em> with you',
    heroText: 'Mobile accessories built around performance, design and reliability — from the first charge to the last moment of your day.',
    trust: ['✓ Curated quality','✓ Local support','✓ Fast delivery'],
    categoriesEyebrow:'01 / SHOP BY CATEGORY', categoriesTitle:'Choose what<br><em>fits you</em>', categoriesText:'A clearer store starts with the right category — discover ROCK products around your everyday needs.',
    catPower:['Charging & Power','Chargers • Cables • Power Banks'], catCar:['Car','Car chargers and accessories'], catAudio:['Audio','Earphones and a clearer listening experience'],
    storeEyebrow:'02 / THE ROCK STORE', storeTitle:'Explore <em>the collection</em>', searchPlaceholder:'Search chargers, power banks, earphones...',
    filters:['All','Charging & Power','Car','Audio'], sortFeatured:'Featured', sortLow:'Price: Low to high', sortHigh:'Price: High to low', sortName:'Name', empty:'No products match your search',
    featuredEyebrow:'03 / ROCK FEATURED', featuredTitle:'Power<br><em>65W in your pocket</em>', featuredText:'ROCK RKCH765 GaN charger with 65W output and three ports for fast charging at home or on the go.',
    specs:['W MAX','OUTPUTS','FAST CHARGE'], addCart:'Add to cart +',
    whyEyebrow:'04 / WHY ROCK', whyTitle:'Simpler.<br><em>Stronger.</em> Smarter.', whyText:'A clearer tech shopping experience: focused categories, quick specifications, featured products and support in one place.',
    whyTitles:['Reliable performance','Easier choice','Closer support'], whyTexts:['Everyday products focused on the job that matters.','Clear specifications and filters help you find the right product faster.','A clear Arabic-first storefront with local support and warranty.'],
    care:'ROCK CARE', careText:'Bought a product? We are with you after the purchase.', careLink:'Support & warranty ↗', detailEyebrow:'ROCK / DETAIL', detailTitle:'Details<br><em>make the difference</em>',
    storyEyebrow:'05 / OUR STORY', storyTitle:'Born from<br><em>need</em>', storyText:'ROCK focuses on the technology you use every day. Accessories should not feel like extra clutter around your phone; they should fit naturally into your lifestyle.', contact:'Get in touch ↗',
    connectedEyebrow:'06 / STAY CONNECTED', connectedTitle:'Ready for<br><em>ROCK?</em>', browse:'Browse products ↗',
    footerStore:'Store', footerCollections:'Collections', footerStory:'Our story', footerContact:'Contact',
    cart:'Cart', cartEmpty:'Your cart is empty', cartHint:'Add a product to get started', total:'Total', order:'Place order', remove:'Remove',
    priceRequest:'Price on request', catalogData:'Catalog data', product:'product', products:'products', resultsReset:'Reset',
    needsEyebrow:'ROCK / SHOP BY NEED', needsTitle:'Shop for<br><em>your day</em>', needsText:'Start with what you need — we will guide you to the right category.',
    needs:['I need faster charging','I need power for travel','I need to set up my car','I want better audio'],
    finderEyebrow:'ROCK FINDER', finderTitle:'Help me choose', finderText:'Answer a few questions and we will suggest a starting point from the ROCK catalog.',
    finderDevice:'Your device', finderUse:'Your use', finderResult:'Show my recommendation', finderOutput:'ROCK recommendation', finderAdd:'Add to cart',
    market:'Shopping preferences', marketLabel:'Market', currencyLabel:'Currency', currencyNote:'Currency changes are for storefront preview. Live FX, tax and payment rates should come from the backend.'
  };

  const phraseMap = new Map([
    ['بيانات الكتالوج', english.catalogData], ['السعر عند الطلب', english.priceRequest], ['السعر: الأقل', english.sortLow], ['السعر: الأعلى', english.sortHigh],
    ['الأكثر تميزًا', english.sortFeatured], ['الاسم', english.sortName], ['الكل', english.filters[0]], ['الشحن والطاقة', english.filters[1]], ['السيارة', english.filters[2]], ['الصوت', english.filters[3]],
    ['الفلاتر +', english.filters], ['إضافة للمفضلة','Add to wishlist'], ['إزالة من المفضلة','Remove from wishlist'], ['حذف', english.remove],
    ['السلة فارغة', english.cartEmpty], ['أضف منتجًا لتبدأ', english.cartHint], ['المجموع', english.total], ['إتمام الطلب', english.order], ['لا توجد منتجات مطابقة لبحثك', english.empty],
    ['جاهز لـ','Ready for'], ['تصفح المنتجات','Browse products'], ['الدعم والضمان','Support & warranty'], ['تواصل معنا','Get in touch'], ['قصتنا','Our story'], ['المتجر','Shop'], ['التصنيفات','Collections'], ['الأكثر طلبًا','Featured'], ['لماذا ROCK','Why ROCK']
  ]);

  const productDescription = (card) => {
    const name = (card.querySelector('h3')?.textContent || '').toLowerCase();
    const label = (card.querySelector('.product-category')?.textContent || '').toLowerCase();
    if (name.includes('charger') || label.includes('charger')) return 'A ROCK charging accessory designed for reliable everyday power.';
    if (name.includes('cable') || label.includes('cable')) return 'A durable ROCK charging cable designed for everyday devices.';
    if (name.includes('power bank') || label.includes('power bank')) return 'A portable ROCK power solution designed for travel and everyday use.';
    if (name.includes('holder') || label.includes('holder')) return 'A practical ROCK phone holder designed for stable everyday use.';
    if (name.includes('headphone') || name.includes('earphone') || name.includes('speaker') || label.includes('earphone') || label.includes('headphone')) return 'A ROCK audio product designed for clear everyday listening.';
    return 'A practical ROCK accessory designed for everyday use.';
  };

  function set(selector, value) { const el = document.querySelector(selector); if (el) el.innerHTML = value; }
  function setText(selector, value) { const el = document.querySelector(selector); if (el) el.textContent = value; }
  function setPlaceholder(selector, value) { const el = document.querySelector(selector); if (el) el.placeholder = value; }

  function applyStatic() {
    const en = document.documentElement.lang === 'en';
    if (!en) return;
    const navLinks = document.querySelectorAll('.desktop-nav a');
    [english.navShop, english.navCollections, english.navFeatured, english.navWhy].forEach((v,i)=>{ if(navLinks[i]) navLinks[i].textContent=v; });
    const mobileLinks = document.querySelectorAll('#mobileMenu a');
    [english.navShop, english.navCollections, english.navFeatured, english.navWhy].forEach((v,i)=>{ if(mobileLinks[i]) mobileLinks[i].textContent=v; });
    const anns=document.querySelectorAll('.announcement span'); english.announcement.forEach((v,i)=>{if(anns[i])anns[i].textContent=v;});
    set('.hero .eyebrow',english.heroEyebrow); set('.hero h1',english.heroTitle); setText('.hero-text',english.heroText);
    const trusts=document.querySelectorAll('.hero-trust span'); english.trust.forEach((v,i)=>{if(trusts[i])trusts[i].textContent=v;});
    set('.hero-actions .btn-primary',english.explore); set('.text-link[href="#story"]',english.discover);
    set('.section#collections .eyebrow',english.categoriesEyebrow); set('.section#collections h2',english.categoriesTitle); setText('.section#collections .section-head>p',english.categoriesText);
    const cats=document.querySelectorAll('#collections .category-card'); [[...english.catPower],[...english.catCar],[...english.catAudio]].forEach((v,i)=>{if(cats[i]){setText('h3',v[0],cats[i]);setText('p',v[1],cats[i]);}});
    set('#shop .shop-top .eyebrow',english.storeEyebrow); set('#shop .shop-top h2',english.storeTitle); setPlaceholder('#productSearch',english.searchPlaceholder);
    const filterBtns=document.querySelectorAll('#filterPills button'); english.filters.forEach((v,i)=>{if(filterBtns[i])filterBtns[i].textContent=v;});
    const sortMap=[english.sortFeatured,english.sortLow,english.sortHigh,english.sortName]; document.querySelectorAll('#sortProducts option').forEach((o,i)=>{if(sortMap[i])o.textContent=sortMap[i];});
    set('#featured .eyebrow',english.featuredEyebrow); set('#featured h2',english.featuredTitle); setText('#featured .feature-copy>p:not(.eyebrow)',english.featuredText); setText('#featured .add-demo',english.addCart);
    set('#why .eyebrow',english.whyEyebrow); set('#why h2',english.whyTitle); setText('#why .section-head>p',english.whyText);
    const whyCards=document.querySelectorAll('#why .why-card'); english.whyTitles.forEach((v,i)=>{if(whyCards[i]){setText('h3',v,whyCards[i]);setText('p',english.whyTexts[i],whyCards[i]);}});
    setText('.service-band span',english.care); setText('.service-band strong',english.careText); setText('.service-band a',english.careLink);
    set('.showcase-copy .eyebrow',english.detailEyebrow); set('.showcase-copy h2',english.detailTitle);
    set('#story .story-title .eyebrow',english.storyEyebrow); set('#story .story-title h2',english.storyTitle); setText('#story .story-copy>p:first-child',english.storyText); setText('#story .story-copy .text-link',english.contact);
    set('#contact .eyebrow',english.connectedEyebrow); set('#contact h2',english.connectedTitle); setText('#contact .btn-primary',english.browse);
    const fl=document.querySelectorAll('.footer-links a'); [english.footerStore,english.footerCollections,english.footerStory,english.footerContact].forEach((v,i)=>{if(fl[i])fl[i].textContent=v;});
    const footerBrands=document.querySelectorAll('.footer-top .brand + p'); footerBrands.forEach(e=>e.textContent='POWER YOUR EVERYDAY.');
    setText('#cartDrawer .cart-head strong',english.cart); setText('#cartDrawer .cart-foot>div>span',english.total); setText('#checkoutBtn',english.order);
    setPlaceholder('#overlaySearch','Search by product name or category...'); set('#emptyProducts',english.empty);
    applyNeeds();
    document.querySelectorAll('.product-card').forEach(card=>{const p=card.querySelector('.product-info>p');if(p)p.textContent=productDescription(card);});
    document.querySelectorAll('.rating span').forEach(el=>{if(el.textContent.trim()==='بيانات الكتالوج')el.textContent=english.catalogData;});
    document.querySelectorAll('.favorite-btn').forEach(btn=>{btn.setAttribute('aria-label',btn.classList.contains('active')?english.remove:'Add to wishlist');});
    applyModalText();
  }

  function applyNeeds(){
    const section=document.getElementById('rockShopByNeed'); if(section){ set('.rock-needs .eyebrow',english.needsEyebrow); set('.rock-needs h2',english.needsTitle); setText('.rock-needs .section-head>p',english.needsText); const btns=section.querySelectorAll('[data-need]'); english.needs.forEach((v,i)=>{if(btns[i])btns[i].innerHTML=`${v} <span>→</span>`;}); }
  }

  function applyModalText(){
    const cartEmpty=document.querySelector('.empty-cart'); if(cartEmpty){const parts=cartEmpty.childNodes;if(parts[0])parts[0].textContent=english.cartEmpty+'\n'; const span=cartEmpty.querySelector('span'); if(span)span.textContent=english.cartHint;}
    const finder=document.getElementById('finderModal'); if(finder){
      const title=finder.querySelector('.finder-card h2'); const p=finder.querySelector('.finder-card>p:not(.eyebrow)'); const ey=finder.querySelector('.finder-card .eyebrow');
      if(ey)ey.textContent=english.finderEyebrow; if(title)title.textContent=english.finderTitle; if(p)p.textContent=english.finderText;
      const labels=finder.querySelectorAll('.finder-step label'); if(labels[0])labels[0].textContent=english.finderDevice; if(labels[1])labels[1].textContent=english.finderUse;
      const result=finder.querySelector('#finderResult'); if(result)result.textContent=english.finderResult;
    }
    const modal=document.getElementById('productModal'); if(modal){const desc=modal.querySelector('.modal-copy>p'); const cat=modal.querySelector('.product-category'); if(cat)cat.textContent=cat.textContent; if(desc)desc.textContent=productDescription(modal); const add=modal.querySelector('[data-modal-add]'); if(add)add.textContent=english.addCart.replace(' +','');}
  }

  function applyPhraseMap(){
    if(document.documentElement.lang !== 'en') return;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n=>{const t=n.nodeValue.trim(); if(!t)return; const mapped=phraseMap.get(t); if(mapped && typeof mapped==='string') n.nodeValue=n.nodeValue.replace(t,mapped);});
  }

  function boot(){
    applyStatic();
    applyPhraseMap();
    let queued=false;
    const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(document.documentElement.lang==='en'){applyStatic();applyPhraseMap();}});};
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
    new MutationObserver(applyStatic).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();

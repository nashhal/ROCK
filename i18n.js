(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const AR={
    nav:['المتجر','التصنيفات','الأكثر طلبًا','لماذا ROCK'],
    mobile:['المتجر','التصنيفات','الأكثر طلبًا','لماذا ROCK'],
    announcement:['شحن سريع داخل السعودية','ضمان موثوق','دفع آمن','POWER YOUR EVERYDAY'],
    hero:{title:'تقنية|تتحرك معك',text:'إكسسوارات جوال تجمع بين الأداء، التصميم والاعتمادية — من أول شحنة إلى آخر لحظة في يومك.',primary:'استكشف المنتجات',story:'اكتشف ROCK',trust:['✓ جودة مختارة','✓ دعم محلي','✓ شحن سريع']},
    categories:{title:'اختَر ما|يناسبك',text:'تجربة متجر أوضح تبدأ من التصنيف الصحيح — اكتشف منتجات ROCK حسب احتياجك اليومي.',items:[['الشحن والطاقة','شواحن • كيابل • بطاريات متنقلة'],['الحماية','حماية يومية لهاتفك'],['الصوت','سماعات وتجربة صوتية واضحة']]},
    shop:{title:'اكتشف|المجموعة',finder:'ساعدني أختار',filter:'الفلاتر +',placeholder:'ابحث عن شاحن، باور بنك، سماعة...',filters:['الكل','الشحن والطاقة','الحماية','الصوت'],sort:['الأكثر تميزًا','السعر: الأقل','السعر: الأعلى','الاسم'],empty:'لا توجد منتجات مطابقة لبحثك'},
    featured:{title:'القوة|في جيبك',text:'باور بنك ROCK مصمم لرحلاتك وأيامك الطويلة — طاقة كبيرة، منافذ متعددة وتصميم يسهل حمله.',button:'أضف إلى السلة'},
    why:{title:'أبسط.|أقوى. أذكى.',text:'نستلهم أفضل تجارب التجارة التقنية العالمية: تصنيفات واضحة، معلومات سريعة، منتجات بارزة، وخدمة ما بعد البيع في مكان واحد.',items:[['أداء يعتمد عليه','منتجات يومية تركز على الوظيفة الأساسية قبل أي شيء.'],['اختيار أسهل','مواصفات مختصرة وفلاتر تساعدك على الوصول للمنتج المناسب بسرعة.'],['خدمة قريبة','تجربة شراء عربية واضحة مع دعم محلي وضمان موثوق.']]},
    service:{strong:'اشتريت المنتج؟ نحن معك بعد الشراء.','link':'الدعم والضمان ↗'},
    showcase:'التفاصيل|تصنع الفرق',
    story:{title:'ولدنا من|الحاجة',text:'ROCK علامة تقنية تركّز على الأشياء التي تستخدمها كل يوم. لا نريد أن تكون الإكسسوارات مجرد إضافات حول هاتفك؛ نريدها أن تكون جزءًا طبيعيًا من أسلوب حياتك.',link:'تواصل معنا ↗'},
    contact:{title:'جاهز لـ|ROCK؟',button:'تصفح المنتجات'},
    footer:['المتجر','التصنيفات','قصتنا','تواصل'],
    search:{title:'وش تدور عليه؟',placeholder:'اكتب اسم المنتج أو الفئة...'},
    cart:{title:'السلة',empty:'السلة فارغة',emptySub:'أضف منتجًا لتبدأ',total:'المجموع',checkout:'إتمام الطلب',remove:'حذف'},
    finder:{title:'ساعدني أختار',text:'جاوب بثلاث خطوات ونقترح عليك نقطة بداية مناسبة.',labels:['جهازك','استخدامك','ميزانيتك'],device:['iPhone','Samsung','iPad / Mac','أكثر من جهاز'],use:['سفر','مكتب','سيارة','يومي'],budget:['أقل من 100','100–200','مفتوحة'],result:'اعرض ترشيحي',match:'ترشيح ROCK',add:'أضف إلى السلة',best:'مناسب لـ'},
    product:{reviews:'مراجعة',best:'مناسب لـ'}
  };
  const EN={
    nav:['Shop','Categories','Best Sellers','Why ROCK'],mobile:['Shop','Categories','Best Sellers','Why ROCK'],announcement:['Fast shipping in Saudi Arabia','Trusted warranty','Secure payment','POWER YOUR EVERYDAY'],
    hero:{title:'Tech that|moves with you',text:'Mobile accessories built around performance, design and reliability — from the first charge to the last moment of your day.',primary:'Explore products',story:'Discover ROCK',trust:['✓ Curated quality','✓ Local support','✓ Fast shipping']},
    categories:{title:'Choose what|fits you',text:'A clearer shopping experience starts with the right category — discover ROCK products for everyday needs.',items:[['Power & Charging','Chargers • Cables • Power Banks'],['Protection','Everyday protection for your phone'],['Audio','Headphones and clear everyday sound']]},
    shop:{title:'Explore the|collection',finder:'Help me choose',filter:'Filters +',placeholder:'Search for a charger, power bank, headphones...',filters:['All','Power & Charging','Protection','Audio'],sort:['Featured','Price: Low','Price: High','Name'],empty:'No products match your search'},
    featured:{title:'Power|in your pocket',text:'The ROCK power bank is made for trips and long days — high capacity, multiple ports and an easy-to-carry design.',button:'Add to cart'},
    why:{title:'Simpler.|Stronger. Smarter.',text:'We take cues from the best global tech-commerce experiences: clear categories, fast information, standout products and after-sales support in one place.',items:[['Reliable performance','Everyday products focused on their core purpose first.'],['Easier choice','Clear specs and filters help you reach the right product faster.'],['Local support','A clear shopping experience backed by local support and a trusted warranty.']]},
    service:{strong:'Bought it? We are here after the purchase.','link':'Support & warranty ↗'},showcase:'Details|make the difference',
    story:{title:'Born from|a need',text:'ROCK is a technology brand focused on the things you use every day. Accessories should not feel like extras around your phone; they should feel like a natural part of your lifestyle.',link:'Get in touch ↗'},
    contact:{title:'Ready for|ROCK?',button:'Browse products'},footer:['Shop','Categories','Our story','Contact'],search:{title:'What are you looking for?',placeholder:'Type a product or category...'},
    cart:{title:'Cart',empty:'Your cart is empty',emptySub:'Add a product to get started',total:'Total',checkout:'Checkout',remove:'Remove'},
    finder:{title:'Help me choose',text:'Answer three quick steps and we will suggest a good starting point.',labels:['Your device','Your use','Your budget'],device:['iPhone','Samsung','iPad / Mac','Multiple devices'],use:['Travel','Desk','Car','Everyday'],budget:['Under 100','100–200','Open'],result:'Show my recommendation',match:'ROCK recommendation',add:'Add to cart',best:'Best for'},product:{reviews:'reviews',best:'Best for'}
  };
  const productsEN={gan65:{label:'CHARGER',desc:'A compact GaN fast charger for everyday use and travel.',badge:'BEST SELLER',best:['Travel','Desk','Home'],specs:[['Power','65W'],['Technology','GaN'],['Ports','3 Ports']]},power20k:{label:'POWER BANK',desc:'20,000mAh portable battery with up to 22.5W output.',badge:'FEATURED',best:['Travel','Long use'],specs:[['Capacity','20,000mAh'],['Power','22.5W'],['Outputs','3']]},usbc100:{label:'CABLE',desc:'High-power USB-C cable for fast charging and power delivery.',badge:'NEW',best:['Laptop','Phone'],specs:[['Power','100W'],['Port','USB-C'],['Use','Charge + Data']]},magsafe:{label:'PROTECTION',desc:'Slim everyday protection with a clean design and magnetic compatibility.',badge:'POPULAR',best:['Everyday use','iPhone'],specs:[['Compatibility','MagSafe'],['Protection','Everyday'],['Design','Slim']]},glasspro:{label:'SCREEN',desc:'Clear everyday screen protection with easy installation.',badge:'NEW',best:['iPhone','Samsung'],specs:[['Type','Screen Protector'],['Clarity','HD'],['Install','Easy']]},airbuds:{label:'AUDIO',desc:'Wireless earbuds with a comfortable design and clear sound.',badge:'BEST SELLER',best:['On the go','Calls'],specs:[['Connection','Wireless'],['Sound','Stereo'],['Use','Everyday']]},soundmini:{label:'AUDIO',desc:'A compact speaker made for everyday life and travel.',badge:'POPULAR',best:['Travel','Desk'],specs:[['Size','Compact'],['Connection','Wireless'],['Use','Portable']]},'3in1':{label:'CABLE',desc:'A multi-use cable designed for charging across different scenarios.',badge:'SMART PICK',best:['Travel','Car'],specs:[['Design','3-in-1'],['Use','Multi-device'],['Compatibility','Universal']]} };
  const textMap=(root,selector,ar,en)=>{const el=$(selector,root);if(el)el.textContent=english?en:ar};
  let english=localStorage.getItem('rockLanguage')==='en';
  const digits=s=>s.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s*ر\.س/g,' SAR');
  function setDir(){document.documentElement.lang=english?'en':'ar';document.documentElement.dir=english?'ltr':'rtl';document.body.classList.toggle('lang-en',english);const b=$('#langBtn');if(b)b.textContent=english?'AR':'EN';document.title='ROCK — Power your everyday';}
  function translateStatic(){
    const d=english?EN:AR;
    $$('.announcement span').forEach((e,i)=>e.textContent=d.announcement[i]);
    $$('.desktop-nav a').forEach((e,i)=>e.textContent=d.nav[i]); $$('#mobileMenu a').forEach((e,i)=>e.textContent=d.mobile[i]);
    textMap(document,'.hero h1',AR.hero.title.replace('|',' '),EN.hero.title.replace('|',' ')); textMap(document,'.hero-text',AR.hero.text,EN.hero.text);
    $$('.hero-actions .btn').forEach(e=>{e.childNodes[0].textContent=d.hero.primary+' '}); textMap(document,'.hero-actions .text-link',AR.hero.story,EN.hero.story); $$('.hero-trust span').forEach((e,i)=>e.textContent=d.hero.trust[i]);
    textMap(document,'#collections .section-head h2',AR.categories.title.replace('|',' '),EN.categories.title.replace('|',' ')); textMap(document,'#collections .section-head>div+ p',AR.categories.text,EN.categories.text); $$('#collections .category-card').forEach((e,i)=>{e.querySelector('h3').textContent=d.categories.items[i][0];e.querySelector('p').textContent=d.categories.items[i][1]});
    textMap(document,'#shop .shop-top h2',AR.shop.title.replace('|',' '),EN.shop.title.replace('|',' ')); textMap(document,'#finderBtn',AR.shop.finder,EN.shop.finder); textMap(document,'#filterToggle',AR.shop.filter,EN.shop.filter); $('#productSearch').placeholder=d.shop.placeholder; $('#overlaySearch').placeholder=d.search.placeholder;
    $$('#filterPills button').forEach((e,i)=>e.textContent=d.shop.filters[i]); $$('#sortProducts option').forEach((e,i)=>e.textContent=d.shop.sort[i]); textMap(document,'#emptyProducts',AR.shop.empty,EN.shop.empty);
    textMap(document,'#featured h2',AR.featured.title.replace('|',' '),EN.featured.title.replace('|',' ')); textMap(document,'#featured .feature-copy>p:not(.eyebrow)',AR.featured.text,EN.featured.text); textMap(document,'#featured .add-demo',AR.featured.button,EN.featured.button);
    textMap(document,'#why .section-head h2',AR.why.title.replace('|',' '),EN.why.title.replace('|',' ')); textMap(document,'#why .section-head>div+ p',AR.why.text,EN.why.text); $$('#why .why-card').forEach((e,i)=>{e.querySelector('h3').textContent=d.why.items[i][0];e.querySelector('p').textContent=d.why.items[i][1]});
    textMap(document,'.service-band strong',AR.service.strong,EN.service.strong); textMap(document,'.service-band a',AR.service.link,EN.service.link); textMap(document,'.showcase-copy h2',AR.showcase.replace('|',' '),EN.showcase.replace('|',' ')); textMap(document,'#story .story-title h2',AR.story.title.replace('|',' '),EN.story.title.replace('|',' ')); textMap(document,'.story-copy>p:first-child',AR.story.text,EN.story.text); textMap(document,'.story-copy .text-link',AR.story.link,EN.story.link); textMap(document,'#contact h2',AR.contact.title.replace('|',' '),EN.contact.title.replace('|',' ')); textMap(document,'.contact-actions .btn',AR.contact.button,EN.contact.button);
    $$('.footer-links a').forEach((e,i)=>e.textContent=d.footer[i]); textMap(document,'.search-overlay h2',AR.search.title,EN.search.title); textMap(document,'.cart-head strong',AR.cart.title,EN.cart.title); textMap(document,'.cart-foot>div span',AR.cart.total,EN.cart.total); textMap(document,'#checkoutBtn',AR.cart.checkout,EN.cart.checkout); textMap(document,'.empty-cart',AR.cart.empty+' ',EN.cart.empty+' ');
    if(english) $$('.ticker-track span').forEach((e,i)=>e.textContent=['POWER','PROTECTION','AUDIO','CHARGE','POWER','PROTECTION'][i]);
  }
  function translateDynamic(){
    const d=english?EN:AR;
    $$('.product-card').forEach(card=>{const id=card.dataset.id, p=productsEN[id]; if(!p)return; if(english){card.querySelector('.product-category').textContent=p.label;card.querySelector('.product-badge').textContent=p.badge;card.querySelector('.product-info p').textContent=p.desc;card.querySelector('.product-add')?.setAttribute('aria-label','Add '+card.querySelector('h3').textContent+' to cart');} });
    $$('.product-price,#cartTotal').forEach(e=>{if(english)e.textContent=digits(e.textContent)});
    $$('.cart-remove').forEach(e=>e.textContent=english?EN.cart.remove:AR.cart.remove);
    $$('.empty-cart span').forEach(e=>e.textContent=english?EN.cart.emptySub:AR.cart.emptySub);
    const modal=$('#productModal'); if(modal?.classList.contains('open')&&english){const p=productsEN[modal.querySelector('[data-modal-add]')?.dataset.modalAdd];if(p){modal.querySelector('.modal-copy>p').textContent=p.desc;modal.querySelector('.modal-copy h4').textContent=EN.product.best;modal.querySelector('.best-for').innerHTML=p.best.map(x=>`<span>${x}</span>`).join('');modal.querySelector('.modal-copy .rating span').textContent=modal.querySelector('.modal-copy .rating span').textContent.replace('مراجعة','reviews');modal.querySelector('[data-modal-add]').textContent=EN.featured.button;}}
  }
  function apply(){setDir();translateStatic();translateDynamic();}
  const oldLang=$('#langBtn');
  if(oldLang){const fresh=oldLang.cloneNode(true);oldLang.replaceWith(fresh);fresh.addEventListener('click',()=>{english=!english;localStorage.setItem('rockLanguage',english?'en':'ar');apply();});}
  new MutationObserver(()=>translateDynamic()).observe($('#productGrid')||document.body,{childList:true,subtree:true});
  apply();
})();
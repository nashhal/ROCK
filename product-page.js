(() => {
  const catalogProducts = Array.isArray(globalThis.ROCK_PRODUCTS) ? globalThis.ROCK_PRODUCTS : [];
  const photoQuality = globalThis.ROCK_PRODUCT_IMAGE_QUALITY;
  const approvedPhotoIds = new Set(photoQuality && Array.isArray(photoQuality.visibleIds) ? photoQuality.visibleIds : []);
  // Hidden products should not remain accessible through direct product links.
  const products = catalogProducts.filter(item => approvedPhotoIds.has(item.id));
  const $ = selector => document.querySelector(selector);
  const params = new URLSearchParams(window.location.search);
  const product = products.find(item => item.id === params.get('id'));
  const getStored = (key, fallback='') => { try { const value = localStorage.getItem(key); return value === null ? fallback : value; } catch { return fallback; } };
  const setStored = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
  let lang = getStored('rock-lang', 'ar') === 'en' ? 'en' : 'ar';
  const i18n = {
    ar:{
      openMenu:'فتح القائمة',switchLanguage:'تغيير اللغة',viewCart:'عرض السلة',navigationMenu:'قائمة التنقل',
      announcement:'ROCK | ملحقات تقنية ليومك',brandTagline:'ملحقات تقنية ليومك',shop:'المتجر',collections:'التصنيفات',storeInfo:'معلومات المتجر',bag:'السلة',home:'الرئيسية',
      productDetails:'تفاصيل المنتج',notFoundTitle:'لم يتم العثور على المنتج',notFoundText:'تحقق من الرابط أو ارجع إلى قائمة المنتجات.',backToShop:'العودة إلى المتجر',
      catalogImageNote:'صورة المنتج من كتالوج ROCK',photoPending:'صورة المنتج قيد التجهيز',viewOriginalPhotos:'عرض صور المنتج الأصلية ↗',barcodeLabel:'الباركود',modelLabel:'الموديل',modelMissing:'غير محدد',priceLabel:'السعر',viewProduct:'عرض المنتج',factModelTitle:'رقم الموديل',factModelText:'استخدم رقم الموديل عند الاستفسار عن هذا المنتج.',
      factCompatTitle:'التوافق',factCompatText:'تحقق من توافق المنتج مع جهازك والميزات المدعومة قبل الطلب.',
      factDeliveryTitle:'التوفر والتوصيل',factDeliveryText:'يجب تأكيد المخزون ومدة التوصيل وتكلفته والضمان قبل قبول الطلب.',
      addToBag:'أضف إلى السلة',orderInfo:'معلومات الطلب والخصوصية',
      orderNote:'هذه النسخة تُجهّز ملخص الطلب داخل المتصفح ولا تنفّذ دفعًا إلكترونيًا أو إرسالًا تلقائيًا.',
      relatedTitle:'منتجات من الفئة نفسها',viewAllProducts:'عرض جميع المنتجات ↗',
      descPower:'من فئة الطاقة والشحن في كتالوج ROCK. راجع مواصفات المنتج المطبوعة وتأكد من دعم جهازك لمعيار الشحن المطلوب قبل الطلب.',
      descAudio:'من فئة الصوت في كتالوج ROCK. تحقق من نوع الاتصال والتوافق والميزات المطلوبة بناءً على تفاصيل الموديل قبل الطلب.',
      descCar:'من فئة إكسسوارات السيارة في كتالوج ROCK. تحقق من المقاس وطريقة التركيب والتوافق مع سيارتك قبل الطلب.',
      descLifestyle:'من فئة المنتجات اليومية في كتالوج ROCK. تأكد من الأبعاد والمواد والمواصفات التفصيلية المتاحة للموديل قبل الطلب.',
      catPower:'الطاقة والشحن',catAudio:'الصوت',catDrive:'السيارة',catLifestyle:'أسلوب الحياة',sar:'ر.س',added:'تمت الإضافة إلى السلة',addError:'تعذر حفظ السلة في هذا المتصفح'
    },
    en:{
      openMenu:'Open menu',switchLanguage:'Switch language',viewCart:'View cart',navigationMenu:'Navigation menu',
      announcement:'ROCK | Everyday tech essentials',brandTagline:'Everyday tech essentials',shop:'Shop',collections:'Collections',storeInfo:'Store information',bag:'Bag',home:'Home',
      productDetails:'Product details',notFoundTitle:'Product not found',notFoundText:'Check the link or return to the catalog.',backToShop:'Back to shop',
      catalogImageNote:'Product image from the ROCK catalog',photoPending:'Product photo pending',viewOriginalPhotos:'View original product photos ↗',barcodeLabel:'Barcode',modelLabel:'Model',modelMissing:'Not specified',priceLabel:'Price',viewProduct:'View product',factModelTitle:'Model reference',factModelText:'Use the model number when asking about this product.',
      factCompatTitle:'Compatibility',factCompatText:'Confirm device fit and supported features before ordering.',
      factDeliveryTitle:'Availability and delivery',factDeliveryText:'Stock, delivery time, shipping cost and warranty must be confirmed before an order is accepted.',
      addToBag:'Add to bag',orderInfo:'Order and privacy information',
      orderNote:'This version prepares an order summary in your browser; it does not process online payments or submit orders automatically.',
      relatedTitle:'More from this category',viewAllProducts:'View all products ↗',
      descPower:'From the ROCK power and charging catalog. Check the product packaging and confirm your device supports the required charging standard before ordering.',
      descAudio:'From the ROCK audio catalog. Confirm the connection type, compatibility and model-specific features before ordering.',
      descCar:'From the ROCK car accessories catalog. Confirm dimensions, installation method and compatibility with your vehicle before ordering.',
      descLifestyle:'From the ROCK everyday products catalog. Confirm dimensions, materials and model-specific details before ordering.',
      catPower:'Power',catAudio:'Audio',catDrive:'Drive',catLifestyle:'Lifestyle',sar:'SAR',added:'Added to bag',addError:'Could not save the bag in this browser'
    }
  };
  const t = key => i18n[lang][key] || key;
  const name = item => lang === 'ar' ? item.nameAr : item.nameEn;
  const category = key => ({power:t('catPower'),audio:t('catAudio'),car:t('catDrive'),lifestyle:t('catLifestyle')})[key] || 'ROCK';
  const priceText = value => { const amount=Number(value); const shown=Number.isInteger(amount)?String(amount):amount.toFixed(2); return shown+' '+t('sar'); };
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const imagePath = path => typeof path === 'string' && /^assets\/products\/[a-z0-9-]+\.webp$/i.test(path) ? path : '';
  function applyLanguage(){
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});
    document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));
    $('#langBtn').textContent=lang==='ar'?'EN':'AR';
  }
  function readCart(){
    try{
      const value=JSON.parse(localStorage.getItem('rock-cart')||'[]');
      if(!Array.isArray(value))return [];
      const ids=new Set(products.map(item=>item.id));
      return value.filter(item=>item&&ids.has(item.id)&&Number.isSafeInteger(item.qty)&&item.qty>0).map(item=>({id:item.id,qty:Math.min(item.qty,99)}));
    }catch{return []}
  }
  function renderRelated(){
    if(!product)return;
    const related=products.filter(item=>item.category===product.category&&item.id!==product.id).slice(0,3);
    $('#relatedGrid').innerHTML='';
    related.forEach(item=>{
      const detailUrl='product.html?id='+encodeURIComponent(item.id);
      const card=document.createElement('article');card.className='related-card';
      const image=imagePath(item.image);
      const modelText=item.model&&item.model!=='—'?item.model:t('modelMissing');
      const photo=image?'<img data-related-image loading="lazy" width="360" height="270" src="'+escapeHtml(image)+'" alt="'+escapeHtml(name(item))+'">':'<span class="product-photo-placeholder" role="img" aria-label="'+escapeHtml(t('photoPending'))+'"><strong>ROCK</strong><small>'+escapeHtml(t('photoPending'))+'</small></span>';
      card.innerHTML='<a class="related-card-visual" href="'+detailUrl+'" aria-label="'+escapeHtml(t('viewProduct'))+': '+escapeHtml(name(item))+'">'+photo+'</a>'+
        '<div class="related-card-content">'+
          '<div class="related-card-model"><span>'+escapeHtml(t('modelLabel'))+'</span><b dir="ltr">'+escapeHtml(modelText)+'</b></div>'+
          '<a class="related-card-title" href="'+detailUrl+'"><strong>'+escapeHtml(name(item))+'</strong></a>'+
          '<div class="related-card-price"><span>'+escapeHtml(t('priceLabel'))+'</span><strong>'+escapeHtml(priceText(item.price))+'</strong></div>'+
          '<a class="related-card-cta" href="'+detailUrl+'">'+escapeHtml(t('viewProduct'))+' <span aria-hidden="true">↗</span></a>'+
        '</div>';
      const relatedImage=card.querySelector('[data-related-image]');
      if(relatedImage) relatedImage.addEventListener('error',()=>{const ph=document.createElement('span');ph.className='product-photo-placeholder';ph.setAttribute('role','img');ph.setAttribute('aria-label',t('photoPending'));const mark=document.createElement('strong');mark.textContent='ROCK';const note=document.createElement('small');note.textContent=t('photoPending');ph.append(mark,note);relatedImage.replaceWith(ph)},{once:true});
      $('#relatedGrid').appendChild(card);
    });
    $('#relatedSection').hidden=related.length===0;
  }
  function renderProduct(){
    if(!product){
      $('#productNotFound').hidden=false;
      $('#productLayout').hidden=true;
      const robots=$('meta[name="robots"]');if(robots)robots.content='noindex,follow';
      $('#relatedSection').hidden=true;
      document.title=t('notFoundTitle')+' | ROCK';
      return;
    }
    $('#productLayout').hidden=false;
    $('#productNotFound').hidden=true;
    const detailImage=$('#detailImage'),detailPlaceholder=$('#detailImagePlaceholder'),galleryThumbs=$('#detailGalleryThumbs');
    const detailImagePath=imagePath(product.image);
    const galleryImages=(Array.isArray(product.images)?product.images:[]).map(imagePath).filter((path,index,all)=>path&&all.indexOf(path)===index);
    if(detailImagePath&&!galleryImages.includes(detailImagePath))galleryImages.unshift(detailImagePath);
    const updateMainImage=path=>{
      detailImage.onerror=()=>{detailImage.hidden=true;detailPlaceholder.hidden=false};
      detailPlaceholder.hidden=true;
      detailImage.hidden=false;
      detailImage.alt=name(product);
      detailImage.src=path;
      [...galleryThumbs.querySelectorAll('.product-gallery-thumb')].forEach(button=>{
        const active=button.dataset.image===path;
        button.classList.toggle('is-active',active);
        button.setAttribute('aria-pressed',active?'true':'false');
      });
    };
    detailImage.alt=name(product);
    detailImage.onerror=()=>{detailImage.hidden=true;detailPlaceholder.hidden=false};
    detailPlaceholder.hidden=Boolean(detailImagePath);
    detailImage.hidden=!detailImagePath;
    if(detailImagePath)detailImage.src=detailImagePath;else detailImage.removeAttribute('src');
    galleryThumbs.innerHTML='';
    galleryThumbs.hidden=galleryImages.length<2;
    galleryImages.forEach((path,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='product-gallery-thumb'+(path===detailImagePath?' is-active':'');
      button.dataset.image=path;
      button.setAttribute('aria-pressed',path===detailImagePath?'true':'false');
      button.setAttribute('aria-label',(lang==='ar'?'الصورة ':'Image ')+(index+1));
      const thumb=document.createElement('img');
      thumb.src=path;
      thumb.alt=(lang==='ar'?'عرض الصورة ':'View image ')+(index+1);
      thumb.loading='lazy';
      thumb.width=100;thumb.height=100;
      thumb.addEventListener('error',()=>{button.hidden=true;},{once:true});
      button.appendChild(thumb);
      button.addEventListener('click',()=>updateMainImage(path));
      galleryThumbs.appendChild(button);
    });
    $('#detailCategory').textContent=category(product.category);
    $('#detailModel').textContent=t('modelLabel')+': '+(product.model&&product.model!=='—'?product.model:t('modelMissing'));
    $('#detailModelCaption').textContent=product.model;
    $('#detailName').textContent=name(product);
    $('#detailPrice').textContent=priceText(product.price);$('#detailBarcode').textContent=product.barcode?t('barcodeLabel')+': '+product.barcode:'';
    const descriptionKey={power:'descPower',audio:'descAudio',car:'descCar',lifestyle:'descLifestyle'}[product.category]||'descLifestyle';
    $('#detailDescription').textContent=lang==='en'&&product.descriptionEn?product.descriptionEn:t(descriptionKey);
    $('#breadcrumbName').textContent=name(product);
    document.title=name(product)+' | ROCK';
    const desc=$('meta[name="description"]');
    const seoDescription=lang==='en'
      ? `${name(product)}. Model ${product.model}. Listed price ${priceText(product.price)}. Check compatibility and confirm availability before ordering.`
      : `${name(product)}. رقم الموديل ${product.model}. السعر المعروض ${priceText(product.price)}. تحقق من التوافق وأكد التوفر قبل الطلب.`;
    if(desc)desc.content=seoDescription;
    const canonicalUrl='https://nashhal.github.io/ROCK/product.html?id='+encodeURIComponent(product.id);
    let canonical=$('link[rel="canonical"]');
    if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}
    canonical.href=canonicalUrl;
    const metaContent=(selector,value)=>{
      let node=$(selector);
      if(!node){
        node=document.createElement('meta');
        const match=selector.match(/\[(name|property)="([^"]+)"\]/);
        if(match)node.setAttribute(match[1],match[2]);
        document.head.appendChild(node);
      }
      node.content=value;
    };
    metaContent('meta[property="og:title"]',name(product)+' | ROCK');
    metaContent('meta[property="og:description"]',seoDescription);
    metaContent('meta[property="og:url"]',canonicalUrl);
    metaContent('meta[property="og:image"]','https://nashhal.github.io/ROCK/'+(detailImagePath||'assets/brand/rock-logo.svg'));
    metaContent('meta[name="twitter:title"]',name(product)+' | ROCK');
    metaContent('meta[name="twitter:description"]',seoDescription);
    const productSchema={
      '@context':'https://schema.org','@type':'Product',name:name(product),description:seoDescription,
      sku:product.model&&product.model!=='—'?product.model:product.id,
      image:galleryImages.map(path=>'https://nashhal.github.io/ROCK/'+path),
      brand:{'@type':'Brand',name:'ROCK'},category:category(product.category),
      ...(product.barcode?{gtin:product.barcode}:{}),
      offers:{'@type':'Offer',url:canonicalUrl,priceCurrency:'SAR',price:Number(product.price)}
    };
    let schema=$('#rockProductSchema');
    if(!schema){schema=document.createElement('script');schema.type='application/ld+json';schema.id='rockProductSchema';document.head.appendChild(schema);}
    schema.textContent=JSON.stringify(productSchema);
    renderRelated();
  }
  function toast(message){const node=$('#productToast');node.textContent=message;node.classList.add('show');window.setTimeout(()=>node.classList.remove('show'),2200)}
  function addToBag(){
    if(!product)return;
    const cart=readCart();
    const row=cart.find(item=>item.id===product.id);
    if(row){if(row.qty>=99){toast(lang==='ar'?'وصلت إلى الحد الأقصى للكمية':'Maximum quantity reached');return;}row.qty++;}
    else cart.push({id:product.id,qty:1});
    if(!setStored('rock-cart',JSON.stringify(cart))){toast(t('addError'));return;}
    toast(t('added'));
    window.setTimeout(()=>{window.location.href='./?cart=1';},350);
  }
  const productMenu=$('#productMenuBtn');
  const productMobilePanel=$('#productMobilePanel');
  productMenu.addEventListener('click',()=>{
    const expanded=productMobilePanel.classList.toggle('open');
    productMenu.setAttribute('aria-expanded',String(expanded));
    productMobilePanel.setAttribute('aria-hidden',String(!expanded));
  });
  productMobilePanel.querySelectorAll('[data-mobile-link]').forEach(link=>link.addEventListener('click',()=>{
    productMobilePanel.classList.remove('open');
    productMobilePanel.setAttribute('aria-hidden','true');
    productMenu.setAttribute('aria-expanded','false');
  }));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && productMobilePanel.classList.contains('open')){
      productMobilePanel.classList.remove('open');
      productMobilePanel.setAttribute('aria-hidden','true');
      productMenu.setAttribute('aria-expanded','false');
      productMenu.focus();
    }
  });
  $('#langBtn').addEventListener('click',()=>{lang=lang==='ar'?'en':'ar';setStored('rock-lang',lang);applyLanguage();renderProduct();renderRelated()});
  $('#detailAddButton').addEventListener('click',addToBag);
  $('#footerYear').textContent=String(new Date().getFullYear());
  window.addEventListener('rock:assistant-add', event => {
    const detail = event.detail;
    if (!detail || typeof detail.respond !== 'function') return;
    const item = products.find(candidate => candidate.id === detail.id);
    if (!item) { detail.respond(false); return; }
    const cart = readCart();
    const row = cart.find(candidate => candidate.id === item.id);
    if (row && row.qty >= 99) { detail.respond(false); toast(lang === 'ar' ? 'وصلت للحد الأقصى للكمية' : 'Maximum quantity reached'); return; }
    if (row) row.qty += 1; else cart.push({ id: item.id, qty: 1 });
    if (!setStored('rock-cart', JSON.stringify(cart))) { detail.respond(false); return; }
    $('#cartCount').textContent = String(cart.reduce((sum, candidate) => sum + candidate.qty, 0));
    toast(t('added'));
    detail.respond(true);
  });

  applyLanguage();
  renderProduct();
  $('#cartCount').textContent=String(readCart().reduce((sum,item)=>sum+item.qty,0));
})();
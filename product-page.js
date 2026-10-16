(() => {
  const products = Array.isArray(globalThis.ROCK_PRODUCTS) ? globalThis.ROCK_PRODUCTS : [];
  const $ = selector => document.querySelector(selector);
  const params = new URLSearchParams(window.location.search);
  const product = products.find(item => item.id === params.get('id'));
  const getStored = (key, fallback='') => { try { const value = localStorage.getItem(key); return value === null ? fallback : value; } catch { return fallback; } };
  const setStored = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
  let lang = getStored('rock-lang', 'ar') === 'en' ? 'en' : 'ar';
  const i18n = {
    ar:{
      announcement:'تقنية يومية بتفاصيل محسوبة',shop:'المتجر',collections:'التصنيفات',storeInfo:'معلومات المتجر',bag:'السلة',home:'الرئيسية',
      productDetails:'تفاصيل المنتج',notFoundTitle:'لم يتم العثور على المنتج',notFoundText:'تحقق من الرابط أو ارجع إلى قائمة المنتجات.',backToShop:'العودة إلى المتجر',
      catalogImageNote:'صورة المنتج من كتالوج ROCK',viewOriginalPhotos:'عرض صور المنتج الأصلية ↗',barcodeLabel:'الباركود',factModelTitle:'رقم الموديل',factModelText:'استخدم رقم الموديل عند الاستفسار عن هذا المنتج.',
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
      announcement:'Everyday technology, considered.',shop:'Shop',collections:'Collections',storeInfo:'Store information',bag:'Bag',home:'Home',
      productDetails:'Product details',notFoundTitle:'Product not found',notFoundText:'Check the link or return to the catalog.',backToShop:'Back to shop',
      catalogImageNote:'Product image from the ROCK catalog',viewOriginalPhotos:'View original product photos ↗',barcodeLabel:'Barcode',factModelTitle:'Model reference',factModelText:'Use the model number when asking about this product.',
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
  const imagePath = path => typeof path === 'string' && /^assets\/products\/[a-z0-9-]+\.webp$/i.test(path) ? path : 'assets/brand/rock-logo.svg';
  const safePhotoUrl = value => typeof value === 'string' && /^https:\/\/drive\.google\.com\/(?:drive\/folders\/[A-Za-z0-9_-]+|file\/d\/[A-Za-z0-9_-]+\/view)(?:\?[A-Za-z0-9_=&%-]+)?$/.test(value.trim()) ? value.trim() : '';
  function applyLanguage(){
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});
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
      const a=document.createElement('a');a.className='related-card';a.href='product.html?id='+encodeURIComponent(item.id);
      a.innerHTML='<img loading="lazy" width="360" height="360" src="'+escapeHtml(imagePath(item.image))+'" alt="'+escapeHtml(name(item))+'"><small>'+escapeHtml(item.model)+'</small><strong>'+escapeHtml(name(item))+'</strong><span>'+escapeHtml(priceText(item.price))+'</span>';
      $('#relatedGrid').appendChild(a);
    });
    $('#relatedSection').hidden=related.length===0;
  }
  function renderProduct(){
    if(!product){
      $('#productNotFound').hidden=false;
      $('#productLayout').hidden=true;
      $('#relatedSection').hidden=true;
      document.title=t('notFoundTitle')+' | ROCK';
      return;
    }
    $('#productLayout').hidden=false;
    $('#productNotFound').hidden=true;
    $('#detailImage').src=imagePath(product.image);
    $('#detailImage').alt=name(product);
    $('#detailCategory').textContent=category(product.category);
    $('#detailModel').textContent=product.model;
    $('#detailModelCaption').textContent=product.model;
    $('#detailName').textContent=name(product);
    $('#detailPrice').textContent=priceText(product.price);$('#detailBarcode').textContent=product.barcode?t('barcodeLabel')+': '+product.barcode:'';const photosLink=$('#detailPhotosLink');const photosUrl=safePhotoUrl(product.picturesUrl);photosLink.hidden=!photosUrl;if(photosUrl)photosLink.href=photosUrl;
    const descriptionKey={power:'descPower',audio:'descAudio',car:'descCar',lifestyle:'descLifestyle'}[product.category]||'descLifestyle';
    $('#detailDescription').textContent=lang==='en'&&product.descriptionEn?product.descriptionEn:t(descriptionKey);
    $('#breadcrumbName').textContent=name(product);
    document.title=name(product)+' | ROCK';
    const desc=$('meta[name="description"]');if(desc)desc.content=t(descriptionKey);
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
  $('#langBtn').addEventListener('click',()=>{lang=lang==='ar'?'en':'ar';setStored('rock-lang',lang);applyLanguage();renderProduct();renderRelated()});
  $('#detailAddButton').addEventListener('click',addToBag);
  $('#footerYear').textContent=String(new Date().getFullYear());
  applyLanguage();
  renderProduct();
  $('#cartCount').textContent=String(readCart().reduce((sum,item)=>sum+item.qty,0));
})();
(() => {
  const $ = selector => document.querySelector(selector);
  const getStored = (key, fallback='') => { try { const value=localStorage.getItem(key); return value===null?fallback:value; } catch { return fallback; } };
  const setStored = (key,value) => { try { localStorage.setItem(key,value); } catch {} };
  let lang = getStored('rock-lang','ar') === 'en' ? 'en' : 'ar';
  const words = {
    ar:{
      announcement:'تقنية يومية بتفاصيل محسوبة',shop:'المتجر',collections:'التصنيفات',bag:'السلة',home:'الرئيسية',backToShop:'العودة إلى المتجر',
      pageTitle:'معلومات المتجر والخصوصية',pageIntro:'معلومات واضحة حول النسخة الحالية من ROCK وطريقة إعداد الطلب.',
      notice:'مهم: هذه النسخة لا تستقبل الطلبات تلقائيًا ولا تنفذ الدفع الإلكتروني. نسخ ملخص الطلب لا يعني تأكيد توفر المنتج أو قبول الطلب.',
      orderingTitle:'إعداد الطلب',orderingText:'يمكنك مراجعة السلة وإعداد ملخص يتضمن العناصر وبيانات التواصل التي تدخلها. عند النسخ، يُنقل الملخص إلى حافظة جهازك لتشاركه بنفسك. لا يوجد إرسال تلقائي إلى ROCK في هذه النسخة.',
      deliveryTitle:'الشحن والتوصيل',deliveryText:'لا تعرض النسخة الحالية سعر شحن أو موعد توصيل مؤكدًا. يجب تأكيد رسوم التوصيل والمدة والمنطقة المخدومة قبل قبول الطلب.',
      returnsTitle:'الاسترجاع والضمان',returnsText:'لم تُحدد في ملفات المتجر الحالية سياسة نهائية للاسترجاع أو الضمان. ينبغي نشر الشروط المعتمدة والاستثناءات وفترات التغطية قبل بدء البيع، وعدم افتراض توفر ضمان معين قبل تأكيده.',
      privacyTitle:'الخصوصية وبيانات المتصفح',privacyText:'تحفظ الواجهة الحالية محتويات السلة وتفضيل اللغة في مساحة التخزين المحلية للمتصفح. بيانات نموذج الطلب لا تُرسل إلى خادم ولا تحفظها الواجهة عمدًا؛ لكن عند نسخ الطلب، تكون البيانات في حافظة جهازك. تستخدم الصفحة خطوطًا من Google Fonts، ما يستدعي اتصال المتصفح بخوادم مزود الخطوط.',
      pricingTitle:'الأسعار والتوفر',pricingText:'الأسعار الظاهرة في الكتالوج مدخلة في ملفات الموقع وقد لا تعكس المخزون أو الأسعار النهائية وقت الطلب. يجب تأكيد السعر النهائي والتوفر ومواصفات الموديل قبل إتمام عملية البيع.',
      launchTitle:'قبل الإطلاق التجاري',launchText:'يلزم اعتماد بيانات المتجر ووسيلة تواصل موثقة وسياسات الشراء والاسترجاع والخصوصية، وربط نظام آمن لإدارة الطلبات والدفع إذا تقرر قبول الدفع الإلكتروني.',
      sampleProduct:'عرض مثال لصفحة منتج'
    },
    en:{
      announcement:'Everyday technology, considered.',shop:'Shop',collections:'Collections',bag:'Bag',home:'Home',backToShop:'Back to shop',
      pageTitle:'Store information & privacy',pageIntro:'Clear information about the current ROCK storefront and its order-preparation flow.',
      notice:'Important: this version does not receive orders automatically or process online payments. Copying an order summary does not confirm stock or acceptance.',
      orderingTitle:'Preparing an order',orderingText:'You can review your bag and prepare a summary with the items and contact details you enter. Copying moves the summary to your device clipboard for you to share manually. This version does not submit it to ROCK automatically.',
      deliveryTitle:'Shipping and delivery',deliveryText:'This version does not publish confirmed shipping fees or delivery dates. Delivery costs, timeframe and service area must be confirmed before an order is accepted.',
      returnsTitle:'Returns and warranty',returnsText:'The current storefront files do not define a final returns or warranty policy. Approved terms, exceptions and coverage periods should be published before sales begin. Do not assume a particular warranty is available unless confirmed.',
      privacyTitle:'Privacy and browser data',privacyText:'The current interface stores bag contents and language preference in browser local storage. Order-form details are not sent to a server and are not intentionally saved by the interface; when you copy an order, the details are placed in your device clipboard. The page loads fonts from Google Fonts, which involves a browser request to that provider.',
      pricingTitle:'Pricing and availability',pricingText:'Catalog prices are entered in the site files and may not reflect stock or final prices at the time of a request. Confirm final price, availability and model specifications before completing a sale.',
      launchTitle:'Before commercial launch',launchText:'The store needs approved business details, a verified contact channel, finalized purchase/returns/privacy policies, and a secure order-management and payment system if online payment will be offered.',
      sampleProduct:'View a sample product page'
    }
  };
  function apply(){
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=words[lang][el.dataset.i18n]||el.textContent});
    $('#langBtn').textContent=lang==='ar'?'EN':'AR';
    document.title=(lang==='ar'?'معلومات المتجر والخصوصية':'Store information & privacy')+' | ROCK';
    const description=document.querySelector('meta[name="description"]');
    if(description)description.content=lang==='ar'?'معلومات متجر ROCK حول الطلبات والتوصيل والخصوصية والأسعار.':'ROCK store information about orders, delivery, privacy and pricing.';
    const ogTitle=document.querySelector('meta[property="og:title"]');
    if(ogTitle)ogTitle.content=document.title;
    const ogDescription=document.querySelector('meta[property="og:description"]');
    if(ogDescription&&description)ogDescription.content=description.content;
    $('#year').textContent=String(new Date().getFullYear());
  }
  $('#langBtn').addEventListener('click',()=>{lang=lang==='ar'?'en':'ar';setStored('rock-lang',lang);apply()});
  apply();
})();
(() => {
  const $ = selector => document.querySelector(selector);
  const getStored = (key, fallback='') => { try { const value=localStorage.getItem(key); return value===null?fallback:value; } catch { return fallback; } };
  const setStored = (key,value) => { try { localStorage.setItem(key,value); } catch {} };
  let lang = getStored('rock-lang','ar') === 'en' ? 'en' : 'ar';
  const words = {
    ar:{
      announcement:'ROCK | فجر جديد مع روك',brandTagline:'فجر جديد مع روك',shop:'المتجر',collections:'التصنيفات',bag:'السلة',home:'الرئيسية',backToShop:'العودة إلى المتجر',
      pageTitle:'معلومات المتجر والخصوصية',pageIntro:'معلومات واضحة حول النسخة الحالية من ROCK وطريقة إعداد الطلب.',
      notice:'مهم: استقبال الطلبات يتطلب نشر الواجهة على استضافة مفعّل عليها PHP وMySQL وإتمام إعداد قاعدة البيانات. تسجيل الطلب لا يؤكد الدفع أو التوفر أو التوصيل؛ ولا يوجد دفع إلكتروني في هذه النسخة.',
      orderingTitle:'إعداد الطلب',orderingText:'عند تشغيل نسخة الخادم، يرسل زر تسجيل الطلب البيانات والمنتجات إلى قاعدة بيانات ROCK بعد موافقتك على الملخص. أما نسخة GitHub Pages فتنشئ ملخصًا لتشاركه بنفسك. كلا الخيارين لا يؤكد التوفر أو السعر النهائي أو التوصيل، ولا ينفذ دفعًا إلكترونيًا.',
      deliveryTitle:'الشحن والتوصيل',deliveryText:'لا تعرض النسخة الحالية سعر شحن أو موعد توصيل مؤكدًا. يجب تأكيد رسوم التوصيل والمدة والمنطقة المخدومة قبل قبول الطلب.',
      returnsTitle:'الاسترجاع والضمان',returnsText:'لم تُحدد في ملفات المتجر الحالية سياسة نهائية للاسترجاع أو الضمان. ينبغي نشر الشروط المعتمدة والاستثناءات وفترات التغطية قبل بدء البيع، وعدم افتراض توفر ضمان معين قبل تأكيده.',
      privacyTitle:'الخصوصية وبيانات المتصفح',privacyText:'تحفظ الواجهة الحالية محتويات السلة وتفضيل اللغة في مساحة التخزين المحلية للمتصفح. بيانات نموذج الطلب لا تُرسل تلقائيًا إلى خادم ولا تحفظها الواجهة عمدًا. عند نسخ الملخص، تظهر البيانات التي أدخلتها في حافظة جهازك؛ وعند المشاركة، تُرسل إلى الوجهة التي تختارها من نافذة المشاركة. راجع المستلم ومحتوى الرسالة قبل الإرسال. تستخدم الصفحة خطوطًا من Google Fonts، ما يستدعي اتصال المتصفح بخوادم مزود الخطوط.',
      pricingTitle:'الأسعار والتوفر',pricingText:'الأسعار الظاهرة في الكتالوج مدخلة في ملفات الموقع وقد لا تعكس المخزون أو الأسعار النهائية وقت الطلب. يجب تأكيد السعر النهائي والتوفر ومواصفات الموديل قبل إتمام عملية البيع.',
      launchTitle:'قبل الإطلاق التجاري',launchText:'يلزم اعتماد بيانات المتجر ووسيلة تواصل موثقة وسياسات الشراء والاسترجاع والخصوصية، وربط نظام آمن لإدارة الطلبات والدفع إذا تقرر قبول الدفع الإلكتروني.',
      sampleProduct:'عرض مثال لصفحة منتج'
    },
    en:{
      announcement:'ROCK | A new dawn with ROCK',brandTagline:'A new dawn with ROCK',shop:'Shop',collections:'Collections',bag:'Bag',home:'Home',backToShop:'Back to shop',
      pageTitle:'Store information & privacy',pageIntro:'Clear information about the current ROCK storefront and its order-preparation flow.',
      notice:'Important: order intake requires deployment to a PHP/MySQL host with the database configured. Recording a request does not confirm payment, availability, or delivery. Online payment is not enabled.',
      orderingTitle:'Preparing an order',orderingText:'On a configured PHP/MySQL deployment, the submit-order button sends the products and details to the ROCK order database after you confirm the summary. GitHub Pages only prepares a summary for you to share manually. Neither path confirms stock, final price, or delivery, and neither processes online payment.',
      deliveryTitle:'Shipping and delivery',deliveryText:'This version does not publish confirmed shipping fees or delivery dates. Delivery costs, timeframe and service area must be confirmed before an order is accepted.',
      returnsTitle:'Returns and warranty',returnsText:'The current storefront files do not define a final returns or warranty policy. Approved terms, exceptions and coverage periods should be published before sales begin. Do not assume a particular warranty is available unless confirmed.',
      privacyTitle:'Privacy and browser data',privacyText:'The current interface stores bag contents and language preference in browser local storage. Order-form details are not sent automatically to a server and are not intentionally saved by the interface. Copying places the details you entered in your device clipboard; sharing sends them to the destination you choose in the share sheet. Review the recipient and message contents before sending. The page loads fonts from Google Fonts, which involves a browser request to that provider.',
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
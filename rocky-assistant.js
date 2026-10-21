/* ROCKY Assistant — local catalog search; no external API or paid service required. */
(() => {
  'use strict';
  if (document.getElementById('rockyWidget')) return;

  const PRODUCTS = Array.isArray(window.ROCK_PRODUCTS) ? window.ROCK_PRODUCTS : [];
  const root = document.createElement('section');
  root.id = 'rockyWidget';
  root.className = 'rocky-widget';
  root.setAttribute('aria-label', 'ROCKY shopping assistant');
  root.innerHTML = `
    <button class="rocky-launcher" type="button" id="rockyLauncher" aria-expanded="false" aria-controls="rockyPanel" aria-label="افتح مساعد روكي">
      <img src="assets/brand/rocky-avatar.webp" alt="" width="48" height="48">
      <span class="rocky-launcher-copy"><strong>روكي | ROCKY</strong><small data-rocky-launch-sub>مساعد التسوّق</small></span><span class="rocky-launcher-dot" aria-hidden="true"></span>
    </button>
    <section class="rocky-panel" id="rockyPanel" role="dialog" aria-modal="false" aria-labelledby="rockyTitle" hidden>
      <header class="rocky-head">
        <img src="assets/brand/rocky-avatar.webp" alt="" width="43" height="43">
        <div class="rocky-head-copy"><strong id="rockyTitle">روكي <span aria-hidden="true">·</span> ROCK</strong><span><i class="rocky-status" aria-hidden="true"></i><span data-rocky-status>جاهز يساعدك تختار</span></span></div>
        <button class="rocky-close" id="rockyClose" type="button" aria-label="إغلاق مساعد روكي">×</button>
      </header>
      <div class="rocky-intro" id="rockyIntro">
        <p data-rocky-welcome>يا هلا! أنا روكي. قل لي وش تدور عليه، وأطلع لك المنتجات الموجودة في كتالوج ROCK.</p>
        <div class="rocky-shortcuts" aria-label="اقتراحات سريعة">
          <button class="rocky-shortcut" type="button" data-rocky-query="أبغى شاحن">أبغى شاحن</button>
          <button class="rocky-shortcut" type="button" data-rocky-query="أبحث عن كابل">أبحث عن كابل</button>
          <button class="rocky-shortcut" type="button" data-rocky-query="أبغى سماعات">السماعات</button>
          <button class="rocky-shortcut" type="button" data-rocky-query="قارن لي بين منتجين">قارن منتجين</button>
        </div>
      </div>
      <div class="rocky-messages" id="rockyMessages" role="log" aria-live="polite" aria-relevant="additions text"></div>
      <form class="rocky-foot" id="rockyForm">
        <label class="rocky-sr-only" for="rockyInput" data-rocky-input-label>اكتب سؤالك</label>
        <input class="rocky-input" id="rockyInput" name="question" type="text" autocomplete="off" maxlength="180" placeholder="مثلاً: شاحن أقل من 50 ريال">
        <button class="rocky-send" type="submit" aria-label="إرسال السؤال">↑</button>
      </form>
      <div class="rocky-disclaimer" data-rocky-note>روكي يبحث في كتالوج المتجر الحالي؛ قد تكون بعض المواصفات غير متوفرة.</div>
    </section>`;
  document.body.appendChild(root);

  const $ = (selector) => root.querySelector(selector);
  const launcher = $('#rockyLauncher');
  const panel = $('#rockyPanel');
  const messages = $('#rockyMessages');
  const input = $('#rockyInput');
  let greeted = false;
  let lastFocused = null;

  const copy = {
    ar: {
      launch:'مساعد التسوّق', status:'جاهز يساعدك تختار', welcome:'يا هلا! أنا روكي. قل لي وش تدور عليه، وأطلع لك المنتجات الموجودة في كتالوج ROCK.',
      greet:'يا هلا والله! حيّاك في ROCK. وش ودّك تلاقي اليوم؟',
      ask:'اكتب اسم المنتج أو الموديل أو نوع الإكسسوار، وببحث لك في كتالوج ROCK.',
      noResults:'ما لقيت تطابق واضح في الكتالوج الحالي. جرّب اسم الموديل أو نوع المنتج، أو تصفّح المتجر كامل.',
      showResults:'لقيت لك هالخيارات من كتالوج ROCK:',
      compare:'هذي مقارنة سريعة حسب المعلومات المسجلة في الكتالوج. المواصفات غير الموجودة ما راح أفترضها:',
      addSuccess:'تمت الإضافة للسلة.',
      addFailed:'ما قدرت أضيف المنتج للسلة. حدّث الصفحة وجرّب مرة ثانية.',
      input:'مثلاً: شاحن أقل من 50 ريال', label:'اكتب سؤالك', close:'إغلاق مساعد روكي',
      view:'عرض المنتج', add:'أضف للسلة', model:'الموديل', price:'السعر', comparePrompt:'للمقارنة، حدّد موديلين أو اكتب نوع المنتج اللي تقارن بينه.',
      greetingWords:['هلا','هلا والله','السلام عليكم','مرحبا','مرحبتين','يا هلا','hello','hi'],
      shortcut:[['أبغى شاحن','أبحث عن كابل'],['السماعات','قارن منتجين']]
    },
    en: {
      launch:'Shopping assistant', status:'Here to help you choose', welcome:'Hi! I’m Rocky. Tell me what you need and I’ll search the products listed in the ROCK catalog.',
      greet:'Hey there, welcome to ROCK. What are you looking for today?',
      ask:'Enter a product name, model, or accessory type and I’ll search the ROCK catalog.',
      noResults:'I couldn’t find a clear match in the current catalog. Try a model number or product type, or browse the full store.',
      showResults:'Here are matching items from the ROCK catalog:',
      compare:'A quick comparison using only details recorded in the catalog. I won’t assume missing specifications:',
      addSuccess:'Added to your bag.', addFailed:'I could not add the item. Refresh the page and try again.',
      input:'For example: charger under 50 SAR', label:'Type your question', close:'Close Rocky assistant',
      view:'View product', add:'Add to bag', model:'Model', price:'Price', comparePrompt:'For a comparison, enter two model numbers or the product type.',
      greetingWords:['hello','hi','hey','good morning','good evening'], shortcut:[['Find a charger','Find a cable'],['Earphones','Compare products']]
    }
  };
  const english = () => (document.documentElement.lang || 'ar').toLowerCase().startsWith('en');
  const t = key => (english() ? copy.en : copy.ar)[key] || key;
  const escText = value => String(value ?? '');

  function normalize(value) {
    return String(value || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function categoryOf(query) {
    const q = normalize(query);
    const rules = [
      ['audio', ['سماعه','سماعات','سماعه اذن','ايربودز','اير بودز','سماعه لاسلكيه','هيدفون','headphone','earphone','earbud','audio','pods','sound']],
      ['car', ['سياره','السياره','سياره','سيارات','شاحن سياره','حامل جوال','للسياره','car charger','car mount','drive']],
      ['lifestyle', ['حامل','ستاند','قاعده','مسكه','حامل جوال','lifestyle','everyday']],
      ['power', ['شاحن','شواحن','شحن','كابل','كيبل','كابلات','كيابل','سلك','اسلاك','باور بانك','باوربانك','power bank','charger','charging','cable','usb','power']]
    ];
    for (const [category, words] of rules) if (words.some(word => q.includes(normalize(word)))) {
      if (category === 'power' && /سياره|السياره|للسياره|شاحن سياره/.test(q)) return 'car';
      if (category === 'lifestyle' && /سياره|للسياره/.test(q)) return 'car';
      return category;
    }
    return '';
  }
  function isGreeting(q) {
    const n = normalize(q);
    return (english() ? ['hello','hi','hey','good morning','good evening'] : ['هلا','هلا والله','السلام عليكم','مرحبا','مرحبتين','يا هلا','سلام عليكم'])
      .some(word => n === normalize(word));
  }
  function priceBounds(query) {
    const q = normalize(query);
    const m = q.match(/(?:اقل من|تحت|ارخص من|less than|under|below)\s*(\d+(?:\.\d+)?)/);
    const x = q.match(/(?:اكثر من|فوق|اعلى من|more than|over|above)\s*(\d+(?:\.\d+)?)/);
    const between = q.match(/(?:بين|between)\s*(\d+(?:\.\d+)?)\s*(?:و|and|-)\s*(\d+(?:\.\d+)?)/);
    return { min: x ? Number(x[1]) : between ? Math.min(Number(between[1]), Number(between[2])) : null,
      max: m ? Number(m[1]) : between ? Math.max(Number(between[1]), Number(between[2])) : null };
  }
  function requestedType(query) {
    const q = normalize(query);
    if (/power bank|powerbank|باور بانك|باوربانك|بطاريه متنقله|portable charger/.test(q)) return 'powerbank';
    if (/cable|cord|كابل|كيبل|كيابل|كابلات|سلك|اسلاك/.test(q)) return 'cable';
    if (/charger|شاحن|شواحن/.test(q)) return 'charger';
    return '';
  }
  function matchesRequestedType(product, type) {
    const haystack = normalize([product.nameAr, product.nameEn, product.descriptionEn].join(' '));
    if (type === 'powerbank') return /power bank|powerbank|portable charger|portable battery|باور بانك|باوربانك|بطاريه متنقله/.test(haystack);
    if (type === 'cable') return /cable|cord|كابل|كيبل|سلك/.test(haystack);
    if (type === 'charger') return /charger|شاحن/.test(haystack);
    return true;
  }
  function rankProducts(query) {
    const q = normalize(query);
    const category = categoryOf(query);
    const bounds = priceBounds(query);
    const words = q.split(' ').filter(word => word.length > 1 && !['ابغى','ابي','احتاج','عندي','ممكن','ودي','ابي','ابحث','عن','لي','من','في','على','with','the','for','find','need','want','show','me'].includes(word));
    let ranked = PRODUCTS.map((p, index) => {
      const haystack = normalize([p.model,p.barcode,p.nameAr,p.nameEn,p.descriptionEn,p.category].join(' '));
      let score = 0;
      if (category && p.category === category) score += 5;
      for (const word of words) if (haystack.includes(word)) score += word.length >= 5 ? 3 : 1;
      if (q && haystack.includes(q)) score += 10;
      if (bounds.min !== null && p.price < bounds.min) score = -100;
      if (bounds.max !== null && p.price > bounds.max) score = -100;
      return { p, score, index };
    }).filter(item => item.score >= 0);
    if (category) ranked = ranked.filter(item => item.p.category === category);
    const intent = requestedType(query);
    if (intent) ranked = ranked.filter(item => matchesRequestedType(item.p, intent));
    ranked.sort((a,b) => b.score - a.score || a.index-b.index);
    if (ranked.length && !category && words.length && ranked[0].score <= 1) return [];
    return ranked.map(item => item.p);
  }
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = escText(text);
    return el;
  }
  function addMessage(text, who) {
    const bubble = node('div', 'rocky-message' + (who === 'user' ? ' user' : ''), text);
    bubble.dir = english() ? 'ltr' : 'rtl';
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }
  function addProductCards(items, compareMode) {
    const wrap = node('div', 'rocky-results');
    items.slice(0, compareMode ? 2 : 3).forEach(product => {
      const card = node('article','rocky-product');
      const imageWrap = node('div','rocky-product-img');
      const safeImage = typeof product.image === 'string' && /^assets\/products\/[a-z0-9-]+\.webp$/i.test(product.image);
      if (safeImage) {
        const img = document.createElement('img');
        img.src = product.image; img.alt = escText(english() ? product.nameEn : product.nameAr);
        img.loading = 'lazy'; img.width = 65; img.height = 65;
        img.addEventListener('error', () => { imageWrap.replaceChildren(node('span','rocky-product-placeholder','ROCK')); }, { once: true });
        imageWrap.appendChild(img);
      } else imageWrap.appendChild(node('span','rocky-product-placeholder','ROCK'));
      const info = node('div','rocky-product-info');
      info.appendChild(node('span','rocky-product-model',product.model || 'ROCK'));
      info.appendChild(node('span','rocky-product-name',english() ? product.nameEn : product.nameAr));
      info.appendChild(node('span','rocky-product-desc',`${t('price')}: ${Number(product.price).toLocaleString(english()?'en-US':'ar-SA',{maximumFractionDigits:2})} ${english()?'SAR':'ر.س'}`));
      if (compareMode && product.descriptionEn && english()) info.appendChild(node('span','rocky-product-desc',product.descriptionEn));
      const actions = node('div','rocky-product-actions');
      const link = node('a','rocky-product-view',t('view'));
      link.href = 'product.html?id=' + encodeURIComponent(product.id);
      const add = node('button','rocky-product-add',t('add'));
      add.type = 'button';
      add.addEventListener('click', () => requestAdd(product));
      actions.append(link,add); info.appendChild(actions); card.append(imageWrap,info); wrap.appendChild(card);
    });
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }
  function requestAdd(product) {
    let answered = false;
    const detail = { id: product.id, respond: (ok) => {
      if (answered) return; answered = true;
      addMessage(ok ? t('addSuccess') : t('addFailed'),'bot');
    }};
    const event = new CustomEvent('rock:assistant-add', { detail });
    window.dispatchEvent(event);
    if (!answered && !event.defaultPrevented) detail.respond(false);
  }
  function respond(query) {
    const question = query.trim();
    if (!question) return;
    addMessage(question,'user');
    const q = normalize(question);
    if (isGreeting(question)) { addMessage(t('greet'),'bot'); return; }
    const compareMode = /قارن|مقارنه|الفرق|compare|comparison/.test(q);
    const results = rankProducts(question);
    if (!results.length) {
      const category = categoryOf(question);
      if (compareMode) addMessage(t('comparePrompt'),'bot');
      else if (/توصيه|اقترح|وش اختار|what should|recommend|best/.test(q) && category) {
        addMessage(t('showResults'),'bot'); addProductCards(PRODUCTS.filter(p=>p.category===category).slice(0,3),false);
      } else addMessage(t('noResults'),'bot');
      return;
    }
    if (compareMode) {
      addMessage(t('compare'),'bot'); addProductCards(results.slice(0,2),true);
    } else {
      addMessage(t('showResults'),'bot'); addProductCards(results.slice(0,3),false);
    }
  }
  function openPanel() {
    lastFocused = document.activeElement;
    panel.hidden = false; launcher.setAttribute('aria-expanded','true');
    $('#rockyIntro').hidden = false;
    if (!greeted) { greeted = true; addMessage(t('ask'),'bot'); }
    input.focus();
  }
  function closePanel() {
    panel.hidden = true; launcher.setAttribute('aria-expanded','false');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    else launcher.focus();
  }
  function applyLanguage() {
    const en = english();
    launcher.setAttribute('aria-label', en ? 'Open Rocky shopping assistant' : 'افتح مساعد روكي');
    $('[data-rocky-launch-sub]').textContent = t('launch');
    $('[data-rocky-status]').textContent = t('status');
    $('[data-rocky-welcome]').textContent = t('welcome');
    $('[data-rocky-input-label]').textContent = t('label');
    input.placeholder = t('input');
    $('#rockyClose').setAttribute('aria-label',t('close'));
    root.dir = en ? 'ltr' : 'rtl';
    root.querySelectorAll('[data-rocky-query]').forEach((button,index)=>{
      const list = en ? ['Find a charger','Find a cable','Earphones','Compare products'] : ['أبغى شاحن','أبحث عن كابل','أبغى سماعات','قارن لي بين منتجين'];
      button.textContent = list[index] || button.textContent;
      button.dataset.query = list[index] || button.dataset.query;
    });
    root.setAttribute('aria-label', en ? 'ROCKY shopping assistant' : 'مساعد التسوّق روكي');
  }

  launcher.addEventListener('click', () => panel.hidden ? openPanel() : closePanel());
  $('#rockyClose').addEventListener('click',closePanel);
  $('#rockyForm').addEventListener('submit', event => {
    event.preventDefault();
    const query = input.value; input.value = ''; respond(query);
  });
  root.querySelectorAll('[data-rocky-query]').forEach(button=>button.addEventListener('click',()=>respond(button.dataset.query)));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)closePanel();});
  const langButton = document.getElementById('langBtn');
  if (langButton) langButton.addEventListener('click', () => window.setTimeout(applyLanguage,0));
  applyLanguage();
})();
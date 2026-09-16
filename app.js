(() => {
  const products = (window.ROCK_PRODUCTS || []).filter(p => Number.isFinite(Number(p.price)) && p.image);
  const state = { query:'', category:'all', sort:'featured', lang:'ar', cart:JSON.parse(localStorage.getItem('rock-cart-v2') || '{}') };
  const $ = id => document.getElementById(id);
  const el = { grid:$('catalogGrid'), featured:$('featuredGrid'), chips:$('chips'), search:$('search'), sort:$('sort'), empty:$('empty'), total:$('productTotal'), count:$('cartCount'), items:$('cartItems'), cartTotal:$('cartTotal'), drawer:$('cartDrawer'), overlay:$('cartOverlay'), lang:$('langBtn'), year:$('year'), menu:$('menuBtn') };
  const cats = { all:{ar:'الكل',en:'All'}, power:{ar:'الطاقة والشحن',en:'Power'}, audio:{ar:'الصوت',en:'Audio'}, car:{ar:'السيارة',en:'Car'}, lifestyle:{ar:'أسلوب الحياة',en:'Lifestyle'} };
  const text = { ar:{cart:'السلة',search:'ابحث بالاسم أو الموديل',empty:'لا توجد منتجات مطابقة للبحث.',cartEmpty:'السلة فارغة حاليًا',continue:'متابعة الطلب',note:'الواجهة جاهزة للربط بالدفع والشحن.'}, en:{cart:'Cart',search:'Search by product or model',empty:'No products match your search.',cartEmpty:'Your cart is empty',continue:'Continue order',note:'Ready for payment and shipping integration.'} };
  const locale = () => state.lang === 'ar' ? 'ar-SA' : 'en-SA';
  const money = n => new Intl.NumberFormat(locale(),{style:'currency',currency:'SAR',minimumFractionDigits:2}).format(Number(n));
  const name = p => state.lang === 'ar' ? p.nameAr : p.nameEn;
  const esc = s => String(s).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const persist = () => localStorage.setItem('rock-cart-v2',JSON.stringify(state.cart));
  function visible(){
    let out = products.filter(p => state.category==='all' || p.category===state.category);
    const q = state.query.trim().toLowerCase();
    if(q) out = out.filter(p => `${p.nameAr} ${p.nameEn} ${p.model}`.toLowerCase().includes(q));
    if(state.sort==='low') out.sort((a,b)=>a.price-b.price);
    if(state.sort==='high') out.sort((a,b)=>b.price-a.price);
    return out;
  }
  function card(p){return `<article class="product-card"><div class="product-media"><img loading="lazy" src="${esc(p.image)}" alt="${esc(name(p))}" onerror="this.closest('.product-card').remove()"><span class="price">${money(p.price)}</span></div><div class="product-info"><span class="model">${esc(p.model)}</span><h3 class="product-name">${esc(name(p))}</h3><div class="product-bottom"><strong class="product-price">${money(p.price)}</strong><button class="add" data-add="${esc(p.id)}" aria-label="${state.lang==='ar'?'إضافة إلى السلة':'Add to cart'}">+</button></div></div></article>`}
  function feature(p,i){return `<article class="featured-card"><span class="meta">0${i+1} / ${esc(p.model)}</span><span class="mark"></span><div><div class="name">${esc(name(p).replace(/^ROCK\s*/,'')}</div><div class="price">${money(p.price)}</div></div></article>`}
  function updateMobileNav(){
    const nav = document.querySelector('.mobile-nav');
    if(nav) nav.innerHTML = `<a href="#shop">${state.lang==='ar'?'المتجر':'Shop'}</a><a href="#featured">${state.lang==='ar'?'المختارات':'Featured'}</a><a href="#about">ROCK</a>`;
  }
  function render(){
    el.chips.innerHTML = Object.entries(cats).map(([k,v])=>`<button class="chip ${state.category===k?'active':''}" data-cat="${k}">${v[state.lang]}</button>`).join('');
    const out = visible(); el.grid.innerHTML = out.map(card).join(''); el.empty.hidden = out.length>0;
    const featured = [...products].sort((a,b)=>b.price-a.price).slice(0,4); el.featured.innerHTML = featured.map(feature).join('');
    el.total.textContent = products.length; el.search.placeholder=text[state.lang].search; renderCart(); bind(); updateMobileNav();
    document.documentElement.lang=state.lang; document.documentElement.dir=state.lang==='ar'?'rtl':'ltr';
  }
  function bind(){
    document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;render()});
    document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>add(b.dataset.add));
    document.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>qty(b.dataset.inc,1));
    document.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>qty(b.dataset.dec,-1));
  }
  function add(id){state.cart[id]=(state.cart[id]||0)+1;persist();renderCart();openCart()}
  function qty(id,delta){state.cart[id]=(state.cart[id]||0)+delta;if(state.cart[id]<=0)delete state.cart[id];persist();renderCart()}
  function renderCart(){
    const lines=Object.entries(state.cart).map(([id,q])=>{const p=products.find(x=>x.id===id);return p?{p,q}:null}).filter(Boolean);
    const count=lines.reduce((s,x)=>s+x.q,0), total=lines.reduce((s,x)=>s+x.q*x.p.price,0); el.count.textContent=count; el.cartTotal.textContent=money(total);
    el.items.innerHTML=lines.length?lines.map(({p,q})=>`<div class="cart-line"><img src="${esc(p.image)}" alt=""><div><h4>${esc(name(p))}</h4><small>${money(p.price)} × ${q}</small></div><div class="qty"><button data-dec="${esc(p.id)}">−</button><span>${q}</span><button data-inc="${esc(p.id)}">+</button></div></div>`).join(''):`<div class="empty">${text[state.lang].cartEmpty}</div>`;
    bind();
  }
  function openCart(){el.drawer.classList.add('open');el.overlay.classList.add('open');document.body.classList.add('lock')}
  function closeCart(){el.drawer.classList.remove('open');el.overlay.classList.remove('open');document.body.classList.remove('lock')}
  el.search.oninput=e=>{state.query=e.target.value;render()}; el.sort.onchange=e=>{state.sort=e.target.value;render()}; $('cartBtn').onclick=openCart; $('closeCart').onclick=closeCart; el.overlay.onclick=closeCart;
  $('checkoutBtn').onclick=()=>alert(text[state.lang].note);
  el.lang.onclick=()=>{state.lang=state.lang==='ar'?'en':'ar';el.lang.textContent=state.lang==='ar'?'EN':'AR';render()};
  el.menu.onclick=()=>document.querySelector('.mobile-nav')?.classList.toggle('open');
  const nav=document.createElement('nav');nav.className='mobile-nav';document.body.appendChild(nav);
  el.year.textContent=new Date().getFullYear(); render();
})();

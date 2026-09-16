(() => {
  const products = Array.isArray(window.ROCK_PRODUCTS) ? window.ROCK_PRODUCTS.filter(p => Number.isFinite(Number(p.price))) : [];
  const state = { query: '', category: 'all', sort: 'featured', lang: 'ar', cart: JSON.parse(localStorage.getItem('rock-cart') || '{}') };
  const els = {
    grid: document.getElementById('catalogGrid'), featured: document.getElementById('featuredGrid'), chips: document.getElementById('chips'), empty: document.getElementById('empty'),
    search: document.getElementById('search'), sort: document.getElementById('sort'), cartCount: document.getElementById('cartCount'), cartItems: document.getElementById('cartItems'), cartTotal: document.getElementById('cartTotal'),
    drawer: document.getElementById('cartDrawer'), overlay: document.getElementById('cartOverlay'), year: document.getElementById('year'), productTotal: document.getElementById('productTotal'), langBtn: document.getElementById('langBtn'), menuBtn: document.getElementById('menuBtn')
  };
  const cats = {all:'الكل',power:'الطاقة والشحن',audio:'الصوت',car:'السيارة',lifestyle:'أسلوب الحياة'};
  const money = value => new Intl.NumberFormat(state.lang === 'ar' ? 'ar-SA' : 'en-SA', {style:'currency',currency:'SAR',minimumFractionDigits:2}).format(value);
  const save = () => localStorage.setItem('rock-cart', JSON.stringify(state.cart));
  const image = src => src || 'assets/products/catalog-placeholder.svg';
  const visible = () => {
    let out = products.filter(p => state.category === 'all' || p.category === state.category);
    const q = state.query.trim().toLowerCase();
    if (q) out = out.filter(p => `${p.name} ${p.model}`.toLowerCase().includes(q));
    if (state.sort === 'low') out.sort((a,b) => a.price - b.price);
    if (state.sort === 'high') out.sort((a,b) => b.price - a.price);
    return out;
  };
  const productCard = p => `<article class="product-card">
      <div class="product-media"><img loading="lazy" src="${image(p.image)}" alt="${escapeHtml(p.name)}" onerror="this.src='assets/products/catalog-placeholder.svg'"><span class="price-tag">${money(p.price)}</span></div>
      <div class="product-info"><span class="product-code">${escapeHtml(p.model || p.id)}</span><h3 class="product-name">${escapeHtml(p.name)}</h3>
      <div class="product-bottom"><strong class="product-price">${money(p.price)}</strong><button class="add" data-add="${p.id}" aria-label="إضافة إلى السلة">+</button></div></div>
    </article>`;
  const featureCard = (p,i) => `<article class="feature-card"><span class="index">0${i+1} / ROCK</span><span class="feature-icon"></span><div><h3>${escapeHtml(p.name.replace(/^ROCK /,''))}</h3><span class="price">${money(p.price)}</span></div></article>`;
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
  function render(){
    els.chips.innerHTML = Object.entries(cats).map(([key,label]) => `<button class="chip ${state.category===key?'active':''}" data-cat="${key}">${label}</button>`).join('');
    const out = visible(); els.grid.innerHTML = out.map(productCard).join(''); els.empty.hidden = out.length !== 0;
    const featured = [...products].sort((a,b)=>a.price-b.price).slice(-4); els.featured.innerHTML = featured.map(featureCard).join('');
    els.productTotal.textContent = products.length; bindDynamic(); renderCart();
  }
  function bindDynamic(){
    document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;render()});
    document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addToCart(b.dataset.add));
  }
  function addToCart(id){state.cart[id]=(state.cart[id]||0)+1;save();renderCart();openCart();}
  function changeQty(id,d){state.cart[id]=(state.cart[id]||0)+d;if(state.cart[id]<=0)delete state.cart[id];save();renderCart()}
  function renderCart(){
    const lines=Object.entries(state.cart).map(([id,qty])=>{const p=products.find(x=>x.id===id);return p?{p,qty}:null}).filter(Boolean);
    const count=lines.reduce((n,x)=>n+x.qty,0), total=lines.reduce((n,x)=>n+x.qty*x.p.price,0); els.cartCount.textContent=count; els.cartTotal.textContent=money(total);
    els.cartItems.innerHTML=lines.length?lines.map(({p,qty})=>`<div class="cart-line"><img src="${image(p.image)}" alt=""><div><h4>${escapeHtml(p.name)}</h4><small>${money(p.price)} × ${qty}</small></div><div class="qty"><button data-dec="${p.id}">−</button><span>${qty}</span><button data-inc="${p.id}">+</button></div></div>`).join(''):`<div class="empty">السلة فارغة حاليًا</div>`;
    document.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>changeQty(b.dataset.inc,1)); document.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>changeQty(b.dataset.dec,-1));
  }
  function openCart(){els.drawer.classList.add('open');els.overlay.classList.add('open');document.body.style.overflow='hidden'}
  function closeCart(){els.drawer.classList.remove('open');els.overlay.classList.remove('open');document.body.style.overflow=''}
  els.search.oninput=e=>{state.query=e.target.value;render()}; els.sort.onchange=e=>{state.sort=e.target.value;render()}; document.getElementById('cartBtn').onclick=openCart; document.getElementById('closeCart').onclick=closeCart; els.overlay.onclick=closeCart;
  document.getElementById('checkoutBtn').onclick=()=>alert('واجهة الطلب جاهزة للربط بخدمة دفع لاحقًا.');
  els.langBtn.onclick=()=>{state.lang=state.lang==='ar'?'en':'ar';els.langBtn.textContent=state.lang==='ar'?'EN':'AR';document.documentElement.lang=state.lang;document.documentElement.dir=state.lang==='ar'?'rtl':'ltr';render()};
  els.menuBtn.onclick=()=>{let nav=document.querySelector('.mobile-nav');if(!nav){nav=document.createElement('nav');nav.className='mobile-nav';nav.innerHTML='<a href="#shop">المتجر</a><a href="#featured">مختاراتنا</a><a href="#story">عن ROCK</a>';document.body.appendChild(nav)}nav.classList.toggle('open')};
  els.year.textContent=new Date().getFullYear(); render();
})();

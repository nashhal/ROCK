(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const readCart = () => { try { return JSON.parse(localStorage.getItem('rockCart') || '[]'); } catch { return []; } };
  const catalog = () => (typeof products !== 'undefined' && Array.isArray(products)) ? products : [];
  const money = value => window.ROCK_COMMERCE?.money ? window.ROCK_COMMERCE.money(value) : (value == null ? 'السعر عند الطلب' : `${Number(value).toLocaleString('ar-SA')} ر.س`);
  const cart = readCart();
  const list = catalog();
  const rows = cart.map(item => ({ item, product: list.find(p => p.id === item.id) })).filter(x => x.product);
  const items = $('#checkoutItems');
  const total = $('#checkoutTotal');
  const error = $('#checkoutError');
  const form = $('#checkoutForm');
  const success = $('#checkoutSuccess');

  function render() {
    if (!rows.length) {
      items.innerHTML = '<div class="muted">السلة فارغة. <a href="index.html#shop">العودة للمتجر</a></div>';
      $('#submitOrder').disabled = true;
      total.textContent = '0 ر.س';
      return;
    }
    let sum = 0;
    items.innerHTML = rows.map(({ item, product }) => {
      if (product.price != null) sum += Number(product.price) * Number(item.qty || 1);
      return `<div class="order-row"><div><strong>${esc(product.name)}</strong><small>${item.qty || 1} × ${esc(money(product.price))}</small></div><strong>${product.price == null ? 'عند الطلب' : esc(money(product.price * (item.qty || 1)))}</strong></div>`;
    }).join('');
    total.textContent = sum ? money(sum) : 'يحدد عند الطلب';
  }

  function esc(v) { return String(v ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c])); }
  function orderId() { return `ROCK-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,8).toUpperCase()}`; }

  form?.addEventListener('submit', e => {
    e.preventDefault();
    if (!rows.length) return;
    error.classList.remove('show');
    const data = new FormData(form);
    if (!data.get('name') || !data.get('phone') || !data.get('city') || !data.get('address')) {
      error.textContent = 'يرجى تعبئة الاسم والجوال والمدينة والعنوان.';
      error.classList.add('show');
      return;
    }
    const id = orderId();
    const payload = {
      id, createdAt: new Date().toISOString(), customer: Object.fromEntries(data.entries()),
      items: rows.map(({ item, product }) => ({ id: product.id, name: product.name, qty: item.qty || 1, price: product.price })),
      note: 'Order captured locally. Connect ROCK checkoutApi/paymentApi for production fulfillment.'
    };
    try {
      localStorage.setItem(`rock-order-${id}`, JSON.stringify(payload));
      localStorage.removeItem('rockCart');
    } catch (_) {}
    $('#orderId').textContent = id;
    form.style.display = 'none';
    success.classList.add('show');
  });
  render();
})();

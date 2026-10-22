(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const state = { csrf: $('meta[name="csrf-token"]')?.content || '', products: [], filtered: [], orders: [], filteredOrders: [], view: 'products' };
  let toastTimer = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function setMessage(selector, message, type = '') {
    const node = $(selector);
    if (!node) return;
    node.textContent = message || '';
    node.className = 'form-message' + (type ? ' ' + type : '');
  }

  function showToast(message, type = '') {
    const node = $('#toast');
    node.textContent = message;
    node.className = 'toast is-visible' + (type ? ' ' + type : '');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { node.className = 'toast'; }, 3200);
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const payload = contentType.includes('application/json') ? await response.json() : {};
    if (!response.ok) throw new Error(payload.error || 'تعذّر الاتصال بالخادم. تحقق من إعداد PHP وقاعدة البيانات.');
    return payload;
  }

  function addCsrf(form) {
    form.set('csrf', state.csrf);
  }

  function setAuthenticated(username) {
    $('#loginPanel').hidden = true;
    $('#dashboard').hidden = false;
    $('#logoutButton').hidden = false;
    $('#currentAdminName')?.replaceChildren(document.createTextNode(username || 'ROCK admin'));
  }

  function setLoggedOut() {
    $('#loginPanel').hidden = false;
    $('#dashboard').hidden = true;
    $('#logoutButton').hidden = true;
  }

  async function bootstrap() {
    if (document.body.dataset.setupNeeded === '1') return;
    try {
      const me = await api('api.php?action=me');
      state.csrf = me.csrf || state.csrf;
      if (me.authenticated) {
        setAuthenticated(me.username);
        await Promise.all([loadProducts(), loadOrders()]);
      } else {
        setLoggedOut();
      }
    } catch (error) {
      setLoggedOut();
      setMessage('#loginMessage', error.message, 'error');
    }
  }

  async function loadProducts() {
    setMessage('#catalogMessage', 'جارٍ تحميل المنتجات…');
    try {
      const payload = await api('api.php?action=products');
      state.products = Array.isArray(payload.products) ? payload.products : [];
      state.filtered = state.products;
      $('#totalCount').textContent = String(payload.counts?.all ?? state.products.length);
      $('#activeCount').textContent = String(payload.counts?.active ?? state.products.filter(p => p.active).length);
      $('#hiddenCount').textContent = String(payload.counts?.hidden ?? state.products.filter(p => !p.active).length);
      filterProducts();
      setMessage('#catalogMessage', '');
    } catch (error) {
      setMessage('#catalogMessage', error.message, 'error');
    }
  }

  const orderStatusLabels = {
    new: 'جديد',
    confirmed: 'تم التأكيد',
    preparing: 'قيد التجهيز',
    shipped: 'تم الشحن',
    delivered: 'تم التسليم',
    cancelled: 'ملغي'
  };
  const orderStatusTransitions = {
    new: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: []
  };

  function orderDate(value) {
    const raw = String(value || '');
    const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
    return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh'
    }).format(parsed);
  }

  function renderOrders() {
    const body = $('#ordersBody');
    if (!body) return;
    const query = ($('#searchOrders')?.value || '').trim().toLocaleLowerCase();
    state.filteredOrders = state.orders.filter(order =>
      !query || [order.order_number, order.customer_name, order.customer_phone, order.customer_city]
        .some(value => String(value || '').toLocaleLowerCase().includes(query))
    );
    $('#ordersTotalCount').textContent = String(state.orders.length);
    $('#ordersNewCount').textContent = String(state.orders.filter(order => order.status === 'new').length);
    const today = new Date().toISOString().slice(0, 10);
    $('#ordersTodayCount').textContent = String(state.orders.filter(order => String(order.created_at || '').slice(0, 10) === today).length);
    body.replaceChildren();
    if (!state.filteredOrders.length) {
      body.innerHTML = '<tr><td class="empty-cell" colspan="8">لا توجد طلبات مطابقة للبحث.</td></tr>';
      return;
    }
    for (const order of state.filteredOrders) {
      const row = document.createElement('tr');
      const currentStatus = String(order.status || 'new');
      const options = [currentStatus, ...(orderStatusTransitions[currentStatus] || [])]
        .filter((value, index, values) => values.indexOf(value) === index);
      const statusOptions = options.map(status =>
        '<option value="' + escapeHtml(status) + '"' + (status === currentStatus ? ' selected' : '') + '>' +
        escapeHtml(orderStatusLabels[status] || status) + '</option>'
      ).join('');
      row.innerHTML =
        '<td><strong class="order-id">' + escapeHtml(order.order_number) + '</strong><small class="order-subtext">' + escapeHtml(order.currency || 'SAR') + '</small></td>' +
        '<td><strong class="product-ar">' + escapeHtml(order.customer_name) + '</strong><small class="order-subtext">' + escapeHtml(order.customer_city || '—') + '</small></td>' +
        '<td><span dir="ltr">' + escapeHtml(order.customer_phone) + '</span></td>' +
        '<td>' + escapeHtml(order.item_count || 0) + '</td>' +
        '<td><strong class="price-value">' + escapeHtml(money(order.subtotal)) + '</strong><small class="order-subtext">مجموع المنتجات</small></td>' +
        '<td><span class="order-subtext">' + escapeHtml(orderDate(order.created_at)) + '</span></td>' +
        '<td><select class="order-status-select" data-order-status="' + escapeHtml(order.id) + '" data-current-status="' + escapeHtml(currentStatus) + '" aria-label="تغيير حالة ' + escapeHtml(order.order_number) + '">' + statusOptions + '</select></td>' +
        '<td><button class="btn btn-small btn-edit" type="button" data-order-details="' + escapeHtml(order.id) + '">عرض</button></td>';
      body.appendChild(row);
    }
  }

  async function loadOrders() {
    if (!$('#ordersBody')) return;
    setMessage('#ordersMessage', 'جارٍ تحميل الطلبات…');
    try {
      const payload = await api('api.php?action=orders');
      state.orders = Array.isArray(payload.orders) ? payload.orders : [];
      renderOrders();
      setMessage('#ordersMessage', state.orders.length ? 'تم تحميل ' + state.orders.length + ' طلبًا. تظهر آخر 200 طلب.' : 'لا توجد طلبات مسجلة بعد.');
    } catch (error) {
      state.orders = [];
      renderOrders();
      setMessage('#ordersMessage', error.message, 'error');
    }
  }

  async function updateOrderStatus(select) {
    const orderId = select.dataset.orderStatus;
    const nextStatus = select.value;
    const previous = select.dataset.currentStatus;
    if (!orderId || !nextStatus || nextStatus === previous) return;
    select.disabled = true;
    const data = new FormData();
    data.set('action', 'order_status');
    data.set('order_id', orderId);
    data.set('status', nextStatus);
    addCsrf(data);
    try {
      await api('api.php?action=order_status', { method: 'POST', body: data });
      showToast('تم تحديث حالة الطلب وتسجيل التغيير');
      await loadOrders();
    } catch (error) {
      showToast(error.message, 'error');
      select.value = previous;
      select.disabled = false;
    }
  }

  async function openOrderDetails(orderId) {
    const order = state.orders.find(item => String(item.id) === String(orderId));
    if (!order) return;
    $('#orderDetailTitle').textContent = 'تفاصيل ' + order.order_number;
    $('#orderDetailBody').innerHTML = '<p class="form-message">جارٍ تحميل العناصر…</p>';
    $('#orderDetailDialog').hidden = false;
    document.body.classList.add('dialog-open');
    try {
      const payload = await api('api.php?action=order_items&id=' + encodeURIComponent(order.id));
      const items = Array.isArray(payload.items) ? payload.items : [];
      const events = Array.isArray(payload.events) ? payload.events : [];
      const fields = [
        ['العميل', order.customer_name],
        ['الجوال', order.customer_phone],
        ['المدينة', order.customer_city || '—'],
        ['العنوان', order.customer_address || '—'],
        ['رقم الطلب', order.order_number],
        ['تاريخ الطلب', orderDate(order.created_at)],
        ['حالة الطلب', orderStatusLabels[order.status] || order.status],
        ['حالة الدفع', order.payment_status === 'paid' ? 'مدفوع' : 'غير مربوط'],
        ['مجموع المنتجات', money(order.subtotal)],
        ['الشحن', order.shipping == null ? 'غير محدد' : money(order.shipping)],
        ['الإجمالي النهائي', order.total == null ? 'يُحدد بعد تأكيد الشحن' : money(order.total)]
      ];
      const fieldsHtml = fields.map(([label, value]) =>
        '<div class="order-detail-field"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value ?? '—') + '</strong></div>'
      ).join('');
      const itemRows = items.map(item => '<tr><td><strong>' + escapeHtml(item.name_ar) + '</strong><small class="order-subtext" dir="ltr">' + escapeHtml(item.model) + '</small></td><td>' + escapeHtml(item.quantity) + '</td><td>' + escapeHtml(money(item.unit_price)) + '</td><td>' + escapeHtml(money(item.line_total)) + '</td></tr>').join('');
      const notes = String(order.customer_notes || '').trim();
      const eventLabels = { order_received: 'استلام الطلب', status_changed: 'تغيير حالة الطلب', shipping_updated: 'تحديث رسوم الشحن' };
      const eventsHtml = events.length
        ? '<ol class="order-events">' + events.map(event => '<li><div><strong>' + escapeHtml(eventLabels[event.event_type] || event.event_type) + '</strong><small>' + escapeHtml(event.actor_username || '—') + '</small></div><div><span>' + escapeHtml(event.from_status || '—') + ' → ' + escapeHtml(event.to_status || '—') + '</span><time>' + escapeHtml(orderDate(event.created_at)) + '</time></div></li>').join('') + '</ol>'
        : '<p class="order-detail-notes">لا يوجد سجل تغييرات إضافي.</p>';
      const shippingEditor = order.status === 'new'
        ? '<form id="orderShippingForm" data-order-id="' + escapeHtml(order.id) + '" class="shipping-editor"><label for="orderShippingInput">رسوم الشحن (ر.س)<input id="orderShippingInput" name="shipping" type="number" min="0" max="999999999" step="0.01" inputmode="decimal" value="' + escapeHtml(order.shipping == null ? '' : order.shipping) + '" required></label><button class="btn btn-primary" type="submit">حفظ رسوم الشحن</button><p>أدخل السعر الفعلي للشحن. اكتب 0 فقط إذا كان التوصيل مجانيًا فعلًا.</p></form>'
        : '<div class="order-payment-note">تم إغلاق تعديل الشحن بعد بدء تنفيذ الطلب. أي تعديل استثنائي يحتاج إلى إجراء موثق منفصل.</div>';
      $('#orderDetailBody').innerHTML =
        '<div class="order-detail-grid">' + fieldsHtml + '</div>' +
        shippingEditor +
        '<h3 style="font-size:13px;margin:0 0 8px">المنتجات</h3>' +
        '<div class="table-scroll"><table class="order-items-table"><thead><tr><th>المنتج / الموديل</th><th>الكمية</th><th>سعر الوحدة</th><th>المجموع</th></tr></thead><tbody>' +
        (itemRows || '<tr><td colspan="4" class="empty-cell">لا توجد عناصر.</td></tr>') + '</tbody></table></div>' +
        '<h3 style="font-size:13px;margin:18px 0 8px">سجل تغييرات الطلب</h3>' + eventsHtml +
        '<h3 style="font-size:13px;margin:16px 0 8px">ملاحظات العميل</h3><div class="order-detail-notes">' + escapeHtml(notes || 'لا توجد ملاحظات.') + '</div>' +
        '<div class="order-payment-note">لا يوجد مزود دفع أو شحن متصل بهذه النسخة. لا تعتبر حالة الدفع أو قيمة الشحن مؤكدة.</div>';
    } catch (error) {
      $('#orderDetailBody').innerHTML = '<p class="form-message error">' + escapeHtml(error.message) + '</p>';
    }
  }

  async function saveOrderShipping(form) {
    const orderId = form.dataset.orderId;
    const shipping = String(new FormData(form).get('shipping') || '').trim();
    if (!orderId || !/^\d{1,9}(?:\.\d{1,2})?$/.test(shipping)) {
      showToast('أدخل رسوم شحن صحيحة حتى منزلتين عشريتين.', 'error');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    const data = new FormData();
    data.set('action', 'order_shipping');
    data.set('order_id', orderId);
    data.set('shipping', shipping);
    addCsrf(data);
    try {
      await api('api.php?action=order_shipping', { method: 'POST', body: data });
      showToast('تم حفظ رسوم الشحن والإجمالي المبدئي.');
      await loadOrders();
      await openOrderDetails(orderId);
    } catch (error) {
      showToast(error.message, 'error');
      button.disabled = false;
    }
  }

  function closeOrderDetails() {
    $('#orderDetailDialog').hidden = true;
    document.body.classList.remove('dialog-open');
  }

  function setAdminView(view) {
    state.view = view === 'orders' ? 'orders' : 'products';
    $('#productsView').hidden = state.view !== 'products';
    $('#ordersView').hidden = state.view !== 'orders';
    $('#newProductButton').hidden = state.view !== 'products';
    $$('.view-tab').forEach(tab => {
      const active = tab.dataset.adminView === state.view;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    if (state.view === 'orders') loadOrders();
  }

  function money(value) {
    const number = Number(value);
    return (Number.isFinite(number) ? new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(number) : '—') + ' ر.س';
  }

  function imageUrl(path) {
    if (typeof path !== 'string' || !/^(?:assets|uploads)\/products\/[a-z0-9_-]+\.webp$/i.test(path)) return '';
    return '../' + path.split('/').map(part => encodeURIComponent(part)).join('/');
  }

  function renderProducts() {
    const body = $('#productsBody');
    if (!body) return;
    body.innerHTML = '';
    if (!state.filtered.length) {
      body.innerHTML = '<tr><td class="empty-cell" colspan="7">لا توجد منتجات مطابقة للبحث.</td></tr>';
      return;
    }

    for (const product of state.filtered) {
      const row = document.createElement('tr');
      const image = imageUrl(product.image);
      const statusText = !product.imageApproved ? 'صورة غير معتمدة' : (product.active ? 'معروض' : 'مخفي');
      const statusClass = product.imageApproved && product.active ? 'status-on' : 'status-off';
      row.innerHTML = `
        <td><div class="table-thumb">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">` : '<span>ROCK</span>'}</div></td>
        <td><strong class="sku" dir="ltr">${escapeHtml(product.model || product.id)}</strong><small class="barcode" dir="ltr">${escapeHtml(product.barcode || '')}</small></td>
        <td><strong class="product-ar">${escapeHtml(product.nameAr)}</strong><small class="product-en" dir="ltr">${escapeHtml(product.nameEn)}</small></td>
        <td><strong class="price-value">${escapeHtml(money(product.price))}</strong></td>
        <td><span class="stock-cell">${product.stockQuantity == null ? 'غير متتبع' : escapeHtml(String(product.stockQuantity)) + (Number(product.stockQuantity) <= Number(product.lowStockThreshold ?? 5) ? ' · منخفض' : ' وحدة')}</span></td>
        <td><span class="status-pill ${statusClass}">${escapeHtml(statusText)}</span></td>
        <td><div class="row-actions"><button class="btn btn-small btn-edit" type="button" data-edit="${escapeHtml(product.id)}">تعديل</button><button class="btn btn-small btn-delete" type="button" data-delete="${escapeHtml(product.id)}" aria-label="حذف ${escapeHtml(product.model || product.id)}">حذف</button></div></td>`;
      body.appendChild(row);
    }
  }

  function filterProducts() {
    const query = ($('#searchProducts')?.value || '').trim().toLocaleLowerCase();
    state.filtered = state.products.filter(product =>
      !query || [product.id, product.model, product.barcode, product.nameAr, product.nameEn]
        .some(value => String(value || '').toLocaleLowerCase().includes(query))
    );
    renderProducts();
  }

  function openDialog(product = null) {
    const form = $('#productForm');
    form.reset();
    setMessage('#productFormMessage', '');
    $('#imageStatus').textContent = '';
    $('#productImage').value = '';
    $('#formTitle').textContent = product ? 'تعديل المنتج' : 'إضافة منتج جديد';
    const idInput = $('#productId');
    idInput.readOnly = Boolean(product);
    idInput.classList.toggle('is-readonly', Boolean(product));

    if (product) {
      for (const [field, value] of Object.entries({
        id: product.id,
        model: product.model,
        barcode: product.barcode,
        category: product.category,
        price: product.price,
        name_ar: product.nameAr,
        name_en: product.nameEn,
        description_en: product.descriptionEn,
        pictures_url: product.picturesUrl,
        stock_quantity: product.stockQuantity == null ? '' : product.stockQuantity,
        low_stock_threshold: product.lowStockThreshold ?? 5
      })) {
        if (form.elements[field]) form.elements[field].value = value ?? '';
      }
      form.elements.active.checked = Boolean(product.active);
      $('#imageStatus').textContent = product.imageApproved ? 'الصورة الحالية معتمدة. اختيار صورة جديدة يستبدلها بعد فحصها.' : 'الصورة الحالية غير معتمدة؛ ارفع صورة واضحة بخلفية بيضاء قبل عرض المنتج.';
    } else {
      form.elements.active.checked = true;
      $('#imageStatus').textContent = 'الصورة الرئيسية مطلوبة للمنتج الجديد.';
    }

    $('#productDialog').hidden = false;
    document.body.classList.add('dialog-open');
    (product ? form.elements.price : idInput).focus();
  }

  function closeDialog() {
    $('#productDialog').hidden = true;
    document.body.classList.remove('dialog-open');
    $('#newProductButton').focus();
  }

  async function login(event) {
    event.preventDefault();
    const button = $('#loginForm button[type="submit"]');
    button.disabled = true;
    setMessage('#loginMessage', 'جارٍ التحقق…');
    try {
      const data = new FormData(event.currentTarget);
      data.set('action', 'login');
      data.set('csrf', state.csrf);
      const result = await api('api.php?action=login', { method: 'POST', body: data });
      state.csrf = result.csrf || state.csrf;
      setAuthenticated(result.username);
      event.currentTarget.reset();
      setMessage('#loginMessage', '');
      await Promise.all([loadProducts(), loadOrders()]);
    } catch (error) {
      setMessage('#loginMessage', error.message, 'error');
    } finally {
      button.disabled = false;
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('#saveButton');
    const isNew = !state.products.some(product => product.id === form.elements.id.value);
    if (isNew && !$('#productImage').files.length) {
      setMessage('#productFormMessage', 'ارفع صورة رئيسية واضحة بخلفية بيضاء للمنتج الجديد.', 'error');
      return;
    }

    button.disabled = true;
    button.textContent = 'جارٍ الحفظ…';
    setMessage('#productFormMessage', 'يتم حفظ البيانات وفحص الصورة على الخادم…');
    try {
      const data = new FormData(form);
      data.set('action', 'save');
      addCsrf(data);
      const result = await api('api.php?action=save', { method: 'POST', body: data });
      setMessage('#productFormMessage', '');
      closeDialog();
      showToast('تم حفظ المنتج بنجاح');
      await loadProducts();
      if (result.product?.id) {
        const row = $('#productsBody [data-edit="' + CSS.escape(result.product.id) + '"]');
        row?.focus();
      }
    } catch (error) {
      setMessage('#productFormMessage', error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'حفظ المنتج';
    }
  }

  async function deleteProduct(id) {
    const product = state.products.find(item => item.id === id);
    if (!product) return;
    if (!window.confirm('هل تريد حذف المنتج "' + product.nameAr + '"؟ لا يمكن التراجع عن حذف بياناته.')) return;

    const data = new FormData();
    data.set('action', 'delete');
    data.set('id', id);
    addCsrf(data);
    try {
      await api('api.php?action=delete', { method: 'POST', body: data });
      showToast('تم حذف المنتج');
      await loadProducts();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function logout() {
    const data = new FormData();
    data.set('action', 'logout');
    addCsrf(data);
    try {
      await api('api.php?action=logout', { method: 'POST', body: data });
      setLoggedOut();
      showToast('تم تسجيل الخروج');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  $$('.view-tab').forEach(tab => tab.addEventListener('click', () => setAdminView(tab.dataset.adminView)));
  $('#refreshOrdersButton')?.addEventListener('click', loadOrders);
  $('#refreshOrdersInline')?.addEventListener('click', loadOrders);
  $('#searchOrders')?.addEventListener('input', renderOrders);
  $('#ordersBody')?.addEventListener('change', event => {
    const select = event.target.closest('[data-order-status]');
    if (select) updateOrderStatus(select);
  });
  $('#ordersBody')?.addEventListener('click', event => {
    const button = event.target.closest('[data-order-details]');
    if (button) openOrderDetails(button.dataset.orderDetails);
  });
  $$('[data-close-order-dialog]').forEach(node => node.addEventListener('click', closeOrderDetails));
  $('#orderDetailBody')?.addEventListener('submit', event => {
    if (event.target.id === 'orderShippingForm') {
      event.preventDefault();
      saveOrderShipping(event.target);
    }
  });
  $('#loginForm')?.addEventListener('submit', login);
  $('#productForm')?.addEventListener('submit', saveProduct);
  $('#newProductButton')?.addEventListener('click', () => openDialog());
  $('#refreshButton')?.addEventListener('click', loadProducts);
  $('#searchProducts')?.addEventListener('input', filterProducts);
  $('#logoutButton')?.addEventListener('click', logout);
  $$('[data-close-dialog]').forEach(node => node.addEventListener('click', closeDialog));
  $('#productsBody')?.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit]');
    const remove = event.target.closest('[data-delete]');
    if (edit) {
      const product = state.products.find(item => item.id === edit.dataset.edit);
      if (product) openDialog(product);
    } else if (remove) {
      deleteProduct(remove.dataset.delete);
    }
  });
  $('#productImage')?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    $('#imageStatus').textContent = file ? file.name + ' — سيتم فحص الخلفية والوضوح عند الحفظ.' : '';
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('#productDialog').hidden) closeDialog();
    if (event.key === 'Escape' && !$('#orderDetailDialog').hidden) closeOrderDetails();
  });

  bootstrap();
})();

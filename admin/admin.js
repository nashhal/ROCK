(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const state = { csrf: $('meta[name="csrf-token"]')?.content || '', products: [], filtered: [] };
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
        await loadProducts();
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
      body.innerHTML = '<tr><td class="empty-cell" colspan="6">لا توجد منتجات مطابقة للبحث.</td></tr>';
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
        pictures_url: product.picturesUrl
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
      await loadProducts();
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
  });

  bootstrap();
})();

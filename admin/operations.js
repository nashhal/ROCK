(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const state = {
    csrf: $('meta[name="csrf-token"]')?.content || '',
    role: document.body.dataset.role || '',
    view: 'overview',
    inventory: [],
    customers: [],
    staff: [],
    report: null,
    overview: null
  };

  const viewMeta = {
    overview: ['OVERVIEW / 01', 'نظرة عامة', 'صورة تشغيلية لما يحدث في المتجر الآن.'],
    inventory: ['INVENTORY / 02', 'المخزون', 'راجع الكميات الفعلية وسجّل كل تعديل في سجل حركة المخزون.'],
    customers: ['CUSTOMERS / 03', 'العملاء', 'ملفات العملاء التي تم إنشاؤها من طلباتهم المحفوظة.'],
    reports: ['REPORTS / 04', 'التقارير', 'تابع قيمة الطلبات المسجلة خلال الفترة المحددة.'],
    staff: ['TEAM / 05', 'فريق العمل', 'إدارة حسابات المديرين ومندوبي المبيعات وصلاحياتهم.'],
    settings: ['SETTINGS / 06', 'إعدادات المتجر', 'إعدادات الشحن وطرق الدفع ومعلومات خدمة العملاء.']
  };

  const labels = {
    new: 'طلب جديد',
    waiting_rep: 'بانتظار المندوب',
    contacting: 'جاري التواصل',
    confirmed: 'مؤكد',
    preparing: 'قيد التجهيز',
    out_for_delivery: 'خرج للتوصيل',
    delivered: 'تم التسليم',
    failed_delivery: 'تعذر التسليم',
    cancelled: 'ملغي',
    admin: 'مدير النظام',
    manager: 'مدير',
    sales_rep: 'مندوب مبيعات'
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function money(value) {
    const number = Number(value);
    return (Number.isFinite(number) ? new Intl.NumberFormat('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(number) : '—') + ' ر.س';
  }

  function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 }).format(n) : '—';
  }

  function date(value) {
    if (!value) return '—';
    const raw = String(value).replace(' ', 'T');
    const parsed = new Date(raw.endsWith('Z') ? raw : raw + 'Z');
    if (Number.isNaN(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeZone: 'Asia/Riyadh' }).format(parsed);
  }

  function showToast(message, kind = '') {
    const node = $('#opsToast');
    if (!node) return;
    node.textContent = message;
    node.className = 'ops-toast show' + (kind ? ' ' + kind : '');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { node.className = 'ops-toast'; }, 3200);
  }

  async function api(action, options = {}) {
    const url = 'operations-api.php?action=' + encodeURIComponent(action);
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,
      headers: { Accept: 'application/json', ...(options.headers || {}) }
    });
    const type = (response.headers.get('content-type') || '').toLowerCase();
    const payload = type.includes('application/json') ? await response.json() : {};
    if (!response.ok) throw new Error(payload.error || 'تعذّر الاتصال بالخادم.');
    return payload;
  }

  function formData(action, form) {
    const data = new FormData(form);
    data.set('action', action);
    data.set('csrf', state.csrf);
    return data;
  }

  function switchView(view) {
    if (!viewMeta[view] || (!['admin'].includes(state.role) && ['staff', 'settings'].includes(view))) return;
    state.view = view;
    const [kicker, title, description] = viewMeta[view];
    $('#viewKicker').textContent = kicker;
    $('#viewTitle').textContent = title;
    $('#viewDescription').textContent = description;
    $$('[data-section]').forEach(section => { section.hidden = section.dataset.section !== view; });
    $$('[data-view]').forEach(button => {
      if (button.dataset.view === view) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    loadView(view);
    window.history.replaceState(null, '', '#' + view);
  }

  async function loadView(view) {
    try {
      if (view === 'overview') await loadOverview();
      if (view === 'inventory') await loadInventory();
      if (view === 'customers') await loadCustomers();
      if (view === 'reports') await loadReports();
      if (view === 'staff' && state.role === 'admin') await loadStaff();
      if (view === 'settings' && state.role === 'admin') await loadSettings();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function loadOverview() {
    const payload = await api('overview');
    state.overview = payload;
    const p = payload.products || {};
    const o = payload.orders || {};
    $('[data-metric="products"]').textContent = number(p.total || 0);
    $('[data-metric="newOrders"]').textContent = number(o.new_count || 0);
    $('[data-metric="revenue"]').textContent = money(o.revenue_30d || 0);
    $('[data-metric="lowStock"]').textContent = number(p.low_stock || 0);

    const recent = Array.isArray(payload.recentOrders) ? payload.recentOrders : [];
    $('#recentOrdersBody').innerHTML = recent.length ? recent.map(order =>
      '<tr><td class="ops-number">' + escapeHtml(order.order_number) + '</td>' +
      '<td><strong>' + escapeHtml(order.customer_name) + '</strong><small style="display:block;color:#91a0ae;font-size:9px">' + escapeHtml(order.customer_city || '') + '</small></td>' +
      '<td><span class="ops-status ' + escapeHtml(order.status) + '">' + escapeHtml(labels[order.status] || order.status) + '</span></td>' +
      '<td><span class="ops-money">' + escapeHtml(money(order.total)) + '</span></td></tr>'
    ).join('') : '<tr><td colspan="4" class="ops-empty">لا توجد طلبات مسجلة حتى الآن.</td></tr>';

    const attention = [];
    if (Number(p.low_stock || 0) > 0) {
      attention.push('<div class="ops-attention-item"><div><strong>منتجات وصلت إلى حد إعادة الطلب</strong><small>راجع الكميات قبل قبول طلبات جديدة.</small></div><span class="ops-alert-number">' + number(p.low_stock) + '</span></div>');
    }
    if (Number(o.new_count || 0) > 0) {
      attention.push('<div class="ops-attention-item"><div><strong>طلبات جديدة تحتاج إلى متابعة</strong><small>افتح لوحة الطلبات لتأكيدها مع العملاء.</small></div><span class="ops-alert-number">' + number(o.new_count) + '</span></div>');
    }
    if (!attention.length) attention.push('<p class="ops-empty">لا توجد تنبيهات تشغيلية حالياً.</p>');
    $('#attentionList').innerHTML = attention.join('');
  }

  function filteredInventory() {
    const query = ($('#inventorySearch').value || '').trim().toLocaleLowerCase('ar');
    const filter = $('#inventoryFilter').value;
    return state.inventory.filter(item => {
      const matches = [item.id, item.model, item.name_ar, item.name_en].join(' ').toLocaleLowerCase('ar').includes(query);
      const tracked = Number(item.track_stock) === 1;
      const low = tracked && Number(item.stock_quantity) <= Number(item.low_stock_threshold);
      return matches && (filter === 'all' || (filter === 'tracked' && tracked) || (filter === 'untracked' && !tracked) || (filter === 'low' && low));
    });
  }

  async function loadInventory() {
    const payload = await api('inventory');
    state.inventory = Array.isArray(payload.products) ? payload.products : [];
    $('#inventoryCount').textContent = number(state.inventory.length) + ' منتج';
    renderInventory();
  }

  function renderInventory() {
    const items = filteredInventory();
    $('#inventoryBody').innerHTML = items.length ? items.map(item => {
      const tracked = Number(item.track_stock) === 1;
      const low = tracked && Number(item.stock_quantity) <= Number(item.low_stock_threshold);
      const image = /^(?:assets|uploads)\/products\/[a-z0-9_-]+\.webp$/i.test(item.image || '') ? '../' + item.image : '';
      return '<tr data-product-id="' + escapeHtml(item.id) + '">' +
        '<td><div class="ops-product-cell">' + (image ? '<img src="' + escapeHtml(image) + '" alt="" loading="lazy">' : '') +
        '<div><strong>' + escapeHtml(item.name_ar || item.model) + '</strong><small>' + escapeHtml(item.id) + '</small></div></div></td>' +
        '<td><span class="ops-number">' + escapeHtml(item.model) + '</span></td>' +
        '<td><span class="ops-money">' + escapeHtml(money(item.price)) + '</span></td>' +
        '<td>' + (tracked ? '<strong>' + number(item.stock_quantity) + '</strong> <span class="ops-stock-state ' + (low ? 'low' : 'ok') + '">' + (low ? 'منخفض' : 'متاح') + '</span>' : '<span class="ops-stock-state">غير متابع</span>') + '</td>' +
        '<td>' + (tracked ? number(item.low_stock_threshold) : '—') + '</td>' +
        '<td><div class="ops-stock-editor"><input type="number" min="0" max="10000000" step="1" value="' + (tracked ? Number(item.stock_quantity) : 0) + '" aria-label="الكمية الجديدة">' +
        '<button type="button" data-update-stock>حفظ الكمية</button></div></td></tr>';
    }).join('') : '<tr><td colspan="6" class="ops-empty">لا توجد منتجات تطابق التصفية.</td></tr>';
  }

  async function updateStock(row, button) {
    const quantity = row.querySelector('input').value;
    const id = row.dataset.productId;
    if (!/^\d{1,7}$/.test(quantity) || Number(quantity) > 10000000) {
      showToast('أدخل كمية صحيحة للمخزون.', 'error');
      return;
    }
    const reason = window.prompt('سبب تعديل المخزون:', 'جرد أو استلام كمية');
    if (reason === null) return;
    const data = new URLSearchParams({
      csrf: state.csrf,
      product_id: id,
      stock_quantity: quantity,
      reason: reason.slice(0, 255)
    });
    button.disabled = true;
    button.textContent = 'جارٍ الحفظ…';
    try {
      const payload = await api('update-stock', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: data });
      showToast('تم تحديث المخزون. التغيير: ' + (payload.change > 0 ? '+' : '') + number(payload.change));
      await loadInventory();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'حفظ الكمية';
    }
  }

  async function loadCustomers() {
    const query = ($('#customerSearch').value || '').trim();
    const payload = await api('customers&q=' + encodeURIComponent(query));
    state.customers = Array.isArray(payload.customers) ? payload.customers : [];
    $('#customerCount').textContent = number(state.customers.length) + ' عميل';
    $('#customersBody').innerHTML = state.customers.length ? state.customers.map(customer =>
      '<tr><td><strong>' + escapeHtml(customer.customer_name) + '</strong></td>' +
      '<td class="ops-number">' + escapeHtml(customer.phone) + '</td>' +
      '<td>' + escapeHtml(customer.city || '—') + '</td>' +
      '<td>' + number(customer.order_count) + '</td>' +
      '<td><span class="ops-money">' + escapeHtml(money(customer.total_spent)) + '</span></td>' +
      '<td>' + escapeHtml(date(customer.last_order_at)) + '</td></tr>'
    ).join('') : '<tr><td colspan="6" class="ops-empty">لا توجد ملفات عملاء بعد. ستظهر هنا بعد حفظ أول طلب لكل عميل.</td></tr>';
  }

  function exportCsv(filename, headers, rows) {
    const cell = value => {
      let text = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportCustomers() {
    exportCsv('rock-customers-' + new Date().toISOString().slice(0, 10) + '.csv',
      ['الاسم', 'الجوال', 'المدينة', 'عدد الطلبات', 'إجمالي المشتريات', 'آخر طلب'],
      state.customers.map(c => [c.customer_name, c.phone, c.city, c.order_count, c.total_spent + ' SAR', c.last_order_at]));
  }

  function setDefaultReportDates() {
    const today = new Date();
    const prior = new Date(today);
    prior.setDate(prior.getDate() - 29);
    const iso = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    $('#reportFrom').value ||= iso(prior);
    $('#reportTo').value ||= iso(today);
  }

  async function loadReports() {
    setDefaultReportDates();
    const from = $('#reportFrom').value;
    const to = $('#reportTo').value;
    const payload = await api('reports&from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to));
    state.report = payload;
    const s = payload.summary || {};
    $('#reportRevenue').textContent = money(s.revenue || 0);
    $('#reportOrders').textContent = number(s.order_count || 0);
    $('#reportAverage').textContent = money(s.average_order || 0);
    renderDailyReport(payload.daily || []);
  }

  function renderDailyReport(rows) {
    const max = Math.max(0, ...rows.map(row => Number(row.revenue || 0)));
    $('#dailyReport').innerHTML = rows.length ? rows.map(row => {
      const amount = Number(row.revenue || 0);
      const width = max > 0 ? Math.max(1.5, amount / max * 100) : 0;
      return '<div class="ops-day-row"><span class="ops-day-date">' + escapeHtml(row.day) + '</span>' +
        '<div class="ops-day-track" title="' + escapeHtml(money(amount)) + '"><div class="ops-day-bar" style="width:' + width.toFixed(1) + '%"></div></div>' +
        '<span class="ops-day-total">' + escapeHtml(money(amount)) + '</span></div>';
    }).join('') : '<p class="ops-empty">لا توجد طلبات في الفترة المحددة.</p>';
  }

  function exportReport() {
    if (!state.report) return;
    exportCsv('rock-sales-' + state.report.from + '-to-' + state.report.to + '.csv',
      ['التاريخ', 'عدد الطلبات', 'المبيعات (SAR)'],
      (state.report.daily || []).map(row => [row.day, row.order_count, row.revenue]));
  }

  async function loadStaff() {
    const payload = await api('staff');
    state.staff = Array.isArray(payload.staff) ? payload.staff : [];
    $('#staffBody').innerHTML = state.staff.length ? state.staff.map(user =>
      '<tr><td><strong>' + escapeHtml(user.full_name || user.username) + '</strong></td>' +
      '<td class="ops-number">' + escapeHtml(user.username) + '</td>' +
      '<td>' + escapeHtml(labels[user.role] || user.role) + '</td>' +
      '<td><span class="ops-status ' + (Number(user.is_active) ? 'active' : 'cancelled') + '">' + (Number(user.is_active) ? 'نشط' : 'غير نشط') + '</span></td>' +
      '<td><button type="button" class="ops-text-button" data-edit-staff="' + Number(user.id) + '">تعديل</button></td></tr>'
    ).join('') : '<tr><td colspan="5" class="ops-empty">لم تتم إضافة أعضاء للفريق بعد.</td></tr>';
  }

  function resetStaffForm() {
    $('#staffForm').reset();
    $('#staffId').value = '';
    $('#staffActive').checked = true;
    $('#staffFormTitle').textContent = 'إضافة عضو جديد';
    $('#staffPassword').required = true;
    $('#staffUsername').readOnly = false;
    $('#staffFormMessage').textContent = '';
  }

  function editStaff(id) {
    const user = state.staff.find(item => Number(item.id) === Number(id));
    if (!user) return;
    $('#staffId').value = user.id;
    $('#staffFullName').value = user.full_name || '';
    $('#staffUsername').value = user.username;
    $('#staffRole').value = user.role;
    $('#staffPassword').value = '';
    $('#staffPassword').required = false;
    $('#staffActive').checked = Number(user.is_active) === 1;
    $('#staffFormTitle').textContent = 'تعديل بيانات عضو الفريق';
    $('#staffUsername').readOnly = true;
    $('#staffFormMessage').textContent = 'اترك كلمة المرور فارغة للإبقاء على كلمة المرور الحالية.';
    $('#staffForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function saveStaff(event) {
    event.preventDefault();
    const button = $('#saveStaffButton');
    button.disabled = true;
    button.textContent = 'جارٍ الحفظ…';
    const data = formData('save-staff', event.currentTarget);
    data.set('is_active', $('#staffActive').checked ? '1' : '0');
    try {
      await api('save-staff', { method: 'POST', body: data });
      $('#staffFormMessage').textContent = 'تم حفظ حساب الفريق.';
      $('#staffFormMessage').className = 'ops-message success';
      resetStaffForm();
      await loadStaff();
      showToast('تم حفظ حساب الفريق.');
    } catch (error) {
      $('#staffFormMessage').textContent = error.message;
      $('#staffFormMessage').className = 'ops-message error';
    } finally {
      button.disabled = false;
      button.textContent = 'حفظ الحساب';
    }
  }

  async function loadSettings() {
    const payload = await api('settings');
    const settings = payload.settings || {};
    $('#shippingDefault').value = settings.shipping_default_sar ?? '20';
    $('#freeShipping').value = settings.free_shipping_threshold_sar ?? '300';
    $('#supportWhatsApp').value = settings.support_whatsapp ?? '';
    const payments = Array.isArray(settings.payment_methods) ? settings.payment_methods : [];
    $$('input[name="payment_methods"]').forEach(box => { box.checked = payments.includes(box.value); });
  }

  async function saveSettings(event) {
    event.preventDefault();
    const button = $('#saveSettingsButton');
    button.disabled = true;
    button.textContent = 'جارٍ الحفظ…';
    const data = formData('save-settings', event.currentTarget);
    data.delete('payment_methods');
    $$('input[name="payment_methods"]:checked').forEach(box => data.append('payment_methods[]', box.value));
    try {
      await api('save-settings', { method: 'POST', body: data });
      $('#settingsMessage').textContent = 'تم حفظ إعدادات المتجر.';
      $('#settingsMessage').className = 'ops-message success';
      showToast('تم حفظ إعدادات المتجر.');
    } catch (error) {
      $('#settingsMessage').textContent = error.message;
      $('#settingsMessage').className = 'ops-message error';
    } finally {
      button.disabled = false;
      button.textContent = 'حفظ الإعدادات';
    }
  }

  async function logout() {
    const data = new FormData();
    data.set('action', 'logout');
    data.set('csrf', state.csrf);
    try {
      const response = await fetch('api.php?action=logout', { method: 'POST', credentials: 'same-origin', body: data, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('تعذر تسجيل الخروج.');
      window.location.href = './';
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  $$('[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  $('#refreshView')?.addEventListener('click', () => loadView(state.view));
  $('#inventorySearch')?.addEventListener('input', renderInventory);
  $('#inventoryFilter')?.addEventListener('change', renderInventory);
  $('#inventoryBody')?.addEventListener('click', event => {
    const button = event.target.closest('[data-update-stock]');
    if (button) updateStock(button.closest('[data-product-id]'), button);
  });
  $('#customerSearch')?.addEventListener('input', () => {
    window.clearTimeout(loadCustomers.timer);
    loadCustomers.timer = window.setTimeout(() => loadCustomers().catch(error => showToast(error.message, 'error')), 260);
  });
  $('#exportCustomers')?.addEventListener('click', exportCustomers);
  $('#reportFilters')?.addEventListener('submit', event => { event.preventDefault(); loadReports().catch(error => showToast(error.message, 'error')); });
  $('#exportReport')?.addEventListener('click', exportReport);
  $('#staffForm')?.addEventListener('submit', saveStaff);
  $('#resetStaffForm')?.addEventListener('click', resetStaffForm);
  $('#staffBody')?.addEventListener('click', event => {
    const button = event.target.closest('[data-edit-staff]');
    if (button) editStaff(button.dataset.editStaff);
  });
  $('#storeSettingsForm')?.addEventListener('submit', saveSettings);
  $('#logoutOperations')?.addEventListener('click', logout);

  const initialView = window.location.hash.slice(1);
  switchView(viewMeta[initialView] && (state.role === 'admin' || !['staff', 'settings'].includes(initialView)) ? initialView : 'overview');
})();

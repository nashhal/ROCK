(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const csrf = $('meta[name="csrf-token"]')?.content || '';
  const state = { orders: [], visible: [], salesReps: [], canAssign: false };
  const statusLabels = {
    new: 'طلب جديد',
    waiting_rep: 'بانتظار المندوب',
    contacting: 'جاري التواصل',
    confirmed: 'مؤكد',
    preparing: 'قيد التجهيز',
    out_for_delivery: 'خرج للتوصيل',
    delivered: 'تم التسليم',
    failed_delivery: 'تعذر التسليم',
    cancelled: 'ملغي'
  };
  const activeStatuses = new Set(['waiting_rep', 'contacting', 'confirmed', 'preparing', 'out_for_delivery']);

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function money(value) {
    const number = Number(value);
    return (Number.isFinite(number) ? new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(number) : '—') + ' ر.س';
  }

  function date(value) {
    const parsed = new Date(String(value || '').replace(' ', 'T') + (String(value || '').includes('Z') ? '' : 'Z'));
    if (Number.isNaN(parsed.getTime())) return String(value || '—');
    return new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh'
    }).format(parsed);
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,
      headers: { Accept: 'application/json', ...(options.headers || {}) }
    });
    const type = (response.headers.get('content-type') || '').toLowerCase();
    const payload = type.includes('application/json') ? await response.json() : {};
    if (!response.ok) throw new Error(payload.error || 'تعذر الاتصال بالخادم.');
    return payload;
  }

  function updateStats() {
    $('#statAll').textContent = String(state.orders.length);
    $('#statNew').textContent = String(state.orders.filter(order => order.status === 'new').length);
    $('#statActive').textContent = String(state.orders.filter(order => activeStatuses.has(order.status)).length);
    $('#statDelivered').textContent = String(state.orders.filter(order => order.status === 'delivered').length);
  }

  function statusOptions(selected) {
    return Object.entries(statusLabels).map(([value, label]) =>
      '<option value="' + value + '"' + (value === selected ? ' selected' : '') + '>' + label + '</option>'
    ).join('');
  }

  function render() {
    const query = ($('#searchOrders').value || '').trim().toLocaleLowerCase('ar');
    const status = $('#statusFilter').value;
    state.visible = state.orders.filter(order => {
      const haystack = [order.orderNumber, order.customerName, order.customerPhone, order.customerCity]
        .join(' ').toLocaleLowerCase('ar');
      return (status === 'all' || order.status === status) && (!query || haystack.includes(query));
    });
    $('#resultCount').textContent = 'عدد النتائج: ' + state.visible.length;
    const root = $('#ordersList');
    if (!state.visible.length) {
      root.innerHTML = '<div class="empty">لا توجد طلبات مطابقة للفلاتر الحالية.</div>';
      return;
    }
    root.innerHTML = state.visible.map(order => {
      const itemRows = order.items.map(item =>
        '<li><span>' + escapeHtml(item.nameAr || item.model) + ' · <b dir="ltr">' + Number(item.quantity) + ' × ' +
        escapeHtml(money(item.unitPrice)) + '</b></span></li>'
      ).join('');
      const orderDetails = [
        order.customerPhone ? 'الجوال: ' + order.customerPhone : '',
        order.customerCity ? 'المدينة: ' + order.customerCity : '',
        order.customerAddress ? 'العنوان: ' + order.customerAddress : ''
      ].filter(Boolean).join(' · ');
      return '<article class="order" data-order-id="' + Number(order.id) + '">' +
        '<section><div class="order-top"><strong class="order-number">' + escapeHtml(order.orderNumber) +
        '</strong><span class="order-status">' + escapeHtml(statusLabels[order.status] || order.status) +
        '</span></div><div class="order-date">' + escapeHtml(date(order.createdAt)) + '</div>' +
        '<div class="customer" style="margin-top:12px">' + escapeHtml(order.customerName) + '</div>' +
        '<div class="customer-detail">' + escapeHtml(orderDetails) + '</div>' +
        (order.customerNotes ? '<div class="notes">' + escapeHtml(order.customerNotes) + '</div>' : '') + '</section>' +
        '<section><strong>تفاصيل المنتجات</strong><ul class="items">' + itemRows + '</ul></section>' +
        '<section class="order-actions"><div class="order-total">' + escapeHtml(money(order.total)) + '</div>' +
        '<div class="order-date">قيمة المنتجات: ' + escapeHtml(money(order.subtotal)) + ' · الشحن: ' + escapeHtml(money(order.shippingFee)) + '</div>' +
        '<div class="order-date">طريقة الدفع: ' + escapeHtml(order.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'الدفع عند الاستلام') + '</div>' +
        '<div class="status-row"><select aria-label="تحديث حالة الطلب" data-status-select>' +
        statusOptions(order.status) + '</select><button class="btn btn-primary" type="button" data-save-status>حفظ</button></div>' +
        (state.canAssign ? '<div class="status-row"><select aria-label="تعيين مندوب للطلب" data-assignee>' +
          '<option value="">بدون تعيين</option>' + state.salesReps.map(rep =>
            '<option value="' + Number(rep.id) + '"' + (Number(order.assignedTo) === Number(rep.id) ? ' selected' : '') + '>' +
            escapeHtml(rep.full_name || rep.username) + '</option>'
          ).join('') + '</select><button class="btn" type="button" data-save-assignee>تعيين</button></div>' : '') +
        (order.assignedName ? '<div class="order-date">المندوب: ' + escapeHtml(order.assignedName) + '</div>' : '') +
        '<div class="order-date">آخر تحديث: ' + escapeHtml(date(order.updatedAt)) + '</div></section></article>';
    }).join('');
  }

  async function loadOrders() {
    const button = $('#refreshOrders');
    if (!button || !$('#ordersList')) return;
    button.disabled = true;
    button.textContent = 'جارٍ التحديث…';
    try {
      const payload = await api('orders-api.php?action=orders');
      state.orders = Array.isArray(payload.orders) ? payload.orders : [];
      state.salesReps = Array.isArray(payload.salesReps) ? payload.salesReps : [];
      state.canAssign = Boolean(payload.canAssign);
      updateStats();
      render();
    } catch (error) {
      $('#ordersList').innerHTML = '<div class="error">' + escapeHtml(error.message) + '</div>';
    } finally {
      button.disabled = false;
      button.textContent = 'تحديث الطلبات';
    }
  }

  async function updateStatus(card) {
    const select = card.querySelector('[data-status-select]');
    const button = card.querySelector('[data-save-status]');
    const orderId = card.dataset.orderId;
    const body = new URLSearchParams({
      action: 'update-status',
      order_id: orderId,
      status: select.value,
      csrf
    });
    button.disabled = true;
    button.textContent = 'جارٍ الحفظ…';
    try {
      await api('orders-api.php?action=update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body
      });
      await loadOrders();
    } catch (error) {
      button.disabled = false;
      button.textContent = 'حفظ';
      window.alert(error.message);
    }
  }

  async function assignOrder(card) {
    const select = card.querySelector('[data-assignee]');
    const button = card.querySelector('[data-save-assignee]');
    const data = new FormData();
    data.set('action', 'assign-order');
    data.set('order_id', card.dataset.orderId);
    data.set('staff_id', select.value);
    data.set('csrf', document.querySelector('meta[name="csrf-token"]')?.content || '');
    button.disabled = true;
    button.textContent = 'جارٍ الحفظ…';
    try {
      const response = await fetch('operations-api.php?action=assign-order', {
        method: 'POST', credentials: 'same-origin', body: data,
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر إسناد الطلب.');
      await loadOrders();
    } catch (error) {
      button.disabled = false;
      button.textContent = 'تعيين';
      window.alert(error.message);
    }
  }

  function csvCell(value) {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportCsv() {
    const columns = ['رقم الطلب', 'التاريخ', 'اسم العميل', 'الجوال', 'المدينة', 'الحالة', 'المنتجات', 'الإجمالي'];
    const rows = state.visible.map(order => [
      order.orderNumber,
      order.createdAt,
      order.customerName,
      order.customerPhone,
      order.customerCity,
      statusLabels[order.status] || order.status,
      order.items.map(item => item.nameAr + ' × ' + item.quantity).join(' | '),
      order.total + ' SAR'
    ]);
    const csv = '\uFEFF' + [columns, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rock-orders-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  $('#refreshOrders')?.addEventListener('click', loadOrders);
  $('#searchOrders')?.addEventListener('input', render);
  $('#statusFilter')?.addEventListener('change', render);
  $('#exportOrders')?.addEventListener('click', exportCsv);
  $('#ordersList')?.addEventListener('click', event => {
    const statusButton = event.target.closest('[data-save-status]');
    const assignButton = event.target.closest('[data-save-assignee]');
    if (statusButton) updateStatus(statusButton.closest('[data-order-id]'));
    if (assignButton) assignOrder(assignButton.closest('[data-order-id]'));
  });
  loadOrders();
})();

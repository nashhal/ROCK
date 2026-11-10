(() => {
  'use strict';

  const form = document.getElementById('orderDetailsForm');
  const actions = form?.querySelector('.order-actions');
  if (!form || !actions || document.getElementById('submitStoreOrder')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'submitStoreOrder';
  button.className = 'btn btn-dark';
  button.hidden = true;
  button.textContent = 'إرسال الطلب إلى ROCK';

  const status = document.createElement('p');
  status.id = 'storeOrderStatus';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.style.cssText = 'margin:10px 0 0;padding:10px 12px;border-radius:9px;background:#f2f7fd;color:#173b5e;font-size:12px;line-height:1.7;display:none';

  const honeypot = document.createElement('input');
  honeypot.type = 'text';
  honeypot.name = 'website';
  honeypot.autocomplete = 'off';
  honeypot.tabIndex = -1;
  honeypot.setAttribute('aria-hidden', 'true');
  honeypot.style.cssText = 'position:absolute!important;left:-10000px!important;top:auto!important;width:1px!important;height:1px!important;overflow:hidden!important';

  const paymentLabel = document.createElement('label');
  paymentLabel.className = 'rock-payment-choice';
  paymentLabel.hidden = true;
  paymentLabel.textContent = 'طريقة الدفع';
  const paymentSelect = document.createElement('select');
  paymentSelect.id = 'rockPaymentMethod';
  paymentSelect.name = 'payment_method';
  paymentLabel.appendChild(paymentSelect);

  actions.insertBefore(button, actions.firstChild);
  form.insertBefore(paymentLabel, actions);
  actions.parentElement.appendChild(status);
  form.appendChild(honeypot);

  const isEnglish = () => (document.documentElement.lang || 'ar').toLowerCase().startsWith('en');
  const copy = {
    ar: {
      submit: 'إرسال الطلب إلى ROCK',
      sending: 'جارٍ إرسال الطلب…',
      success: 'تم استلام طلبك بنجاح. رقم الطلب: ',
      fail: 'تعذّر إرسال الطلب.',
      empty: 'السلة فارغة. أضف منتجاً قبل إرسال الطلب.',
      city: 'يرجى إدخال المدينة قبل إرسال الطلب.',
      confirmation: 'يرجى تأكيد مراجعة ملخص الطلب أولاً.',
      invalid: 'يرجى مراجعة بيانات العميل المطلوبة.',
      orderHelp: 'سنتواصل معك لتأكيد السعر والتوفر والتوصيل. لا يتم تحصيل أي مبلغ عبر هذه الصفحة.',
      paymentMethod: 'طريقة الدفع', bankTransfer: 'تحويل بنكي', cashOnDelivery: 'الدفع عند الاستلام'
    },
    en: {
      submit: 'Send order to ROCK',
      sending: 'Sending order…',
      success: 'Your order was received. Order number: ',
      fail: 'The order could not be submitted.',
      empty: 'Your cart is empty. Add a product before submitting.',
      city: 'Please enter your city before submitting.',
      confirmation: 'Please confirm that you reviewed the order summary.',
      invalid: 'Please review the required customer details.',
      orderHelp: 'We will contact you to confirm price, availability and delivery. No payment is collected on this page.',
      paymentMethod: 'Payment method', bankTransfer: 'Bank transfer', cashOnDelivery: 'Cash on delivery'
    }
  };
  const t = key => copy[isEnglish() ? 'en' : 'ar'][key];

  let busy = false;
  let accepted = false;

  function showMessage(message, success = false) {
    status.textContent = message;
    status.style.display = 'block';
    status.style.background = success ? '#edf8f1' : '#fff5f2';
    status.style.color = success ? '#205a37' : '#8a3d30';
  }

  async function detectLiveStore() {
    try {
      const response = await fetch(new URL('api/products.php', document.baseURI), {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('catalog unavailable');
      const payload = await response.json();
      if (payload.source !== 'hostinger-mysql' || !Array.isArray(payload.products)) {
        throw new Error('live catalog not active');
      }
      const settingsResponse = await fetch(new URL('api/store-settings.php', document.baseURI), {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (!settingsResponse.ok) throw new Error('store settings unavailable');
      const settings = await settingsResponse.json();
      const paymentMethods = Array.isArray(settings.paymentMethods) ? settings.paymentMethods : [];
      if (!paymentMethods.length) throw new Error('no payment methods configured');
      paymentSelect.replaceChildren();
      for (const method of paymentMethods) {
        if (!['bank_transfer', 'cash_on_delivery'].includes(method)) continue;
        const option = document.createElement('option');
        option.value = method;
        option.textContent = method === 'bank_transfer' ? t('bankTransfer') : t('cashOnDelivery');
        paymentSelect.appendChild(option);
      }
      if (!paymentSelect.options.length) throw new Error('no payment methods configured');
      paymentLabel.firstChild.textContent = t('paymentMethod');
      paymentLabel.hidden = false;
      const city = document.getElementById('customerCity');
      if (city) city.required = true;
      button.hidden = false;
      status.textContent = t('orderHelp');
      status.style.display = 'block';
      status.style.background = '#f2f7fd';
      status.style.color = '#173b5e';
      button.textContent = t('submit');
    } catch {
      // GitHub Pages/static mode keeps the existing copy/share flow.
      button.hidden = true;
    }
  }

  function readCart() {
    let cart;
    try { cart = JSON.parse(localStorage.getItem('rock-cart') || '[]'); }
    catch { cart = []; }
    if (!Array.isArray(cart)) return [];
    return cart.filter(item =>
      item && typeof item.id === 'string' &&
      Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 99
    ).map(item => ({ id: item.id, qty: item.qty }));
  }

  async function submitOrder() {
    if (busy || accepted) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      showMessage(t('invalid'));
      return;
    }
    if (!document.getElementById('orderConfirmation')?.checked) {
      document.getElementById('orderConfirmation')?.focus();
      showMessage(t('confirmation'));
      return;
    }
    const items = readCart();
    if (!items.length) {
      showMessage(t('empty'));
      return;
    }
    const customer = {
      name: document.getElementById('customerName')?.value.trim() || '',
      phone: document.getElementById('customerPhone')?.value.trim() || '',
      city: document.getElementById('customerCity')?.value.trim() || '',
      address: document.getElementById('customerAddress')?.value.trim() || '',
      notes: document.getElementById('customerNotes')?.value.trim() || ''
    };
    if (!customer.city) {
      document.getElementById('customerCity')?.focus();
      showMessage(t('city'));
      return;
    }

    busy = true;
    button.disabled = true;
    button.textContent = t('sending');
    try {
      const response = await fetch(new URL('api/orders.php', document.baseURI), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ customer, items, paymentMethod: paymentSelect.value, website: honeypot.value })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok || !payload.orderNumber) {
        throw new Error(payload.error || t('fail'));
      }
      accepted = true;
      button.textContent = isEnglish() ? 'Order received' : 'تم استلام الطلب';
      const totalLabel = payload.total ? ' — ' + (isEnglish() ? 'Total: ' : 'الإجمالي مع الشحن: ') + payload.total + ' SAR' : '';
      showMessage(t('success') + payload.orderNumber + totalLabel + ' — ' + t('orderHelp'), true);
    } catch (error) {
      showMessage(error.message || t('fail'));
      button.disabled = false;
      button.textContent = t('submit');
    } finally {
      busy = false;
    }
  }

  button.addEventListener('click', submitOrder);
  const languageObserver = new MutationObserver(() => {
    if (!busy && !accepted && !button.hidden) { button.textContent = t('submit'); paymentLabel.firstChild.textContent = t('paymentMethod'); [...paymentSelect.options].forEach(option => { option.textContent = option.value === 'bank_transfer' ? t('bankTransfer') : t('cashOnDelivery'); }); }
    if (accepted) button.textContent = isEnglish() ? 'Order received' : 'تم استلام الطلب';
  });
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });

  detectLiveStore();
})();

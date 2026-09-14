(() => {
  'use strict';

  function applyProductSurface() {
    document.querySelectorAll('img.product-image').forEach((img) => {
      img.style.background = 'transparent';
      img.style.mixBlendMode = 'normal';
      img.style.objectFit = 'contain';
      img.style.objectPosition = 'center center';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        img.closest('.product-media')?.classList.add('image-missing');
      }, { once: true });
    });
  }

  function wireMobileNavigation() {
    document.querySelectorAll('.mobile-bottom-nav [data-jump]').forEach((button) => {
      if (button.dataset.rockNavWired) return;
      button.dataset.rockNavWired = '1';
      button.addEventListener('click', () => {
        const target = document.querySelector(button.dataset.jump);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const mobileSearch = document.getElementById('mobileSearch');
    if (mobileSearch && !mobileSearch.dataset.rockNavWired) {
      mobileSearch.dataset.rockNavWired = '1';
      mobileSearch.addEventListener('click', () => {
        const overlay = document.getElementById('searchOverlay');
        const input = document.getElementById('overlaySearch');
        if (overlay) overlay.classList.add('open');
        input?.focus();
      });
    }

    const mobileCart = document.getElementById('mobileCart');
    if (mobileCart && !mobileCart.dataset.rockNavWired) {
      mobileCart.dataset.rockNavWired = '1';
      mobileCart.addEventListener('click', () => document.getElementById('cartBtn')?.click());
    }
    syncMobileCartCount();
  }

  function syncMobileCartCount() {
    const source = document.getElementById('cartCount');
    const target = document.getElementById('mobileCartCount');
    if (source && target) target.textContent = source.textContent || '0';
  }

  function repairExcelCategories() {
    const card = document.querySelector('.category-card[data-filter-link="protection"]');
    if (!card) return;
    card.dataset.filterLink = 'car';
    const title = card.querySelector('h3');
    const desc = card.querySelector('p');
    const number = card.querySelector('span');
    if (number) number.textContent = '02';
    if (title) title.textContent = 'السيارة';
    if (desc) desc.textContent = 'شواحن وملحقات السيارة';
  }

  function repairFeaturedProduct() {
    const button = document.querySelector('.add-demo');
    const featured = typeof findProduct === 'function' ? findProduct('rkch765') : null;
    if (!button || !featured || typeof addToCart !== 'function') return;

    const section = document.getElementById('featured');
    const heading = section?.querySelector('.feature-copy h2');
    const copy = section?.querySelector('.feature-copy > p:not(.eyebrow)');
    const specs = section?.querySelectorAll('.feature-specs strong');
    const labels = section?.querySelectorAll('.feature-specs span');
    const screen = section?.querySelector('.pb-screen');
    const brand = section?.querySelector('.pb-brand');

    if (heading) heading.innerHTML = 'القوة<br><em>65W في جيبك</em>';
    if (copy) copy.textContent = 'شاحن ROCK RKCH765 GaN بقدرة 65W وثلاثة مخارج للشحن السريع في المنزل والسفر.';
    if (specs?.length >= 3) {
      specs[0].textContent = '65';
      specs[1].textContent = '3';
      specs[2].textContent = 'GaN';
    }
    if (labels?.length >= 3) {
      labels[0].textContent = 'W MAX';
      labels[1].textContent = 'OUTPUTS';
      labels[2].textContent = 'FAST CHARGE';
    }
    if (screen) screen.textContent = '65W';
    if (brand) brand.textContent = 'ROCK';

    button.dataset.product = featured.id;
    button.innerHTML = 'أضف إلى السلة <span>+</span>';
    if (button.dataset.rockFeaturedWired) return;
    button.dataset.rockFeaturedWired = '1';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      addToCart(featured.id);
    }, true);
  }

  function wireModalDismissal() {
    document.querySelectorAll('.modal-backdrop').forEach((modal) => {
      if (modal.dataset.rockDismissWired) return;
      modal.dataset.rockDismissWired = '1';
      modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.classList.remove('open');
      });
    });
  }

  function addSalesPolish() {
    if (!document.getElementById('rock-sales-style')) {
      const style = document.createElement('style');
      style.id = 'rock-sales-style';
      style.textContent = `
        .rock-trust-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:24px 0 28px}
        .rock-trust-item{background:#fff;border:1px solid #e2e2dc;border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:10px;min-height:64px}
        .rock-trust-icon{width:30px;height:30px;border-radius:50%;background:#f0f0eb;display:grid;place-items:center;font:700 12px Montserrat;color:#222;flex:0 0 auto}
        .rock-trust-item strong{display:block;font-size:11px;line-height:1.4;color:#161614}
        .rock-trust-item span{display:block;font-size:9px;line-height:1.4;color:#85857f}
        .rock-availability{display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:9px;color:#2e6d46}
        .rock-availability i{width:6px;height:6px;border-radius:50%;background:#2e8a56;display:block}
        .rock-model{font:700 8px Montserrat;color:#999891;letter-spacing:.08em;margin-top:6px}
        .rock-checkout-note{margin:12px 0 0;padding:12px 14px;background:#ededE8;border-radius:14px;font-size:10px;line-height:1.7;color:#66665f}
        .rock-checkout-btn{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;width:100%;min-height:50px;border-radius:999px;background:#111;color:#fff;font:700 12px Cairo,sans-serif}
        @media(max-width:760px){.rock-trust-strip{grid-template-columns:repeat(2,1fr);gap:8px}.rock-trust-item{padding:12px;min-height:58px}.rock-trust-item strong{font-size:10px}.rock-trust-item span{font-size:8px}}
      `;
      document.head.appendChild(style);
    }

    const shopTools = document.querySelector('.store-tools');
    if (shopTools && !document.getElementById('rockTrustStrip')) {
      const strip = document.createElement('div');
      strip.id = 'rockTrustStrip';
      strip.className = 'rock-trust-strip';
      strip.innerHTML = `
        <div class="rock-trust-item"><div class="rock-trust-icon">✓</div><div><strong>دفع آمن</strong><span>بيانات طلبك محمية</span></div></div>
        <div class="rock-trust-item"><div class="rock-trust-icon">↗</div><div><strong>شحن داخل السعودية</strong><span>تجهيز سريع للطلب</span></div></div>
        <div class="rock-trust-item"><div class="rock-trust-icon">R</div><div><strong>ضمان موثوق</strong><span>دعم بعد الشراء</span></div></div>
        <div class="rock-trust-item"><div class="rock-trust-icon">?</div><div><strong>اختيار أسهل</strong><span>مواصفات واضحة</span></div></div>`;
      shopTools.after(strip);
    }

    document.querySelectorAll('.product-card').forEach(card => {
      if (card.dataset.rockSalesDecorated) return;
      card.dataset.rockSalesDecorated = '1';
      const addButton = card.querySelector('.product-add');
      const id = addButton?.dataset.product;
      const product = id && typeof findProduct === 'function' ? findProduct(id) : null;
      const info = card.querySelector('.product-info');
      if (!info) return;
      if (product?.distributionPrice != null || product?.price != null) {
        const availability = document.createElement('div');
        availability.className = 'rock-availability';
        availability.innerHTML = '<i></i><span>متوفر للطلب</span>';
        info.appendChild(availability);
      }
      if (product?.model) {
        const model = document.createElement('div');
        model.className = 'rock-model';
        model.textContent = `MODEL ${product.model}`;
        info.appendChild(model);
      }
    });

    const checkout = document.getElementById('checkoutBtn');
    if (checkout && !checkout.dataset.rockCheckoutWired) {
      checkout.dataset.rockCheckoutWired = '1';
      checkout.classList.add('rock-checkout-btn');
      checkout.title = 'إرسال تفاصيل الطلب';
      const note = document.createElement('div');
      note.className = 'rock-checkout-note';
      note.textContent = 'بعد الضغط، سيتم فتح رسالة طلب جاهزة إلى بريد ROCK لتأكيد المنتجات والمجموع.';
      checkout.parentElement?.appendChild(note);
      checkout.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const total = document.getElementById('cartTotal')?.textContent || '0 ر.س';
        const rows = [...document.querySelectorAll('#cartItems .cart-row')];
        if (!rows.length) {
          alert('السلة فارغة. أضف منتجًا أولًا.');
          return;
        }
        const lines = rows.map((row, index) => {
          const text = row.innerText.replace(/\n+/g, ' | ').trim();
          return `${index + 1}. ${text}`;
        });
        const subject = encodeURIComponent('طلب جديد من متجر ROCK');
        const body = encodeURIComponent(`السلام عليكم،\n\nأرغب بإتمام الطلب التالي:\n${lines.join('\n')}\n\nالمجموع: ${total}\n\nالاسم:\nرقم الجوال:\nالمدينة:\nالعنوان:\nملاحظات:`);
        window.location.href = `mailto:hello@rock.sa?subject=${subject}&body=${body}`;
      }, true);
    }
  }

  function loadScriptOnce(src, marker) {
    if (document.querySelector(`script[data-rock-script="${marker}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.dataset.rockScript = marker;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadCatalog() {
    try {
      await loadScriptOnce('catalog-pricing.js?v=20260914-4', 'catalog-pricing');
      await loadScriptOnce('excel-catalog-only.js?v=20260914-3', 'excel-catalog-only');
      repairExcelCategories();
      repairFeaturedProduct();
      applyProductSurface();
      renderProducts?.();
      renderCart?.();
      addSalesPolish();
    } catch (error) {
      console.error('ROCK catalog load failed:', error);
    }
  }

  function start() {
    applyProductSurface();
    wireMobileNavigation();
    wireModalDismissal();
    loadCatalog();

    const grid = document.getElementById('productGrid');
    if (grid && !grid.dataset.rockSurfaceObserver) {
      grid.dataset.rockSurfaceObserver = '1';
      new MutationObserver(() => {
        applyProductSurface();
        wireMobileNavigation();
        addSalesPolish();
      }).observe(grid, { childList: true, subtree: true });
    }

    const count = document.getElementById('cartCount');
    if (count && !count.dataset.rockCountObserver) {
      count.dataset.rockCountObserver = '1';
      new MutationObserver(syncMobileCartCount).observe(count, { childList: true, characterData: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
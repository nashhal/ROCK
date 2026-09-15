/* ROCK Commerce V2 — mobile cart affordance without replacing cart state or checkout logic. */
(() => {
  'use strict';

  const isProductPage = /(^|\/)product\.html$/i.test(location.pathname);

  function addStyles(){
    if(document.getElementById('rock-commerce-v2-styles')) return;
    const link=document.createElement('link');
    link.id='rock-commerce-v2-styles';
    link.rel='stylesheet';
    link.href='rock-commerce-v2.css?v=20260915-1';
    document.head.appendChild(link);
  }

  function addMobileCartBar(){
    if(isProductPage || document.getElementById('rockCartBar')) return;
    const bar=document.createElement('div');
    bar.id='rockCartBar';
    bar.className='rock-cart-bar';
    bar.innerHTML='<div class="rock-cart-summary"><span class="rock-cart-label">ROCK CART</span><strong class="rock-cart-value" id="rockCartBarValue">0 ر.س</strong></div><button type="button" id="rockCartBarButton">عرض السلة</button>';
    document.body.appendChild(bar);

    bar.querySelector('#rockCartBarButton')?.addEventListener('click',()=>{
      document.getElementById('cartBtn')?.click();
    });
  }

  function syncBar(){
    const bar=document.getElementById('rockCartBar');
    const count=document.getElementById('cartCount');
    const total=document.getElementById('cartTotal');
    if(!bar || !count) return;
    const n=Number(String(count.textContent || '0').replace(/[^0-9]/g,'')) || 0;
    const value=document.getElementById('rockCartBarValue');
    if(value) value.textContent = total?.textContent?.trim() || '0 ر.س';
    bar.classList.toggle('is-visible', n>0);
    document.body.classList.toggle('rock-cart-bar-active', n>0);
  }

  function setupObserver(){
    const cartCount=document.getElementById('cartCount');
    const cartItems=document.getElementById('cartItems');
    const cartTotal=document.getElementById('cartTotal');
    if(!cartCount || !cartItems) return;
    const observer=new MutationObserver(syncBar);
    observer.observe(cartCount,{characterData:true,childList:true,subtree:true});
    observer.observe(cartItems,{characterData:true,childList:true,subtree:true});
    if(cartTotal) observer.observe(cartTotal,{characterData:true,childList:true,subtree:true});
    syncBar();
  }

  function addSafeCheckoutHint(){
    const checkout=document.getElementById('checkoutBtn');
    if(!checkout || checkout.dataset.rockCheckoutHint) return;
    checkout.dataset.rockCheckoutHint='1';
    checkout.setAttribute('type','button');
  }

  function boot(){
    addStyles();
    addMobileCartBar();
    addSafeCheckoutHint();
    requestAnimationFrame(setupObserver);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

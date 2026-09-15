(() => {
  'use strict';
  const STYLE_ID='rock-product-image-surface-v7';
  const wired=new WeakSet();
  const IMAGE_VERSION='20260915-original-canvas-1';

  function installStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .product-card .product-visual,.product-card .product-media{position:relative!important;display:grid!important;place-items:center!important;overflow:hidden!important;isolation:isolate!important}
      .product-card .product-image{position:relative!important;z-index:4!important;display:block!important;visibility:visible!important;opacity:1!important;width:auto!important;height:auto!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important;margin:0!important;padding:0!important;background:transparent!important;mix-blend-mode:normal!important;filter:none!important;transform:none!important;}
      .product-card .product-visual .product-art{z-index:1!important}.product-card .product-visual.image-ready .product-art{opacity:0!important;visibility:hidden!important;pointer-events:none!important}.product-card .product-visual.image-missing .product-image{display:none!important}.product-card .product-visual.image-missing .product-art{opacity:1!important;visibility:visible!important}
    `;
    document.head.appendChild(style);
  }
  function cacheBust(src){if(!src||/^data:/i.test(src))return src;try{const u=new URL(src,document.baseURI);u.searchParams.set('rock',IMAGE_VERSION);return u.href}catch(_){return src.includes('?')?`${src}&rock=${IMAGE_VERSION}`:`${src}?rock=${IMAGE_VERSION}`}}
  function normalize(src){const v=String(src||'').trim();if(!v)return '';if(/^(https?:|data:|blob:)/i.test(v))return v;const c=v.replace(/^\.\//,'').replace(/^\//,'');if(c.startsWith('assets/products/'))return c;const f=c.split('/').pop();return /^[A-Za-z0-9._-]+\.webp$/i.test(f)?`assets/products/${f}`:v}
  function visual(img){return img.closest('.product-visual,.product-media,.product-art')||img.parentElement}
  function ready(img){const v=visual(img);if(v){v.classList.remove('image-missing');v.classList.add('image-ready')}}
  function missing(img){const v=visual(img);if(v){v.classList.remove('image-ready');v.classList.add('image-missing')}}
  function id(card){return card.getAttribute('data-product')||card.getAttribute('data-id')||card.querySelector('[data-product]')?.getAttribute('data-product')||card.querySelector('[data-id]')?.getAttribute('data-id')||''}
  function ensure(card){if(!card||card.nodeType!==1)return;let img=card.querySelector('img.product-image,img[data-product-image],.product-image img,img');const pid=id(card);let product=null;if(pid&&typeof findProduct==='function'){try{product=findProduct(pid)}catch(_) {}}
    const declared=product?.image||img?.getAttribute('data-src')||img?.getAttribute('data-product-image')||img?.getAttribute('src');const path=normalize(declared);
    if(!img&&path){const visualEl=card.querySelector('.product-visual,.product-media,.product-art');if(visualEl){img=document.createElement('img');img.className='product-image';img.alt=product?.name||'ROCK product';visualEl.prepend(img)}}
    if(!img||!path)return;img.classList.add('product-image');img.loading='eager';img.decoding='async';img.fetchPriority='high';img.draggable=false;const finalSrc=cacheBust(path);if((img.getAttribute('src')||'')!==finalSrc)img.setAttribute('src',finalSrc);
    if(wired.has(img)){if(img.complete&&img.naturalWidth>0)ready(img);return}wired.add(img);img.addEventListener('load',()=>ready(img));img.addEventListener('error',()=>{if(!img.dataset.rockRetried){img.dataset.rockRetried='1';img.setAttribute('src',path);return}missing(img)});if(img.complete){if(img.naturalWidth>0)ready(img);else missing(img)}}
  function scan(root=document){installStyles();(root.querySelectorAll?.('.product-card')||[]).forEach(ensure)}
  function start(){installStyles();scan();const grid=document.getElementById('productGrid');if(grid&&!grid.dataset.rockImageObserver){grid.dataset.rockImageObserver='1';new MutationObserver(()=>scan(grid)).observe(grid,{childList:true,subtree:true})}[100,500,1200,2500].forEach(d=>setTimeout(scan,d))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

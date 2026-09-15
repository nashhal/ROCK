/* ROCK Identity Experience — focused brand journey + v2 design system. */
(() => {
  'use strict';

  function addDesignSystem(){
    if(document.getElementById('rock-v2-styles')) return;
    const link=document.createElement('link');
    link.id='rock-v2-styles';
    link.rel='stylesheet';
    link.href='rock-v2.css?v=20260915-2';
    document.head.appendChild(link);
    document.documentElement.style.setProperty('color-scheme','light');
    const theme=document.querySelector('meta[name="theme-color"]');
    if(theme) theme.setAttribute('content','#0B0C0D');
  }

  function addCommerceLayer(){
    if(document.getElementById('rock-commerce-v2-script')) return;
    const script=document.createElement('script');
    script.id='rock-commerce-v2-script';
    script.src='rock-commerce-v2.js?v=20260915-1';
    script.async=false;
    document.body.appendChild(script);
  }

  function addPerformanceLayer(){
    if(document.getElementById('rock-performance-script')) return;
    const script=document.createElement('script');
    script.id='rock-performance-script';
    script.src='rock-performance.js?v=20260915-1';
    script.async=false;
    document.body.appendChild(script);
  }

  function addShopByNeed(){
    if(document.getElementById('rockShopByNeed')) return;
    const collections=document.getElementById('collections');
    if(!collections) return;
    const section=document.createElement('section');
    section.id='rockShopByNeed';
    section.className='section rock-needs';
    section.innerHTML=`<div class="section-head"><div><p class="eyebrow">ROCK / SHOP BY NEED</p><h2>اختر حسب<br><em>يومك</em></h2></div><p>بدل البحث عن المواصفات أولًا، ابدأ بما تحتاجه — وسنقربك من الفئة المناسبة.</p></div><div class="rock-needs-grid"><button data-need="power">أحتاج شحنًا أسرع <span>→</span></button><button data-need="travel">أحتاج طاقة للسفر <span>→</span></button><button data-need="car">أحتاج تجهيز السيارة <span>→</span></button><button data-need="audio">أحتاج صوتًا أفضل <span>→</span></button></div>`;
    collections.after(section);
    section.querySelectorAll('[data-need]').forEach(btn=>btn.addEventListener('click',()=>{
      const filter=btn.dataset.need==='travel'?'power':btn.dataset.need;
      const target=document.querySelector(`#filterPills [data-filter="${filter}"]`);
      target?.click();
      document.getElementById('shop')?.scrollIntoView({behavior:'smooth',block:'start'});
    }));
  }
  function addBrandNote(){
    const why=document.getElementById('why');
    if(!why || document.getElementById('rockBrandNote')) return;
    const note=document.createElement('div'); note.id='rockBrandNote'; note.className='rock-identity-note';
    note.innerHTML='<strong>Technology should feel simple.</strong><p>ROCK تجمع الشحن والطاقة والسيارة والصوت تحت تجربة واحدة واضحة — منتجات يومية، مواصفات مفهومة، وهوية واحدة.</p>';
    why.querySelector('.why-grid')?.after(note);
  }
  function boot(){
    addDesignSystem();
    addCommerceLayer();
    addPerformanceLayer();
    addShopByNeed();
    addBrandNote();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();

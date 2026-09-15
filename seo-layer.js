/* ROCK SEO layer — ecommerce discovery foundation */
(() => {
  'use strict';
  const brand = 'ROCK';
  const description = 'ROCK — everyday technology accessories for charging, power, car and audio.';
  const add = (key, value) => {
    let m = document.head.querySelector(`meta[name="${key}"]`);
    if (!m) { m = document.createElement('meta'); m.name = key; document.head.appendChild(m); }
    m.content = value;
  };
  add('description', description);
  add('theme-color', '#111210');
  if (!document.querySelector('link[rel="canonical"]')) {
    const link = document.createElement('link'); link.rel = 'canonical'; link.href = location.href.split('#')[0]; document.head.appendChild(link);
  }
  if (!document.querySelector('script[data-rock-schema="organization"]')) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.rockSchema = 'organization';
    script.textContent = JSON.stringify({
      '@context':'https://schema.org', '@type':'OnlineStore', name:brand,
      url:location.origin + location.pathname, email:'hello@rock.sa', slogan:'POWER YOUR EVERYDAY'
    });
    document.head.appendChild(script);
  }
  if (!document.querySelector('script[data-rock-product-linker]')) {
    const s = document.createElement('script');
    s.src = 'product-linker.js';
    s.dataset.rockProductLinker = '1';
    document.body.appendChild(s);
  }
})();

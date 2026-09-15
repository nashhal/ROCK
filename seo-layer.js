/* ROCK SEO layer — safe static-site metadata foundation */
(() => {
  'use strict';
  const brand = 'ROCK';
  const description = 'ROCK — everyday technology accessories for charging, power, car and audio.';
  const add = (key, value) => { if (!document.head.querySelector(`meta[name="${key}"]`)) { const m=document.createElement('meta'); m.name=key; m.content=value; document.head.appendChild(m); } };
  add('description', description);
  add('theme-color', '#111210');
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { const link=document.createElement('link'); link.rel='canonical'; link.href=location.href.split('#')[0]; document.head.appendChild(link); }
  if (!document.querySelector('script[data-rock-schema="organization"]')) {
    const script=document.createElement('script'); script.type='application/ld+json'; script.dataset.rockSchema='organization';
    script.textContent=JSON.stringify({ '@context':'https://schema.org', '@type':'Organization', name:brand, url:location.origin + location.pathname, email:'hello@rock.sa', slogan:'POWER YOUR EVERYDAY' });
    document.head.appendChild(script);
  }
})();

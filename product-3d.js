import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/geometries/RoundedBoxGeometry.js';

(() => {
  'use strict';

  const VERSION = '20260913-3d-1';
  const views = new Map();
  const visible = new Set();
  let renderer = null;
  let canvas = null;
  let raf = 0;
  let last = performance.now();

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function installStyles() {
    if (document.getElementById('rock-3d-css')) return;
    const style = document.createElement('style');
    style.id = 'rock-3d-css';
    style.textContent = `
      .product-art.has-catalog-image { background: var(--paper, #f3f3f1) !important; overflow: hidden; }
      .rock-3d-viewer { position: absolute; inset: 0; z-index: 3; background: var(--paper, #f3f3f1); cursor: grab; touch-action: pan-y; }
      .rock-3d-viewer:active { cursor: grabbing; }
      .rock-3d-viewer canvas { width:100% !important; height:100% !important; display:block; }
      .product-art.has-catalog-image > .product-image.rock-3d-source { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; position: absolute !important; }
      .rock-3d-label { position:absolute; top:12px; left:12px; z-index:5; padding:6px 8px; border:1px solid rgba(16,16,16,.10); border-radius:999px; background:rgba(243,243,241,.80); backdrop-filter:blur(8px); font:700 8px/1 Montserrat,sans-serif; letter-spacing:.12em; color:#3f3f3b; pointer-events:none; }
      @media (prefers-reduced-motion: reduce) { .rock-3d-viewer { cursor:default; } }
    `;
    document.head.appendChild(style);
  }

  function ensureRenderer() {
    if (renderer) return true;
    canvas = document.createElement('canvas');
    canvas.id = 'rock-3d-renderer';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:29;pointer-events:none;display:block;';
    document.body.appendChild(canvas);
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.setClearColor(0x000000, 0);
      resizeRenderer();
      return true;
    } catch (err) {
      canvas.remove();
      canvas = null;
      renderer = null;
      console.warn('[ROCK 3D] WebGL unavailable:', err);
      return false;
    }
  }

  function resizeRenderer() {
    if (!renderer) return;
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    renderer.setSize(w, h, false);
  }

  function sourceUrl(img) {
    return img.dataset.rockImage || img.getAttribute('src') || '';
  }

  async function loadProcessedTexture(url) {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();

    const max = 320;
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const w = Math.max(1, Math.round(image.naturalWidth * scale));
    const h = Math.max(1, Math.round(image.naturalHeight * scale));
    const source = document.createElement('canvas');
    source.width = w;
    source.height = h;
    const ctx = source.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);

    const mask = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0, tail = 0;
    const push = (x, y) => { queue[tail++] = y * w + x; };
    const isBg = (i) => {
      const r=data.data[i*4], g=data.data[i*4+1], b=data.data[i*4+2];
      return r > 238 && g > 238 && b > 238 && Math.max(r,g,b) - Math.min(r,g,b) < 16;
    };
    for (let x=0; x<w; x++) { if (isBg(x)) { mask[x]=1; push(x,0); } const j=(h-1)*w+x; if (isBg(j)) { mask[j]=1; push(x,h-1); } }
    for (let y=0; y<h; y++) { const i=y*w; if (isBg(i)) { mask[i]=1; push(0,y); } const j=y*w+w-1; if (isBg(j)) { mask[j]=1; push(w-1,y); } }
    while (head < tail) {
      const p=queue[head++], x=p%w, y=(p/w)|0;
      const ns=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
      for (const [nx,ny] of ns) {
        if (nx<0||ny<0||nx>=w||ny>=h) continue;
        const ni=ny*w+nx;
        if (!mask[ni] && isBg(ni)) { mask[ni]=1; push(nx,ny); }
      }
    }

    let minX=w, minY=h, maxX=-1, maxY=-1, sumR=0, sumG=0, sumB=0, count=0;
    for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
      const p=y*w+x, di=p*4;
      if (mask[p]) data.data[di+3]=0;
      else {
        const a=data.data[di+3];
        if (a>8) {
          minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y);
          sumR += data.data[di]; sumG += data.data[di+1]; sumB += data.data[di+2]; count++;
        }
      }
    }
    if (maxX < minX || maxY < minY) { minX=0; minY=0; maxX=w-1; maxY=h-1; }
    const pad = Math.max(2, Math.round(Math.min(w,h)*0.04));
    minX=clamp(minX-pad,0,w-1); minY=clamp(minY-pad,0,h-1); maxX=clamp(maxX+pad,0,w-1); maxY=clamp(maxY+pad,0,h-1);
    const crop = document.createElement('canvas');
    crop.width = maxX-minX+1; crop.height=maxY-minY+1;
    const cctx=crop.getContext('2d');
    cctx.putImageData(data, -minX, -minY);
    const texture = new THREE.CanvasTexture(crop);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer?.capabilities.getMaxAnisotropy?.() || 1);
    texture.needsUpdate = true;
    const average = count ? new THREE.Color((sumR/count)/255,(sumG/count)/255,(sumB/count)/255) : new THREE.Color('#d9d9d5');
    return { texture, crop, average, ratio: crop.width/crop.height };
  }

  function addLights(scene) {
    scene.add(new THREE.HemisphereLight(0xf7f7f4, 0x32322f, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(3, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0xd9dad7, 2.0); rim.position.set(-4, 2, -5); scene.add(rim);
  }

  function materialFromTexture(texture) {
    return new THREE.MeshPhysicalMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.015,
      side: THREE.DoubleSide,
      roughness: 0.42,
      metalness: 0.06,
      clearcoat: 0.12,
      clearcoatRoughness: 0.35
    });
  }

  async function buildView(img) {
    if (views.has(img) || !ensureRenderer()) return;
    const art = img.closest('.product-art');
    if (!art) return;

    const viewer = document.createElement('div');
    viewer.className='rock-3d-viewer';
    viewer.title='اسحب لتدوير المنتج';
    const label=document.createElement('span'); label.className='rock-3d-label'; label.textContent='3D VIEW'; viewer.appendChild(label);
    art.appendChild(viewer);
    img.classList.add('rock-3d-source');

    const scene = new THREE.Scene();
    addLights(scene);
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 0.02, 4.4);

    const path=sourceUrl(img);
    try {
      const {texture, average, ratio} = await loadProcessedTexture(path + (path.includes('?')?'&':'?') + 'v=' + VERSION);
      const wide = ratio >= 1;
      const height = wide ? 1.55 : 1.9;
      const width = height * ratio;
      const depth = clamp(Math.min(width,height)*0.16, 0.08, 0.24);
      const shell = new THREE.Mesh(
        new RoundedBoxGeometry(width*1.03, height*1.03, depth, Math.min(depth*0.42, 0.10), 5),
        new THREE.MeshStandardMaterial({ color: average, roughness:0.52, metalness:0.08 })
      );
      const front = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), materialFromTexture(texture));
      front.position.z = depth*0.52;
      const back = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), new THREE.MeshStandardMaterial({color:average,roughness:.58,metalness:.04}));
      back.rotation.y = Math.PI; back.position.z = -depth*0.52;
      const group=new THREE.Group();
      group.add(shell,front,back);
      scene.add(group);

      const state={img,art,viewer,scene,camera,group,texture,rotY:(Math.random()*Math.PI*2),rotX:-0.08,targetX:-0.08,targetY:0,zoom:1,down:false,lastX:0,lastY:0,auto:true};
      views.set(img,state);
      bindInteraction(state);
    } catch (err) {
      viewer.remove();
      img.classList.remove('rock-3d-source');
      console.warn('[ROCK 3D] texture/model build failed:', path, err);
    }
  }

  function bindInteraction(v) {
    const start=(x,y)=>{v.down=true;v.auto=false;v.lastX=x;v.lastY=y;};
    const move=(x,y)=>{if(!v.down)return;const dx=x-v.lastX,dy=y-v.lastY;v.rotY+=dx*0.012;v.targetX=clamp(v.targetX+dy*0.006,-0.55,0.38);v.lastX=x;v.lastY=y;};
    const end=()=>{v.down=false;};
    v.viewer.addEventListener('pointerdown',e=>{v.viewer.setPointerCapture(e.pointerId);start(e.clientX,e.clientY);});
    v.viewer.addEventListener('pointermove',e=>move(e.clientX,e.clientY));
    v.viewer.addEventListener('pointerup',end);
    v.viewer.addEventListener('pointercancel',end);
    v.viewer.addEventListener('wheel',e=>{e.preventDefault();v.zoom=clamp(v.zoom-(e.deltaY*0.0007),0.82,1.25);},{passive:false});
    v.viewer.addEventListener('mouseenter',()=>{v.auto=false;});
    v.viewer.addEventListener('mouseleave',()=>{v.auto=true;});
  }

  function observe() {
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
      const img=entry.target.querySelector('.product-image') || (entry.target.matches('.product-image')?entry.target:null);
      if (!img) return;
      if (entry.isIntersecting) { visible.add(img); buildView(img); }
      else visible.delete(img);
    }),{rootMargin:'240px 0px'});
    document.querySelectorAll('.product-art.has-catalog-image .product-image').forEach(img=>io.observe(img));
    const grid=document.getElementById('productGrid');
    if (grid) new MutationObserver(()=>document.querySelectorAll('.product-art.has-catalog-image .product-image').forEach(img=>{ if(!img.dataset.rockObserved){img.dataset.rockObserved='1';io.observe(img);} })).observe(grid,{childList:true,subtree:true});
  }

  function tick(now) {
    const dt=Math.min(0.05,(now-last)/1000); last=now;
    if (renderer) {
      resizeRenderer();
      renderer.setScissorTest(true);
      renderer.setClearColor(0x000000,0);
      for (const img of visible) {
        const v=views.get(img); if(!v||!v.art.isConnected) { visible.delete(img); continue; }
        const r=v.art.getBoundingClientRect();
        if(r.width<4||r.height<4||r.bottom<0||r.top>window.innerHeight) continue;
        const x=Math.max(0,Math.floor(r.left)), y=Math.max(0,Math.floor(window.innerHeight-r.bottom));
        const w=Math.min(window.innerWidth-x,Math.ceil(r.width)), h=Math.min(window.innerHeight-y,Math.ceil(r.height));
        if(w<=0||h<=0) continue;
        v.camera.aspect=r.width/r.height; v.camera.position.z=4.4/v.zoom; v.camera.updateProjectionMatrix();
        v.targetX += (v.rotX-v.targetX)*Math.min(1,dt*7);
        v.group.rotation.y=v.rotY;
        v.group.rotation.x=v.targetX;
        renderer.setViewport(x,y,w,h); renderer.setScissor(x,y,w,h); renderer.clear(true,true,true); renderer.render(v.scene,v.camera);
        if(v.auto&&!v.down&&!matchMedia('(prefers-reduced-motion: reduce)').matches) v.rotY += dt*0.72;
      }
      renderer.setScissorTest(false);
    }
    raf=requestAnimationFrame(tick);
  }

  function init() {
    installStyles();
    observe();
    if(!raf) raf=requestAnimationFrame(tick);
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
  window.addEventListener('resize',resizeRenderer,{passive:true});
})();

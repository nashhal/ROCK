/* ROCKY scroll-flight — uses the official ROCKY SVG and follows the existing storefront sections. */
(() => {
  'use strict';
  const root = document.getElementById('rockyFlight');
  const stage = document.getElementById('rockyFlightStage');
  if (!root || !stage) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  const points = [
    { id:'hero', selector:'.hero', desktop:{x:.075,y:.70,s:1.02,turn:-12,pitch:5,roll:-7,alpha:.92,dark:true}, mobile:{x:.075,y:.78,s:.64,turn:-9,pitch:3,roll:-5,alpha:.74,dark:true} },
    { id:'service', selector:'.service-strip', desktop:{x:.925,y:.34,s:.72,turn:11,pitch:-3,roll:8,alpha:.82,dark:true}, mobile:{x:.925,y:.25,s:.52,turn:10,pitch:-2,roll:6,alpha:.64,dark:true} },
    { id:'shop', selector:'#shop', desktop:{x:.07,y:.19,s:.56,turn:-8,pitch:4,roll:-6,alpha:.54}, mobile:{x:.94,y:.16,s:.4,turn:8,pitch:2,roll:5,alpha:.42} },
    { id:'collections', selector:'#collections', desktop:{x:.93,y:.25,s:.82,turn:13,pitch:-4,roll:7,alpha:.88,dark:true}, mobile:{x:.075,y:.23,s:.56,turn:-10,pitch:-2,roll:-6,alpha:.7,dark:true} },
    { id:'story', selector:'#story', desktop:{x:.075,y:.45,s:.86,turn:-12,pitch:5,roll:-8,alpha:.86}, mobile:{x:.925,y:.43,s:.55,turn:10,pitch:3,roll:6,alpha:.7} },
    { id:'closing', selector:'.closing-banner', desktop:{x:.91,y:.32,s:.9,turn:10,pitch:-4,roll:7,alpha:.9,dark:true}, mobile:{x:.09,y:.34,s:.59,turn:-8,pitch:-2,roll:-5,alpha:.72,dark:true} },
    { id:'footer', selector:'.site-footer', desktop:{x:.15,y:.42,s:.62,turn:-8,pitch:3,roll:-4,alpha:.68}, mobile:{x:.9,y:.39,s:.45,turn:9,pitch:2,roll:5,alpha:.55} }
  ];

  let anchors = [];
  let frame = 0;
  let lastTime = 0;
  let lastScroll = window.scrollY;
  let scrollLean = 0;
  let pointerX = 0;
  let pointerY = 0;
  let smoothPointerX = 0;
  let smoothPointerY = 0;
  let smooth = null;

  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const mix = (a,b,t) => a + (b-a)*t;
  const ease = value => value*value*(3-2*value);
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  function measure(){
    anchors = points.map(point => {
      const element = document.querySelector(point.selector);
      return element ? {
        id:point.id,
        top:element.getBoundingClientRect().top + window.scrollY,
        desktop:point.desktop,
        mobile:point.mobile
      } : null;
    }).filter(Boolean);
    if (!anchors.length) return;
    if (!smooth) {
      const first = anchors[0][isMobile()?'mobile':'desktop'];
      smooth = {x:first.x*window.innerWidth,y:first.y*window.innerHeight,s:first.s,turn:first.turn,pitch:first.pitch,roll:first.roll,alpha:first.alpha,dark:Boolean(first.dark)};
    }
  }

  function target(){
    if (!anchors.length) return null;
    const mobile = isMobile();
    const focusY = window.scrollY + Math.min(52,window.innerHeight*.055);
    let index = 0;
    while (index < anchors.length-2 && focusY > anchors[index+1].top) index++;
    const from = anchors[index];
    const to = anchors[Math.min(index+1,anchors.length-1)];
    const a = mobile ? from.mobile : from.desktop;
    const b = mobile ? to.mobile : to.desktop;
    const span = Math.max(1,to.top-from.top);
    const progress = index === anchors.length-1 ? 0 : ease(clamp((focusY-from.top)/span,0,1));
    const alpha = mix(a.alpha,b.alpha,progress);
    return {
      landmark:progress>.52?to.id:from.id,
      x:mix(a.x,b.x,progress)*window.innerWidth,
      y:mix(a.y,b.y,progress)*window.innerHeight,
      s:mix(a.s,b.s,progress),
      turn:mix(a.turn,b.turn,progress),
      pitch:mix(a.pitch,b.pitch,progress),
      roll:mix(a.roll,b.roll,progress),
      alpha,
      dark:progress>.52?Boolean(b.dark):Boolean(a.dark)
    };
  }

  function render(time){
    frame = 0;
    if (document.visibilityState === 'hidden') return;
    const t = target();
    if (!t || !smooth) return;
    const dt = lastTime ? Math.min((time-lastTime)/1000,.05) : 1/60;
    lastTime = time;
    const follow = 1-Math.exp(-dt*4.4);
    const slowFollow = 1-Math.exp(-dt*3.1);
    smooth.x = mix(smooth.x,t.x,follow);
    smooth.y = mix(smooth.y,t.y,follow);
    smooth.s = mix(smooth.s,t.s,follow);
    smooth.turn = mix(smooth.turn,t.turn,slowFollow);
    smooth.pitch = mix(smooth.pitch,t.pitch,follow);
    smooth.roll = mix(smooth.roll,t.roll,follow);
    smooth.alpha = mix(smooth.alpha,t.alpha,follow);
    smooth.dark = t.dark;
    const velocityTilt = clamp(scrollLean*46,-8,8);
    smoothPointerX = mix(smoothPointerX,pointerX,follow);
    smoothPointerY = mix(smoothPointerY,pointerY,follow);
    const pointerTiltX = smoothPointerY * 4;
    const pointerTiltY = smoothPointerX * 7;
    const halfWidth = root.offsetWidth * smooth.s * .5;
    const safeX = clamp(smooth.x,halfWidth+18,Math.max(halfWidth+18,window.innerWidth-halfWidth-18));
    root.style.transform = `translate3d(${safeX}px,${smooth.y}px,0) translate(-50%,-50%) scale(${smooth.s}) rotateZ(${smooth.roll+velocityTilt}deg)`;
    stage.style.transform = `rotateX(${smooth.pitch-pointerTiltX}deg) rotateY(${smooth.turn+pointerTiltY}deg)`;
    root.style.setProperty('--rocky-flight-opacity',String(smooth.alpha));
    root.classList.toggle('is-on-dark',smooth.dark);
    root.classList.add('is-ready');
    root.dataset.landmark = t.landmark;
    scrollLean *= .86;
    if (Math.abs(scrollLean)<.001) scrollLean=0;
    const stillMoving =
      Math.abs(smooth.x-t.x)>.35 ||
      Math.abs(smooth.y-t.y)>.35 ||
      Math.abs(smooth.s-t.s)>.002 ||
      Math.abs(smooth.turn-t.turn)>.08 ||
      Math.abs(smooth.pitch-t.pitch)>.08 ||
      Math.abs(smooth.roll-t.roll)>.08 ||
      Math.abs(smooth.alpha-t.alpha)>.004 ||
      Math.abs(scrollLean)>.001 ||
      Math.abs(smoothPointerX-pointerX)>.004 ||
      Math.abs(smoothPointerY-pointerY)>.004;
    if (stillMoving) frame = window.requestAnimationFrame(render);
    else frame = 0;
  }

  function requestRender(){
    if (reducedMotion && reducedMotion.matches) return;
    if (!frame) frame = window.requestAnimationFrame(render);
  }

  function onScroll(){
    const nextScroll = window.scrollY;
    scrollLean = clamp((nextScroll-lastScroll)/Math.max(1,window.innerHeight),-.18,.18);
    lastScroll = nextScroll;
    requestRender();
  }

  function onPointer(event){
    if (!window.matchMedia('(pointer:fine)').matches) return;
    pointerX = clamp((event.clientX/window.innerWidth-.5)*2,-1,1);
    pointerY = clamp((.5-event.clientY/window.innerHeight)*2,-1,1);
    requestRender();
  }

  function applyReducedMotion(){
    if (reducedMotion && reducedMotion.matches) {
      if (frame) cancelAnimationFrame(frame);
      frame=0;
      const first = points[0].mobile;
      const x = first.x*window.innerWidth;
      const y = first.y*window.innerHeight;
      root.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${first.s})`;
      stage.style.transform = 'none';
      smoothPointerX=pointerX=0;
      smoothPointerY=pointerY=0;
      root.style.setProperty('--rocky-flight-opacity',String(first.alpha));
      root.dataset.landmark = 'hero';
      root.classList.remove('is-on-dark');
      root.classList.add('is-ready');
    } else {
      lastTime=0;
      requestRender();
    }
  }

  measure();
  applyReducedMotion();
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',()=>{measure();requestRender()},{passive:true});
  window.addEventListener('pointermove',onPointer,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){lastTime=0;requestRender()}});
  reducedMotion?.addEventListener?.('change',applyReducedMotion);
  window.addEventListener('load',()=>{measure();requestRender()},{once:true});
})();

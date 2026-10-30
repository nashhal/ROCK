/* ROCK homepage motion layer: reading progress + quiet section reveals. */
(() => {
  'use strict';
  const body=document.body;
  const progress=document.getElementById('rockProgressBar');
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  body.classList.add('rock-immersive');
  let raf=0;
  const update=()=>{
    raf=0;
    const scrollable=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
    const amount=Math.max(0,Math.min(1,window.scrollY/scrollable));
    if(progress)progress.style.transform='scaleX('+amount+')';
    body.classList.toggle('rock-page-scrolled',window.scrollY>22);
  };
  const schedule=()=>{
    if(raf)return;
    raf=window.requestAnimationFrame(update);
  };
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('load',schedule,{once:true});
  update();

  const revealNodes=[
    ...document.querySelectorAll('.service-item,.shop-section .section-head,.collections .section-head,.collection-card,.story-mark,.story-copy,.closing-banner>div,.closing-banner>.circle-arrow')
  ];
  revealNodes.forEach((node,index)=>{
    node.classList.add('rock-reveal');
    node.dataset.rockDelay=String(index%4);
  });
  if(!reduce&&'IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('rock-visible');
          observer.unobserve(entry.target);
        }
      });
    },{threshold:.16,rootMargin:'0px 0px -6% 0px'});
    revealNodes.forEach(node=>observer.observe(node));
  }else{
    revealNodes.forEach(node=>node.classList.add('rock-visible'));
  }
})();

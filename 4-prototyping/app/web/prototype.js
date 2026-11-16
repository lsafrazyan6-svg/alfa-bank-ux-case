// Local prototype navigation only. No banking requests or bank application code.
const screen = document.body.dataset.screen;
const go = name => { location.href = `${name === 'home' ? 'index' : name}.html`; };
const exact = (text) => [...document.querySelectorAll('a,button,span,div,h3')].filter(el => el.textContent.trim() === text);
function routeText(text, page) {
  for (const el of exact(text)) {
    if ([...el.children].some(c => c.textContent.trim() === text)) continue;
    const target = el.closest('a,button,[role="button"]') || el;
    target.dataset.route = page;
    target.style.cursor = 'pointer';
    if (!target.matches('a,button')) { target.tabIndex = 0; target.setAttribute('role','button'); }
  }
}
for (const [label,page] of Object.entries({'Главный':'home','Выгода':'benefits','История':'history','Задания и награды':'tasks','Выберите категории':'cashback','+1 категория кэшбэка':'cashback','Готово':'benefits','К покупкам':'history'})) routeText(label,page);
for (const el of document.querySelectorAll('[data-test-id*="quest-card"]')) {
  const text = el.textContent;
  el.dataset.route = text.includes('20\u00a0000') || text.includes('3000') ? 'task-shopping' : text.includes('категориях') ? 'task-categories' : text.includes('сохранение') ? 'task-balance' : '';
  if (el.dataset.route) { el.setAttribute('role','button'); el.tabIndex=0; el.style.cursor='pointer'; }
}
for (const el of document.querySelectorAll('[data-test-id*="back"],button[title="Назад"]')) el.dataset.back = 'true';
let selected = screen === 'cashback-selected';
for (const el of document.querySelectorAll('[data-test-id="category-cashback-free-item"]')) {
  el.addEventListener('click', () => {
    document.querySelectorAll('input[type="checkbox"]').forEach(c => { c.checked = false; });
    const input = el.querySelector('input'); if (input) input.checked = true;
    selected = true;
    const summary = document.querySelector('[data-test-id="summary-free-main"]');
    if (summary) for (const n of summary.querySelectorAll('*')) if (!n.children.length && /[01] из 1/.test(n.textContent)) n.textContent = '1 из 1';
    const submit = document.querySelector('[data-test-id="submit-button-choose-cashback"]');
    if (submit) submit.disabled = false;
  });
}
const submit = document.querySelector('[data-test-id="submit-button-choose-cashback"]');
if (submit) submit.addEventListener('click', () => { if (selected) go('cashback-done'); });
document.addEventListener('click', event => {
  const route = event.target.closest('[data-route]');
  if (route?.dataset.route) { event.preventDefault(); go(route.dataset.route); return; }
  if (event.target.closest('[data-back]')) { event.preventDefault(); go(screen.startsWith('task-') ? 'tasks' : 'benefits'); return; }
  const a = event.target.closest('a'); if (a) event.preventDefault();
});
document.addEventListener('keydown', e => { if (e.key==='Enter' && e.target.dataset.route) go(e.target.dataset.route); });
// A separate navigation page is available to the owner, without an overlay on test screens.
// Explicit navbar destinations also work when the icon is clicked.
for (const [suffix, page] of Object.entries({main:'home',marketplace:'benefits',history:'history'})) {
  const el = document.querySelector(`[data-test-id="mobile-footer-navbar-link-${suffix}"]`);
  if(el) { el.dataset.route=page; el.href=`${page==='home'?'index':page}.html`; }
}
routeText('Моя выгода', 'benefits');
if (screen === 'home') {
  const panel=document.querySelector('.RGWna');
  const handle=document.querySelector('.wzVlA > .ohvjj');
  const header=document.querySelector('[data-test-id="main-page-bottom-sheet-container-header"]');
  const scroller=document.querySelector('.D20jK');
  const collapsed=()=>Math.min(440,innerHeight-240);
  let expanded=false, startY=0, startTop=0, dragged=false;
  const setTop=(top,animate=true)=>{
    document.body.style.setProperty('--prototype-sheet-top',`${top}px`);
    document.body.classList.toggle('sheet-dragging',!animate);
  };
  const settle=next=>{
    expanded=next;setTop(next?8:collapsed());
    document.body.dataset.sheet=next?'expanded':'collapsed';
    if(handle)handle.setAttribute('aria-expanded',String(next));
    if(!next&&scroller)scroller.scrollTop=0;
  };
  for(const target of [handle,header].filter(Boolean)) {
    target.style.touchAction='none';
    target.addEventListener('pointerdown',e=>{startY=e.clientY;startTop=panel.getBoundingClientRect().top;dragged=false;target.setPointerCapture(e.pointerId);});
    target.addEventListener('pointermove',e=>{if(!target.hasPointerCapture(e.pointerId))return;const delta=e.clientY-startY;if(Math.abs(delta)>5)dragged=true;if(dragged)setTop(Math.max(8,Math.min(collapsed(),startTop+delta)),false);});
    target.addEventListener('pointerup',e=>{if(target.hasPointerCapture(e.pointerId))target.releasePointerCapture(e.pointerId);if(dragged)settle(panel.getBoundingClientRect().top<collapsed()/2);else if(target===handle)settle(!expanded);});
    target.addEventListener('pointercancel',()=>settle(expanded));
  }
  if(handle){handle.setAttribute('role','button');handle.setAttribute('aria-label','Развернуть или свернуть главную');handle.tabIndex=0;handle.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();settle(!expanded)}});}
  if(scroller)scroller.addEventListener('wheel',e=>{if(!expanded&&e.deltaY>10){e.preventDefault();settle(true)}},{passive:false});
  window.addEventListener('resize',()=>settle(expanded));
  settle(false);
}
// Native touch scrolling + mouse grab scrolling for archived horizontal carousels.
let suppressCarouselClickUntil = 0;
document.addEventListener('click', event => {
  if (performance.now() < suppressCarouselClickUntil && event.target.closest('.swiper,.prototype-carousel')) {
    event.preventDefault(); event.stopImmediatePropagation();
  }
}, true);
for (const el of document.querySelectorAll('div,section')) {
  if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 4 && ['auto','scroll'].includes(getComputedStyle(el).overflowX)) el.classList.add('prototype-carousel');
}
for (const carousel of document.querySelectorAll('.swiper,.prototype-carousel')) {
  carousel.tabIndex = 0;
  carousel.setAttribute('aria-label', 'Карусель предложений');
  for (const image of carousel.querySelectorAll('img')) image.draggable = false;
  carousel.addEventListener('dragstart', e => e.preventDefault());
  let drag = null;
  carousel.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || event.button !== 0) return;
    drag = { id:event.pointerId, x:event.clientX, y:event.clientY, left:carousel.scrollLeft, active:false };
  });
  carousel.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { drag=null; return; }
      if (Math.abs(dx) < 6) return;
      drag.active = true;
      carousel.setPointerCapture(event.pointerId);
      carousel.classList.add('carousel-dragging');
    }
    event.preventDefault();
    carousel.scrollLeft = drag.left - dx;
    suppressCarouselClickUntil = performance.now() + 350;
  });
  const finish = event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.active) suppressCarouselClickUntil = performance.now() + 350;
    drag = null;
    carousel.classList.remove('carousel-dragging');
    if (carousel.hasPointerCapture(event.pointerId)) carousel.releasePointerCapture(event.pointerId);
  };
  for (const name of ['pointerup','pointercancel','lostpointercapture']) carousel.addEventListener(name, finish);
  carousel.addEventListener('pointerleave', event => { if(drag && !drag.active) finish(event); });
  carousel.addEventListener('keydown', event => {
    if (event.target!==carousel || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    carousel.scrollBy({left:(event.key==='ArrowRight'?1:-1)*carousel.clientWidth*.7,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
}
// Keep the active tab consistent after restoring complete Lottie icon frames.
const activeTab = screen === 'home' ? 'main' : screen === 'history' ? 'history' : 'marketplace';
for (const a of document.querySelectorAll('nav a[data-test-id]')) {
  const active = a.dataset.testId === `mobile-footer-navbar-link-${activeTab}`;
  a.classList.toggle('active',active);
  if(active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  const color=active?'rgb(3, 3, 6)':'rgb(144, 144, 149)';
  for(const label of a.querySelectorAll(':scope > span'))label.style.color=color;
  for(const shape of a.querySelectorAll('svg path[fill],svg circle[fill]')) {
    if(shape.closest('defs,mask,clipPath'))continue;
    const fill=shape.getAttribute('fill').replace(/\s/g,'');
    if(!['none','transparent','rgb(255,255,255)','#fff','#ffffff','white'].includes(fill) && !fill.startsWith('url('))shape.setAttribute('fill',color);
  }
}

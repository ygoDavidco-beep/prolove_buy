// Світи на одній сторінці (як Worlds.tsx у прототипі): Запитай · Кава · Партнерам.
// Свайп робить браузер (scroll-snap), тут лише: який світ зараз, меню, адреса, посилання між світами і разовий «підгляд».
const worlds = document.getElementById('worlds');
const panes = [...worlds.querySelectorAll('.world')];
const KEYS = panes.map(p => p.dataset.w);
const tabs = [...document.querySelectorAll('.nav-tabs [data-w]')];
let cur = KEYS.indexOf('kava');

const width = () => worlds.clientWidth || innerWidth;
function show(key, smooth = true) {
  const i = KEYS.indexOf(key);
  if (i < 0) return;
  worlds.scrollTo({ left: i * width(), behavior: smooth ? 'smooth' : 'instant' });
  if (!smooth) mark(i);
}
function mark(i) {
  if (i === cur && tabs.some(t => t.getAttribute('aria-current') === 'true')) return;
  cur = i;
  tabs.forEach(t => t.setAttribute('aria-current', String(t.dataset.w === KEYS[i])));
  const u = new URL(location.href);
  if (KEYS[i] === 'kava') u.searchParams.delete('w'); else u.searchParams.set('w', KEYS[i]);
  history.replaceState(history.state, '', u);
  dispatchEvent(new CustomEvent('pl:world', { detail: KEYS[i] }));
}
// видно світ (хоч частково)? — Матриця не малює дощ, коли її не видно
function visibility() {
  const x = worlds.scrollLeft, w = width();
  panes.forEach((p, j) => { p.dataset.vis = Math.abs(x - j * w) < w - 1 ? '1' : '0'; });
}
worlds.addEventListener('scroll', () => {
  visibility();
  const i = Math.round(worlds.scrollLeft / width());
  if (i !== cur) mark(i);
}, { passive: true });
new ResizeObserver(() => { worlds.scrollTo({ left: cur * width(), behavior: 'instant' }); visibility(); }).observe(worlds);

tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.w)));

// посилання між світами не перезавантажують сторінку
document.addEventListener('click', e => {
  const a = e.target.closest?.('a[href]');
  if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.button) return;
  const u = new URL(a.getAttribute('href'), location.href);
  // адреса цієї ж сторінки світів: «/» на сервері або «…/index.html» у статичному демо
  const self = u.pathname === location.pathname || /\/(index\.html)?$/.test(u.pathname);
  if (u.origin !== location.origin || !self) return;
  e.preventDefault();
  if (u.hash.length > 1) { openLot(decodeURIComponent(u.hash.slice(1))); return; }
  show(a.dataset.go || u.searchParams.get('w') || 'kava');
}, true);
function openLot(id) {
  dispatchEvent(new CustomEvent('pl:lot', { detail: id }));
  show('kava');
}
addEventListener('hashchange', () => { if (location.hash.length > 1) openLot(decodeURIComponent(location.hash.slice(1))); });

addEventListener('keydown', e => {
  if (e.target.closest?.('input, textarea, select') || e.altKey || e.metaKey || e.ctrlKey || document.querySelector('.sheet.on')) return;
  if (e.key === 'ArrowLeft' && cur > 0) show(KEYS[cur - 1]);
  if (e.key === 'ArrowRight' && cur < KEYS.length - 1) show(KEYS[cur + 1]);
});

// стрічка → Матриця: чіткий свайп праворуч на пачці (картка вже на першій сторінці).
// Safari на iPhone не передає жест із вкладеної картки на світи — тому робимо це явно.
(() => {
  let t = null;
  const kava = document.getElementById('w-kava');
  kava.addEventListener('touchstart', e => {
    const pg = e.target.closest('.pager');
    const p = e.touches[0];
    // від самого краю екрана — це «назад» телефона, не чіпаємо
    t = pg && pg.scrollLeft < 4 && e.touches.length === 1 && p.clientX > 24 ? { x: p.clientX, y: p.clientY, at: Date.now() } : null;
  }, { passive: true });
  kava.addEventListener('touchend', e => {
    if (!t) return;
    const p = e.changedTouches[0], dx = p.clientX - t.x, dy = p.clientY - t.y;
    if (dx > 60 && Math.abs(dx) > 2 * Math.abs(dy) && Date.now() - t.at < 900) show('ask');
    t = null;
  }, { passive: true });
})();

// старт: світ з адреси (?w=ask) або стрічка
const start = new URLSearchParams(location.search).get('w');
const first = KEYS.includes(start) ? start : 'kava';
cur = -1;
requestAnimationFrame(() => { show(first, false); visibility(); });

// разовий «підгляд»: світи ледь зсуваються — видно край Матриці, потім край кабінету. Лише картинка, прокрутка не змінюється.
let seen = false;
try { seen = sessionStorage.getItem('pl_peek') === '1'; sessionStorage.setItem('pl_peek', '1'); } catch { /* приватний режим */ }
if (!seen && !start && !location.hash && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const anims = panes.map(p => p.animate([
    { transform: 'translateX(0)' }, { transform: 'translateX(56px)', offset: 0.22 }, { transform: 'translateX(56px)', offset: 0.3 },
    { transform: 'translateX(0)', offset: 0.5 }, { transform: 'translateX(-56px)', offset: 0.72 }, { transform: 'translateX(-56px)', offset: 0.8 },
    { transform: 'translateX(0)' },
  ], { duration: 2300, delay: 1200, easing: 'ease-in-out' }));
  const cancel = () => anims.forEach(a => a.cancel());
  for (const ev of ['pointerdown', 'keydown', 'wheel']) addEventListener(ev, cancel, { once: true, capture: true, passive: true });
}

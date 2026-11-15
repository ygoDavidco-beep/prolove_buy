// Світи на одній сторінці: Запитай · Кава. Заварити і Партнерам — окремі сторінки з тим самим меню.
// Усі горизонтальні жести тут, в одному місці: сторінка їде за пальцем, а що відкриється — вирішує, де почався жест:
//   Матриця  ← пальцем вліво →  стрічка
//   пачка    → вправо: Матриця · вліво: опис лота
//   опис     → вправо: пачка   · вліво: «Заварити» (окрема сторінка)
// Вертикаль лишається браузеру (стрічка лотів), а з опису, прокрученого до кінця, — наступний лот.
const $ = s => document.querySelector(s);
const worlds = $('#worlds');
const panes = [...worlds.querySelectorAll('.world')];
const KEYS = panes.map(p => p.dataset.w);
const tabs = [...document.querySelectorAll('.nav-tabs [data-w]')];
const feed = $('#feed');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = k => 1 - Math.pow(1 - k, 3);
const W = () => worlds.clientWidth || innerWidth;

// ---------- положення світів: 0 — Матриця, 1 — Кава (дробове під час жесту) ----------
let pos = KEYS.indexOf('kava'), cur = -1, wAnim = 0;
function paint(p) {
  pos = p;
  worlds.style.transform = `translate3d(${-p * 100}%,0,0)`;
  panes.forEach((el, j) => { el.dataset.vis = Math.abs(p - j) < 0.999 ? '1' : '0'; });
  dispatchEvent(new CustomEvent('pl:pos', { detail: p }));
}
function mark(i) {
  if (i === cur) return;
  cur = i;
  tabs.forEach(t => t.setAttribute('aria-current', String(t.dataset.w === KEYS[i])));
  const u = new URL(location.href);
  if (KEYS[i] === 'kava') u.searchParams.delete('w'); else u.searchParams.set('w', KEYS[i]);
  history.replaceState(history.state, '', u);
  dispatchEvent(new CustomEvent('pl:world', { detail: KEYS[i] }));
}
function slideTo(i, ms = 320) {
  cancelAnimationFrame(wAnim);
  const from = pos, d = i - from;
  if (reduce || !ms || Math.abs(d) < 0.001) { paint(i); mark(i); return; }
  const t0 = performance.now(), dur = Math.max(160, ms * Math.min(1, Math.abs(d)));
  const f = now => { const k = Math.min(1, (now - t0) / dur); paint(from + d * ease(k)); if (k < 1) wAnim = requestAnimationFrame(f); else mark(i); };
  wAnim = requestAnimationFrame(f);
}
function show(key, smooth = true) { const i = KEYS.indexOf(key); if (i >= 0) slideTo(i, smooth ? 320 : 0); }

tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.w)));

// ---------- картка лота: пачка ↔ опис (гортаємо самі, без вкладеного гортання браузера) ----------
const lotNow = () => feed?.querySelectorAll('.lot')[Math.round(feed.scrollTop / (feed.clientHeight || 1))] || null;
const pageOf = pg => Math.round(pg.scrollLeft / (pg.clientWidth || 1));
function pagerTo(pg, page, ms = 300) {
  cancelAnimationFrame(pg._raf);
  const from = pg.scrollLeft, to = page * pg.clientWidth, d = to - from;
  if (reduce || Math.abs(d) < 1) { pg.scrollLeft = to; return; }
  const t0 = performance.now(), dur = Math.max(140, ms * Math.min(1, Math.abs(d) / pg.clientWidth));
  const f = now => { const k = Math.min(1, (now - t0) / dur); pg.scrollLeft = from + d * ease(k); if (k < 1) pg._raf = requestAnimationFrame(f); };
  pg._raf = requestAnimationFrame(f);
}

// «Заварити» за описом: підказка, що тягне сторінку
const brewHref = () => document.querySelector('.nav-tabs a[href*="brew"]')?.href || '/brew';
const pull = document.createElement('div');
pull.className = 'pull-brew'; pull.setAttribute('aria-hidden', 'true');
pull.innerHTML = '<span>Заварити</span><b>›</b>';
$('#w-kava')?.appendChild(pull);
const PULL = 0.28; // частка ширини екрана, яку треба протягнути пальцем до «Заварити»
function pullPaint(card, px, k = 0) {
  k = Math.min(1, k);
  card.style.transform = px ? `translate3d(${-px}px,0,0)` : '';
  pull.style.opacity = String(k);
  pull.style.transform = `translate3d(${(1 - k) * 40}px,-50%,0) scale(${0.85 + 0.15 * k})`;
  pull.classList.toggle('go', k >= 1);
}
function pullReset(card) {
  if (!card) return;
  card.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)';
  pullPaint(card, 0);
  setTimeout(() => { card.style.transition = ''; }, 260);
}
const rubber = (x, lim) => lim * (1 - 1 / (Math.abs(x) / lim + 1)) * Math.sign(x);

// один крок у бік: dir = 1 — «далі» (палець вліво), −1 — «назад» (палець вправо). Для стрілок і тачпада.
function step(dir) {
  const k = KEYS[cur];
  if (k === 'ask') { if (dir > 0) show('kava'); return; }
  const lot = lotNow(), pg = lot?.querySelector('.pager');
  const page = pg ? pageOf(pg) : 0;
  if (dir < 0) { if (pg && page === 1) pagerTo(pg, 0); else show('ask'); }
  else if (pg && page === 0) pagerTo(pg, 1);
  else if (pg && page === 1) location.href = brewHref();
}

// ---------- дотик ----------
const EDGE = 18; // від самого краю — системний «назад» телефона, не чіпаємо
// кнопки поверх стрічки (кошик, вага, повідомлення, правий ряд) — лише тапи, свайп із них не починаємо
const SKIP = 'input, textarea, select, [contenteditable], .hint, .sheet, .nav, .cartpill, .buy, .btoast, .rail, .toast, .sc-hit';
let g = null;
worlds.addEventListener('touchstart', e => {
  g = null;
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  if (t.clientX < EDGE || t.clientX > innerWidth - EDGE || e.target.closest(SKIP) || $('#w-kava .sheet.on')) return;
  cancelAnimationFrame(wAnim);
  const lot = KEYS[cur] === 'kava' ? e.target.closest('.lot') : null;
  const pg = lot?.querySelector('.pager') || null;
  if (pg) { cancelAnimationFrame(pg._raf); }
  g = { x: t.clientX, y: t.clientY, lx: t.clientX, lt: performance.now(), v: 0, axis: null, pg, page: pg ? pageOf(pg) : 0, p0: pos };
  const card = e.target.closest('.card');
  if (card && feed) Object.assign(g, { card, top: card.scrollTop <= 1, bot: card.scrollTop + card.clientHeight >= card.scrollHeight - 2, feedTop: feed.scrollTop });
}, { passive: true });

worlds.addEventListener('touchmove', e => {
  if (!g) return;
  const t = e.touches[0], dx = t.clientX - g.x, dy = t.clientY - g.y;
  if (!g.axis) {
    // тап із легким ковзанням пальця — ще тап, не свайп
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    g.axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
  }
  if (g.axis !== 'x') return;
  e.preventDefault();
  const now = performance.now();
  g.v = 0.7 * g.v + 0.3 * ((t.clientX - g.lx) / Math.max(1, now - g.lt)); g.lx = t.clientX; g.lt = now;
  drag(dx);
}, { passive: false });

function drag(dx) {
  const w = W(), u = -dx / w; // u > 0 — палець вліво
  g.dx = dx;
  if (KEYS[cur] === 'ask' || !g.pg) {
    const p = g.p0 + u, max = KEYS.length - 1;
    paint(p < 0 ? -rubber(-p, 0.08) : p > max ? max + rubber(p - max, 0.08) : p);
    return;
  }
  const pw = g.pg.clientWidth;
  if (g.page === 0) {
    if (u < 0) { g.pg.scrollLeft = 0; paint(Math.max(0, g.p0 + u)); }            // пачка → Матриця
    else { paint(g.p0); g.pg.scrollLeft = Math.min(1, u) * pw; }                 // пачка → опис
  } else {
    const card = g.pg.querySelector('.card');
    if (u < 0) { pullPaint(card, 0); g.pg.scrollLeft = Math.max(0, 1 + u) * pw; } // опис → пачка
    else { g.pg.scrollLeft = pw; pullPaint(card, rubber(u * w, w * 0.3), u / PULL); } // опис → «Заварити»
  }
}

function release() {
  const w = W(), u = -(g.dx || 0) / w, fling = Math.abs(g.v) > 0.45 ? -Math.sign(g.v) : 0;
  const go = Math.abs(u) > 0.2 || (fling && Math.sign(u) === fling && Math.abs(u) > 0.03);
  if (KEYS[cur] === 'ask' || !g.pg) { slideTo(Math.min(KEYS.length - 1, Math.max(0, Math.round(g.p0 + (go ? Math.sign(u) : 0))))); return; }
  if (g.page === 0) {
    if (u < 0) slideTo(go ? KEYS.indexOf('ask') : g.p0);
    else pagerTo(g.pg, go ? 1 : 0);
  } else {
    const card = g.pg.querySelector('.card');
    if (u < 0) pagerTo(g.pg, go ? 0 : 1);
    else {
      const far = u >= PULL || (fling > 0 && u > 0.1);
      if (far) { pull.classList.add('go'); location.href = brewHref(); setTimeout(() => pullReset(card), 600); } else pullReset(card);
    }
  }
}

worlds.addEventListener('touchend', e => {
  if (!g) return;
  if (g.axis === 'x') release();
  else if (g.axis === 'y' && g.card) {
    // опис прокручено до кінця, а стрічка сама не поїхала (iPhone не передає жест із картки) — наступний / попередній лот
    const dy = e.changedTouches[0].clientY - g.y, H = feed.clientHeight;
    const feedMoved = Math.abs(feed.scrollTop - g.feedTop) > 2;
    const atBot = g.card.scrollTop + g.card.clientHeight >= g.card.scrollHeight - 2;
    if (!feedMoved && dy < -50 && g.bot && atBot) feed.scrollTo({ top: (Math.round(feed.scrollTop / H) + 1) * H, behavior: 'smooth' });
    else if (!feedMoved && dy > 50 && g.top && g.card.scrollTop <= 1) feed.scrollTo({ top: (Math.round(feed.scrollTop / H) - 1) * H, behavior: 'smooth' });
  }
  g = null;
}, { passive: true });
worlds.addEventListener('touchcancel', () => {
  if (g?.axis === 'x') { g.dx = 0; g.v = 0; release(); }
  g = null;
}, { passive: true });

// ---------- тачпад і миша: горизонтальне гортання — один крок за жест ----------
let wsum = 0, wlock = false, wt = 0;
worlds.addEventListener('wheel', e => {
  if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || e.target.closest('.hint, .sheet') || e.ctrlKey) return;
  e.preventDefault();
  clearTimeout(wt); wt = setTimeout(() => { wsum = 0; wlock = false; }, 180);
  if (wlock) return;
  wsum += e.deltaX;
  if (Math.abs(wsum) > 40) { wlock = true; step(wsum > 0 ? 1 : -1); }
}, { passive: false });

addEventListener('keydown', e => {
  if (e.target.closest?.('input, textarea, select') || e.altKey || e.metaKey || e.ctrlKey || $('.sheet.on')) return;
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'ArrowRight') step(1);
});

// ---------- посилання між світами не перезавантажують сторінку ----------
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

// ---------- старт: світ з адреси (?w=ask) або стрічка ----------
const start = new URLSearchParams(location.search).get('w');
show(KEYS.includes(start) ? start : 'kava', false);
// повернення «назад» зі сторінки інструкцій (кеш браузера) — меню на свій світ
addEventListener('pageshow', () => { cur = -1; slideTo(Math.round(pos), 0); });

// ---------- разовий «підгляд»: ледь видно край Матриці, потім край опису лота ----------
let seen = false;
try { seen = sessionStorage.getItem('pl_peek') === '1'; sessionStorage.setItem('pl_peek', '1'); } catch { /* приватний режим */ }
if (!seen && !start && !location.hash && !reduce) {
  const anims = [];
  const cancel = () => anims.forEach(a => a.cancel());
  setTimeout(() => {
    if (cur !== KEYS.indexOf('kava')) return;
    const kv = $('#w-kava');
    anims.push(kv.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(56px)', offset: 0.45 }, { transform: 'translateX(56px)', offset: 0.6 }, { transform: 'translateX(0)' }],
      { duration: 1100, easing: 'ease-in-out' }));
    const pages = lotNow()?.querySelectorAll('.page') || [];
    pages.forEach(p => anims.push(p.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-56px)', offset: 0.45 }, { transform: 'translateX(-56px)', offset: 0.6 }, { transform: 'translateX(0)' }],
      { duration: 1100, delay: 1150, easing: 'ease-in-out' })));
  }, 1300);
  for (const ev of ['pointerdown', 'touchstart', 'keydown', 'wheel']) addEventListener(ev, cancel, { once: true, capture: true, passive: true });
}

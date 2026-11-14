// Оболонка світів: Запитай · Кава · Заварити · Партнерам — одна стрічка, екран іде за пальцем.
// Кожен світ — окрема сторінка в iframe; жести ловить swipe.js усередині світу і передає сюди через window.parent.PL_SHELL.
// Щоб телефон не захлинався пам'яттю, тримаємо завантаженими лише поточний світ і сусідів (стрічку — завжди).
// Кожен перехід — запис в історії: жест чи кнопка «назад» на телефоні повертає в попередній світ, а не викидає з сайту.
const track = document.getElementById('track');
const frames = [...track.querySelectorAll('iframe')];
const KEYS = frames.map(f => f.dataset.w);
const params = new URLSearchParams(location.search);
let cur = Math.max(0, KEYS.indexOf(params.get('w') || 'kava'));
if (cur < 0) cur = 1;
let W = innerWidth;

function load(i, hash = '') {
  const f = frames[i];
  if (f && !f.dataset.loaded) { f.dataset.loaded = '1'; nav(f, f.dataset.src + hash); }
}
// перехід усередині iframe без запису в історію браузера — інакше «назад» гортав би сторінки всередині світів
function nav(f, url) {
  try { if (f.contentWindow && f.getAttribute('src')) { f.contentWindow.location.replace(url); return; } } catch { /* ще не готовий */ }
  f.src = url; // перше завантаження порожнього iframe історію не змінює
}
const busy = f => { try { return !!f.contentWindow?.PL_BUSY; } catch { return false; } };
let tidy = null;
function neighbours() {
  [cur - 1, cur + 1].forEach(j => j >= 0 && j < KEYS.length && load(j));
  clearTimeout(tidy);
  tidy = setTimeout(() => frames.forEach((f, j) => {
    if (Math.abs(j - cur) >= 2 && KEYS[j] !== 'kava' && f.dataset.loaded && !busy(f)) { delete f.dataset.loaded; nav(f, 'about:blank'); }
  }), 2500);
}
function setX(px, anim) {
  track.style.transition = !anim ? 'none' : anim === 'slow' ? 'transform 1.5s cubic-bezier(.65,0,.35,1)' : 'transform .32s cubic-bezier(.2,.8,.2,1)';
  track.style.transform = `translate3d(${px}px,0,0)`;
}
function go(i, anim = true, fromHistory = false) {
  i = Math.max(0, Math.min(KEYS.length - 1, i));
  const changed = i !== cur;
  cur = i; load(i);
  setX(-i * W, anim);
  if (changed && !fromHistory) {
    const u = new URL(location.href);
    if (KEYS[i] === 'kava') u.searchParams.delete('w'); else u.searchParams.set('w', KEYS[i]);
    u.hash = '';
    history.pushState({ w: KEYS[i] }, '', u);
  }
  setTimeout(neighbours, anim ? 400 : 0);
  // світ, що став видимим, дізнається про це (стрічка коротко показує меню)
  setTimeout(() => { try { frames[i].contentWindow?.postMessage({ pl: 'show' }, location.origin); } catch { /* ще вантажиться */ } }, anim === 'slow' ? 1500 : anim ? 330 : 0);
  frames.forEach((f, j) => f.setAttribute('aria-hidden', j === i ? 'false' : 'true'));
  frames.forEach((f, j) => { if (j !== i) f.setAttribute('tabindex', '-1'); else f.removeAttribute('tabindex'); });
}

let introPending = false, dragging = false;
window.PL_SHELL = {
  // будь-який дотик людини скасовує вступну анімацію
  touch() { if (introPending) { introPending = false; setX(-cur * W, true); } },
  current: () => KEYS[cur],
  // світ видно, якщо він поточний або сусідній під час жесту чи підгляду
  visible: key => { const i = KEYS.indexOf(key); return i === cur || ((dragging || introPending) && Math.abs(i - cur) === 1); },
  hasPrev: () => cur > 0,
  hasNext: () => cur < KEYS.length - 1,
  drag(dx) {
    introPending = false;
    dragging = true;
    // на краях стрічки — опір, як у пружини
    if ((cur === 0 && dx > 0) || (cur === KEYS.length - 1 && dx < 0)) dx /= 3;
    setX(-cur * W + dx, false);
  },
  release(dx, v = 0) {
    dragging = false;
    let to = cur;
    if (dx < -W * 0.2 || v < -0.35) to = cur + 1;
    else if (dx > W * 0.2 || v > 0.35) to = cur - 1;
    go(to);
  },
  step: d => go(cur + d),
  go: key => { const i = KEYS.indexOf(key); if (i >= 0) go(i); },
  openLot(id) {
    const i = KEYS.indexOf('kava');
    const f = frames[i];
    if (f.dataset.loaded) { try { const l = f.contentWindow.location; l.replace(l.pathname + l.search + '#' + encodeURIComponent(id)); } catch { nav(f, f.dataset.src + '#' + id); } } else load(i, '#' + id);
    go(i);
  },
  navigate(href) { location.href = href; },
};

addEventListener('resize', () => { W = innerWidth; setX(-cur * W, false); });
addEventListener('popstate', () => { const k = new URLSearchParams(location.search).get('w') || 'kava'; const i = KEYS.indexOf(k); if (i >= 0) go(i, true, true); });
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') go(cur - 1);
  if (e.key === 'ArrowRight') go(cur + 1);
});

// старт: спершу поточний світ (з лотом із посилання), решту — коли він завантажився
load(cur, KEYS[cur] === 'kava' && location.hash ? location.hash : '');
history.replaceState({ w: KEYS[cur] }, '', location.href);
setX(-cur * W, false);
frames.forEach((f, j) => f.setAttribute('aria-hidden', j === cur ? 'false' : 'true'));
// сусіди і стрічка — коли поточний світ уже завантажився
const rest = () => { load(KEYS.indexOf('kava')); neighbours(); };
frames[cur].addEventListener('load', () => setTimeout(rest, 300), { once: true });
setTimeout(rest, 4000);

// вступ: короткий «підгляд» — стрічка ледь зсувається, показуючи край Матриці, повертається,
// а потім так само показує край «Заварити». Раз за сесію, лише для «голої» адреси; дотик скасовує.
let seen = false;
try { seen = !!sessionStorage.getItem('pl_intro'); sessionStorage.setItem('pl_intro', '1'); } catch { /* приватний режим */ }
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!seen && !calm && !params.get('w') && !location.hash && KEYS[cur] === 'kava') {
  introPending = true;
  load(KEYS.indexOf('ask')); load(KEYS.indexOf('brew'));
  const nudge = (dx, ms) => { if (!introPending) return; track.style.transition = `transform ${ms}ms cubic-bezier(.45,0,.25,1)`; track.style.transform = `translate3d(${-cur * W + dx}px,0,0)`; };
  const seq = [[W * 0.2, 520], [0, 480], [-W * 0.2, 520], [0, 480]];
  frames[cur].addEventListener('load', () => {
    let t = 1100;
    for (const [dx, ms] of seq) { setTimeout(() => nudge(dx, ms), t); t += ms + 140; }
    setTimeout(() => { introPending = false; }, t);
  }, { once: true });
}

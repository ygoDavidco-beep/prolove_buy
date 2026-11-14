// Оболонка світів: Запитай · Кава · Партнерам · Заварити — одна стрічка, екран іде за пальцем.
// Кожен світ — окрема сторінка в iframe (завантажується один раз), жести ловить swipe.js усередині світу
// і передає сюди через window.parent.PL_SHELL.
const track = document.getElementById('track');
const frames = [...track.querySelectorAll('iframe')];
const KEYS = frames.map(f => f.dataset.w);
const params = new URLSearchParams(location.search);
let cur = Math.max(0, KEYS.indexOf(params.get('w') || 'kava'));
if (cur < 0) cur = 1;
let W = innerWidth;

function load(i, hash = '') {
  const f = frames[i];
  if (f && !f.src) f.src = f.dataset.src + hash;
}
function setX(px, anim) {
  track.style.transition = !anim ? 'none' : anim === 'slow' ? 'transform 1.5s cubic-bezier(.65,0,.35,1)' : 'transform .32s cubic-bezier(.2,.8,.2,1)';
  track.style.transform = `translate3d(${px}px,0,0)`;
}
function go(i, anim = true) {
  i = Math.max(0, Math.min(KEYS.length - 1, i));
  const changed = i !== cur;
  cur = i; load(i);
  setX(-i * W, anim);
  if (changed) {
    const u = new URL(location.href);
    if (KEYS[i] === 'kava') u.searchParams.delete('w'); else u.searchParams.set('w', KEYS[i]);
    u.hash = '';
    history.replaceState(null, '', u);
  }
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
    if (f.src) { try { f.contentWindow.location.hash = id; } catch { f.src = f.dataset.src + '#' + id; } } else load(i, '#' + id);
    go(i);
  },
  navigate(href) { location.href = href; },
};

addEventListener('resize', () => { W = innerWidth; setX(-cur * W, false); });
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') go(cur - 1);
  if (e.key === 'ArrowRight') go(cur + 1);
});

// старт: спершу поточний світ (з лотом із посилання), решту — коли він завантажився
load(cur, KEYS[cur] === 'kava' && location.hash ? location.hash : '');
go(cur, false);
const rest = () => KEYS.forEach((_, i) => load(i));
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

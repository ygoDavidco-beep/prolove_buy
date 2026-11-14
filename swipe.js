// Свайпи між світами: Запитай · Кава · Заварити · Партнерам.
// Усередині оболонки (shell.html) екран іде за пальцем: жест передається в window.parent.PL_SHELL.
// Відкрита окремо сторінка (наприклад, /brew із QR) переходить в оболонку на сусідній світ.
// У стрічці «Кава» свайп убік спершу гортає пачку ↔ опис; світ змінюється лише з краю.
const ORDER = ['ask', 'kava', 'brew', 'partners'];
const UK = { ask: 'Запитай', kava: 'Кава', partners: 'Партнерам', brew: 'Заварити' };
const demo = /\.html$/.test(location.pathname) || !!document.querySelector('script[src="demo-shim.js"]');
const nameOf = u => (u.pathname.split('/').pop() || '').replace(/\.html$/, '');
const worldOf = u => {
  const n = nameOf(u);
  if (['ask', 'partners', 'brew'].includes(n)) return n;
  if (['', 'index', 'kava'].includes(n)) return u.searchParams.get('w') || 'kava';
  return null;
};
const shellUrl = (key, hash = '') => `${demo ? 'index.html' : '/'}${key === 'kava' ? '' : `?w=${key}`}${hash}`;
const shell = (() => { try { return window.parent !== window && window.parent.PL_SHELL ? window.parent.PL_SHELL : null; } catch { return null; } })();
const me = (() => { const n = nameOf(location); return n === 'index' || n === '' ? 'kava' : n; })();
const idx = ORDER.indexOf(me);
const prevKey = ORDER[idx - 1], nextKey = ORDER[idx + 1];
const SKIP = 'input, textarea, select, .sheet, #sheet, .shade.on, [role="dialog"], .noswipe';

function edges(pager) {
  if (!pager) return { atStart: true, atEnd: true };
  const w = pager.clientWidth, max = pager.scrollWidth - w, x = pager.scrollLeft;
  return { atStart: x <= w * 0.12, atEnd: x >= max - w * 0.12 };
}

if (idx >= 0 && shell) {
  // ---------- усередині оболонки ----------
  if (!document.querySelector('.pager')) document.documentElement.style.touchAction = 'pan-y pinch-zoom';

  // посилання між світами гортають оболонку, решта відкривається на весь екран
  document.addEventListener('click', e => {
    const a = e.target.closest?.('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    const u = new URL(a.getAttribute('href'), location.href);
    if (u.origin === location.origin && u.pathname === location.pathname && u.hash && !u.search) return; // якір на цій же сторінці
    e.preventDefault();
    const k = u.origin === location.origin ? worldOf(u) : null;
    if (!k) return shell.navigate(u.href);
    if (k === 'kava' && u.hash.length > 1) return shell.openLot(decodeURIComponent(u.hash.slice(1)));
    shell.go(k);
  }, true);

  let s = null;
  for (const ev of ['pointerdown', 'wheel', 'keydown']) addEventListener(ev, () => shell.touch?.(), { passive: true });
  addEventListener('touchstart', e => {
    shell.touch?.();
    if (e.touches.length !== 1 || e.target.closest(SKIP)) { s = null; return; }
    const t = e.touches[0], pager = e.target.closest('.pager');
    s = { x: t.clientX, y: t.clientY, lock: null, pager, ...edges(pager), d: 0, hist: [] };
  }, { passive: true });
  addEventListener('touchmove', e => {
    if (!s || s.lock === 'no') return;
    const t = e.touches[0], dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (!s.lock) {
      // світ гортаємо лише чітким жестом убік; будь-який нахил донизу/догори — це звичайна прокрутка сторінки
      if (s.scrolled || (Math.abs(dy) > 10 && Math.abs(dx) < 2 * Math.abs(dy))) { s.lock = 'no'; return; }
      if (Math.abs(dx) < 18) return;
      const sideOk = (dx > 0 && s.atStart) || (dx < 0 && s.atEnd);
      if (Math.abs(dx) > 2 * Math.abs(dy) && sideOk) { s.lock = 'x'; s.x0 = t.clientX; s.sign = Math.sign(dx); }
      else { s.lock = 'no'; return; }
    }
    let d = t.clientX - s.x0;
    if (s.pager) d = s.sign > 0 ? Math.max(0, d) : Math.min(0, d); // у стрічці тягнемо лише в бік сусіднього світу
    s.d = d; shell.drag(d);
    s.hist.push([performance.now(), t.clientX]); while (s.hist.length > 5) s.hist.shift();
  }, { passive: true });
  const end = () => {
    if (s?.lock === 'x') {
      const h = s.hist, v = h.length > 1 ? (h.at(-1)[1] - h[0][1]) / Math.max(1, h.at(-1)[0] - h[0][0]) : 0;
      shell.release(s.d, s.pager ? (s.sign > 0 ? Math.max(0, v) : Math.min(0, v)) : v);
    }
    s = null;
  };
  addEventListener('touchend', end, { passive: true });
  addEventListener('touchcancel', end, { passive: true });
  // сторінка почала прокручуватись сама (стрічка, інструкція) — цей дотик уже не про світи
  addEventListener('scroll', e => {
    if (!s) return;
    if (e.target?.classList?.contains('pager')) return; // гортання пачка ↔ опис не скасовує
    if (s.lock === 'x') { shell.release(0, 0); s = null; } else s.scrolled = true;
  }, { capture: true, passive: true });

  // тачпад: свайп двома пальцями
  let wg = null, wt = 0;
  addEventListener('wheel', e => {
    if (e.ctrlKey || e.target.closest?.(SKIP)) return;
    const now = performance.now();
    if (!wg || now - wt > 220) wg = { acc: 0, fired: false, ...edges(e.target.closest?.('.pager')) };
    wt = now;
    if (wg.fired || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    wg.acc += e.deltaX;
    if (Math.abs(wg.acc) < 110) return;
    if (wg.acc > 0 && wg.atEnd && shell.hasNext()) { wg.fired = true; shell.step(1); }
    else if (wg.acc < 0 && wg.atStart && shell.hasPrev()) { wg.fired = true; shell.step(-1); }
  }, { passive: true });

  addEventListener('keydown', e => {
    if (e.target.closest?.('input, textarea, select') || e.altKey || e.metaKey || e.ctrlKey || document.querySelector('.pager')) return;
    if (e.key === 'ArrowLeft') shell.step(-1);
    if (e.key === 'ArrowRight') shell.step(1);
  });
  addEventListener('message', e => { if (e.origin === location.origin && e.data?.pl === 'show') dispatchEvent(new Event('pl:show')); });
} else if (idx >= 0) {
  // ---------- сторінка відкрита окремо: свайп веде в оболонку ----------
  const pill = (side, key) => {
    if (!key) return null;
    const d = document.createElement('div');
    d.className = `swipe-hint ${side}`; d.setAttribute('aria-hidden', 'true');
    d.textContent = side === 'l' ? `‹ ${UK[key]}` : `${UK[key]} ›`;
    document.body.append(d); return d;
  };
  const L = pill('l', prevKey), R = pill('r', nextKey);
  const show = (el, p) => { if (!el) return; el.style.opacity = p; el.style.setProperty('--p', p); el.classList.toggle('ready', p >= 1); };
  const go = (key, dir) => { document.body.classList.add(dir < 0 ? 'swipe-out-r' : 'swipe-out-l'); setTimeout(() => { location.href = shellUrl(key); }, 160); };
  addEventListener('pageshow', () => { document.body.classList.remove('swipe-out-l', 'swipe-out-r'); show(L, 0); show(R, 0); });

  let s = null;
  addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { s = null; return; }
    const t = e.touches[0];
    if (t.clientX < 18 || t.clientX > innerWidth - 18 || e.target.closest(SKIP)) { s = null; return; }
    s = { x: t.clientX, y: t.clientY, ...edges(e.target.closest('.pager')) };
  }, { passive: true });
  const dirOf = (dx, dy) => (Math.abs(dx) > 1.2 * Math.abs(dy) ? Math.sign(dx) : 0);
  const prog = dx => Math.min(1, Math.max(0, (Math.abs(dx) - 20) / 70));
  addEventListener('touchmove', e => {
    if (!s) return;
    const t = e.touches[0], dx = t.clientX - s.x, d = dirOf(dx, t.clientY - s.y);
    show(L, d > 0 && s.atStart ? prog(dx) : 0); show(R, d < 0 && s.atEnd ? prog(dx) : 0);
  }, { passive: true });
  addEventListener('touchend', e => {
    if (!s) return;
    const t = e.changedTouches[0], dx = t.clientX - s.x, d = dirOf(dx, t.clientY - s.y);
    if (Math.abs(dx) > 70 && d > 0 && s.atStart && prevKey) go(prevKey, -1);
    else if (Math.abs(dx) > 70 && d < 0 && s.atEnd && nextKey) go(nextKey, 1);
    else { show(L, 0); show(R, 0); }
    s = null;
  }, { passive: true });
  addEventListener('touchcancel', () => { s = null; show(L, 0); show(R, 0); }, { passive: true });

  let wg = null, wt = 0;
  addEventListener('wheel', e => {
    if (e.ctrlKey || e.target.closest?.(SKIP)) return;
    const now = performance.now();
    if (!wg || now - wt > 220) wg = { acc: 0, fired: false, ...edges(e.target.closest?.('.pager')) };
    wt = now;
    if (wg.fired || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    wg.acc += e.deltaX;
    if (Math.abs(wg.acc) < 110) return;
    if (wg.acc > 0 && wg.atEnd && nextKey) { wg.fired = true; go(nextKey, 1); }
    else if (wg.acc < 0 && wg.atStart && prevKey) { wg.fired = true; go(prevKey, -1); }
  }, { passive: true });
}

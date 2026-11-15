// Звичайний (не модульний) скрипт у <head>: позначає перехід «назад», щоб сторінка від'їжджала праворуч, як в Instagram.
addEventListener('pagereveal', function (e) {
  try {
    if (e.viewTransition && window.navigation && navigation.activation && navigation.activation.navigationType === 'traverse') e.viewTransition.types.add('back');
  } catch (err) { /* браузер без переходів — просто без анімації */ }
});
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-back]');
  if (!b) return;
  try {
    if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) { e.preventDefault(); history.back(); }
  } catch (err) { /* звичайне посилання */ }
});

// ---------- «Лінза»: меню справа як колесо під збільшувальним склом ----------
// Слово в лінзі велике, сусідні менші. Затисни і крути пальцем — сторінка не міняється, поки не відпустиш;
// тап по слову — лінза під'їжджає до нього, слово росте, і тоді перехід.
(function () {
  function init() {
    var tabs = document.querySelector('.nav-tabs');
    if (!tabs || tabs.getAttribute('data-lens')) return;
    tabs.setAttribute('data-lens', '1');
    var items = Array.prototype.slice.call(tabs.children);
    var track = document.createElement('div'); track.className = 'lens-track';
    items.forEach(function (it) { it.classList.add('lens-it'); it.setAttribute('draggable', 'false'); track.appendChild(it); });
    var glass = document.createElement('i'); glass.className = 'lens-glass'; glass.setAttribute('aria-hidden', 'true');
    tabs.appendChild(glass); tabs.appendChild(track); tabs.classList.add('lens');
    var N = items.length, S = 84, Wd = 210, off, held = false, raf = 0, follow = true, st = null, dragEnd = 0, holdT = 0;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function curIdx() {
      for (var i = 0; i < N; i++) { var a = items[i].getAttribute('aria-current'); if (a === 'true' || a === 'page') return i; }
      return 0;
    }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function rub(x) { if (x < 0) return -0.35 * (1 - 1 / (-x + 1)); if (x > N - 1) return N - 1 + 0.35 * (1 - 1 / (x - N + 2)); return x; }
    function paint() {
      track.style.transform = 'translate3d(' + (Wd / 2 - (off + 0.5) * S).toFixed(1) + 'px,0,0)';
      for (var i = 0; i < N; i++) {
        var d = Math.abs(i - off), s = Math.max(0.6, 1 - 0.32 * d);
        if (d < 0.5) s *= held ? 1.14 : 1;
        items[i].style.transform = 'scale(' + s.toFixed(3) + ')';
        items[i].style.opacity = String(Math.max(0.3, 1 - 0.45 * d).toFixed(2));
        items[i].classList.toggle('lens-c', d < 0.5);
      }
    }
    function measure() { Wd = tabs.clientWidth || 210; S = clamp(Wd / 2.45, 62, 100); tabs.style.setProperty('--slot', S + 'px'); paint(); }
    function tween(to, ms, done) {
      cancelAnimationFrame(raf);
      var from = off, t0 = performance.now(), d = to - from;
      if (reduce || Math.abs(d) < 0.001) { off = to; paint(); if (done) done(); return; }
      var dur = Math.max(160, ms * Math.min(1.4, Math.abs(d)));
      raf = requestAnimationFrame(function f(now) {
        var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        off = from + d * e; paint();
        if (k < 1) raf = requestAnimationFrame(f); else { raf = 0; if (done) done(); }
      });
    }
    function choose(i) {
      follow = false;
      var here = curIdx(), it = items[i];
      tween(i, 240, function () {
        it.classList.add('lens-pop');
        setTimeout(function () {
          it.classList.remove('lens-pop');
          follow = true;
          // та сама сторінка — нічого не робимо; світ на цій сторінці (кнопка) або інша сторінка (посилання)
          if (i === here && it.tagName === 'A') return;
          it.click();
        }, reduce ? 0 : 150);
      });
    }
    off = curIdx(); measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(tabs); else addEventListener('resize', measure);

    tabs.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      cancelAnimationFrame(raf); raf = 0;
      st = { x: e.clientX, o: off, lx: e.clientX, lt: performance.now(), v: 0, moved: false, id: e.pointerId };
      clearTimeout(holdT); holdT = setTimeout(function () { if (st) { held = true; tabs.classList.add('lens-held'); paint(); } }, 160);
    });
    tabs.addEventListener('pointermove', function (e) {
      if (!st) return;
      var dx = e.clientX - st.x, now = performance.now();
      if (!st.moved) {
        if (Math.abs(dx) < 6) return;
        st.moved = true; held = true; tabs.classList.add('lens-held');
        try { tabs.setPointerCapture(st.id); } catch (err) { /* */ }
      }
      st.v = 0.7 * st.v + 0.3 * ((e.clientX - st.lx) / Math.max(1, now - st.lt)); st.lx = e.clientX; st.lt = now;
      off = rub(st.o - dx / S); paint();
    });
    function up(cancel) {
      clearTimeout(holdT);
      var s = st; st = null;
      var wasHeld = held; held = false; tabs.classList.remove('lens-held');
      if (!s) return;
      if (!s.moved) { if (wasHeld) paint(); return; }
      dragEnd = performance.now();
      if (cancel) { tween(curIdx(), 240); return; }
      choose(clamp(Math.round(off - s.v * 160 / S), 0, N - 1));
    }
    tabs.addEventListener('pointerup', function () { up(false); });
    tabs.addEventListener('pointercancel', function () { up(true); });
    // тап і клавіатура: спершу лінза їде до слова, потім перехід (наш власний it.click() пропускаємо)
    tabs.addEventListener('click', function (e) {
      if (!e.isTrusted) return;
      e.preventDefault(); e.stopPropagation();
      if (performance.now() - dragEnd < 400) return;
      var it = e.target.closest('.lens-it');
      var i = items.indexOf(it);
      if (i >= 0) choose(i);
    }, true);
    // на сторінці світів лінза йде за свайпом між Матрицею і стрічкою
    addEventListener('pl:pos', function (e) { if (follow && !st && !raf) { off = e.detail; paint(); } });
    addEventListener('pageshow', function () { follow = true; off = curIdx(); measure(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

// ---------- окремі сторінки: свайп праворуч — назад, ліворуч — наступний розділ ----------
(function () {
  var g = null;
  function hScroll(el) {
    for (; el && el !== document.body; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth + 2) { var o = getComputedStyle(el).overflowX; if (o === 'auto' || o === 'scroll') return true; }
    }
    return false;
  }
  function body() { return document.body; }
  document.addEventListener('touchstart', function (e) {
    g = null;
    var b = body();
    if (!b || b.classList.contains('pl-app') || e.touches.length !== 1 || window.PL_BUSY) return;
    var t = e.touches[0], el = e.target;
    if (t.clientX < 20 || t.clientX > innerWidth - 20) return; // край — системний «назад»
    if (el.closest('input, textarea, select, [contenteditable], .nav, canvas') || hScroll(el)) return;
    g = { x: t.clientX, y: t.clientY, t: performance.now(), axis: null, dx: 0 };
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!g) return;
    var t = e.touches[0], dx = t.clientX - g.x, dy = t.clientY - g.y;
    if (!g.axis) { if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; g.axis = Math.abs(dx) > Math.abs(dy) * 1.6 ? 'x' : 'y'; }
    if (g.axis !== 'x') return;
    g.dx = dx;
    var r = 70 * (1 - 1 / (Math.abs(dx) / 70 + 1)) * (dx < 0 ? -1 : 1);
    body().style.setProperty('--pdx', r.toFixed(1) + 'px'); body().classList.add('pl-drag');
  }, { passive: true });
  function reset() { var b = body(); b.classList.remove('pl-drag'); b.style.removeProperty('--pdx'); }
  document.addEventListener('touchend', function () {
    if (!g || g.axis !== 'x') { g = null; return; }
    var dx = g.dx, fast = Math.abs(dx) / Math.max(1, performance.now() - g.t) > 0.5; g = null; reset();
    if (Math.abs(dx) < (fast ? 50 : innerWidth * 0.28)) return;
    if (dx > 0) {
      var back = document.querySelector('[data-back]');
      try { if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) { history.back(); return; } } catch (err) { /* */ }
      if (back) location.href = back.href;
      return;
    }
    // ліворуч — наступний розділ меню (лише з самої сторінки розділу, не з її підсторінок)
    var its = Array.prototype.slice.call(document.querySelectorAll('.nav-tabs a, .nav-tabs button'));
    var i = its.findIndex(function (a) { return a.getAttribute('aria-current') === 'page'; });
    var cur = its[i];
    if (!cur || !cur.href || new URL(cur.href).pathname.replace(/\.html$/, '') !== location.pathname.replace(/\.html$/, '')) return;
    if (its[i + 1] && its[i + 1].href) location.href = its[i + 1].href;
  }, { passive: true });
  document.addEventListener('touchcancel', function () { g = null; reset(); }, { passive: true });
})();

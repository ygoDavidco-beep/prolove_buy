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

// ---------- Меню «вугілля і вогонь» ----------
// Видно всі розділи: графітові, як деревне вугілля; вибраний горить фірмовим вогнем (від червоного до світлого).
// Тап — слово спалахує і перехід. Можна вести пальцем по меню: горить те слово, над яким палець, перехід — коли відпустиш.
(function () {
  function init() {
    var tabs = document.querySelector('.nav-tabs');
    if (!tabs || tabs.getAttribute('data-coal')) return;
    tabs.setAttribute('data-coal', '1');
    tabs.classList.add('coal');
    var items = Array.prototype.slice.call(tabs.children);
    items.forEach(function (it) {
      var w = document.createElement('span'); w.className = 'w';
      while (it.firstChild) w.appendChild(it.firstChild);
      it.appendChild(w); it.setAttribute('draggable', 'false');
    });
    var st = null, dragEnd = 0, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function at(x) {
      for (var i = 0; i < items.length; i++) { var r = items[i].getBoundingClientRect(); if (x >= r.left && x <= r.right) return i; }
      return x < items[0].getBoundingClientRect().left ? 0 : items.length - 1;
    }
    function scrub(i) { items.forEach(function (it, j) { it.classList.toggle('scrub', j === i); }); }
    function choose(i) {
      var it = items[i], cur = it.getAttribute('aria-current');
      if (it.tagName === 'A' && cur === 'page') return; // уже тут
      tabs.classList.add('scrubbing'); scrub(i); it.classList.add('ign');
      setTimeout(function () {
        it.classList.remove('ign'); tabs.classList.remove('scrubbing'); scrub(-1);
        it.click();
      }, reduce ? 0 : 160);
    }
    tabs.addEventListener('pointerdown', function (e) { if (!e.button) st = { x: e.clientX, id: e.pointerId, moved: false }; });
    tabs.addEventListener('pointermove', function (e) {
      if (!st) return;
      if (!st.moved) {
        if (Math.abs(e.clientX - st.x) < 8) return;
        st.moved = true; tabs.classList.add('scrubbing');
        try { tabs.setPointerCapture(st.id); } catch (err) { /* */ }
      }
      scrub(at(e.clientX));
    });
    function up(cancel, e) {
      var s = st; st = null;
      if (!s || !s.moved) return;
      dragEnd = performance.now();
      if (cancel) { tabs.classList.remove('scrubbing'); scrub(-1); return; }
      choose(at(e.clientX));
    }
    tabs.addEventListener('pointerup', function (e) { up(false, e); });
    tabs.addEventListener('pointercancel', function (e) { up(true, e); });
    tabs.addEventListener('click', function (e) {
      if (!e.isTrusted) return; // наш власний it.click() після спалаху
      e.preventDefault(); e.stopPropagation();
      if (performance.now() - dragEnd < 400) return;
      var i = items.indexOf(e.target.closest('.nav-tabs > *'));
      if (i >= 0) choose(i);
    }, true);
    addEventListener('pageshow', function () { tabs.classList.remove('scrubbing'); scrub(-1); });
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

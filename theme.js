// Тема коміксів: світла (друкований комікс) або темна (нічний). Читаємо вибір до малювання сторінки — без блимання.
// За замовчуванням світла; вибір людини зберігається в її браузері.
(function () {
  var KEY = 'pl_theme', root = document.documentElement;
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function apply(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'dark' ? '#0B0909' : '#E6E1D5');
    var b = document.querySelector('.theme-tg');
    if (b) { b.innerHTML = t === 'dark' ? SUN + 'День' : MOON + 'Ніч'; b.setAttribute('aria-label', t === 'dark' ? 'Денний комікс' : 'Нічний комікс'); }
  }
  var MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  var SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
  apply(saved() === 'dark' ? 'dark' : 'light');
  // кнопка — угорі сторінки (у кожної теми свій стиль коміксу — цікаво перемкнути й порівняти)
  document.addEventListener('DOMContentLoaded', function () {
    var main = document.querySelector('main') || document.body;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'theme-tg';
    main.insertBefore(b, main.firstChild);
    apply(root.getAttribute('data-theme'));
    b.addEventListener('click', function () {
      var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, t); } catch (e) { /* приватний режим */ }
      apply(t);
    });
  });
})();

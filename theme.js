// Тема коміксів: світла (друкований комікс) або темна (нічний). Читаємо вибір до малювання сторінки — без блимання.
// Вибір людини зберігається в її браузері; якщо не обирала — як у системі.
(function () {
  var KEY = 'pl_theme', root = document.documentElement;
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function sys() { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  function apply(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'dark' ? '#121011' : '#E6E1D5');
    var b = document.querySelector('.theme-tg');
    if (b) { b.innerHTML = t === 'dark' ? SUN : MOON; b.setAttribute('aria-label', t === 'dark' ? 'Світла тема' : 'Темна тема'); }
  }
  var MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  var SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
  apply(saved() || sys());
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (!saved()) apply(sys()); });
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'theme-tg';
    document.body.appendChild(b);
    apply(root.getAttribute('data-theme'));
    b.addEventListener('click', function () {
      var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, t); } catch (e) { /* приватний режим */ }
      apply(t);
    });
  });
})();

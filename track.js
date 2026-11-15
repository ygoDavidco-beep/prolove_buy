// Анонімна статистика PROLOVE: без імені, телефону й IP. Випадковий номер відвідувача живе лише в цьому браузері.
// Події збираються пачкою і йдуть на наш сервер (/api/ev) раз на кілька секунд і при виході зі сторінки.
// Використання: window.plt('lot', 'kenya-kegwa', null, 4.2)
(function () {
  if (window.plt) return;
  var Q = [], MAX_ERR = 3, errs = 0;
  function rid() { var a = new Uint8Array(8); (window.crypto || window.msCrypto).getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function ls(store, k, make) { try { var v = store.getItem(k); if (!v) { v = make(); store.setItem(k, v); } return v; } catch (e) { return make(); } }
  var vid = ls(localStorage, 'pl_vid', rid), sid = ls(sessionStorage, 'pl_sid', rid);
  // звідки прийшла людина: utm_source або сайт, з якого перейшла
  var src = ls(sessionStorage, 'pl_src', function () {
    var u = new URLSearchParams(location.search).get('utm_source'), r = '';
    try { r = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { r = ''; }
    var s = (u || r).toLowerCase();
    if (!s) return 'direct';
    if (r && r === location.hostname && !u) return 'internal';
    if (/insta/.test(s)) return 'instagram';
    if (/t\.me|telegram|tg/.test(s)) return 'telegram';
    if (/google/.test(s)) return 'google';
    if (/facebook|fb\./.test(s)) return 'facebook';
    if (/tiktok/.test(s)) return 'tiktok';
    return 'other';
  });
  var ua = navigator.userAgent;
  var dev = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : /Windows|Macintosh|Linux/.test(ua) ? 'desktop' : 'other';
  var tg = !!(window.TelegramWebviewProxy || window.Telegram || /Telegram/i.test(ua));
  var page = (location.pathname.replace(/\.html$/, '').replace(/^\/index$/, '/') || '/');
  // статичне демо (GitHub Pages) не має сервера статистики — нічого не шлемо
  var off = /github\.io$/.test(location.hostname) || navigator.doNotTrack === '1' || /HeadlessChrome|bot|crawl/i.test(ua) && !/Mobile Safari/.test(ua);

  function flush(beacon) {
    if (!Q.length || off) { Q = []; return; }
    var body = JSON.stringify({ vid: vid, sid: sid, src: src, dev: dev, tg: tg, e: Q.splice(0, 60) });
    try {
      if (beacon && navigator.sendBeacon) navigator.sendBeacon('/api/ev', new Blob([body], { type: 'application/json' }));
      else fetch('/api/ev', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
    } catch (e) { /* статистика ніколи не ламає сайт */ }
  }
  window.plt = function (ev, k, v, n) {
    if (off) return;
    Q.push([ev, k == null ? null : String(k), v == null ? null : String(v), n == null ? null : n, page]);
    if (Q.length >= 40) flush(false);
  };
  window.plt.page = page;
  setInterval(function () { flush(false); }, 5000);
  addEventListener('pagehide', function () { flush(true); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); });
  // помилки JS — щоб перед запуском бачити, де глючить (кілька на сторінку, не більше)
  addEventListener('error', function (e) { if (errs++ < MAX_ERR) window.plt('err', String(e.message || 'error').slice(0, 100) + (e.lineno ? ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno : '')); });
  window.plt('view', page);
})();

// Стаття: /read?a=bitter. Обкладинка, короткі розділи, чек-лист і джерела.
import { ARTICLES, ART_ORDER } from './articles.js?v=mwl8etx8';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const key = new URLSearchParams(location.search).get('a');
const A = ARTICLES[key];
const main = document.getElementById('a');
const sfx = (location.pathname.endsWith('.html') || /github\.io$/.test(location.hostname)) ? '.html' : '';
const local = h => h.replace(/^(\w+)(\?|$)/, `$1${sfx}$2`);

if (!A) location.replace(`brew${sfx}`);
else {
  document.title = `${A.title} — PROLOVE`;
  const i = ART_ORDER.indexOf(key), next = ART_ORDER[(i + 1) % ART_ORDER.length];
  main.innerHTML = `
  <header class="cover acover"><div class="title"><h1>${esc(A.title)}</h1><p>${esc(A.lead)}</p><span class="stamp">${esc(A.stamp)}</span></div></header>
  <section class="page">${A.parts.map((p, n) => `<article class="pnl tipf"><span class="no">${n + 1}</span><div class="cap"><h3>${p.h}</h3><p>${esc(p.p)}</p></div></article>`).join('')}</section>
  ${A.check?.length ? `<div class="part fast"><h2>Чек-лист</h2></div><ul class="acheck">${A.check.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
  ${A.src?.length ? `<p class="asrc">Джерела: ${A.src.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} ↗</a>`).join(' · ')}</p>` : ''}
  <div class="next">${A.cta ? `<a class="btn" href="${esc(local(A.cta.href))}">${esc(A.cta.label)}</a>` : `<a class="btn" href="brew${sfx}">Усі способи</a>`}<a class="btn ghost" href="read${sfx}?a=${next}">${esc(ARTICLES[next].title)} ›</a></div>
  <p class="foot">PROLOVE · Кава вогонь</p>`;
}

// статистика: скільки статті прочитали (найглибша прокрутка, %)
if (A) {
  let depth = 0, sent = false;
  const measure = () => { const h = document.documentElement.scrollHeight - innerHeight; depth = Math.max(depth, h > 0 ? Math.round((scrollY / h) * 100) : 100); };
  addEventListener('scroll', measure, { passive: true }); measure();
  const send = () => { if (!sent) { sent = true; window.plt?.('article', key, null, Math.min(100, depth)); } };
  addEventListener('pagehide', send);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') send(); });
}

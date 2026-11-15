// Сторінка способу: /method?m=cezve. Комікс за рецептом PROLOVE, кнопка таймера на весь екран і «Рецепти чемпіонів».
import { METHODS, ORDER } from './methods.js?v=mwht0uki';
import { deviceIcon } from './art.js?v=mwht0uki';
import { openFocus } from './focus.js?v=mwht0uki';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const key = new URLSearchParams(location.search).get('m');
const M = METHODS[key];
const main = document.getElementById('m');
const sfx = location.pathname.endsWith('.html') ? '.html' : ''; // статичне демо
const href = k => `method${sfx}?m=${k}`;
const PLACE = { 1: '1 місце', 2: '2 місце', 3: '3 місце' };

if (!M) {
  location.replace(`brew${sfx}`);
} else {
  document.title = `${M.title} — як заварити — PROLOVE`;
  const i = ORDER.indexOf(key), prev = ORDER[i - 1], next = ORDER[i + 1];
  main.innerHTML = `
  <header class="cover mcover">
    <div class="title"><h1>${esc(M.title)}</h1><p>${esc(M.intro)}</p><span class="stamp">${esc(M.stamp)}</span></div>
    <figure class="mdev">${deviceIcon(M.icon)}<figcaption>${M.params.map(p => `<span>${esc(p)}</span>`).join('')}</figcaption></figure>
  </header>
  ${M.timer ? `<button class="btn fx-open" type="button" data-fx="base">Варити з таймером <small>${esc(M.timer.params)}</small></button>` : ''}
  <div class="part"><h2>Рецепт PROLOVE</h2><p>крок за кроком</p></div>
  <section class="page">${M.panels.map((p, n) => `<article class="pnl"><span class="no">${n + 1}</span><div class="art" data-p="${n}"></div>
    <div class="cap"><h3>${p.h}</h3><p>${p.p}</p></div></article>`).join('')}</section>
  ${M.tips?.length ? `<div class="part fast"><h2>Поради</h2></div><section class="page">${M.tips.map(t => `<article class="pnl tipf"><span class="no">!</span><div class="cap"><h3>${t.h}</h3><p>${t.p}</p></div></article>`).join('')}</section>` : ''}
  ${M.tools ? `<div class="part"><h2>Порція і секундомір</h2><p>для будь-якого фільтра</p></div>
    <section class="calc" data-calc data-coffee="15" aria-label="Калькулятор порції"></section>
    <section class="timer ft" id="ft" aria-label="Секундомір фільтра"></section>
    <section class="rcwrap" id="rcWrap" hidden aria-label="Картка рецепту">
      <div class="rc-edit"><h3>Картка рецепту</h3><p>Додай свої поля — помел, каву, температуру. Потім скріншот картки або «Зберегти картинку».</p>
        <div id="rcFields"></div><div class="rc-addrow" id="rcAdd"></div></div>
      <div class="rc" id="rcCard"></div><button class="btn" type="button" id="rcSave">Зберегти картинку</button></section>` : ''}
  ${M.champs?.length ? `<div class="part"><h2>Рецепти чемпіонів</h2><p>тапни — і вари як чемпіон</p></div>
    <p class="cnote">Кожен рецепт створено під конкретну каву, воду й млинок — з нашою кавою смак буде іншим. Це нормально: бери ідею, а помел підкрути під себе.</p>
    <section class="champs">${M.champs.map((c, n) => `<article class="champ">
      <div class="cdev">${deviceIcon(c.icon)}</div>
      <div class="cbody"><span class="cmeta">${esc(c.champ)} · ${c.year} · ${PLACE[c.place] || `${c.place} місце`}</span>
        <h3>${esc(c.who)} <small>${esc(c.country)}</small></h3>
        <p class="cgoal">${esc(c.purpose)}</p>
        <p class="cpar">${esc(c.params)}${c.coffee && c.coffee !== '—' ? ` · на чемпіонаті: ${esc(c.coffee)}` : ''}</p>
        ${c.note ? `<p class="cpar">${esc(c.note)}</p>` : ''}
        <div class="cact"><button class="btn" type="button" data-fx="${n}">Варити як чемпіон</button><a href="${esc(c.src.url)}" target="_blank" rel="noopener">джерело: ${esc(c.src.name)} ↗</a></div></div></article>`).join('')}</section>`
    : M.champsNote ? `<p class="cnote">${esc(M.champsNote)}</p>` : ''}
  <div class="next">${prev ? `<a class="btn ghost" href="${href(prev)}">‹ ${esc(METHODS[prev].title)}</a>` : ''}<a class="btn" href="brew${sfx}">Усі способи</a>${next ? `<a class="btn ghost" href="${href(next)}">${esc(METHODS[next].title)} ›</a>` : ''}</div>
  <p class="foot">PROLOVE · Кава вогонь</p>`;

  main.querySelectorAll('[data-p]').forEach(el => { el.innerHTML = M.panels[+el.dataset.p].art(); });
  main.addEventListener('click', e => {
    const b = e.target.closest('[data-fx]'); if (!b) return;
    if (b.dataset.fx === 'base') return openFocus(M.timer);
    const c = M.champs[+b.dataset.fx];
    openFocus({ name: `${c.who} · ${c.champ} ${c.year}`, params: c.params, prep: `${c.purpose}. Підготуй каву й воду — «Старт» разом із першим поливом.`, steps: c.steps });
  });
  if (M.tools) { import('./calc.js').then(() => import('./filter.js')); }
}

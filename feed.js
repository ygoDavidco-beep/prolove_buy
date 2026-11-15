// Стрічка «Кава»: екран = пачка, свайп убік = картка опису, тап по етикетці = штора з «Купити».
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uah = n => (n === null || n === undefined ? 'ціна —' : `${n.toLocaleString('uk-UA')} ₴`);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватний режим */ } },
};
let fav = store.get('pl_fav', []), cart = store.get('pl_cart', []);
let LOTS = [], MAP = null, N = 0, current = 0;
// меню тепер одне на весь сайт і завжди видно — колишня «брова» стрічки лишилась заглушкою
const NOOP = { classList: { toggle() {}, add() {}, remove() {} }, querySelectorAll: () => [] };
const feed = $('#feed'), brow = $('#brow') || NOOP, sheet = $('#sheet'), shade = $('#shade');

function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200); }

const icon = {
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  share: '<path d="M4 12v7h16v-7M12 4v11M7.5 8.5 12 4l4.5 4.5"/>',
  mood: '<circle cx="12" cy="12" r="8"/><path d="M8 13c1.2 1.6 2.4 2.4 4 2.4s2.8-.8 4-2.4M9 9.5h.01M15 9.5h.01"/>',
};

function packHTML(l, k) {
  return `<div class="page pack" data-k="${k}">
    <button class="topzone" type="button" aria-label="Показати меню"></button>
    <div class="wm"><img src="img/wordmark.png" alt="PROLOVE"></div>
    <div class="lg"><img src="img/logo.png" alt=""></div>
    <div class="rail">
      <button type="button" data-fav="${k}" aria-pressed="${fav.includes(l.id)}"><span class="ic"><svg viewBox="0 0 24 24">${icon.heart}</svg></span>Відкласти</button>
      <button type="button" data-share="${k}"><span class="ic"><svg viewBox="0 0 24 24">${icon.share}</svg></span>Поділитись</button>
      <button type="button" data-mood><span class="ic"><svg viewBox="0 0 24 24">${icon.mood}</svg></span>Настрій</button>
    </div>
    <button class="label" type="button" data-open="${k}">
      <span class="n">${esc(l.name)}</span>
      <span class="t" style="color:${l.color}">Смак: ${esc(l.taste)}.</span>
      <span class="d">${l.process_label ? `Обробка: ${esc(l.process_label)}<br>` : ''}${l.farm ? `Ферма: ${esc(l.farm)}<br>` : ''} ${l.altitude ? `Висота: ${esc(l.altitude)}` : ''}</span>
      ${l.methods?.length ? `<span class="m">${esc(l.methods.map((m, i) => i ? m.short : m.short[0].toUpperCase() + m.short.slice(1)).join(' · '))}</span>` : ''}
      <span class="more" style="color:${l.color}">Опис ▲</span>
    </button>
    <svg class="pop" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="#E8394A"/></svg>
  </div>`;
}

function cardHTML(l, k) {
  const pos = l.flame === null ? null : Math.round(l.flame * 1000) / 10;
  return `<div class="page card" data-k="${k}" style="--lotc:${l.color}">
    <div class="dh"><div class="mini"><img src="img/wordmark.png" alt=""><img src="img/logo.png" alt=""></div>
      <div><div class="nm">${esc(l.name)}</div><div class="s">${esc([l.country, l.farm && 'Ферма ' + l.farm].filter(Boolean).join(' · '))}</div></div></div>
    <div class="chips">${l.words.map(w => `<span class="chip" style="color:${w.color}">${esc(w.word[0].toUpperCase() + w.word.slice(1))}</span>`).join('')}</div>
    ${pos === null ? '' : `<div class="box"><h4>Смак на шкалі вогню</h4>
      <div class="sc" style="background:${MAP.gradient}"><i style="left:${pos}%;background:${l.color}"></i></div>
      <div class="scl"><span>свіжа кислинка</span><span>тепла солодкість</span></div>
      <div class="cats">${l.categories.map(c => `<span style="color:${c.color}">${esc(c.uk)}</span>`).join('')}</div></div>`}
    ${l.methods?.length ? `<div class="box"><h4>Як готувати</h4>${methLinks(l)}</div>` : ''}
    <div class="box"><h4>Паспорт лота</h4><dl class="kv">
      ${l.process_label ? `<dt>Обробка</dt><dd>${esc(l.process_label)}</dd>` : ''}${l.variety ? `<dt>Різновид</dt><dd>${esc(l.variety)}</dd>` : ''}${l.farm ? `<dt>Ферма</dt><dd>${esc(l.farm)}</dd>` : ''}${l.altitude ? `<dt>Висота</dt><dd>${esc(l.altitude)}</dd>` : ''}${l.country ? `<dt>Країна</dt><dd>${esc(l.country)}</dd>` : ''}
    </dl></div>
    ${l.description ? `<p class="desc-p">${esc(l.description)}</p>` : ''}
  </div>`;
}

// спосіб приготування веде на інструкцію до нього (турка → поради для турки), призначення — просто позначка
function methLinks(l) {
  return `<div class="meth">${l.methods.map(m => m.group === 'use'
    ? `<span class="use">${esc(m.uk)}</span>`
    : `<a class="go" href="brew.html?m=${encodeURIComponent(m.key)}">${esc(m.uk)} <i aria-hidden="true">›</i></a>`).join('')}</div>`;
}

function lotHTML(l, k, copy) {
  return `<article class="lot" data-k="${k}" data-copy="${copy}" id="${copy === 1 ? esc(l.id) : ''}" aria-label="${esc(l.name)}">
    <div class="pager">${packHTML(l, k)}${cardHTML(l, k)}</div>
    <div class="dots"><b class="on"></b><b></b></div>
  </article>`;
}

function render() {
  N = LOTS.length;
  if (!N) { feed.innerHTML = '<div class="loading">Лоти скоро з\'являться</div>'; return; }
  feed.innerHTML = [0, 1, 2].map(c => LOTS.map((l, k) => lotHTML(l, k, c)).join('')).join('');
  const H = () => feed.clientHeight;
  const jump = i => feed.scrollTo({ top: i * H(), behavior: 'instant' });
  // повернення зі сторінки «Заварити»: той самий лот і той самий вигляд (пачка чи опис)
  let back = null;
  try { back = JSON.parse(sessionStorage.getItem('pl_pos') || 'null'); } catch { /* приватний режим */ }
  const fromHash = LOTS.findIndex(l => '#' + l.id === location.hash);
  const start = Math.max(0, fromHash >= 0 ? fromHash : LOTS.findIndex(l => l.id === back?.id));
  if (fromHash < 0 && back?.view === 1) view = 1;
  requestAnimationFrame(() => jump(N + start));
  let lastH = 0;
  new ResizeObserver(() => { const h = H(); if (!h) return; const i = lastH ? Math.round(feed.scrollTop / lastH) : N + start; lastH = h; jump(i); }).observe(feed);
  const settle = () => {
    const i = Math.round(feed.scrollTop / H());
    if (i < N) jump(i + N); else if (i >= 2 * N) jump(i - N);
    setCurrent(((i % N) + N) % N);
  };
  if ('onscrollend' in window) feed.addEventListener('scrollend', settle);
  else { let t; feed.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(settle, 140); }); }
  // режим перегляду спільний для всієї стрічки: перегорнув на опис — гортаєш вниз по описах
  const pagers = [...feed.querySelectorAll('.pager')];
  const pageOf = p => Math.round(p.scrollLeft / (p.clientWidth || 1));
  const markDots = (p, page) => p.parentElement.querySelectorAll('.dots b').forEach((b, j) => b.classList.toggle('on', j === page));
  const syncView = src => {
    for (const p of pagers) if (p !== src && pageOf(p) !== view) { p.style.scrollSnapType = 'none'; p.scrollLeft = view * p.clientWidth; p.style.scrollSnapType = ''; markDots(p, view); }
  };
  pagers.forEach(p => {
    p.addEventListener('scroll', () => {
      const page = pageOf(p);
      markDots(p, page);
      if (p.closest('.lot') === feed.querySelectorAll('.lot')[Math.round(feed.scrollTop / H())]) brow.classList.toggle('on', page === 1 || browPinned);
      clearTimeout(p._t); p._t = setTimeout(() => { if (Math.abs(p.scrollLeft - page * p.clientWidth) < 2 && page !== view) { view = page; syncView(p); } }, 120);
    }, { passive: true });
  });
  new ResizeObserver(() => syncView(null)).observe(feed);
  addEventListener('hashchange', () => {
    const k = LOTS.findIndex(l => '#' + l.id === decodeURIComponent(location.hash));
    if (k >= 0) feed.scrollTo({ top: (N + k) * H(), behavior: 'instant' });
  });
  syncView(null);
  setCurrent(start);
  peekBrow();
}

addEventListener('pagehide', () => {
  try { if (LOTS[current]) sessionStorage.setItem('pl_pos', JSON.stringify({ id: LOTS[current].id, view })); } catch { /* приватний режим */ }
});
function setCurrent(k) {
  current = k;
  const l = LOTS[k];
  $('#p250').textContent = uah(l.price250);
  $('#p1000').textContent = uah(l.price1000);
  const art = feed.querySelectorAll('.lot')[N + k];
  const onCard = art && Math.round(art.querySelector('.pager').scrollLeft / art.clientWidth) === 1;
  if (!browPinned) brow.classList.toggle('on', !!onCard);
}

// ---------- брова ----------
let browPinned = false;
let view = 0; // 0 — пачка, 1 — опис лота
// лот із пошуку Матриці: стрічка стає на нього
addEventListener('pl:lot', e => {
  const k = LOTS.findIndex(l => l.id === e.detail);
  if (k >= 0) feed.scrollTo({ top: (N + k) * feed.clientHeight, behavior: 'instant' });
});
function peekBrow() { browPinned = true; brow.classList.add('on'); clearTimeout(peekBrow.t); peekBrow.t = setTimeout(() => { browPinned = false; setCurrent(current); }, 3000); }

// ---------- кошик ----------
// помел: той самий лот, але для пакування — окрема позиція (ключ id:вага:помел)
const GRIND = [['beans', 'зерно'], ['espresso', 'еспресо'], ['cezve', 'турка'], ['cup', 'чашка'], ['moka', 'гейзер'], ['aeropress', 'аеропрес'], ['v60', 'V-60'], ['clever', 'клевер / фільтр до 600 мл', '2–3 чашки'], ['filter', 'фільтр понад 800 мл']];
const GN = Object.fromEntries(GRIND);
// мапа помелу: від дрібного до крупного, над кожним — мінімалістичний образ; смуга — від солодкого червоного до світлого, тихіше за смаки
const GMAP = [
  ['cezve', 'турка', 'M9 8.5h10 M10 9c0 2.5-2.6 5-2.6 9.5 0 4.5 2.6 7.5 6.6 7.5s6.6-3 6.6-7.5C20.6 14 18 11.5 18 9 M19.8 14L29 10'],
  ['espresso', 'еспресо', 'M3.5 11h16 M5 11v2.5c0 2.8 3 4.8 6.5 4.8s6.5-2 6.5-4.8V11 M18 13.5l11 3 M9.5 18.5v2 M13.5 18.5v2 M8.5 23h6v2a3 3 0 0 1-6 0z'],
  ['moka', 'гейзер', 'M11.5 5.5h9 M10 8h12 M10 8l1.6 7.5h8.8L22 8 M11.6 15.5l-2.1 11h13l-2.1-11 M22.2 9.5h3v6.5l-3.6 1.4 M10 8L7.6 6.6'],
  ['aeropress', 'аеропрес', 'M11.5 4.5h9 M12.5 4.5v8 M19.5 4.5v8 M10.5 11.5h11v14h-11z M8.5 25.5h15 M13 18h6'],
  ['v60', 'V-60', 'M6.5 9h19l-6.8 11.5h-5.4z M12.5 12.5l2.3 5 M19.5 12.5l-2.3 5 M10.5 24h11 M14 20.5V24 M18 20.5V24'],
  ['clever', 'клевер · до 600 мл', 'M7.5 7.5h17l-3 13.5h-11z M10.5 21h11v3h-11z M8.5 24h15 M24.4 10h2.6v5.5l-3.4 1.2'],
  ['filter', 'фільтр · 800+ мл', 'M6 5h20v5H6z M22 10v16 M6 26h20 M9.5 14h9l-1 10h-7z M18.5 16h2v5h-1.6 M12 10v2.5 M16 10v2.5'],
  ['cup', 'чашка', 'M7 12h15v4.5a7.5 7.5 0 0 1-15 0z M22 13.5c3.3 0 3.3 5.5 0 5.5 M5.5 27h19'],
];
const GCOL = ['#E8394A', '#EA4F45', '#EC6740', '#EF7E38', '#F29A4A', '#F5B26A', '#F7C88E', '#F9DCB4'];
function grindMap() {
  const n = GMAP.length;
  return `<div class="gmap" data-ground="0">
    <div class="gtabs" role="radiogroup" aria-label="Зерно чи мелена"><button type="button" role="radio" data-gt="beans" aria-checked="true">Зерно</button><button type="button" role="radio" data-gt="ground" aria-checked="false">Змолоти</button></div>
    <div class="gname" id="gName">ціле зерно</div>
    <div class="gsteps" role="radiogroup" aria-label="Помел">${GMAP.map(([key, name, d], i) => `<button type="button" role="radio" data-g="${key}" aria-checked="false" aria-label="${esc(name)}" style="--gc:${GCOL[i]}">
      <svg viewBox="0 0 32 32" aria-hidden="true"><path d="${d}"/></svg>
      <span class="gl"><i class="gseg" style="${i === 0 ? 'left:50%' : i === n - 1 ? 'right:50%' : ''}"></i><i class="dot" style="--s:${(4 + i * 1.5).toFixed(1)}px;--r:${i * 23}deg;border-radius:${i < 2 ? 50 : 32}%"></i></span></button>`).join('')}</div>
    <div class="gends"><span>дрібний</span><span>крупний</span></div>
  </div>`;
}
const gKey = g => (GN[g] ? g : 'beans');
const wTxt = w => (+w === 250 ? '250 г' : '1 кг');
const gTxt = g => (gKey(g) === 'beans' ? 'зерно' : `помел: ${GN[g]}`);
cart = cart.map(c => ({ id: c.id, w: +c.w, g: gKey(c.g) }));
function addToCart(k, w, g = 'beans', quiet = false) {
  const l = LOTS[k], item = { id: l.id, w: +w, g: gKey(g) };
  cart.push(item); store.set('pl_cart', cart); renderCart();
  if (!quiet) toast(`${l.name}, ${wTxt(w)}, ${gTxt(g)} — у кошику`);
  return item;
}
function renderCart() { const p = $('#cartPill'); p.hidden = !cart.length; p.textContent = `Кошик ${cart.length}`; }

// «Купити» на пачці купує одразу. 3 секунди можна тапнути повідомлення: покупка зупиняється, відкривається штора
// (вага, помел). Купиш там — гаразд; згорнеш — скасовано. Новий «Купити» — попередня покупка лишається, повідомлення нове.
const btoast = document.createElement('button');
btoast.type = 'button'; btoast.className = 'btoast'; btoast.hidden = true;
($('#w-kava .app') || $('#w-kava'))?.appendChild(btoast);
let pending = null, paused = null;
function buyNow(k, w) {
  clearTimeout(pending?.t);
  const item = addToCart(k, w, 'beans', true);
  const l = LOTS[k];
  btoast.innerHTML = `<b>${esc(l.name)} · ${wTxt(w)} · зерно — у кошику</b><small>Тапни, щоб змінити помел чи вагу</small><i></i>`;
  btoast.hidden = false; btoast.classList.remove('on'); void btoast.offsetWidth; btoast.classList.add('on');
  pending = { k, w: +w, item, t: setTimeout(() => { btoast.classList.remove('on'); pending = null; setTimeout(() => { if (!pending) btoast.hidden = true; }, 250); }, 3000) };
}
btoast.addEventListener('click', () => {
  if (!pending) return;
  clearTimeout(pending.t);
  const i = cart.indexOf(pending.item);
  if (i >= 0) { cart.splice(i, 1); store.set('pl_cart', cart); renderCart(); }
  paused = { k: pending.k, w: pending.w };
  pending = null; btoast.classList.remove('on'); btoast.hidden = true;
  openLot(paused.k, { w: paused.w, paused: true });
});
$('#buy').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) buyNow(current, b.dataset.w); });
// кошик → оформлення. Ціни на екрані орієнтовні, остаточну суму рахує сервер.
const lines = () => {
  const m = new Map();
  for (const c of cart) { const k = `${c.id}:${c.w}:${gKey(c.g)}`; m.set(k, { ...c, g: gKey(c.g), key: k, qty: (m.get(k)?.qty || 0) + 1 }); }
  return [...m.values()].map(x => ({ ...x, lot: LOTS.find(l => l.id === x.id) })).filter(x => x.lot);
};
const linePrice = x => (x.w === 250 ? x.lot.price250 : x.lot.price1000);
let me = null;
fetch('/api/me').then(r => r.json()).then(j => { me = j.me; }).catch(() => {});
async function openCart() {
  const L = lines();
  if (!L.length) { closeSheet(); return; }
  // що вже введено у форму — не губимо при зміні кількості
  const prev = $('#checkout') ? Object.fromEntries(new FormData($('#checkout'))) : null;
  const v = k => esc(prev?.[k] ?? ({ name: me?.first_name, phone: me?.phone, cafe: me?.cafe }[k] || ''));
  let q = null;
  try {
    const r = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: L.map(x => ({ id: x.id, w: x.w, qty: x.qty })) }) });
    if (r.ok) q = await r.json();
  } catch { /* покажемо базові ціни */ }
  const missing = q ? q.total === null : L.some(x => linePrice(x) === null);
  const total = q?.total ?? L.reduce((a, x) => a + (linePrice(x) || 0) * x.qty, 0);
  const saved = q && q.base_total !== null ? q.base_total - q.total : 0;
  openSheet(`<div class="handle"></div><h5>Кошик${q?.partner ? ' · ціни партнера' : ''}</h5>
    ${L.map((x, i) => {
      const it = q?.items[i], p = it ? it.price : linePrice(x), disc = it && it.price !== null && it.price < it.base;
      return `<div class="row2"><span>${esc(x.lot.name)}, ${wTxt(x.w)}<br><em class="gr${x.g === 'beans' ? '' : ' on'}">${esc(gTxt(x.g))}</em><br><small style="color:var(--muted)">${p === null ? 'ціну уточнимо' : `${disc ? `<s>${uah(it.base)}</s> ` : ''}<b style="color:${disc ? 'var(--teal)' : 'inherit'}">${uah(p)}</b>${disc && it.note ? ` · ${esc(it.note)}` : ''}`}</small></span>
      <span class="qty"><button type="button" data-dec="${esc(x.key)}" aria-label="Менше">−</button><b>${x.qty}</b><button type="button" data-inc="${esc(x.key)}" aria-label="Більше">+</button></span></div>`;
    }).join('')}
    <div class="row2"><b>Разом${q ? ` · ${q.total_kg.toLocaleString('uk-UA')} кг` : ''}</b><b>${missing ? '—' : uah(total)}</b></div>
    ${saved > 0 ? `<p class="saved">Знижка ${uah(saved)}</p>` : ''}
    ${(q?.hints || []).map(h => `<p class="hint-soft">${esc(h)}</p>`).join('')}
    ${missing ? '<p style="color:var(--muted);font-size:14px">Ціни на ці лоти ще не опубліковані. Напиши нам — порахуємо.</p>' : `
    <form class="checkout" id="checkout" novalidate>
      <h5 style="margin-top:6px">Оформлення</h5>
      <input name="name" placeholder="Ім'я" autocomplete="name" value="${v('name')}" required>
      <input name="phone" type="tel" inputmode="tel" placeholder="Телефон +380…" autocomplete="tel" value="${v('phone')}" required>
      <input name="cafe" placeholder="Заклад (для кав'ярень, необов'язково)" value="${v('cafe')}">
      <div class="np2"><input name="np_city" placeholder="Місто" autocomplete="address-level2" value="${v('np_city')}" required>
        <input name="np_branch" placeholder="Відділення або поштомат НП, №" value="${v('np_branch')}" required></div>
      <div class="payopt"><label><input type="radio" name="payment" value="invoice" ${prev?.payment !== 'cod' ? 'checked' : ''}> На рахунок<small>QR і кнопка Приват24 / mono</small></label>
        <label><input type="radio" name="payment" value="cod" ${prev?.payment === 'cod' ? 'checked' : ''}> Накладений платіж<small>оплата при отриманні</small></label></div>
      <textarea name="comment" rows="2" placeholder="Коментар, побажання">${v('comment')}</textarea>
      <div class="msg" id="coMsg"></div>
      <button class="cta" type="submit" style="width:100%">Замовити · ${uah(total)}</button>
      <p class="consent">Натискаючи «Замовити», ти погоджуєшся з <a href="legal-oferta.html" target="_blank">офертою</a>, <a href="legal-delivery.html" target="_blank">умовами доставки й повернення</a> та <a href="legal-privacy.html" target="_blank">політикою конфіденційності</a>.</p>
    </form>`}`, !!prev);
  $('#checkout')?.addEventListener('submit', submitOrder);
}
async function submitOrder(e) {
  e.preventDefault();
  const f = new FormData(e.target), btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...Object.fromEntries(f), items: lines().map(x => ({ id: x.id, w: x.w, g: x.g, qty: x.qty })) }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Не вдалося оформити');
    cart = []; store.set('pl_cart', cart); renderCart();
    openSheet(`<div class="handle"></div><h5>Замовлення ${esc(j.number)}</h5>
      <p>Дякуємо! Сума: <b>${uah(j.total)}</b>. ${j.invoice ? 'Рахунок готовий — оплатити можна в один дотик.' : 'Ми зв\'яжемося для підтвердження.'}</p>
      ${j.invoice ? `<a class="cta" href="${esc(j.invoice)}" style="display:block;text-decoration:none">Відкрити рахунок</a>` : ''}`);
  } catch (err) { $('#coMsg').textContent = err.message; btn.disabled = false; }
}
$('#cartPill').onclick = openCart;

// ---------- штора ----------
function openSheet(html, keepScroll) { const y = sheet.scrollTop; sheet.innerHTML = html; sheet.classList.add('on'); shade.classList.add('on'); sheet.scrollTop = keepScroll ? y : 0; }
function closeSheet() {
  sheet.classList.remove('on'); shade.classList.remove('on');
  if (paused) { paused = null; toast('Покупку скасовано'); }
}
shade.onclick = closeSheet;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
let dragY = null;
sheet.addEventListener('pointerdown', e => { if (sheet.scrollTop <= 0) dragY = e.clientY; });
sheet.addEventListener('pointerup', e => { if (dragY !== null && e.clientY - dragY > 70) closeSheet(); dragY = null; });

function openLot(k, opt = {}) {
  const l = LOTS[k];
  let w = opt.w === 1000 ? 1000 : 250, g = 'beans';
  const price = () => uah(w === 250 ? l.price250 : l.price1000);
  openSheet(`<div class="handle"></div>
    <div class="sh-top"><div class="t"><b>${esc(l.name)}</b><div class="seg"><button type="button"${w === 250 ? ' class="on"' : ''} data-sw="250">250 г</button><button type="button"${w === 1000 ? ' class="on"' : ''} data-sw="1000">1 кг</button></div></div>
      <button class="cta" type="button" data-buy>Купити<small id="shPrice">${price()}</small></button></div>
    ${opt.paused ? '<p class="paused">Покупку призупинено. Обери вагу й помел і тисни «Купити». Згорнеш — скасуємо.</p>' : ''}
    ${grindMap()}
    <h5>Опис</h5>
    ${l.description ? `<p>${esc(l.description)}</p>` : `<p>Смак: <b style="color:${l.color}">${esc(l.taste)}</b>.</p>`}
    <div class="chips" style="margin-bottom:10px">${l.words.map(x => `<span class="chip" style="color:${x.color}">${esc(x.word)}</span>`).join('')}</div>
    ${l.methods?.length ? `<h5>Як готувати</h5>${methLinks(l)}` : ''}
    <h5>Звідки</h5><p>${esc([l.farm && 'Ферма ' + l.farm, l.country, l.altitude && 'висота ' + l.altitude].filter(Boolean).join(', '))}.</p>
    ${l.price1000_bulk ? `<h5>Для кав'ярень</h5><p style="font-size:14.5px">Від 7 кг у замовленні — 1 кг за ${uah(l.price1000_bulk)}. Від 28 пачок по 250 г — ще дешевше. Партнерам — спеціальна ціна на 250 г.</p>` : ''}`);
  sheet.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => {
    w = +b.dataset.sw; sheet.querySelectorAll('[data-sw]').forEach(x => x.classList.toggle('on', x === b)); $('#shPrice').textContent = price();
  });
  // зерно ↔ змолоти; тап по образу одразу вмикає «змолоти». «Змолоти» без вибору — «Купити» чекає на спосіб.
  const map = sheet.querySelector('.gmap'), buyBtn = sheet.querySelector('[data-buy]'), gName = $('#gName');
  const setG = key => {
    g = key;
    const ground = g !== 'beans' && g !== null;
    map.dataset.ground = g === 'beans' ? '0' : '1';
    map.querySelectorAll('[data-gt]').forEach(b => b.setAttribute('aria-checked', String((b.dataset.gt === 'beans') === (g === 'beans'))));
    map.querySelectorAll('[data-g]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.g === g)));
    gName.textContent = g === 'beans' ? 'ціле зерно' : ground ? GMAP.find(x => x[0] === g)[1] : 'обери, під що молоти';
    gName.classList.toggle('ask', g === null);
    buyBtn.disabled = g === null;
  };
  map.querySelector('[data-gt="beans"]').onclick = () => setG('beans');
  map.querySelector('[data-gt="ground"]').onclick = () => { if (g === 'beans') setG(null); };
  map.querySelectorAll('[data-g]').forEach(b => b.onclick = () => setG(b.dataset.g));
  buyBtn.onclick = () => { if (g === null) return; paused = null; addToCart(k, w, g); closeSheet(); };
}

sheet.addEventListener('click', e => {
  const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
  if (inc || dec) {
    const [id, w, g] = (inc || dec).dataset[inc ? 'inc' : 'dec'].split(':');
    if (inc) cart.push({ id, w: +w, g: gKey(g) }); else { const i = cart.findIndex(c => c.id === id && c.w === +w && gKey(c.g) === gKey(g)); if (i >= 0) cart.splice(i, 1); }
    store.set('pl_cart', cart); renderCart(); openCart();
  }
  const m = e.target.closest('[data-moodpick]');
  if (m) { sortByMood(+m.dataset.moodpick); closeSheet(); toast(`Настрій: ${m.textContent}`); }
  const mt = e.target.closest('[data-method]');
  if (mt) { sortByMethod(mt.dataset.method); closeSheet(); toast(`Спершу лоти: ${mt.textContent.toLowerCase()}`); }
});

// ---------- настрій ----------
function openMoods() {
  openSheet(`<div class="handle"></div><h5>Який настрій?</h5><p style="font-size:14px;color:var(--muted)">Стрічка почнеться з найближчих за смаком лотів.</p>
    <div style="display:grid;gap:8px">${MAP.moods.map(m => `<button type="button" class="mood" data-moodpick="${m.flame}" style="color:${flameAt(m.flame)}">${esc(m.uk)}</button>`).join('')}</div>
    ${MAP.methods?.length ? `<h5 style="margin-top:8px">Як готуєш?</h5><div class="meth pick">${MAP.methods.map(m => `<button type="button" data-method="${m.key}" class="${m.group}">${esc(m.uk)}</button>`).join('')}</div>` : ''}`);
}
function sortByMethod(key) {
  const has = l => (l.methods || []).some(m => m.key === key);
  LOTS = [...LOTS.filter(has), ...LOTS.filter(l => !has(l))];
  render();
}
function flameAt(t) {
  const near = MAP.categories.reduce((a, c) => (Math.abs(c.flame - t) < Math.abs(a.flame - t) ? c : a));
  return near.color;
}
function sortByMood(t) {
  LOTS.sort((a, b) => Math.abs((a.flame ?? 0.5) - t) - Math.abs((b.flame ?? 0.5) - t));
  render();
}

// ---------- жести в стрічці ----------
let lastTap = 0;
feed.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('.topzone')) return peekBrow();
  const fb = t.closest('[data-fav]'); if (fb) return toggleFav(+fb.dataset.fav);
  const sh = t.closest('[data-share]'); if (sh) return share(+sh.dataset.share);
  if (t.closest('[data-mood]')) return openMoods();
  const op = t.closest('[data-open]'); if (op) return openLot(+op.dataset.open);
});
feed.addEventListener('pointerup', e => {
  if (e.target.closest('button')) return;
  const p = e.target.closest('.pack'); if (!p) return;
  const now = Date.now();
  if (now - lastTap < 300) {
    const k = +p.dataset.k; if (!fav.includes(LOTS[k].id)) toggleFav(k);
    const pop = p.querySelector('.pop'); pop.classList.remove('go'); void pop.offsetWidth; pop.classList.add('go'); lastTap = 0;
  } else lastTap = now;
});
function toggleFav(k) {
  const id = LOTS[k].id;
  fav = fav.includes(id) ? fav.filter(x => x !== id) : [...fav, id]; store.set('pl_fav', fav);
  feed.querySelectorAll(`[data-fav="${k}"]`).forEach(b => b.setAttribute('aria-pressed', fav.includes(id)));
  toast(fav.includes(id) ? 'Відкладено' : 'Прибрано з відкладеного');
}
async function share(k) {
  const l = LOTS[k], url = `${location.origin}/#${l.id}`;
  try { await navigator.clipboard.writeText(`PROLOVE ${l.name}: ${l.taste}. ${url}`); toast('Посилання скопійовано'); } catch { toast(url); }
}

// ---------- старт ----------
(async () => {
  try {
    const [lots, map] = await Promise.all([fetch('/api/lots').then(r => r.json()), fetch('/api/flavor-map').then(r => r.json())]);
    LOTS = lots; MAP = map; render(); renderCart();
  } catch { feed.innerHTML = '<div class="loading">Не вдалося завантажити лоти. Онови сторінку.</div>'; }
})();

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
  const start = Math.max(0, LOTS.findIndex(l => '#' + l.id === location.hash));
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
function addToCart(k, w) {
  const l = LOTS[k];
  cart.push({ id: l.id, w: +w }); store.set('pl_cart', cart); renderCart();
  toast(`${l.name}, ${+w === 250 ? '250 г' : '1 кг'} — у кошику`);
}
function renderCart() { const p = $('#cartPill'); p.hidden = !cart.length; p.textContent = `Кошик ${cart.length}`; }
$('#buy').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) addToCart(current, b.dataset.w); });
// кошик → оформлення. Ціни на екрані орієнтовні, остаточну суму рахує сервер.
const lines = () => {
  const m = new Map();
  for (const c of cart) { const k = c.id + ':' + c.w; m.set(k, { ...c, qty: (m.get(k)?.qty || 0) + 1 }); }
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
      return `<div class="row2"><span>${esc(x.lot.name)}, ${x.w === 250 ? '250 г' : '1 кг'}<br><small style="color:var(--muted)">${p === null ? 'ціну уточнимо' : `${disc ? `<s>${uah(it.base)}</s> ` : ''}<b style="color:${disc ? 'var(--teal)' : 'inherit'}">${uah(p)}</b>${disc && it.note ? ` · ${esc(it.note)}` : ''}`}</small></span>
      <span class="qty"><button type="button" data-dec="${x.id}:${x.w}" aria-label="Менше">−</button><b>${x.qty}</b><button type="button" data-inc="${x.id}:${x.w}" aria-label="Більше">+</button></span></div>`;
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
      <textarea name="comment" rows="2" placeholder="Коментар: помол, побажання">${v('comment')}</textarea>
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
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...Object.fromEntries(f), items: lines().map(x => ({ id: x.id, w: x.w, qty: x.qty })) }) });
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
function closeSheet() { sheet.classList.remove('on'); shade.classList.remove('on'); }
shade.onclick = closeSheet;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
let dragY = null;
sheet.addEventListener('pointerdown', e => { if (sheet.scrollTop <= 0) dragY = e.clientY; });
sheet.addEventListener('pointerup', e => { if (dragY !== null && e.clientY - dragY > 70) closeSheet(); dragY = null; });

function openLot(k) {
  const l = LOTS[k];
  let w = 250;
  const price = () => uah(w === 250 ? l.price250 : l.price1000);
  openSheet(`<div class="handle"></div>
    <div class="sh-top"><div class="t"><b>${esc(l.name)}</b><div class="seg"><button type="button" class="on" data-sw="250">250 г</button><button type="button" data-sw="1000">1 кг</button></div></div>
      <button class="cta" type="button" data-buy>Купити<small id="shPrice">${price()}</small></button></div>
    <h5>Опис</h5>
    ${l.description ? `<p>${esc(l.description)}</p>` : `<p>Смак: <b style="color:${l.color}">${esc(l.taste)}</b>.</p>`}
    <div class="chips" style="margin-bottom:10px">${l.words.map(x => `<span class="chip" style="color:${x.color}">${esc(x.word)}</span>`).join('')}</div>
    ${l.methods?.length ? `<h5>Як готувати</h5>${methLinks(l)}` : ''}
    <h5>Звідки</h5><p>${esc([l.farm && 'Ферма ' + l.farm, l.country, l.altitude && 'висота ' + l.altitude].filter(Boolean).join(', '))}.</p>
    ${l.price1000_bulk ? `<h5>Для кав'ярень</h5><p style="font-size:14.5px">Від 7 кг у замовленні — 1 кг за ${uah(l.price1000_bulk)}. Від 28 пачок по 250 г — ще дешевше. Партнерам — спеціальна ціна на 250 г.</p>` : ''}`);
  sheet.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => {
    w = +b.dataset.sw; sheet.querySelectorAll('[data-sw]').forEach(x => x.classList.toggle('on', x === b)); $('#shPrice').textContent = price();
  });
  sheet.querySelector('[data-buy]').onclick = () => { addToCart(k, w); closeSheet(); };
}

sheet.addEventListener('click', e => {
  const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
  if (inc || dec) {
    const [id, w] = (inc || dec).dataset[inc ? 'inc' : 'dec'].split(':');
    if (inc) cart.push({ id, w: +w }); else { const i = cart.findIndex(c => c.id === id && c.w === +w); if (i >= 0) cart.splice(i, 1); }
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

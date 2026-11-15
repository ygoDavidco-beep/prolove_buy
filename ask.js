// «Запитай» — Матриця PROLOVE: дощ із назв лотів і смаків, одне поле, відповідь друкується як код.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
let LOTS = [], POOL = [], FOCUS = null;
// живий дощ: поки людина набирає «с», підсвічуються СОЛОДКИЙ, СЛИВА, СМОРОДИНА…
let HL = null, HLPOOL = [];
const lit = w => !!HL && HL.test(w.t.toLowerCase());

// ---------- дощ ----------
const cv = $('#rain'), ctx = cv.getContext('2d');
// кожна літера — у своїй клітинці з запасом зверху/знизу, щоб Й, Ї, Д, Щ не обрізались сусідньою літерою
const FS = 17, COL = 20, LH = 24;
let cols = [], W = 0, H = 0, dpr = 1;
function pick() {
  const src = HLPOOL.length && Math.random() < 0.6 ? HLPOOL : FOCUS && Math.random() < 0.8 ? FOCUS : POOL;
  return src.length ? src[(Math.random() * src.length) | 0] : { t: 'PROLOVE', c: '#5EC4CC' };
}
function newCol(x, scatter) {
  const w = pick();
  return { x, y: scatter ? -Math.round(Math.random() * H / LH) * LH : -LH * Math.round(1 + Math.random() * 14), w, i: 0, speed: 0.5 + Math.random() * 0.7, acc: 0 };
}
function resize() {
  dpr = Math.min(1.5, devicePixelRatio || 1);
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  cols = Array.from({ length: Math.ceil(W / COL) }, (_, k) => newCol(k * COL + 1, true));
}
function step() {
  ctx.fillStyle = 'rgba(0,0,0,0.085)';
  ctx.fillRect(0, 0, W, H);
  ctx.font = `500 ${FS}px Oswald, 'Arial Narrow', sans-serif`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const cx = c => c.x + COL / 2, cy = y => y + LH / 2;
  for (const c of cols) {
    c.acc += c.speed;
    while (c.acc >= 1) {
      c.acc -= 1;
      const ch = c.w.t[c.i] ?? ' ';
      // попередня літера стає кольором смаку, голова — світла; очищаємо рівно її клітинку
      const on = lit(c.w);
      ctx.globalAlpha = HL && !on ? 0.35 : 1;
      if (c.i > 0) {
        ctx.fillStyle = '#000'; ctx.fillRect(c.x, c.y - LH, COL, LH);
        if (on) { ctx.shadowColor = c.w.c; ctx.shadowBlur = 10; }
        ctx.fillStyle = c.w.c; ctx.fillText((c.w.t[c.i - 1] || '').toUpperCase(), cx(c), cy(c.y - LH));
      } else if (on) { ctx.shadowColor = c.w.c; ctx.shadowBlur = 10; }
      ctx.fillStyle = on ? '#FFFFFF' : '#F6F0EB';
      ctx.fillText(ch.toUpperCase(), cx(c), cy(c.y));
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      c.y += LH; c.i += 1;
      if (c.i > c.w.t.length + 3 || c.y > H + LH) Object.assign(c, newCol(c.x, false), { y: c.y > H ? -LH * Math.round(Math.random() * 8) : c.y + LH * 2 });
    }
  }
}
let last = 0;
const host = document.getElementById('w-ask');
function loop(ts) {
  // дощ іде лише тоді, коли Матрицю видно: решту часу телефон відпочиває
  if (ts - last > 55 && (!host || host.dataset.vis !== '0') && !document.hidden) { step(); last = ts; }
  requestAnimationFrame(loop);
}
function still() { // без анімації: статичний візерунок слів
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.font = `500 ${FS}px Oswald, sans-serif`; ctx.textBaseline = 'top';
  ctx.textAlign = 'center'; for (const c of cols) { const w = pick(); for (let i = 0; i < w.t.length; i++) { ctx.fillStyle = w.c; ctx.globalAlpha = 0.25; ctx.fillText(w.t[i].toUpperCase(), c.x + COL / 2, c.y + i * LH); } c.y = Math.random() * H; }
  ctx.globalAlpha = 1;
}

// ---------- друк відповіді ----------
const out = $('#out');
// нова розмова — вгорі, одразу під полем; старі блоки з'їжджають униз
let blk = out;
function newBlock() { blk = document.createElement('div'); blk.className = 'blk'; out.prepend(blk); out.scrollTop = 0; return blk; }
const sleep = ms => new Promise(r => setTimeout(r, calm ? 0 : ms));
async function type(html, cls = '') {
  const d = document.createElement('div'); d.className = 'ln cur ' + cls; blk.append(d);
  const tmp = document.createElement('div'); tmp.innerHTML = html; const text = tmp.textContent;
  for (let i = 1; i <= text.length; i += 2) { d.textContent = text.slice(0, i); await sleep(14); }
  d.innerHTML = html; d.classList.remove('cur');
}
let busy = false;
// розмова: токен і останнє побачене повідомлення — щоб відповідь Давида знайшла людину навіть після перезаходу
const store = { get() { try { return JSON.parse(localStorage.getItem('pl_chat')) || {}; } catch { return {}; } }, set(v) { try { localStorage.setItem('pl_chat', JSON.stringify(v)); } catch { /* приватний режим */ } } };
let chat = store.get();
const METH = { espresso: 'еспресо', superauto: 'суперавтомат', moka: 'гейзер', cezve: 'турка', filter: 'фільтр', milk: 'молочні напої', cafe: "кав'ярні" };
const shown = new Set();
function lotCard(l) {
  blk.insertAdjacentHTML('beforeend', `<a class="lot" data-ql="${esc(l.id)}" href="index.html#${esc(l.id)}"><b>${esc(l.name)}</b><span class="go">у стрічку →</span>
    <span style="color:${l.color}">${esc(l.taste)}</span>${l.methods?.length ? `<small>${esc(l.methods.map(m => m.short).join(' · '))}</small>` : ''}</a>`);
}
async function sayLine(who, text, cls) {
  const head = `<span class="who">${esc(who)}</span> `;
  for (const part of String(text).split(/\n+/).filter(Boolean)) { await type(head + esc(part), cls); }
}
async function search(q) {
  q = q.trim(); if (!q || busy) return; busy = true;
  $('#term').classList.add('up'); HL = null; HLPOOL = [];
  newBlock();
  await type(`&gt; ${esc(q)}`, 'dim');
  let r = null;
  try {
    r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: chat.token, text: q }) }).then(x => x.json());
    if (r.token) { chat = { token: r.token, last: Math.max(chat.last || 0, ...r.messages.map(m => m.id)) }; store.set(chat); poll.start(); }
  } catch { r = null; }
  if (!r || r.error) {
    // запасний шлях — лише пошук без розмови
    try { r = { match: await fetch('/api/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q }) }).then(x => x.json()), messages: [] }; }
    catch { await type('&gt; зв\'язок перервався. спробуй ще раз'); busy = false; return; }
  }
  const m = r.match || { lots: [] };
  setMood(m.mood, q, m);
  // у статистику — слова, які людина написала сама (без наших розширень «солодке → карамель, мед…»), і намір
  window.plt?.('q', q, `${(m.own?.length ? m.own : m.words || []).slice(0, 8).join(',')}|${m.mood || ''}|${(m.intents || []).join(',')}`, (m.lots || []).length);
  if (/доставк|оплат|поверн|замовлен|рахун|опт\b|оптов/i.test(q)) {
    await type(r.owner ? '&gt; передав ростеру — Давид відповість тут' : '&gt; це питання до людей — контакти в «Інфо»');
    blk.insertAdjacentHTML('beforeend', '<a class="lot" href="info.html"><b>Інфо і підтримка</b><span class="go">→</span><small>доставка, оплата, контакти</small></a>');
  } else {
    const found = (m.lots || []).map(x => ({ ...x, lot: LOTS.find(l => l.id === x.id) })).filter(x => x.lot);
    if (m.missing) {
      await type(`&gt; ${esc(m.missing.name)} — зараз немає в обсмажці`);
      await type(m.missing.near ? `&gt; найближче за краєм (${esc(m.missing.region)}):` : '&gt; ось що є схоже за смаком:', 'dim');
    } else if (m.intents?.length) await type(`&gt; зрозумів: ${m.intents.map(esc).join(' · ')}`, 'dim');
    if (!found.length) {
      FOCUS = null;
      await type('&gt; не впізнаю. спробуй смак: ягоди, вишня, шоколад, горіх, цитрус, квіти…');
      await type('&gt; або спосіб: турка, гейзер, фільтр, суперавтомат, капучино', 'dim');
    } else {
      FOCUS = found.flatMap(x => [{ t: x.lot.name, c: x.lot.color }, ...x.lot.words.map(w => ({ t: w.word, c: w.color }))]);
      // показуємо лише ті слова, що справді є у знайдених лотах
      const tags = [...new Set(found.flatMap(x => x.words || []))].concat((m.methods || []).map(k => METH[k]));
      if (tags.length && !m.missing) await type(`&gt; збіг: ${tags.map(esc).join(' · ')}`, 'dim');
      for (const x of found) { lotCard(x.lot); shown.add(x.lot.id); await sleep(160); }
    }
  }
  for (const msg of (r.messages || []).filter(x => x.role !== 'user')) await render(msg);
  if (r.owner && !(r.messages || []).some(x => x.role === 'ai')) await type(r.human ? '&gt; Давид на зв\'язку — відповідь з\'явиться тут' : '&gt; ростер бачить запит і може відповісти тут', 'dim');
  busy = false;
}
async function render(msg) {
  if (msg.role === 'ai') await sayLine('ШІ PROLOVE:', msg.text, 'ai');
  else if (msg.role === 'owner') { await sayLine('Давид · ростер:', msg.text, 'owner'); ping(); }
  for (const id of msg.lots || []) { const l = LOTS.find(x => x.id === id); if (l && !shown.has(id)) { lotCard(l); shown.add(id); } }
  chat.last = Math.max(chat.last || 0, msg.id); store.set(chat);
}
// відповідь Давида: дзвіночок і крапка на «Запитай», якщо людина зараз у стрічці
function ping() {
  if (document.getElementById('w-ask')?.dataset.vis === '0') document.querySelector('.nav-tabs [data-w="ask"]')?.classList.add('ping');
}
addEventListener('pl:world', e => { if (e.detail === 'ask') document.querySelector('.nav-tabs [data-w="ask"]')?.classList.remove('ping'); });
const poll = (() => {
  let t = null, since = 0;
  async function tick() {
    if (!chat.token || document.hidden || busy) return;
    try {
      const r = await fetch(`/api/chat?token=${encodeURIComponent(chat.token)}&after=${chat.last || 0}`).then(x => x.json());
      if (r.error) { chat = {}; store.set(chat); return stop(); }
      const fresh = (r.messages || []).filter(m => m.role !== 'user');
      if (fresh.length) { $('#term').classList.add('up'); newBlock(); }
      for (const msg of fresh) { await render(msg); since = Date.now(); }
    } catch { /* мережа — спробуємо пізніше */ }
    if (Date.now() - since > 30 * 60e3) stop(); // пів години тиші — перестаємо питати
  }
  function stop() { clearInterval(t); t = null; }
  return { start() { since = Date.now(); if (!t) t = setInterval(tick, 4000); }, tick };
})();
if (chat.token) { poll.start(); setTimeout(poll.tick, 1500); }

$('#ask').addEventListener('submit', e => { e.preventDefault(); search($('#q').value); $('#q').blur(); });
$('#q').addEventListener('input', () => {
  const tok = ($('#q').value.toLowerCase().match(/[\p{L}'’]+$/u) || [''])[0];
  HL = tok ? new RegExp(`(^|[\\s,(])${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u') : null;
  HLPOOL = HL ? POOL.filter(lit) : [];
});
$('#hint').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { $('#q').value = b.textContent; search(b.textContent); } });

// ---------- настрій кольору ----------
// Колір змінює сприйняття смаку: рожево-малиновий підсилює солодкість, лимонний і свіжий зелений — кислинку,
// теплий коричневий із червоним — шоколад і тіло. Підсвічуємо те, що людина сама назвала, і лише справжні лоти з таким профілем.
// Смак людини зберігається тільки в її браузері (localStorage) — на сервер не йде.
const app = document.getElementById('w-ask');
const taste = {
  get() { try { const t = JSON.parse(localStorage.getItem('pl_taste')); return t && Date.now() - t.at < 60 * 864e5 ? t : null; } catch { return null; } },
  set(v) { try { localStorage.setItem('pl_taste', JSON.stringify(v)); } catch { /* приватний режим */ } },
};
function paintMood(mood) {
  if (!app) return;
  if (mood) app.dataset.mood = mood; else delete app.dataset.mood;
}
function setMood(mood, q, m) {
  if (!mood) return; // незрозумілий запит не стирає вже відомий смак
  paintMood(mood);
  taste.set({ mood, q: q.slice(0, 60), words: (m.words || []).slice(0, 8), at: Date.now() });
  dispatchEvent(new CustomEvent('pl:taste'));
}

// підказки в полі по черзі
const EX = ['хочу солодку каву…', 'вишня й шоколад…', 'щось для турки…', 'без кислинки…', 'кисле ягідне…', 'під капучино…', 'вайб: дощовий вечір…', 'горіх і карамель…', 'для фільтра…', 'Гватемала?…'];
let exi = 0;
setInterval(() => { if (document.activeElement !== $('#q') && !$('#q').value) $('#q').placeholder = EX[++exi % EX.length]; }, 2600);

// ---------- старт ----------
(async () => {
  try { LOTS = await fetch('/api/lots').then(r => r.json()); } catch { LOTS = []; }
  POOL = LOTS.flatMap(l => [{ t: l.name, c: l.color }, { t: l.country || '', c: 'rgba(246,240,235,.55)' }, ...l.words.map(w => ({ t: w.word, c: w.color })), ...(l.methods || []).map(m => ({ t: m.short, c: 'rgba(94,196,204,.8)' }))]).filter(w => w.t);
  POOL.push({ t: 'PROLOVE', c: '#E8394A' }, { t: 'кава вогонь', c: '#F2B33D' }, { t: 'солодка', c: '#F2B33D' }, { t: 'без кислинки', c: '#C98A55' }, { t: 'яскрава', c: '#5EC4CC' }, { t: 'турка', c: 'rgba(94,196,204,.8)' }, { t: 'гейзер', c: 'rgba(94,196,204,.8)' }, { t: 'капучино', c: 'rgba(94,196,204,.8)' });
  // людина повертається — Матриця вже знає її смак: колір, дощ зі «своїх» слів і її запит першою підказкою
  const t = taste.get();
  if (t) {
    paintMood(t.mood);
    const mine = POOL.filter(w => t.words.some(x => w.t.toLowerCase().includes(x)));
    if (mine.length) FOCUS = mine;
    if (t.q && ![...$('#hint').children].some(b => b.textContent === t.q)) $('#hint').insertAdjacentHTML('afterbegin', `<button type="button" class="mine">${esc(t.q)}</button>`);
  }
  resize(); addEventListener('resize', resize);
  if (calm) still(); else requestAnimationFrame(loop);
  const q = new URLSearchParams(location.search).get('q');
  if (q) { $('#q').value = q; search(q); }
})();

// статистика: з Матриці перейшли на лот
document.addEventListener('click', e => { const a = e.target.closest('a[data-ql]'); if (a) window.plt?.('q_lot', a.dataset.ql); });

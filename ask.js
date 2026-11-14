// «Запитай» — Матриця PROLOVE: дощ із назв лотів і смаків, одне поле, відповідь друкується як код.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
let LOTS = [], POOL = [], FOCUS = null;

// ---------- дощ ----------
const cv = $('#rain'), ctx = cv.getContext('2d');
// кожна літера — у своїй клітинці з запасом зверху/знизу, щоб Й, Ї, Д, Щ не обрізались сусідньою літерою
const FS = 17, COL = 20, LH = 24;
let cols = [], W = 0, H = 0, dpr = 1;
function pick() {
  const src = FOCUS && Math.random() < 0.8 ? FOCUS : POOL;
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
      if (c.i > 0) {
        ctx.fillStyle = '#000'; ctx.fillRect(c.x, c.y - LH, COL, LH);
        ctx.fillStyle = c.w.c; ctx.fillText((c.w.t[c.i - 1] || '').toUpperCase(), cx(c), cy(c.y - LH));
      }
      ctx.fillStyle = '#F6F0EB';
      ctx.fillText(ch.toUpperCase(), cx(c), cy(c.y));
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
const sleep = ms => new Promise(r => setTimeout(r, calm ? 0 : ms));
async function type(html, cls = '') {
  const d = document.createElement('div'); d.className = 'ln cur ' + cls; out.append(d);
  const tmp = document.createElement('div'); tmp.innerHTML = html; const text = tmp.textContent;
  for (let i = 1; i <= text.length; i += 2) { d.textContent = text.slice(0, i); await sleep(14); }
  d.innerHTML = html; d.classList.remove('cur'); out.scrollTop = out.scrollHeight;
}
let busy = false;
async function search(q) {
  q = q.trim(); if (!q || busy) return; busy = true;
  $('#term').classList.add('up'); $('#hint').hidden = true; out.innerHTML = '';
  await type(`&gt; ${esc(q)}`, 'dim');
  if (/доставк|оплат|поверн|замовлен|рахун|ціна доставки/i.test(q)) {
    await type('&gt; це питання до людей, не до Матриці');
    out.insertAdjacentHTML('beforeend', '<a class="lot" href="info.html"><b>Інфо і підтримка</b><span class="go">→</span><small>доставка, оплата, контакти</small></a>');
    busy = false; return;
  }
  let r;
  try { r = await fetch('/api/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q }) }).then(x => x.json()); }
  catch { await type('&gt; зв\'язок перервався. спробуй ще раз'); busy = false; return; }
  if (r.error) { await type(`&gt; ${esc(r.error)}`); busy = false; return; }
  const found = (r.lots || []).map(x => ({ ...x, lot: LOTS.find(l => l.id === x.id) })).filter(x => x.lot);
  if (!found.length) {
    FOCUS = null;
    await type('&gt; не впізнаю. спробуй смак: ягоди, вишня, шоколад, горіх, цитрус, квіти…');
    await type('&gt; або спосіб: турка, гейзер, фільтр, суперавтомат, капучино', 'dim');
    busy = false; return;
  }
  // дощ фокусується на знайденому
  FOCUS = found.flatMap(x => [{ t: x.lot.name, c: x.lot.color }, ...x.lot.words.map(w => ({ t: w.word, c: w.color }))]);
  const tags = [...(r.words || []), ...(r.methods || []).map(k => ({ espresso: 'еспресо', superauto: 'суперавтомат', moka: 'гейзер', cezve: 'турка', filter: 'фільтр', milk: 'молочні напої', cafe: "кав'ярні" }[k]))];
  if (tags.length) await type(`&gt; збіг: ${tags.map(esc).join(' · ')}`, 'dim');
  for (const x of found) {
    const l = x.lot;
    out.insertAdjacentHTML('beforeend', `<a class="lot" href="index.html#${esc(l.id)}"><b>${esc(l.name)}</b><span class="go">у стрічку →</span>
      <span style="color:${l.color}">${esc(l.taste)}</span>${l.methods?.length ? `<small>${esc(l.methods.map(m => m.short).join(' · '))}</small>` : ''}</a>`);
    await sleep(160);
  }
  busy = false;
}

$('#ask').addEventListener('submit', e => { e.preventDefault(); search($('#q').value); $('#q').blur(); });
$('#hint').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { $('#q').value = b.textContent; search(b.textContent); } });

// підказки в полі по черзі
const EX = ['вишня й шоколад…', 'щось для турки…', 'кисле ягідне…', 'під капучино…', 'горіх і карамель…', 'для фільтра…'];
let exi = 0;
setInterval(() => { if (document.activeElement !== $('#q') && !$('#q').value) $('#q').placeholder = EX[++exi % EX.length]; }, 2600);

// ---------- старт ----------
(async () => {
  try { LOTS = await fetch('/api/lots').then(r => r.json()); } catch { LOTS = []; }
  POOL = LOTS.flatMap(l => [{ t: l.name, c: l.color }, { t: l.country || '', c: 'rgba(246,240,235,.55)' }, ...l.words.map(w => ({ t: w.word, c: w.color })), ...(l.methods || []).map(m => ({ t: m.short, c: 'rgba(94,196,204,.8)' }))]).filter(w => w.t);
  POOL.push({ t: 'PROLOVE', c: '#E8394A' }, { t: 'кава вогонь', c: '#F2B33D' });
  resize(); addEventListener('resize', resize);
  if (calm) still(); else requestAnimationFrame(loop);
  const q = new URLSearchParams(location.search).get('q');
  if (q) { $('#q').value = q; search(q); }
})();

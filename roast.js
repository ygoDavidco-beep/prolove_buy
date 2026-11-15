// «Вивантаж вчасно»: барабан, графік і керування. Фізика — у roastgame.js (детермінована, згодом перевіряється сервером).
import { makeRoast, step, gas, ignite, wakeUp, unload, SPEED, WIN, BLACK, LOW_GAS, FC } from './roastgame.js?v=mwi7c3pu';

const $ = id => document.getElementById(id);
const DT = 0.05;                 // крок фізики, с обсмаження
let briefAt = 0, cracked = false, s = null, acts = [], hist = [], raf = 0, last = 0, acc = 0, started = false, forPrize = false;
// демо-лічильники лише в цьому браузері; у справжній грі все це рахує сервер
const LS = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };

// ---------- зерна в барабані ----------
const beansG = $('beans');
const BEANS = Array.from({ length: 34 }, (_, i) => {
  const a = Math.PI * (0.15 + 0.7 * ((i * 0.618) % 1)), r = 30 + ((i * 37) % 40);
  return { x: 100 + Math.cos(a) * r, y: 100 + Math.sin(a) * r * 0.9, rot: (i * 47) % 180 };
});
beansG.innerHTML = BEANS.map(b => `<ellipse cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" rx="5.2" ry="3.4" transform="rotate(${b.rot} ${b.x.toFixed(1)} ${b.y.toFixed(1)})"/>`).join('');

// колір зерна за температурою: від карамельного до чорного
const STOPS = [[21, [122, 142, 86]], [150, [168, 150, 92]], [185, [176, 128, 78]], [203, [154, 106, 68]], [208, [128, 82, 50]], [212, [104, 63, 37]], [214.5, [62, 36, 22]], [217, [26, 16, 12]]];
function beanColor(bt) {
  let a = STOPS[0], b = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) if (bt >= STOPS[i][0] && bt <= STOPS[i + 1][0]) { a = STOPS[i]; b = STOPS[i + 1]; }
  const k = Math.max(0, Math.min(1, (bt - a[0]) / ((b[0] - a[0]) || 1)));
  return `rgb(${a[1].map((v, j) => Math.round(v + (b[1][j] - v) * k)).join(',')})`;
}

// ---------- графік ----------
const cv = $('chart'), ctx = cv.getContext('2d');
function fit() { const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
function chart() {
  const W = cv.clientWidth, H = cv.clientHeight, L = 34, R = 30, T = 8, B = 18;
  const lo = s?.woke ? Math.min(199, Math.floor(Math.min(...hist.map(p => p.bt)) / 2) * 2 - 2) : 199, span = 217 - lo;
  const rMax = Math.max(40, Math.ceil(Math.max(0, ...hist.map(p => p.ror)) / 10) * 10 + 10);
  const tMax = Math.max(40, (s?.t || 0) + 8), y = v => T + (H - T - B) * (1 - (Math.max(lo, v) - lo) / span), r = v => T + (H - T - B) * (1 - v / rMax), x = t => L + (W - L - R) * (t / tMax);
  ctx.clearRect(0, 0, W, H);
  // вікно вивантаження
  ctx.fillStyle = 'rgba(242,96,58,.22)'; ctx.fillRect(L, y(WIN[1]), W - L - R, y(WIN[0]) - y(WIN[1]));
  ctx.strokeStyle = 'rgba(242,140,40,.75)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
  [WIN[0], WIN[1]].forEach(v => { ctx.beginPath(); ctx.moveTo(L, y(v)); ctx.lineTo(W - R, y(v)); ctx.stroke(); });
  ctx.setLineDash([]);
  // осі
  ctx.fillStyle = 'rgba(246,240,235,.5)'; ctx.font = '11px Oswald, sans-serif'; ctx.textAlign = 'right';
  (span > 24 ? [lo + 2, 190, 200, 212] : [200, 204, 208, 212, 216]).filter(v => v > lo).forEach(v => ctx.fillText(Math.round(v) + '°', L - 5, y(v) + 4));
  ctx.fillStyle = 'rgba(94,196,204,.8)'; ctx.textAlign = 'left'; [10, 20, 30, 40, 50, 60, 70].filter(v => v < rMax).forEach(v => ctx.fillText(v, W - R + 5, r(v) + 4));
  // легенда
  ctx.font = '11px Manrope, sans-serif'; ctx.fillStyle = '#F28C28'; ctx.fillText('— зерно, °C', L + 6, T + 12);
  ctx.fillStyle = '#5EC4CC'; ctx.fillText('— RoR, °/хв', L + 86, T + 12);
  if (hist.length < 2 || !s?.woke) return;
  // RoR — бірюза
  ctx.strokeStyle = '#5EC4CC'; ctx.lineWidth = 2; ctx.beginPath();
  hist.forEach((p, i) => (i ? ctx.lineTo(x(p.t), r(Math.max(0, Math.min(rMax, p.ror)))) : ctx.moveTo(x(p.t), r(p.ror))));
  ctx.stroke();
  // температура зерна — полум'я
  const g = ctx.createLinearGradient(0, y(216), 0, y(200)); g.addColorStop(0, '#E8394A'); g.addColorStop(0.5, '#F28C28'); g.addColorStop(1, '#FFD39A');
  ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.beginPath();
  hist.forEach((p, i) => (i ? ctx.lineTo(x(p.t), y(Math.min(217.5, p.bt))) : ctx.moveTo(x(p.t), y(p.bt))));
  ctx.stroke();
  if (s?.over && s.over.kind !== 'baked') { const p = hist[hist.length - 1]; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x(p.t), y(Math.min(217.5, p.bt)), 4.5, 0, 7); ctx.fill(); }
}

// ---------- звуки ----------
let AC = null;
const ac = () => (AC ||= new (window.AudioContext || window.webkitAudioContext)());
function note(f0, f1, t, d, type = 'sawtooth', vol = 0.13, vib = 0) {
  const a = ac(), o = a.createOscillator(), g = a.createGain(), at = a.currentTime + t;
  o.type = type; o.frequency.setValueAtTime(f0, at); o.frequency.linearRampToValueAtTime(f1, at + d);
  if (vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 7; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(at); l.stop(at + d); }
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.03); g.gain.setValueAtTime(vol, at + d - 0.08); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
  o.connect(g).connect(a.destination); o.start(at); o.stop(at + d + 0.02);
}
// цирковий «тромбон-невдаха»: вау-вау-вау-ваааа
function sadTrombone() { try { note(392, 380, 0, 0.42); note(370, 356, 0.45, 0.42); note(349, 336, 0.9, 0.42); note(330, 262, 1.35, 1.2, 'sawtooth', 0.14, 9); } catch { /* без звуку */ } }
// перший крек: сухі «тріски» — короткі шумові клацання врозсип
// крек: сухі «тріски» врозсип. Тріщить безперервно від 200° до 220°: густо на початку, далі рідше
let popBuf = null, nextPop = 0;
function pop(a, t, loud) {
  if (!popBuf) {
    const len = Math.floor(a.sampleRate * 0.03); popBuf = a.createBuffer(1, len, a.sampleRate);
    const d = popBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
  }
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = popBuf; f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 2600; f.Q.value = 1.2;
  g.gain.value = loud * (0.35 + Math.random() * 0.65);
  src.connect(f).connect(g).connect(a.destination); src.start(t);
}
function crackle(bt) {
  if (bt < FC || bt > 220) return;
  try {
    const a = ac(), now = a.currentTime;
    if (nextPop < now) nextPop = now + 0.02;
    // густота: розгоняється на 200–203°, пік 203–208°, далі стихає до 220°
    const k = bt < 203 ? (bt - FC) / 3 : bt < 208 ? 1 : Math.max(0.25, 1 - (bt - 208) / 14);
    const rate = 1.5 + 9 * k, loud = 0.3 + 0.45 * k;     // тріск на секунду, гучність
    while (nextPop < now + 0.15) { pop(a, nextPop, loud); nextPop += (0.3 + Math.random() * 1.4) / rate; }
  } catch { /* без звуку */ }
}
function crack() { nextPop = 0; try { navigator.vibrate?.([12, 60, 12, 90, 12]); } catch { /* */ } }
function fanfare() { try { [523, 659, 784, 1047].forEach((f, i) => note(f, f, i * 0.12, i === 3 ? 0.5 : 0.14, 'triangle', 0.12)); } catch { /* */ } }

// ---------- екран ----------
const fmt = v => v.toFixed(1).replace('.', ',');
function paint() {
  $('bt').textContent = fmt(s.BT) + '°';
  $('ror').textContent = fmt(Math.max(0, s.RoR));
  [...$('gbar').children].forEach((el, i) => { el.classList.toggle('on', s.gas >= (i + 1) * 0.1 - 1e-6); el.classList.toggle('lo', i < LOW_GAS * 10); });
  $('gnum').textContent = Math.round(s.gas * 10);
  $('rg').classList.toggle('crash', s.crash);
  const drum = $('drum');
  drum.style.setProperty('--heat', Math.min(1, s.gasEff).toFixed(3));
  beansG.setAttribute('fill', beanColor(s.BT));
  beansG.setAttribute('transform', `rotate(${(Math.sin(s.t * 1.7) * 9).toFixed(1)} 100 100)`);
  drum.classList.toggle('hot', s.BT > 214);
  chart();
}
function say(t, cls = '') { const m = $('msg'); m.textContent = t; m.className = 'rg-msg ' + cls; }

function loop(now) {
  if (!s || s.over) return;
  const real = Math.min(0.1, (now - last) / 1000); last = now;
  // поки людина читає інструкцію — барабан «на паузі»; після — перемотка, ніби проспав
  if (!$('brief').hidden) { raf = requestAnimationFrame(loop); return; }
  acc += real * SPEED;
  while (acc >= DT && !s.over) {
    step(s, DT); acc -= DT;
    if (Math.round(s.t / DT) % 4 === 0) hist.push({ t: s.t, bt: s.BT, ror: s.RoR });
  }
  if (s.woke && !cracked && s.BT >= FC) { cracked = true; crack(); s.crackUntil = s.t + 8; } // крек — завжди з 200°
  if (s.woke && !s.over) crackle(s.BT);
  if (s.crash) say('Запіканка! Вогонь нижче 4 — RoR летить униз. Додай пальник!', 'crash');
  else if (s.low > 8) say('RoR падає — кава запікається. Додай вогню!', 'warn');
  else if (!s.ignited) say('Додай пальника!', 'cue');
  else if (s.noteUntil > s.t) { /* лишаємо «Поки читав…» */ }
  else if (s.crackUntil > s.t) say('Перший крек! Чуєш?', 'cue');
  else if (!s.note) say('');
  paint();
  if (s.over) return finish();
  raf = requestAnimationFrame(loop);
}

function act(a) {
  if (!s || s.over || !started) return;
  if (!s.ignited) { // перша команда — лише «+», одним натисканням пальник на 8
    if (a !== 'up') return;
    acts.push({ t: +s.t.toFixed(2), a: 'ignite' }); ignite(s);
    $('rg').classList.remove('wait'); $('brief').hidden = false; briefAt = Date.now(); $('briefOk').focus({ preventScroll: true });
    try { navigator.vibrate?.(25); } catch { /* */ }
    return;
  }
  acts.push({ t: +s.t.toFixed(2), a });
  if (a === 'up') gas(s, 1); else if (a === 'down') gas(s, -1); else { $('brief').hidden = true; unload(s); hist.push({ t: s.t, bt: s.BT, ror: s.RoR }); paint(); finish(); }
  try { navigator.vibrate?.(a === 'drop' ? 30 : 12); } catch { /* */ }
}

function finish() {
  cancelAnimationFrame(raf); started = false;
  const o = s.over, bt = fmt(o.BT) + '°';
  const black = o.kind === 'black' || (o.kind === 'over' && o.BT >= 214);
  $('smoke').classList.toggle('on', black);
  if (o.kind === 'baked' || black) sadTrombone(); else if (o.kind === 'win') fanfare();
  const R = {
    win: ['Влучив!', `${bt} — саме так вивантажує ростер. Ось що робить обсмаження смачним: вчасно.`],
    under: ['Недорозвиток', `${bt} — зарано. Зерно ще не дійшло: було б кисло й трав'янисто. Ціль — 212–212,5°.`],
    over: black ? ['Чорне зерно', `${bt} — вогонь мав інерцію, і зерно пішло далі. Скидай пальник за 4–6 секунд до цілі.`]
      : ['Перепал', `${bt} — трохи пізно. Вікно 212–212,5° пролітає за мить: готуйся раніше й скидай вогонь заздалегідь.`],
    black: ['Чорне зерно', `${fmt(BLACK)}° — момент вивантаження пролетів. Наступного разу тисни раніше.`],
    baked: ['Запіканка!', s.peak >= 0.6 ? 'Вогонь скинули нижче 4 — RoR провалився, і кава запеклась: пласка й порожня. Знижуй пальник плавно, не нижче 4.' : 'Вогню забракло — RoR провис, і кава запеклась. Додавай пальник раніше.'],
  }[o.kind];
  $('brief').hidden = true;
  const won = o.kind === 'win';
  LS.set('pl_roast_n', String(+(LS.get('pl_roast_n') || 0) + 1));
  if (won) { R[1] += ' Є −10% на замовлення! (У демо знижки немає.)'; LS.set('pl_roast_won', '1'); }
  else R[1] += triesLeft() ? ` Лишилось спроб: ${triesLeft()} — по одній на кожну пачку в замовленні.` : ' Спроби скінчились: одна пачка — одна обсмажка.';
  setTimeout(() => { showResult(R[0], R[1], won); }, black ? 1300 : 700);
}
// скільки пачок у замовленні — стільки спроб, доки не виб'єш −10% (демо: кошик у браузері; у справжній грі — сервер)
function packs() { try { return Math.max(1, (JSON.parse(localStorage.getItem('pl_cart')) || []).length); } catch { return 1; } }
const triesLeft = () => (LS.get('pl_roast_won') ? 0 : Math.max(0, packs() - +(LS.get('pl_roast_n') || 0)));
function showResult(title, text, won) {
  $('rTitle').textContent = title; $('rText').textContent = text;
  const left = triesLeft();
  $('offer').hidden = !!won;
  $('offerText').innerHTML = left ? `Ще спроб: <b>${left}</b>. Кожна пачка в замовленні — ще одна обсмажка.` : 'Хочеш ще спробу? Додай до замовлення <b>ще пачку</b> — і обсмаж знову.';
  $('pack').textContent = left ? 'Ще спроба' : 'Обрати пачку';
  $('pack').dataset.mode = left ? 'again' : 'feed';
  $('result').hidden = false; $('result').classList.toggle('win', !!won);
  (won ? $('again') : $('pack')).focus({ preventScroll: true });
}
function newGame() {
  const seed = (crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0; // у справжній грі seed видає сервер
  s = makeRoast(seed); acts = []; hist = [{ t: 0, bt: s.BT, ror: s.RoR }]; acc = 0; started = false;
  $('result').hidden = true; $('brief').hidden = true; $('smoke').classList.remove('on'); say('');
  const left = triesLeft(); cracked = false;
  forPrize = left > 0;
  $('rgPrize').textContent = forPrize ? `спроба на −10% · лишилось ${left} · демо` : (LS.get('pl_roast_won') ? '−10% виграно' : 'спроби скінчились');
  if (!forPrize) { // тренувань немає: одна пачка — одна обсмажка
    $('intro').hidden = true;
    showResult(LS.get('pl_roast_won') ? 'Знижку виграно' : 'Спроби скінчились',
      LS.get('pl_roast_won') ? 'Ти вже вивантажив вчасно — −10% твої.' : 'Одна пачка — одна обсмажка. Як у житті.', !!LS.get('pl_roast_won'));
    return;
  }
  beansG.style.visibility = 'hidden';
  paint();
  $('intro').hidden = false; $('go').textContent = 'Засипай зерно в барабан';
}
// засипали зерно — барабан крутиться, температура йде, світиться лише «+»
function charge() {
  $('intro').hidden = true; $('rg').classList.add('wait');
  beansG.style.visibility = ''; beansG.classList.remove('pour'); void beansG.getBBox(); beansG.classList.add('pour');
  start();
}
function start() {
  $('intro').hidden = true; started = true; last = performance.now();
  raf = requestAnimationFrame(loop);
}

// ---------- керування ----------
const press = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
// пальник: тап — крок 1, тримаєш — крутить далі
function hold(id, a) {
  const el = $(id); let tmr = 0;
  const stop = () => { clearTimeout(tmr); clearInterval(tmr); tmr = 0; };
  el.addEventListener('pointerdown', e => { e.preventDefault(); act(a); stop(); tmr = setTimeout(() => { tmr = setInterval(() => act(a), 110); }, 280); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => el.addEventListener(ev, stop));
}
hold('gUp', 'up');
hold('gDown', 'down');
press('drop', () => act('drop'));
$('go').addEventListener('click', () => { try { ac().resume(); } catch { /* */ } if (s && s.t > 0 && !s.over) start(); else charge(); });
// той самий тап по «+» не має закрити інструкцію, що з'явилась під пальцем
$('briefOk').addEventListener('click', () => {
  if (Date.now() - briefAt <= 450) return;
  $('brief').hidden = true;
  // поки читав — обсмажка йшла: продовжуємо з випадкової точки 180–206° (час не показуємо — просто ти вже тут)
  if (s && !s.over && !s.woke) {
    acts.push({ t: +s.t.toFixed(2), a: 'wake' }); wakeUp(s);
    hist = [{ t: s.t, bt: s.BT, ror: s.RoR }];
    say(`Поки читав — уже ${fmt(s.BT)}°! Діяй!`, 'warn'); s.noteUntil = s.t + 5;
    paint();
  }
});
const feedUrl = location.pathname.endsWith('.html') ? 'index.html' : '/';
const fromCart = new URLSearchParams(location.search).get('from') === 'cart';
if (fromCart) $('again').textContent = 'Повернутись до замовлення';
$('again').addEventListener('click', () => { if (fromCart) { try { sessionStorage.setItem('pl_back_cart', '1'); } catch { /* */ } } location.href = feedUrl; });
// ще одна пачка в замовленні — ще один шанс: ведемо в стрічку, кошик відкриє шанс (feed.js)
$('pack').addEventListener('click', () => { if ($('pack').dataset.mode === 'again') newGame(); else location.href = feedUrl; });
// демо: /roast?reset — почати спочатку (у справжній грі спроби рахує сервер за замовленням)
if (new URLSearchParams(location.search).has('reset')) ['pl_roast_n', 'pl_roast_won'].forEach(k => { try { localStorage.removeItem(k); } catch { /* */ } });
addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' || e.key === '+') act('up');
  else if (e.key === 'ArrowDown' || e.key === '-') act('down');
  else if (e.key === ' ' && started) { e.preventDefault(); act('drop'); }
});
addEventListener('resize', () => { fit(); if (s) chart(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && started && s && !s.over) { cancelAnimationFrame(raf); started = false; $('intro').hidden = false; $('go').textContent = 'Продовжити'; } });
fit(); newGame();

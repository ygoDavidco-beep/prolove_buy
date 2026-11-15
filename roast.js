// «Вивантаж вчасно»: барабан, графік і керування. Фізика — у roastgame.js (детермінована, згодом перевіряється сервером).
import { makeRoast, step, gas, ignite, unload, SPEED, WIN, BLACK, LOW_GAS } from './roastgame.js?v=mwi5dta9';

const $ = id => document.getElementById(id);
const DT = 0.05;                 // крок фізики, с обсмаження
let s = null, acts = [], hist = [], raf = 0, last = 0, acc = 0, started = false, forPrize = false;
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
const STOPS = [[203, [154, 106, 68]], [208, [128, 82, 50]], [212, [104, 63, 37]], [214.5, [62, 36, 22]], [217, [26, 16, 12]]];
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
  const tMax = Math.max(40, (s?.t || 0) + 8), y = v => T + (H - T - B) * (1 - (v - 199) / 19), r = v => T + (H - T - B) * (1 - v / 40), x = t => L + (W - L - R) * (t / tMax);
  ctx.clearRect(0, 0, W, H);
  // вікно вивантаження
  ctx.fillStyle = 'rgba(242,96,58,.22)'; ctx.fillRect(L, y(WIN[1]), W - L - R, y(WIN[0]) - y(WIN[1]));
  ctx.strokeStyle = 'rgba(242,140,40,.75)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
  [WIN[0], WIN[1]].forEach(v => { ctx.beginPath(); ctx.moveTo(L, y(v)); ctx.lineTo(W - R, y(v)); ctx.stroke(); });
  ctx.setLineDash([]);
  // осі
  ctx.fillStyle = 'rgba(246,240,235,.5)'; ctx.font = '11px Oswald, sans-serif'; ctx.textAlign = 'right';
  [200, 204, 208, 212, 216].forEach(v => ctx.fillText(v + '°', L - 5, y(v) + 4));
  ctx.fillStyle = 'rgba(94,196,204,.8)'; ctx.textAlign = 'left'; [10, 20, 30].forEach(v => ctx.fillText(v, W - R + 5, r(v) + 4));
  // легенда
  ctx.font = '11px Manrope, sans-serif'; ctx.fillStyle = '#F28C28'; ctx.fillText('— зерно, °C', L + 6, T + 12);
  ctx.fillStyle = '#5EC4CC'; ctx.fillText('— RoR, °/хв', L + 86, T + 12);
  if (hist.length < 2) return;
  // RoR — бірюза
  ctx.strokeStyle = '#5EC4CC'; ctx.lineWidth = 2; ctx.beginPath();
  hist.forEach((p, i) => (i ? ctx.lineTo(x(p.t), r(Math.max(0, Math.min(40, p.ror)))) : ctx.moveTo(x(p.t), r(p.ror))));
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
  acc += Math.min(0.1, (now - last) / 1000) * SPEED; last = now;
  while (acc >= DT && !s.over) {
    step(s, DT); acc -= DT;
    if (Math.round(s.t / DT) % 4 === 0) hist.push({ t: s.t, bt: s.BT, ror: s.RoR });
  }
  if (s.crash) say('Запіканка! Вогонь нижче 4 — RoR летить униз. Додай пальник!', 'crash');
  else if (s.low > 8) say('RoR падає — кава запікається. Додай вогню!', 'warn');
  else if (!s.ignited) say('Додай пальника!', 'cue');
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
    $('rg').classList.remove('wait'); $('brief').hidden = false; $('briefOk').focus({ preventScroll: true });
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
  if (forPrize && won) R[1] += ' Перша обсмажка — і в точку: −10% твої. (У демо знижки немає.)';
  else if (forPrize) R[1] += ' Знижка грала лише на першій обсмажці — як у житті, шанс один.';
  if (won && forPrize) LS.set('pl_roast_won', '1');
  // повторний шанс — за упаковку в замовленні (один раз)
  const offer = !won && !LS.get('pl_roast_won') && !LS.get('pl_roast_pack');
  setTimeout(() => {
    $('rTitle').textContent = R[0]; $('rText').textContent = R[1];
    $('offer').hidden = !offer;
    $('again').textContent = offer ? 'Просто потренуватись' : 'Ще раз';
    $('again').classList.toggle('ghost', offer);
    $('result').hidden = false; $('result').classList.toggle('win', won);
    (offer ? $('pack') : $('again')).focus({ preventScroll: true });
  }, black ? 1300 : 700);
  LS.set('pl_roast_n', String(+(LS.get('pl_roast_n') || 0) + 1));
}

function newGame() {
  const seed = (crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0; // у справжній грі seed видає сервер
  s = makeRoast(seed); acts = []; hist = [{ t: 0, bt: s.BT, ror: s.RoR }]; acc = 0; started = false;
  $('result').hidden = true; $('brief').hidden = true; $('smoke').classList.remove('on'); say('');
  const n = +(LS.get('pl_roast_n') || 0), bonus = LS.get('pl_roast_pack') === '1';
  forPrize = !LS.get('pl_roast_won') && (n === 0 || bonus);
  $('rgPrize').textContent = forPrize ? 'ця обсмажка — на −10% · демо' : 'тренування · знижка грає лише з першої спроби';
  beansG.style.visibility = 'hidden';
  paint();
  $('intro').hidden = false; $('go').textContent = 'Засипай зерно в барабан';
}
// засипали зерно — барабан крутиться, температура йде, світиться лише «+»
function charge() {
  if (forPrize && LS.get('pl_roast_pack') === '1') LS.set('pl_roast_pack', '2'); // повторний шанс використано
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
$('briefOk').addEventListener('click', () => { $('brief').hidden = true; });
$('again').addEventListener('click', newGame);
$('pack').addEventListener('click', () => { LS.set('pl_roast_pack', '1'); newGame(); }); // демо: у справжній грі — упаковка додається в кошик
addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' || e.key === '+') act('up');
  else if (e.key === 'ArrowDown' || e.key === '-') act('down');
  else if (e.key === ' ' && started) { e.preventDefault(); act('drop'); }
});
addEventListener('resize', () => { fit(); if (s) chart(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && started && s && !s.over) { cancelAnimationFrame(raf); started = false; $('intro').hidden = false; $('go').textContent = 'Продовжити'; } });
fit(); newGame();

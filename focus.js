// Режим фокусу: таймер на весь екран. Наступний крок видно заздалегідь — з відліком і лінійною мапою,
// щоб не читати й лити одночасно. За 3 с до кроку — короткі сигнали, на крок — подвійний сигнал і вібро. Екран не гасне.
import { fmt, beep, wake, timeline } from './tmr.js?v=mwi2mlww';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let el = null;

function tick1() { // короткий «тік» перед кроком
  try { navigator.vibrate?.(40); } catch { /* */ }
  try {
    const a = tick1.ctx ||= new AudioContext(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.frequency.value = 660; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.09);
  } catch { /* */ }
}

export function openFocus(recipe) {
  close();
  const steps = recipe.steps;
  // орієнтовні часи для мапи: tap-кроки — за est
  const when = i => steps[i].at ?? steps[i].est;
  const total = Math.max(...steps.map((s, i) => when(i))) + 15;
  const marks = steps.map((s, i) => ({ at: when(i), label: s.mk, approx: s.approx || s.at === undefined }));
  const screen = wake();
  let t0 = 0, run = false, timer = null, cur = -1, taps = [], warned = -1, pausedAt = 0;

  el = document.createElement('div');
  el.className = 'fx';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `Таймер: ${recipe.name}`);
  el.innerHTML = `<header class="fx-top"><div><b>${esc(recipe.name)}</b><small>${esc(recipe.params || '')}</small></div><button class="fx-x" type="button" aria-label="Закрити таймер">×</button></header>
    <div class="fx-clock" id="fxClock">0:00</div>
    <section class="fx-now" aria-live="assertive"><span class="fx-k">Зараз</span><p id="fxNow"></p><small id="fxNowS"></small></section>
    <section class="fx-next" id="fxNextBox"><span class="fx-k">Далі <b id="fxIn"></b></span><p id="fxNext"></p><i class="fx-bar"><i id="fxBar"></i></i></section>
    <div class="tl fx-tl" id="fxTl" aria-hidden="true"></div>
    <div class="fx-btns"><button class="btn fx-go" type="button" id="fxGo">Старт</button><button class="btn ghost" type="button" id="fxTap" hidden>Далі</button></div>`;
  document.body.appendChild(el);
  document.documentElement.classList.add('fx-on');
  const $ = id => el.querySelector('#' + id);

  const now = () => (run ? (Date.now() - t0) / 1000 : pausedAt);
  // фактичний час кроку з урахуванням «Далі»: після tap-кроку автоматичні кроки зсуваються
  // натиснутий tap-крок зсуває лише кроки ПІСЛЯ себе; сам він стоїть там, де його натиснули
  const shiftOf = i => { let o = 0; for (const tp of taps) if (tp.k < i) o = tp.off; return o; };
  const tapped = i => taps.find(tp => tp.k === i);
  const startOf = i => (steps[i].at !== undefined ? steps[i].at + shiftOf(i) : null);
  const markAt = i => (tapped(i) ? tapped(i).t : steps[i].at !== undefined ? steps[i].at + shiftOf(i) : steps[i].est + shiftOf(i));

  function paintStep() {
    const s = steps[cur];
    $('fxNow').textContent = s ? s.t : '';
    $('fxNowS').textContent = s ? s.s || '' : '';
  }
  function paintNext(t) {
    const n = steps[cur + 1];
    if (!n) { $('fxNextBox').hidden = true; $('fxTap').hidden = true; return; }
    $('fxNextBox').hidden = false;
    $('fxNext').textContent = n.t;
    if (n.at !== undefined) {
      const left = Math.max(0, startOf(cur + 1) - t), span = Math.max(1, startOf(cur + 1) - (cur >= 0 ? (startOf(cur) ?? stepStarted) : 0));
      $('fxIn').textContent = run ? `через ${fmt(Math.ceil(left))}` : 'на старті';
      $('fxBar').style.width = `${Math.min(100, 100 * (1 - left / span))}%`;
      $('fxNextBox').classList.toggle('soon', run && left <= 3);
      $('fxTap').hidden = true;
    } else {
      $('fxIn').textContent = n.hint || 'коли буде — тисни «Далі»';
      $('fxTap').textContent = n.btn || 'Далі';
      $('fxBar').style.width = '0%';
      $('fxNextBox').classList.remove('soon');
      $('fxTap').hidden = !run;
    }
  }
  let stepStarted = 0;
  function go(i) {
    cur = i; stepStarted = now(); paintStep();
    if (i > 0) beep(2);
    if (steps[i].end) finish();
  }
  function frame() {
    const t = now();
    $('fxClock').textContent = fmt(t);
    const shift = taps.length ? taps[taps.length - 1].off : 0;
    timeline($('fxTl'), marks.map((m, i) => ({ ...m, at: Math.max(0, markAt(i)), approx: m.approx && !tapped(i) })), t, total + Math.max(0, shift));
    let n = steps[cur + 1];
    // необов'язкова відмітка («шот пішов»): якщо не натиснули — наступний автокрок усе одно настає вчасно
    const n2 = steps[cur + 2];
    if (run && n && n.opt && n2 && n2.at !== undefined && startOf(cur + 2) <= t) { go(cur + 2); n = steps[cur + 1]; }
    if (run && n && n.at !== undefined) {
      const left = startOf(cur + 1) - t;
      if (left <= 3 && left > 0 && warned !== Math.ceil(left) + (cur + 1) * 10) { warned = Math.ceil(left) + (cur + 1) * 10; tick1(); }
      if (left <= 0) go(cur + 1);
    }
    paintNext(t);
  }
  function start() {
    el.classList.remove('idle');
    t0 = Date.now() - pausedAt * 1000; run = true; window.PL_BUSY = true; screen.on();
    if (cur < 0) go(0);
    timer = setInterval(frame, 200); frame();
    $('fxGo').textContent = 'Пауза';
  }
  function pause() {
    pausedAt = now(); run = false; clearInterval(timer); screen.off(); window.PL_BUSY = false;
    $('fxGo').textContent = 'Далі таймер'; frame();
  }
  function finish() {
    pausedAt = now(); run = false; clearInterval(timer); screen.off(); window.PL_BUSY = false;
    $('fxGo').textContent = 'Ще раз'; $('fxTap').hidden = true; $('fxNextBox').hidden = true;
    el.classList.add('done');
    $('fxClock').textContent = fmt(pausedAt);
  }
  function reset() { cur = -1; taps = []; pausedAt = 0; warned = -1; el.classList.remove('done'); idle(); }
  function idle() {
    el.classList.add('idle');
    $('fxNow').textContent = recipe.prep || 'Приготуй усе — і тисни «Старт».';
    $('fxNowS').textContent = '';
    paintNext(0); frame();
  }

  $('fxGo').onclick = () => {
    if (el.classList.contains('done')) { reset(); return; }
    if (run) pause(); else start();
  };
  $('fxTap').onclick = () => {
    const n = steps[cur + 1]; if (!n || n.at !== undefined) return;
    // фактичний час tap-кроку зсуває всі наступні автоматичні кроки
    taps.push({ k: cur + 1, t: now(), off: now() - (n.est ?? now()) });
    go(cur + 1); frame();
  };
  el.querySelector('.fx-x').onclick = () => history.state?.fx ? history.back() : close();
  el.addEventListener('keydown', e => { if (e.key === 'Escape') el.querySelector('.fx-x').click(); });
  history.pushState({ ...(history.state || {}), fx: 1 }, '');
  idle();
  if (recipe.autostart) start(); // еспресо: секундомір іде одразу, без окремого «Старт»
  el._stop = () => { clearInterval(timer); screen.off(); window.PL_BUSY = false; };
  $('fxGo').focus({ preventScroll: true });
}

export function close() {
  if (!el) return;
  el._stop?.(); el.remove(); el = null;
  document.documentElement.classList.remove('fx-on');
}
// «назад» на телефоні закриває таймер, а не сторінку
addEventListener('popstate', () => { if (el) close(); });

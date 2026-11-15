// Секундомір фільтра: порція з калькулятора → «Старт» → на кожне вливання обираєш, скільки грамів ллєш.
// Рекомендації: після вливання чекати 30 с на кожні 100 мл (цвітіння — не менше 30 с);
// ціль злива: до 300 мл — ~2 хв, далі 1 хв на кожні 100 мл (400 мл — 4 хв, 500 мл — 5 хв).
// У кінці — картка рецепту під скріншот (без брендування) зі своїми полями: помел, кава, температура…
import { fmt, beep, wake, timeline } from './tmr.js?v=mwhcppk4';

// вливання — проста сітка 10…200 г з кроком 10
const STEPS = Array.from({ length: 20 }, (_, i) => (i + 1) * 10);
const PRESETS = ['Кава', 'Помел', 'Температура', 'Пуровер', 'Вода', 'Смак'];
export const targetTime = W => (W <= 300 ? 120 : Math.round(W / 100 * 60));
export const waitAfter = (g, first) => Math.max(first ? 30 : 10, Math.round(g / 100 * 30));

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватний режим */ } },
};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const g1 = x => String(Math.round(x * 10) / 10).replace('.', ',');

const box = document.getElementById('ft');
const calc = document.querySelector('[data-calc]');
if (box && calc) {
  box.innerHTML = `
    <div class="ft-head"><h3>Секундомір фільтра</h3><p id="ftDose"></p></div>
    <div class="clock" id="ftClock">0:00</div>
    <div class="now" id="ftNow" aria-live="polite"></div>
    <div class="btns"><button class="btn" type="button" id="ftGo">Старт</button><button class="btn ghost" type="button" id="ftDone" hidden>Злилось</button></div>
    <div class="ft-pick" id="ftPick" hidden></div>
    <div class="tl" id="ftTl" aria-hidden="true"></div>`;
  const cardBox = document.getElementById('rcWrap');
  const $ = id => document.getElementById(id);
  const screen = wake();
  let v = calc._v || { coffee: 15, water: 250, cup: 225 }, t0 = 0, tick = null, pours = [], doneAt = null, rec = null, called = false, nagged = false;
  const el = () => (tick ? (Date.now() - t0) / 1000 : doneAt ?? 0);
  const poured = () => pours.reduce((a, p) => a + p.g, 0);
  const left = () => Math.round(v.water) - poured();
  const T = () => targetTime(v.water);
  const say = (t, s, cls = '') => { $('ftNow').className = 'now ' + cls; $('ftNow').innerHTML = `${t}${s ? `<small>${s}</small>` : ''}`; };
  const dose = () => { $('ftDose').textContent = `кава ${g1(v.coffee)} г · вода ${Math.round(v.water)} мл · ціль злити за ~${fmt(T())}`; };
  calc.addEventListener('calc', e => { v = e.detail; dose(); if (!tick && doneAt == null) { idle(); draw(); } });

  function marks() {
    const m = pours.map(p => ({ at: p.at, label: `+${p.g}` }));
    if (tick && rec != null && left() > 5) m.push({ at: rec, label: 'далі', rec: true, approx: true });
    if (doneAt == null) m.push({ at: T(), label: 'ціль', rec: true, approx: true });
    else m.push({ at: doneAt, label: 'злилось' });
    return m;
  }
  const draw = () => timeline($('ftTl'), marks(), el(), Math.max(T() + 25, el() + 20, (rec ?? 0) + 15));

  function picker() {
    const rest = left();
    if (rest <= 5) { $('ftPick').hidden = true; return; }
    $('ftPick').hidden = false;
    $('ftPick').innerHTML = `<p>${pours.length ? `Вливання ${pours.length + 1}: скільки грамів ллєш?` : 'Перше вливання (цвітіння): скільки грамів ллєш?'} <span>лишилось ${rest} мл</span></p>` +
      `<div class="ft-grid">${STEPS.map(g => `<button type="button" class="chip" data-g="${g}"${g > rest + 5 ? ' disabled' : ''}>${g}</button>`).join('')}</div>`;
  }
  function idle() {
    say('Змели каву, промий фільтр гарячою водою.', 'Насип каву, розрівняй, ваги на нуль. «Старт» — разом із першим вливанням.');
  }
  function pour(g) {
    const at = el(), first = !pours.length;
    pours.push({ at, g }); rec = at + waitAfter(g, first); called = false; nagged = false;
    $('ftDone').hidden = false;
    const rest = left();
    if (rest <= 5) say(`+${g} г — уся вода (${poured()} г).`, `Чекай, поки зійде, і тисни «Злилось». Ціль — ~${fmt(T())}.`);
    else if (first) say(`+${g} г. Стоп.`, `Цвітіння: дивись, як росте квітка з CO₂, і понюхай. Наступне — о ~${fmt(rec)}.`);
    else say(`+${g} г, разом ${poured()} г.`, `Чекай. Наступне — о ~${fmt(rec)} (30 с на кожні 100 мл).`);
    picker(); draw();
  }
  function frame() {
    const s = el();
    $('ftClock').textContent = fmt(s);
    draw();
    if (!pours.length || left() <= 5 || rec == null) return;
    if (!called && s >= rec) { called = true; beep(2); say('Час! Наступне вливання.', `Лишилось ${left()} мл — обери, скільки ллєш.`, 'go'); }
    else if (!nagged && s >= rec + 20) { nagged = true; beep(2); say('Не дай пересохнути!', 'Кава має бути під водою — лий наступне.', 'nag'); }
  }
  function verdict(t) {
    const tg = T(), tol = Math.max(20, tg * 0.15);
    if (t < tg - tol) return [`Злилось за ${fmt(t)} — швидше за ціль ~${fmt(tg)}.`, 'Вода холодна або помел завеликий: нагрій сильніше або змели дрібніше.'];
    if (t <= tg + tol) return [`Злилось за ${fmt(t)} — у цілі (~${fmt(tg)}).`, 'Скуштуй — і збережи рецепт нижче.'];
    return [`Злилось за ${fmt(t)} — довше за ціль ~${fmt(tg)}.`, 'Якщо смак важкий чи гіркий, наступного разу змели трохи крупніше.'];
  }
  function finish() {
    doneAt = el(); clearInterval(tick); tick = null; screen.off(); beep(); window.PL_BUSY = false;
    $('ftClock').textContent = fmt(doneAt); $('ftPick').hidden = true; $('ftDone').hidden = true;
    say(...verdict(doneAt));
    $('ftGo').textContent = 'Ще раз';
    draw(); card.open({ coffee: v.coffee, water: v.water, cup: v.cup, pours: pours.slice(), done: doneAt, target: T() });
  }
  function reset() {
    clearInterval(tick); tick = null; screen.off(); window.PL_BUSY = false;
    pours = []; doneAt = null; rec = null; $('ftClock').textContent = '0:00'; $('ftPick').hidden = true; $('ftDone').hidden = true;
    $('ftGo').textContent = 'Старт'; idle(); draw(); card.close();
  }
  $('ftGo').addEventListener('click', () => {
    if (tick) return reset();
    if (doneAt != null) reset();
    t0 = Date.now(); tick = setInterval(frame, 250); screen.on(); window.PL_BUSY = true;
    $('ftGo').textContent = 'Скинути';
    say('Лий перше вливання — цвітіння.', 'Обери нижче, скільки грамів: зазвичай удвічі-втричі більше, ніж кави.');
    picker(); frame();
  });
  $('ftPick').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b && !b.disabled && tick) pour(+b.dataset.g); });
  $('ftDone').addEventListener('click', () => { if (tick) finish(); });

  // ---------- картка рецепту ----------
  const card = (() => {
    let r = null;
    let fields = store.get('pl_rc_fields', [{ k: 'Кава', v: '' }, { k: 'Помел', v: '' }, { k: 'Температура', v: '' }]);
    const save = () => store.set('pl_rc_fields', fields);
    const date = () => new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
    function editor() {
      const used = new Set(fields.map(f => f.k.trim().toLowerCase()));
      $('rcFields').innerHTML = fields.map((f, i) => `<div class="rc-in" data-i="${i}">
          <input class="k" value="${esc(f.k)}" maxlength="24" aria-label="Назва поля" placeholder="Поле">
          <input class="v" value="${esc(f.v)}" maxlength="60" aria-label="Значення" placeholder="${esc(f.k === 'Помел' ? '43 кліки' : f.k === 'Температура' ? '95°' : f.k === 'Кава' ? 'Колумбія Нариньо' : 'значення')}">
          <button type="button" class="x" aria-label="Прибрати поле">×</button></div>`).join('');
      $('rcAdd').innerHTML = PRESETS.filter(p => !used.has(p.toLowerCase())).map(p => `<button type="button" class="chip" data-add="${p}">+ ${p}</button>`).join('') +
        '<button type="button" class="chip" data-add="">+ Своє поле</button>';
    }
    function preview() {
      if (!r) return;
      const filled = fields.filter(f => f.k.trim() && f.v.trim());
      let cum = 0;
      $('rcCard').innerHTML = `
        <div class="rc-top"><b>Фільтр</b><span>${esc(date())}</span></div>
        <div class="rc-big">${g1(r.coffee)} г <i>→</i> ${Math.round(r.water)} мл</div>
        <div class="rc-sub">1 : ${g1(r.water / r.coffee)} · у чашці ~${Math.round(r.water * 0.9)} мл</div>
        ${filled.length ? `<dl class="rc-f">${filled.map(f => `<dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd>`).join('')}</dl>` : ''}
        <div class="rc-pours">${r.pours.map((p, i) => { cum += p.g; return `<span>${fmt(p.at)}</span><b>+${p.g} г</b><em>${i ? `${cum} г` : 'цвітіння'}</em>`; }).join('')}</div>
        <div class="tl" id="rcTl"></div>
        <div class="rc-end"><b>Злилось ${fmt(r.done)}</b><span>ціль ~${fmt(r.target)}</span></div>`;
      timeline($('rcTl'), [...r.pours.map(p => ({ at: p.at, label: `+${p.g}` })), { at: r.done, label: 'злив' }], r.done, Math.max(r.done, r.target) + 10);
    }
    cardBox.addEventListener('input', e => {
      const row = e.target.closest('.rc-in'); if (!row) return;
      const f = fields[+row.dataset.i]; f[e.target.classList.contains('k') ? 'k' : 'v'] = e.target.value; save(); preview();
    });
    cardBox.addEventListener('click', e => {
      const x = e.target.closest('.x'); if (x) { fields.splice(+x.closest('.rc-in').dataset.i, 1); save(); editor(); preview(); return; }
      const a = e.target.closest('[data-add]');
      if (a) { fields.push({ k: a.dataset.add, v: '' }); save(); editor(); preview(); cardBox.querySelector(`.rc-in[data-i="${fields.length - 1}"] input.${a.dataset.add ? 'v' : 'k'}`)?.focus(); }
    });
    $('rcSave').addEventListener('click', () => savePng());

    // картинка 1080×1350 (4:5, як пост) — малюємо прямо в canvas, без бібліотек
    async function savePng() {
      if (!r) return;
      try { await Promise.all(['500 60px Oswald', '700 30px Manrope', '400 40px Pangolin'].map(f => document.fonts.load(f))); } catch { /* шрифти за замовчуванням */ }
      const filled = fields.filter(f => f.k.trim() && f.v.trim());
      const need = 480 + filled.length * 78 + 80 + r.pours.length * 62 + 140; // де закінчується вміст
      const H = Math.max(1350, need + 120);
      const c = document.createElement('canvas'); c.width = 1080; c.height = H;
      const x = c.getContext('2d');
      const INK = '#141014', BERRY = '#B5123E', MUTED = '#5B4E52', SHEET = '#F6F2E8', PAPER = '#E6E1D5', GOLD = '#F2B33D';
      x.fillStyle = PAPER; x.fillRect(0, 0, 1080, H);
      x.fillStyle = INK; x.fillRect(74, 74, 960, H - 130);
      x.fillStyle = SHEET; x.fillRect(56, 56, 960, H - 130);
      x.lineWidth = 6; x.strokeStyle = INK; x.strokeRect(56, 56, 960, H - 130);
      const L = 110, R = 960;
      x.textBaseline = 'alphabetic';
      x.fillStyle = INK; x.font = '500 96px Oswald, sans-serif'; x.fillText('ФІЛЬТР', L, 190);
      x.fillStyle = MUTED; x.font = '400 38px Pangolin, cursive'; x.textAlign = 'right'; x.fillText(date(), R, 180); x.textAlign = 'left';
      x.fillStyle = INK; x.font = '500 112px Oswald, sans-serif';
      const a = `${g1(r.coffee)} г `, b = `${Math.round(r.water)} мл`;
      x.fillText(a, L, 340); let w = x.measureText(a).width;
      x.fillStyle = BERRY; x.fillText('→ ', L + w, 340); w += x.measureText('→ ').width;
      x.fillStyle = INK; x.fillText(b, L + w, 340);
      x.fillStyle = MUTED; x.font = '700 36px Manrope, sans-serif'; x.fillText(`1 : ${g1(r.water / r.coffee)} · у чашці ~${Math.round(r.water * 0.9)} мл`, L, 400);
      let y = 480;
      for (const f of filled) {
        x.fillStyle = MUTED; x.font = '800 28px Manrope, sans-serif'; x.fillText(f.k.toUpperCase(), L, y);
        x.fillStyle = INK; x.font = '400 46px Pangolin, cursive';
        let val = f.v; while (x.measureText(val).width > R - 420 && val.length > 3) val = val.slice(0, -2) + '…';
        x.fillText(val, 420, y + 4); y += 78;
      }
      y += 10; x.fillStyle = INK; x.fillRect(L, y, R - L, 4); y += 70;
      let cum = 0;
      r.pours.forEach((p, i) => {
        cum += p.g;
        x.font = '500 48px Oswald, sans-serif'; x.fillStyle = MUTED; x.fillText(fmt(p.at), L, y);
        x.fillStyle = INK; x.fillText(`+${p.g} г`, 300, y);
        x.font = '400 38px Pangolin, cursive'; x.fillStyle = BERRY; x.textAlign = 'right'; x.fillText(i ? `${cum} г` : 'цвітіння', R, y); x.textAlign = 'left';
        y += 62;
      });
      // смужка часу
      y += 20; const tot = Math.max(r.done, r.target) + 10, X = s => L + (R - L) * Math.min(1, s / tot);
      x.lineWidth = 5; x.strokeStyle = INK; x.fillStyle = SHEET; x.beginPath(); x.roundRect(L, y, R - L, 22, 10); x.fill(); x.stroke();
      x.fillStyle = BERRY; x.beginPath(); x.roundRect(L + 4, y + 4, X(r.done) - L - 8, 14, 6); x.fill();
      for (const p of r.pours) { x.fillStyle = INK; x.fillRect(X(p.at) - 3, y - 12, 6, 46); }
      x.strokeStyle = INK; x.setLineDash([10, 8]); x.beginPath(); x.moveTo(X(r.target), y - 16); x.lineTo(X(r.target), y + 38); x.stroke(); x.setLineDash([]);
      x.fillStyle = GOLD; x.beginPath(); x.arc(X(r.done), y + 11, 16, 0, 7); x.fill(); x.stroke();
      y = Math.max(y + 120, H - 150); // підсумок притиснутий до низу картки
      x.fillStyle = INK; x.font = '500 76px Oswald, sans-serif'; x.fillText(`ЗЛИЛОСЬ ${fmt(r.done)}`, L, y);
      x.fillStyle = MUTED; x.font = '400 40px Pangolin, cursive'; x.textAlign = 'right'; x.fillText(`ціль ~${fmt(r.target)}`, R, y); x.textAlign = 'left';
      const blob = await new Promise(res => c.toBlob(res, 'image/png'));
      const file = new File([blob], `recept-${new Date().toISOString().slice(0, 10)}.png`, { type: 'image/png' });
      try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; } } catch { /* скасовано — збережемо файлом */ }
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = file.name; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    }
    return {
      open(recipe) { r = recipe; cardBox.hidden = false; editor(); preview(); },
      close() { r = null; cardBox.hidden = true; },
    };
  })();

  dose(); idle(); draw();
}

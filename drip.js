import { fmt, beep, wake, timeline } from './tmr.js?v=mwijrags';
// DRIP-комікс: лінійні ілюстрації (як на етикетці дріпа) + таймер з підказками.
const INK = '#141014', BERRY = '#B5123E', WATER = '#3FA9BE', COFFEE = '#4A1820', GOLD = '#F2B33D';
const svg = (vb, body, label = '') => `<svg viewBox="${vb}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><g stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none">${body}</g></svg>`;
const sfx = (x, y, t, size = 34, rot = -8, cls = '') => `<text class="sfx ${cls}" x="${x}" y="${y}" font-size="${size}" transform="rotate(${rot} ${x} ${y})" stroke-width="5">${t}</text>`;
const lbl = (x, y, t, size = 16, anchor = 'middle') => `<text class="lbl" x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" stroke="none">${t}</text>`;

// ---------- деталі ----------
function cup(cx, top, w = 120, h = 82, { coffee = false } = {}) {
  const r = w / 2, ry = w * 0.08;
  return {
    back: `<ellipse cx="${cx}" cy="${top}" rx="${r}" ry="${ry}" fill="#F6F2E8"/>${coffee ? `<ellipse cx="${cx}" cy="${top + 2}" rx="${r - 6}" ry="${ry - 2}" fill="${COFFEE}" stroke="none"/>` : ''}`,
    front: `<path d="M${cx - r} ${top} L${cx - r + 8} ${top + h - 10} Q${cx - r + 10} ${top + h} ${cx - r + 20} ${top + h} L${cx + r - 20} ${top + h} Q${cx + r - 10} ${top + h} ${cx + r - 8} ${top + h - 10} L${cx + r} ${top} Z" fill="#F6F2E8" stroke="none"/>
      <path d="M${cx - r} ${top} L${cx - r + 8} ${top + h - 10} Q${cx - r + 10} ${top + h} ${cx - r + 20} ${top + h} L${cx + r - 20} ${top + h} Q${cx + r - 10} ${top + h} ${cx + r - 8} ${top + h - 10} L${cx + r} ${top}"/>
      <path d="M${cx - r} ${top} A${r} ${ry} 0 0 0 ${cx + r} ${top}"/>
      <path d="M${cx + r - 3} ${top + h * 0.2} C${cx + r + 32} ${top + h * 0.12} ${cx + r + 34} ${top + h * 0.78} ${cx + r - 7} ${top + h * 0.7}"/>
      <path d="M${cx - r + 14} ${top + h * 0.45} q4 -10 10 -14" stroke="${BERRY}" stroke-width="2.5"/>`,
  };
}
function drip(cx, rim, { water = 0, ears = true, grounds = true } = {}) {
  const pouch = `<path d="M${cx - 28} ${rim + 12} L${cx - 28} ${rim - 58} Q${cx - 28} ${rim - 64} ${cx - 22} ${rim - 64} L${cx + 22} ${rim - 64} Q${cx + 28} ${rim - 64} ${cx + 28} ${rim - 58} L${cx + 28} ${rim + 12}" fill="#F6F2E8"/>
    <ellipse cx="${cx}" cy="${rim - 62}" rx="26" ry="6" fill="#F6F2E8"/>
    ${grounds ? `<ellipse cx="${cx}" cy="${rim - 61}" rx="21" ry="4" fill="${water ? WATER : COFFEE}" stroke="none"/>` : ''}
    <path d="M${cx - 10} ${rim - 54} L${cx - 10} ${rim + 4}" stroke-width="1.6"/><path d="M${cx + 10} ${rim - 54} L${cx + 10} ${rim + 4}" stroke-width="1.6"/>`;
  const ear = s => `<path d="M${cx + s * 28} ${rim - 40} L${cx + s * 62} ${rim - 22} L${cx + s * 62} ${rim + 20} L${cx + s * 50} ${rim + 20} L${cx + s * 50} ${rim - 6} L${cx + s * 28} ${rim - 18} Z" fill="#F6F2E8"/><path d="M${cx + s * 54} ${rim - 10} L${cx + s * 54} ${rim + 14}" stroke-width="1.6"/>`;
  return { pouch, ears: ears ? ear(-1) + ear(1) : '' };
}
function dripOnCup(cx, rim, opts = {}) {
  const c = cup(cx, rim, 124, 84, opts), d = drip(cx, rim, opts);
  return c.back + d.pouch + c.front + d.ears;
}
function kettle(x, y, { pour = null, temp = '' } = {}) {
  const tip = [x - 86, y - 34];
  return `<path d="M${x - 30} ${y + 20} C${x - 62} ${y + 18} ${x - 58} ${y - 28} ${tip[0]} ${tip[1]}" stroke-width="5"/>
    <path d="M${x - 36} ${y + 34} L${x + 36} ${y + 34} L${x + 29} ${y - 16} Q${x} ${y - 30} ${x - 29} ${y - 16} Z" fill="#F6F2E8"/>
    <path d="M${x - 18} ${y - 22} Q${x} ${y - 34} ${x + 18} ${y - 22}"/><circle cx="${x}" cy="${y - 32}" r="4" fill="${INK}"/>
    <path d="M${x + 31} ${y - 8} C${x + 62} ${y - 12} ${x + 62} ${y + 28} ${x + 33} ${y + 26}" stroke-width="5"/>
    ${temp ? `<circle cx="${x}" cy="${y + 10}" r="13" fill="#F6F2E8"/><text class="dsp" x="${x}" y="${y + 15}" font-size="12" text-anchor="middle" stroke="none" fill="${BERRY}">${temp}</text>` : ''}
    ${pour ? `<path class="flow" d="M${tip[0] - 2} ${tip[1] + 3} Q${tip[0] - 8} ${tip[1] + 26} ${pour[0]} ${pour[1]}" stroke="${WATER}" stroke-width="5"/>` : ''}`;
}
function scale(cx, top, w, text) {
  return `<rect x="${cx - w / 2}" y="${top}" width="${w}" height="30" rx="7" fill="#F6F2E8"/>
    <rect x="${cx - 30}" y="${top + 7}" width="60" height="17" rx="3" fill="${INK}"/>
    <text class="dsp" x="${cx}" y="${top + 21}" font-size="14" text-anchor="middle" stroke="none">${text}</text>`;
}
function stopwatch(cx, cy, r, angle = 0, text = '') {
  const a = (angle - 90) * Math.PI / 180;
  return `<rect x="${cx - 5}" y="${cy - r - 10}" width="10" height="8" rx="2" fill="#F6F2E8"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#F6F2E8"/>
    ${[0, 90, 180, 270].map(d => { const b = (d - 90) * Math.PI / 180; return `<path d="M${cx + Math.cos(b) * (r - 6)} ${cy + Math.sin(b) * (r - 6)} L${cx + Math.cos(b) * (r - 2)} ${cy + Math.sin(b) * (r - 2)}" stroke-width="2"/>`; }).join('')}
    <path d="M${cx} ${cy} L${cx + Math.cos(a) * (r - 8)} ${cy + Math.sin(a) * (r - 8)}" stroke="${BERRY}"/><circle cx="${cx}" cy="${cy}" r="3" fill="${INK}"/>
    ${text ? lbl(cx, cy + r + 20, text, 15) : ''}`;
}
function thermo(x, y, h, fill, text) {
  return `<rect x="${x - 7}" y="${y}" width="14" height="${h}" rx="7" fill="#F6F2E8"/><circle cx="${x}" cy="${y + h + 6}" r="12" fill="${BERRY}"/>
    <rect x="${x - 3}" y="${y + h * (1 - fill)}" width="6" height="${h * fill + 4}" fill="${BERRY}" stroke="none"/>
    ${[0.2, 0.4, 0.6, 0.8].map(t => `<path d="M${x + 7} ${y + h * t} l6 0" stroke-width="2"/>`).join('')}
    ${text ? lbl(x + 20, y + 14, text, 17, 'start') : ''}`;
}
function pack(cx, cy, { open = false, small = false } = {}) {
  const w = small ? 34 : 92, h = small ? 46 : 128, x = cx - w / 2, y = cy - h / 2;
  return `<path d="M${x} ${y + (open ? 10 : 0)} L${x} ${y + h} L${x + w} ${y + h} L${x + w} ${y + (open ? 10 : 0)}" fill="#F6F2E8"/>
    ${open ? `<path d="M${x} ${y + 10} L${x + w} ${y + 10}" stroke-dasharray="5 5" stroke-width="2"/><path d="M${x + w * 0.45} ${y + 10} Q${x + w * 0.7} ${y - 28} ${x + w + 14} ${y - 18} L${x + w} ${y + 10}" fill="#F6F2E8"/>`
      : `<path d="M${x} ${y} L${x + w} ${y}"/><path d="M${x} ${y + h * 0.1} L${x + w} ${y + h * 0.1}" stroke-dasharray="5 5" stroke-width="2"/><path d="M${x + w} ${y + h * 0.1 - 5} l-6 5 l6 5" stroke="${BERRY}"/>`}
    ${small ? '' : `<path d="M${cx} ${cy - 6} c-12 10 -14 22 0 30 c14 -8 12 -22 0 -30z" fill="${BERRY}" stroke="none"/><text x="${cx}" y="${cy + 46}" font-family="Oswald,sans-serif" font-size="15" text-anchor="middle" fill="${INK}" stroke="none">PROLOVE</text>`}`;
}
const bubbles = (x, y) => [[0, 0, 5], [12, -10, 3.5], [-10, -14, 4], [4, -24, 2.5]].map(([a, b, r]) => `<circle cx="${x + a}" cy="${y + b}" r="${r}" fill="#F6F2E8" stroke-width="2"/>`).join('');
const steam = (x, y) => `<g class="steam"><path d="M${x} ${y} q-8 -10 0 -20 q8 -10 0 -20" stroke-width="2.5" stroke="${WATER}"/><path d="M${x + 16} ${y + 4} q-8 -10 0 -20 q8 -10 0 -20" stroke-width="2.5" stroke="${WATER}"/></g>`;
const swirl = (cx, cy) => `<path d="M${cx - 50} ${cy} A50 14 0 1 0 ${cx + 40} ${cy - 10}" stroke="${BERRY}" stroke-width="3.5"/><path d="M${cx + 40} ${cy - 10} l-2 -12 m2 12 l-12 2" stroke="${BERRY}" stroke-width="3.5"/>`;
const levelMark = (x, y1, y2, t, side = 1) => `<path d="M${x} ${y1} L${x} ${y2} M${x - 5} ${y1} L${x + 5} ${y1} M${x - 5} ${y2} L${x + 5} ${y2}" stroke="${BERRY}" stroke-width="2.5"/>${lbl(x + side * 8, (y1 + y2) / 2 + 5, t, 15, side > 0 ? 'start' : 'end')}`;

// ---------- кадри ----------
const ART = {
  open: () => svg('0 0 320 240', `${pack(130, 130, { open: true })}
    <path d="M214 74 L268 62 L271 72 L217 84 Z" fill="#F6F2E8" stroke-width="2.5"/>${lbl(242, 100, 'засічка', 14)}
    ${sfx(206, 54, 'ШУРХ!', 38, -10)}${lbl(250, 196, '12 г кави', 18)}${lbl(250, 216, '+ азот', 15)}`, 'Відкритий пакет дріпа'),
  ears: () => { const c = cup(160, 150, 124, 70), d = drip(160, 150);
    return svg('0 0 320 240', `${c.back}${d.pouch}${c.front}${d.ears}
      <path d="M96 106 l-26 -18 M224 106 l26 -18" stroke="${BERRY}" stroke-width="3"/><path d="M70 88 l2 12 m-2 -12 l12 0 M250 88 l-2 12 m2 -12 l-12 0" stroke="${BERRY}" stroke-width="3"/>
      ${lbl(160, 40, 'OPEN', 18)}<path d="M128 46 l64 0" stroke-dasharray="5 5" stroke-width="2"/>${sfx(28, 60, 'КЛАЦ!', 30, -12)}`, 'Фільтр з вушками на чашці'); },
  water: () => svg('0 0 320 240', `${kettle(150, 150, { temp: '96°' })}${steam(70, 92)}${thermo(256, 70, 96, 0.82, '')}
    ${lbl(256, 205, '95–98°C', 18)}${sfx(26, 214, 'БУЛЬ!', 30, -6, 'b')}`, 'Чайник і термометр 95–98 градусів'),
  scale: () => svg('0 0 320 240', `${dripOnCup(140, 104)}${scale(146, 198, 196, '0.0 g')}
    ${stopwatch(268, 96, 30, 0, 'старт!')}${sfx(212, 40, 'ПІП!', 30, 8)}`, 'Чашка з дріпом на вагах, секундомір'),
  pour1: () => svg('0 0 320 240', `${dripOnCup(118, 112, { water: 1 })}${kettle(262, 74, { pour: [126, 50] })}
    ${bubbles(104, 42)}${scale(124, 200, 180, '40 g')}${stopwatch(272, 170, 22, 120, '')}${lbl(272, 214, '30–40 с', 15)}${sfx(196, 140, 'ПШШШ…', 28, -6)}`, 'Перше вливання 40 грамів, дегазація'),
  pour2: () => svg('0 0 320 240', `${dripOnCup(118, 112, { water: 1 })}${kettle(262, 74, { pour: [126, 50] })}
    ${levelMark(50, 50, 62, '~1 см', -1)}${scale(124, 200, 180, '100 g')}${sfx(214, 170, '+60 г', 32, -4, 'b')}`, 'Друге вливання до верху фільтра'),
  pour3: () => svg('0 0 320 240', `${dripOnCup(118, 112, { water: 1 })}${kettle(262, 74, { pour: [126, 50] })}
    ${scale(124, 200, 180, '200 g')}${sfx(204, 168, '200 г', 32, -4)}${sfx(34, 36, 'КАП-КАП', 24, -8, 'b')}`, 'Третє вливання до 190–200 грамів'),
  foam: () => {
    // вигляд згори: піна в дріпі при гарячій і при холодній воді
    let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const bubbles = (cx, n, rMin, rMax, fill, stroke) => Array.from({ length: n }, () => {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()), x = cx + Math.cos(a) * d * 100, y = 100 + Math.sin(a) * d * 52, r = rMin + rnd() * (rMax - rMin);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${stroke === 'none' ? 0 : 2}"/>`;
    }).join('');
    const bowl = (cx, fill) => `<ellipse cx="${cx}" cy="100" rx="122" ry="70" fill="#F6F2E8"/><ellipse cx="${cx}" cy="100" rx="110" ry="60" fill="${fill}" stroke="none"/>`;
    return svg('0 0 640 230', `${bowl(160, '#9A5A34')}${bubbles(160, 90, 1.5, 4.5, '#D9A46E', 'none')}<ellipse cx="160" cy="100" rx="122" ry="70" fill="none"/>
      ${bowl(480, '#F4EFE9')}${bubbles(480, 26, 7, 17, '#fff', '#B9AEA6')}<ellipse cx="480" cy="100" rx="122" ry="70" fill="none"/>
      ${lbl(160, 212, 'гаряча вода', 30)}${lbl(480, 212, 'холодна вода', 30)}
      ${sfx(52, 36, 'ТАК!', 30, -8, 'b')}${sfx(468, 34, 'ХОЛОДНА!', 26, 6)}`, 'Порівняння піни: гаряча вода дає коричневу дрібну піну, холодна — білу з великими бульбашками'); },
  dry: () => svg('0 0 320 240', `${dripOnCup(150, 120, { water: 0 })}${sfx(40, 56, 'СОХНЕ!', 32, -8)}`, 'Кава у фільтрі без води підсихає'),
  short: () => svg('0 0 320 240', `${dripOnCup(118, 112, { water: 1 })}${kettle(262, 74, { pour: [126, 50] })}${sfx(14, 228, 'ЧАСТО Й ПОТРОХУ', 22, -3, 'b')}`, 'Короткі часті вливання'),
  done: () => { const c = cup(124, 128, 140, 86, { coffee: true });
    return svg('0 0 320 240', `${c.back}${c.front}${swirl(124, 128)}${steam(112, 106)}
      <g transform="translate(250 108) rotate(20) scale(.62) translate(-250 -108)">${drip(250, 150).pouch}${drip(250, 150).ears}</g>${sfx(34, 50, 'ВЖУХ!', 34, -6, 'b')}`, 'Готова кава, перемішування'); },
  kit: () => svg('0 0 640 200', `${pack(70, 92, { small: false })}${lbl(70, 186, 'DRIP', 17)}
    <rect x="170" y="44" width="62" height="104" rx="12" fill="#F6F2E8"/><rect x="164" y="34" width="74" height="16" rx="6" fill="#F6F2E8"/><path d="M178 80 l46 0" stroke="${BERRY}"/>${lbl(201, 186, 'термочашка', 17)}
    ${kettle(352, 104, { temp: '96°' })}${lbl(330, 186, 'вода 95–98°C', 17)}
    ${stopwatch(468, 98, 36, 210)}${lbl(468, 186, 'секундомір', 17)}
    <path d="M570 46 q14 0 14 22 q0 18 -14 20 q-14 -2 -14 -20 q0 -22 14 -22z" fill="#F6F2E8"/><path d="M570 88 l0 70" stroke-width="5"/>${lbl(574, 186, 'ложка', 17)}`, 'Що взяти в дорогу'),
  levels: () => {
    const steps = [[0.5, '½ фільтра', '30–40 с'], [1, 'до верху', 'до ~1 см'], [1, 'знову до верху', 'до ~1 см'], [0.22, 'ще ~1 см', 'стекти']];
    return svg('0 0 640 240', steps.map(([lv, t1, t2], i) => {
      const cx = 86 + i * 156, top = 40, bot = 170, wy = bot - (bot - top) * lv;
      return `<path d="M${cx - 44} ${top} L${cx - 30} ${bot} L${cx + 30} ${bot} L${cx + 44} ${top}" fill="#F6F2E8"/>
        <path d="M${cx - 44 + (wy - top) * 14 / (bot - top)} ${wy} L${cx - 30} ${bot} L${cx + 30} ${bot} L${cx + 44 - (wy - top) * 14 / (bot - top)} ${wy} Z" fill="${WATER}" fill-opacity=".55" stroke="none"/>
        <path d="M${cx - 44 + (wy - top) * 14 / (bot - top)} ${wy} L${cx + 44 - (wy - top) * 14 / (bot - top)} ${wy}" stroke="${WATER}"/>
        <text class="sfx" x="${cx - 54}" y="${top + 4}" font-size="26" stroke-width="5">${i + 1}</text>
        ${lbl(cx, bot + 26, t1, 17)}${lbl(cx, bot + 46, t2, 15)}
        ${i < 3 ? `<path d="M${cx + 54} ${(top + bot) / 2} l40 0 m-8 -7 l8 7 l-8 7" stroke="${BERRY}"/>` : ''}`;
    }).join(''), 'Чотири рівні води у фільтрі');
  },
  mountain: () => svg('0 0 320 240', `<path d="M0 200 L70 96 L104 140 L160 52 L230 150 L262 116 L320 196" fill="#F6F2E8"/><path d="M146 74 L160 52 L176 76 L166 70 L158 80 Z" fill="${INK}" stroke="none"/>
    <path d="M160 52 L160 26 L184 33 L160 40" fill="${BERRY}"/>${lbl(196, 32, '1500 м', 15, 'start')}
    ${thermo(44, 120, 60, 0.6, '')}${lbl(44, 220, '94–95°C', 15)}
    <path d="M220 214 l60 0 M232 214 l8 -16 l32 0 l8 16" /><path d="M250 192 q6 -10 0 -18 q10 6 6 18" fill="${GOLD}"/>`, 'Гори: вода закипає при 94–95 градусах'),
  train: () => { const c = cup(116, 150, 104, 64), d = drip(116, 150);
    return svg('0 0 320 240', `<rect x="20" y="20" width="280" height="104" rx="22" fill="#F6F2E8"/><path d="M30 104 L90 64 L130 92 L190 50 L290 110" stroke-width="2.5"/><circle cx="252" cy="52" r="12" fill="${GOLD}"/>
      <path d="M0 214 L320 214" stroke-width="4"/>${c.back}${d.pouch}${c.front}${d.ears}${sfx(196, 200, '≥95°C', 30, -6, 'b')}${sfx(196, 160, 'ТУК-ТУК', 22, -4)}`, 'Потяг: вода не менше 95 градусів'); },
};

// ---------- іконки «не роби» ----------
const NO = `<circle cx="28" cy="28" r="25" stroke="${BERRY}" stroke-width="4.5" fill="none"/><path d="M11 45 L45 11" stroke="${BERRY}" stroke-width="4.5"/>`;
const ICON = {
  open: `<path d="M18 46 L18 20 M38 46 L38 20 M18 46 L38 46" /><path d="M18 20 Q24 10 40 12" /><path d="M42 22 q6 -2 8 2 M42 30 q6 -2 8 2" stroke="${WATER}" stroke-width="2"/>`,
  twice: `<path d="M16 22 L16 44 L36 44 L36 22 Z" fill="#F6F2E8"/><text x="40" y="24" font-family="Oswald,sans-serif" font-size="14" fill="${INK}" stroke="none">×2</text>`,
  teabag: `<path d="M12 26 L16 48 L40 48 L44 26" fill="#F6F2E8"/><path d="M14 34 L42 34" stroke="${WATER}"/><rect x="21" y="24" width="14" height="18" fill="#F6F2E8"/><path d="M28 24 L28 10"/>`,
  cup: `<path d="M6 32 Q28 52 50 32 Z" fill="#F6F2E8"/><path d="M20 30 L20 16 L36 16 L36 30" fill="#F6F2E8"/>`,
  leave: `<path d="M12 22 L16 46 L40 46 L44 22" fill="#F6F2E8"/><rect x="21" y="14" width="14" height="22" fill="#F6F2E8"/><circle cx="44" cy="14" r="8" fill="#F6F2E8" stroke-width="2"/><path d="M44 9 L44 14 L47 16" stroke-width="2"/>`,
  cold: `<rect x="23" y="8" width="10" height="30" rx="5" fill="#F6F2E8"/><circle cx="28" cy="42" r="7" fill="${WATER}"/><path d="M42 14 l8 8 m0 -8 l-8 8 M46 10 l0 16" stroke="${WATER}" stroke-width="2"/>`,
  nature: `<path d="M18 46 L18 34 M10 34 L18 16 L26 34 Z" fill="#F6F2E8"/><rect x="32" y="38" width="12" height="8" fill="#F6F2E8"/><path d="M4 46 L52 46"/>`,
};

function paint() {
  document.querySelectorAll('[data-art]').forEach(el => { const f = ART[el.dataset.art]; if (f) el.innerHTML = f(); });
  document.querySelectorAll('[data-icon]').forEach(el => {
    el.outerHTML = `<svg viewBox="0 0 56 56" aria-hidden="true"><g stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">${ICON[el.dataset.icon] || ''}</g>${NO}</svg>`;
  });
}

// ---------- таймер ----------
// Команди короткі й наказові; at — автоматично за часом, tap — після «Далі»; nag — нагадування, якщо «Далі» не натиснуто.
// est — орієнтовний час для карти; minor — дрібна відмітка без підпису.
const FLOWER = { at: 8, minor: true, t: 'Дивись: росте квітка.', s: 'Кава піднімається шапкою — це CO₂ виходить із зерна. Насолодись. Піна біла й з великими бульбашками — вода захолодна: перевір температуру.' };
const SMELL = { at: 20, minor: true, t: 'Понюхай!', s: 'Нахились над дріпом: після першого вливання аромат найяскравіший. Порівняй із сухим.' };
const DRY = { after: 30, t: 'Не дай пересохнути!', s: 'Пересохла кава — гірка кава. Кава має бути під водою. Лишився ~1 см — лий далі. Стікає швидко — лий частіше й потроху.' };
const STAGES = {
  home: [
    { at: 0, mk: '40 г', t: 'Лий 40 г. Стоп.', s: 'Тонкою цівкою по центру — і руки геть.' },
    FLOWER, SMELL,
    { at: 35, mk: 'до верху', t: 'Лий до верху. Ще ~60 г.', s: 'Чекай, поки зверху лишиться ~1 см, — і тисни «Далі».', nag: DRY },
    { tap: true, est: 75, mk: '200 г', t: 'Лий до 190–200 г.', s: 'І дай воді пройти до кінця. Стекло — «Далі».' },
    { tap: true, est: 150, end: true, mk: 'готово', t: 'Готово. Зніми дріп. Перемішай.', s: 'Дай трохи охолонути — смак стане м\'якшим і глибшим.' },
  ],
  trip: [
    { at: 0, mk: '½ фільтра', t: 'Залий до половини фільтра. Стоп.', s: '~40 мл, по центру.' },
    FLOWER, SMELL,
    { at: 35, mk: 'до верху', t: 'Лий до верху.', s: 'Чекай ~1 см — і «Далі».', nag: DRY },
    { tap: true, est: 70, mk: 'до верху', t: 'Знову до верху.', s: 'І знову до ~1 см — «Далі».', nag: DRY },
    { tap: true, est: 110, mk: '+1 см', t: 'Долий ще ~1 см.', s: 'Дай стекти до кінця — «Далі».' },
    { tap: true, est: 150, end: true, mk: 'готово', t: 'Готово. Перемішай.', s: 'Дай охолонути й стеж, як змінюється смак.' },
  ],
};
const IDLE = 'Відкрий дріп і понюхай сухий аромат.<small>Запам\'ятай його — потім порівняєш. Чашка на вагах, ваги на нуль. «Старт» — разом із першим вливанням.</small>';
const $ = s => document.querySelector(s);
const screen = wake();
let mode = 'home', t0 = 0, stage = -1, since = 0, nagged = false, tick = null;
const total = () => Math.max(...STAGES[mode].map(x => x.est ?? x.at ?? 0)) + 20;
const marks = () => STAGES[mode].map(x => ({ at: x.at ?? x.est, label: x.mk, approx: x.at === undefined, minor: x.minor }));
const elapsed = () => (tick ? (Date.now() - t0) / 1000 : 0);
function show(i) {
  stage = i; since = elapsed(); nagged = false;
  const st = STAGES[mode][i];
  $('#now').innerHTML = `${st.t}<small>${st.s}</small>`;
  $('#now').classList.remove('nag');
  $('#next').hidden = !STAGES[mode][i + 1]?.tap;
  if (i > 0) beep(st.minor ? 1 : 2);
  if (st.end) { stop(false); $('#go').textContent = 'Ще раз'; }
}
function frame() {
  const s = elapsed();
  $('#clock').textContent = fmt(s);
  timeline($('#tl'), marks(), s, total());
  const st = STAGES[mode][stage], nxt = STAGES[mode][stage + 1];
  if (nxt && nxt.at !== undefined && s >= nxt.at) return show(stage + 1);
  // нагадування, якщо людина довго не тисне «Далі»
  if (st?.nag && !nagged && s - since >= st.nag.after) {
    nagged = true; beep(2);
    $('#now').innerHTML = `${st.nag.t}<small>${st.nag.s}</small>`; $('#now').classList.add('nag');
  }
}
async function start() {
  window.plt?.('timer', 'drip', 'base');
  t0 = Date.now(); tick = setInterval(frame, 250); show(0); frame(); window.PL_BUSY = true;
  $('#go').textContent = 'Скинути';
  screen.on();
}
function stop(reset = true) {
  const s = elapsed();
  clearInterval(tick); tick = null; screen.off(); window.PL_BUSY = false;
  if (reset) { $('#clock').textContent = '0:00'; $('#now').innerHTML = IDLE; $('#now').classList.remove('nag'); $('#next').hidden = true; $('#go').textContent = 'Старт'; stage = -1; timeline($('#tl'), marks(), 0, total()); }
  else timeline($('#tl'), marks(), s, total());
}
$('#go').addEventListener('click', () => { if (tick) stop(); else start(); });
$('#next').addEventListener('click', () => { const i = STAGES[mode].findIndex((x, j) => j > stage && !x.minor); if (i > 0) show(i); });
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
  mode = b.dataset.mode; document.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', x === b)); stop();
}));
$('#now').innerHTML = IDLE; timeline($('#tl'), marks(), 0, total());

paint();

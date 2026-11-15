// Лінійні ілюстрації для комікс-інструкцій: та сама туш, газетний папір і акценти, що й у дріп-коміксі.
// Кожна функція повертає шматок SVG; svg() загортає кадр. Координати — у кадрі 320×240, якщо не сказано інше.
export const INK = '#141014', BERRY = '#B5123E', WATER = '#3FA9BE', COFFEE = '#4A1820', GOLD = '#F2B33D', SHEET = '#F6F2E8', CREMA = '#C8925A';
export const svg = (vb, body, label = '') => `<svg viewBox="${vb}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><g stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none">${body}</g></svg>`;
export const sfx = (x, y, t, size = 30, rot = -8, cls = '') => `<text class="sfx ${cls}" x="${x}" y="${y}" font-size="${size}" transform="rotate(${rot} ${x} ${y})" stroke-width="5">${t}</text>`;
export const lbl = (x, y, t, size = 16, anchor = 'middle') => `<text class="lbl" x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" stroke="none">${t}</text>`;
export const arrow = (x1, y1, x2, y2, c = BERRY) => {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 10;
  return `<path d="M${x1} ${y1} L${x2} ${y2} M${x2} ${y2} L${x2 - h * Math.cos(a - 0.5)} ${y2 - h * Math.sin(a - 0.5)} M${x2} ${y2} L${x2 - h * Math.cos(a + 0.5)} ${y2 - h * Math.sin(a + 0.5)}" stroke="${c}" stroke-width="3.5"/>`;
};
// дуга-стрілка «перевернути»
export const flip = (cx, cy, r = 40) => `<path d="M${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx + r * 0.7} ${cy + r * 0.7}" stroke="${BERRY}" stroke-width="3.5"/><path d="M${cx + r * 0.7} ${cy + r * 0.7} l-2 -13 m2 13 l-13 1" stroke="${BERRY}" stroke-width="3.5"/>`;

// ---------- загальне ----------
export function cup(cx, top, w = 120, h = 82, { coffee = false, handle = true } = {}) {
  const r = w / 2, ry = w * 0.08;
  const body = `M${cx - r} ${top} L${cx - r + 8} ${top + h - 10} Q${cx - r + 10} ${top + h} ${cx - r + 20} ${top + h} L${cx + r - 20} ${top + h} Q${cx + r - 10} ${top + h} ${cx + r - 8} ${top + h - 10} L${cx + r} ${top}`;
  return {
    back: `<ellipse cx="${cx}" cy="${top}" rx="${r}" ry="${ry}" fill="${SHEET}"/>${coffee ? `<ellipse cx="${cx}" cy="${top + 2}" rx="${r - 6}" ry="${Math.max(2, ry - 2)}" fill="${COFFEE}" stroke="none"/>` : ''}`,
    front: `<path d="${body} Z" fill="${SHEET}" stroke="none"/><path d="${body}"/><path d="M${cx - r} ${top} A${r} ${ry} 0 0 0 ${cx + r} ${top}"/>
      ${handle ? `<path d="M${cx + r - 3} ${top + h * 0.2} C${cx + r + 30} ${top + h * 0.12} ${cx + r + 32} ${top + h * 0.78} ${cx + r - 7} ${top + h * 0.7}"/>` : ''}`,
  };
}
export const cupWhole = (cx, top, w, h, o) => { const c = cup(cx, top, w, h, o); return c.back + c.front; };
export function kettle(x, y, { pour = null, temp = '' } = {}) {
  const tip = [x - 86, y - 34];
  return `<path d="M${x - 30} ${y + 20} C${x - 62} ${y + 18} ${x - 58} ${y - 28} ${tip[0]} ${tip[1]}" stroke-width="5"/>
    <path d="M${x - 36} ${y + 34} L${x + 36} ${y + 34} L${x + 29} ${y - 16} Q${x} ${y - 30} ${x - 29} ${y - 16} Z" fill="${SHEET}"/>
    <path d="M${x - 18} ${y - 22} Q${x} ${y - 34} ${x + 18} ${y - 22}"/><circle cx="${x}" cy="${y - 32}" r="4" fill="${INK}"/>
    <path d="M${x + 31} ${y - 8} C${x + 62} ${y - 12} ${x + 62} ${y + 28} ${x + 33} ${y + 26}" stroke-width="5"/>
    ${temp ? `<circle cx="${x}" cy="${y + 10}" r="14" fill="${SHEET}"/><text class="dsp" x="${x}" y="${y + 15}" font-size="12" text-anchor="middle" stroke="none" fill="${BERRY}">${temp}</text>` : ''}
    ${pour ? `<path class="flow" d="M${tip[0] - 2} ${tip[1] + 3} Q${tip[0] - 8} ${tip[1] + 26} ${pour[0]} ${pour[1]}" stroke="${WATER}" stroke-width="5"/>` : ''}`;
}
export function scale(cx, top, w, text) {
  return `<rect x="${cx - w / 2}" y="${top}" width="${w}" height="28" rx="7" fill="${SHEET}"/>
    <rect x="${cx - 32}" y="${top + 6}" width="64" height="17" rx="3" fill="${INK}"/>
    <text class="dsp" x="${cx}" y="${top + 20}" font-size="14" text-anchor="middle" stroke="none">${text}</text>`;
}
export function stopwatch(cx, cy, r, angle = 0, text = '') {
  const a = (angle - 90) * Math.PI / 180;
  return `<rect x="${cx - 5}" y="${cy - r - 10}" width="10" height="8" rx="2" fill="${SHEET}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${SHEET}"/>
    <path d="M${cx} ${cy} L${cx + Math.cos(a) * (r - 7)} ${cy + Math.sin(a) * (r - 7)}" stroke="${BERRY}"/><circle cx="${cx}" cy="${cy}" r="3" fill="${INK}"/>
    ${text ? lbl(cx, cy + r + 20, text, 15) : ''}`;
}
// полум'я конфорки
export function flame(cx, y, size = 1, { big = false } = {}) {
  const s = size * (big ? 1.35 : 1);
  const tongue = (dx, h, w) => `<path d="M${cx + dx - w} ${y} Q${cx + dx - w} ${y - h * 0.6} ${cx + dx} ${y - h} Q${cx + dx + w} ${y - h * 0.6} ${cx + dx + w} ${y} Z" fill="${GOLD}" stroke-width="2.2"/>`;
  return `<path d="M${cx - 46} ${y + 6} L${cx + 46} ${y + 6}" stroke-width="4"/>${tongue(-24, 18 * s, 7)}${tongue(0, 26 * s, 9)}${tongue(24, 18 * s, 7)}
    <path d="M${cx - 2} ${y - 4} Q${cx} ${y - 14 * s} ${cx + 2} ${y - 4}" stroke="${BERRY}" stroke-width="2"/>`;
}
export const steam = (x, y) => `<g class="steam"><path d="M${x} ${y} q-8 -10 0 -20 q8 -10 0 -20" stroke-width="2.5" stroke="${WATER}"/><path d="M${x + 16} ${y + 4} q-8 -10 0 -20 q8 -10 0 -20" stroke-width="2.5" stroke="${WATER}"/></g>`;
export function spoon(x, y, rot = -30, s = 1) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><ellipse cx="0" cy="0" rx="9" ry="13" fill="${SHEET}"/><path d="M0 13 L0 70" stroke-width="4"/></g>`;
}
const bubbles = (cx, cy, n, spread, seed = 3) => {
  let s = seed; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => `<circle cx="${(cx + (r() - 0.5) * spread).toFixed(1)}" cy="${(cy + (r() - 0.5) * 8).toFixed(1)}" r="${(1.5 + r() * 2.5).toFixed(1)}" fill="${SHEET}" stroke-width="1.6"/>`).join('');
};

// ---------- турка ----------
// foam: 0…1 — висота шапки; edge: коричневе з країв (перегрів)
export function cezve(cx, base, { foam = 0, edge = false, handle = true, coffee = true } = {}) {
  const neck = base - 64, lip = base - 82;
  const body = `M${cx - 40} ${base} Q${cx - 44} ${base - 34} ${cx - 25} ${neck} L${cx - 29} ${lip} L${cx + 29} ${lip} L${cx + 25} ${neck} Q${cx + 44} ${base - 34} ${cx + 40} ${base} Z`;
  const fTop = neck - 4 - foam * 20;
  const cap = foam > 0 ? `<path d="M${cx - 25} ${neck} Q${cx - 26} ${fTop} ${cx} ${fTop - 2} Q${cx + 26} ${fTop} ${cx + 25} ${neck} Z" fill="${CREMA}" stroke-width="2.4"/>${bubbles(cx, fTop + 8, 7, 34)}
    ${edge ? `<path d="M${cx - 25} ${neck} Q${cx - 25} ${fTop + 4} ${cx - 15} ${fTop + 2}" stroke="${COFFEE}" stroke-width="6"/><path d="M${cx + 25} ${neck} Q${cx + 25} ${fTop + 4} ${cx + 15} ${fTop + 2}" stroke="${COFFEE}" stroke-width="6"/>` : ''}`
    : coffee ? `<ellipse cx="${cx}" cy="${neck - 2}" rx="23" ry="4" fill="${COFFEE}" stroke="none"/>` : '';
  return `<path d="${body}" fill="${SHEET}"/>${cap}<path d="M${cx - 29} ${lip} l-10 -5" stroke-width="3"/>
    <path d="M${cx - 29} ${lip} L${cx + 29} ${lip}"/>
    ${handle ? `<path d="M${cx + 27} ${neck - 4} L${cx + 120} ${neck - 34}" stroke-width="5"/><path d="M${cx + 70} ${neck - 18} L${cx + 120} ${neck - 34}" stroke="${COFFEE}" stroke-width="9"/>` : ''}`;
}

// ---------- гейзер ----------
export function moka(cx, base, { gurgle = false } = {}) {
  const w = 34, waist = base - 58;
  const facets = (y1, y2, s1, s2) => [-0.4, 0.4].map(k => `<path d="M${cx + k * s1} ${y1} L${cx + k * s2} ${y2}" stroke-width="1.6"/>`).join('');
  return `<path d="M${cx - w} ${base} L${cx - w + 6} ${waist} L${cx + w - 6} ${waist} L${cx + w} ${base} Z" fill="${SHEET}"/>${facets(base, waist, w * 2, w * 2 - 12)}
    <circle cx="${cx - 14}" cy="${base - 28}" r="4.5" fill="${SHEET}" stroke-width="2.4"/>
    <rect x="${cx - w + 4}" y="${waist - 7}" width="${(w - 4) * 2}" height="7" fill="${SHEET}" stroke-width="2.6"/>
    <path d="M${cx - w + 6} ${waist - 7} L${cx - w} ${waist - 64} L${cx + w} ${waist - 64} L${cx + w - 6} ${waist - 7} Z" fill="${SHEET}"/>${facets(waist - 7, waist - 64, w * 2 - 12, w * 2)}
    <path d="M${cx - w - 2} ${waist - 64} Q${cx} ${waist - 84} ${cx + w + 2} ${waist - 64} Z" fill="${SHEET}"/><circle cx="${cx}" cy="${waist - 80}" r="5" fill="${INK}"/>
    <path d="M${cx - w} ${waist - 64} l-12 -7 l4 9" fill="${SHEET}" stroke-width="2.6"/>
    <path d="M${cx + w - 2} ${waist - 58} L${cx + w + 26} ${waist - 52} L${cx + w + 22} ${waist - 20} L${cx + w - 4} ${waist - 26}" fill="${INK}" stroke-width="2.6"/>
    ${gurgle ? `<path d="M${cx - 6} ${waist - 70} q6 -14 12 0" stroke="${COFFEE}" stroke-width="3"/>${sfx(cx - 64, waist - 92, 'БУЛЬ-БУЛЬ', 22, -6, 'b')}` : ''}`;
}

// ---------- еспресо ----------
export function espresso(cx, top, { flow = false, cupY = 160 } = {}) {
  const c = cup(cx, cupY, 64, 40, { coffee: flow });
  return `<rect x="${cx - 70}" y="${top}" width="140" height="30" rx="5" fill="${SHEET}"/><path d="M${cx - 60} ${top + 10} L${cx + 60} ${top + 10}" stroke-width="1.6"/>
    <rect x="${cx - 30}" y="${top + 30}" width="60" height="14" fill="${SHEET}"/>
    <path d="M${cx - 38} ${top + 44} L${cx + 38} ${top + 44} L${cx + 32} ${top + 62} L${cx - 32} ${top + 62} Z" fill="${SHEET}"/>
    <path d="M${cx + 36} ${top + 50} L${cx + 120} ${top + 58}" stroke-width="9"/><path d="M${cx + 36} ${top + 50} L${cx + 120} ${top + 58}" stroke="${SHEET}" stroke-width="4"/>
    <path d="M${cx - 10} ${top + 62} l0 7 M${cx + 10} ${top + 62} l0 7" stroke-width="4"/>
    ${c.back}${flow ? `<path class="flow" d="M${cx - 10} ${top + 70} L${cx - 9} ${cupY}" stroke="${COFFEE}" stroke-width="3"/><path class="flow" d="M${cx + 10} ${top + 70} L${cx + 9} ${cupY}" stroke="${COFFEE}" stroke-width="3"/>` : ''}${c.front}`;
}
export function superauto(cx, base) {
  const top = base - 170;
  return `<rect x="${cx - 62}" y="${top}" width="124" height="170" rx="14" fill="${SHEET}"/>
    <path d="M${cx - 50} ${top} L${cx - 44} ${top - 12} L${cx + 44} ${top - 12} L${cx + 50} ${top}" fill="${SHEET}"/>
    <rect x="${cx - 42}" y="${top + 16}" width="84" height="36" rx="5" fill="${INK}"/>
    <text class="dsp" x="${cx}" y="${top + 40}" font-size="15" text-anchor="middle" stroke="none">40 мл</text>
    <circle cx="${cx - 28}" cy="${top + 68}" r="6" fill="${SHEET}"/><circle cx="${cx}" cy="${top + 68}" r="6" fill="${GOLD}"/><circle cx="${cx + 28}" cy="${top + 68}" r="6" fill="${SHEET}"/>
    <rect x="${cx - 52}" y="${top + 86}" width="104" height="76" rx="6" fill="#E9E3D6"/>
    <rect x="${cx - 16}" y="${top + 86}" width="32" height="12" fill="${SHEET}"/><path d="M${cx - 6} ${top + 98} l0 6 M${cx + 6} ${top + 98} l0 6" stroke-width="3.4"/>
    ${cupWhole(cx, base - 44, 54, 34, { coffee: true })}
    <path d="M${cx - 52} ${base - 8} L${cx + 52} ${base - 8}" stroke-width="2"/>`;
}

// ---------- AeroPress ----------
// прямо: на чашці, поршень зверху. inverted: поршень унизу на столі, камера зверху. press 0…1 — наскільки натиснули
export function aeropress(cx, base, { inverted = false, press = 0, fill = 0.6, cap = true } = {}) {
  const w = 24, h = 108;
  if (!inverted) {
    const bottom = base, top = base - h, plTop = top - 56 + press * 70;
    const level = top + (h - 12) * (1 - fill) + press * 40;
    return `<rect x="${cx - w}" y="${top}" width="${w * 2}" height="${h - 10}" fill="${SHEET}"/>
      ${fill > 0 ? `<rect x="${cx - w + 2}" y="${Math.min(level, bottom - 14)}" width="${w * 2 - 4}" height="${Math.max(2, bottom - 12 - Math.min(level, bottom - 14))}" fill="${COFFEE}" stroke="none"/>` : ''}
      <rect x="${cx - w}" y="${top}" width="${w * 2}" height="${h - 10}"/>
      ${[1, 2, 3, 4].map(i => `<path d="M${cx + w - 9} ${bottom - 14 - i * 19} l8 0" stroke-width="2"/>`).join('')}
      <rect x="${cx - w - 7}" y="${top - 5}" width="${(w + 7) * 2}" height="7" rx="2" fill="${SHEET}"/>
      ${cap ? `<rect x="${cx - w - 4}" y="${bottom - 12}" width="${(w + 4) * 2}" height="12" rx="3" fill="${INK}"/>` : ''}
      <rect x="${cx - w + 4}" y="${plTop}" width="${(w - 4) * 2}" height="${top - plTop + 16}" fill="${SHEET}" stroke-width="2.6"/>
      <rect x="${cx - w + 2}" y="${top + 8 + press * 0}" width="0" height="0"/>
      <rect x="${cx - w - 2}" y="${plTop - 8}" width="${(w + 2) * 2}" height="8" rx="3" fill="${SHEET}"/>`;
  }
  // перевернутий: поршень стоїть на столі, камера над ним, кава всередині, зверху відкрито або кришка
  const plBase = base, plTop = base - 64, chTop = base - 64 - h + 30, chBot = base - 30;
  return `<rect x="${cx - w - 2}" y="${plBase - 8}" width="${(w + 2) * 2}" height="8" rx="3" fill="${SHEET}"/>
    <rect x="${cx - w + 4}" y="${plTop}" width="${(w - 4) * 2}" height="${plBase - 8 - plTop}" fill="${SHEET}" stroke-width="2.6"/>
    <rect x="${cx - w}" y="${chTop}" width="${w * 2}" height="${chBot - chTop}" fill="${SHEET}"/>
    ${fill > 0 ? `<rect x="${cx - w + 2}" y="${chTop + (chBot - chTop - 14) * (1 - fill) + 6}" width="${w * 2 - 4}" height="${(chBot - chTop - 14) * fill}" fill="${COFFEE}" stroke="none"/>` : ''}
    <rect x="${cx - w}" y="${chTop}" width="${w * 2}" height="${chBot - chTop}"/>
    <rect x="${cx - w - 7}" y="${chBot - 2}" width="${(w + 7) * 2}" height="7" rx="2" fill="${SHEET}"/>
    ${cap ? `<rect x="${cx - w - 4}" y="${chTop - 12}" width="${(w + 4) * 2}" height="12" rx="3" fill="${INK}"/>` : ''}`;
}

// ---------- воронки ----------
export function server(cx, top, { coffee = 0.4 } = {}) {
  const path = `M${cx - 30} ${top} L${cx - 38} ${top + 56} Q${cx - 38} ${top + 66} ${cx - 28} ${top + 66} L${cx + 28} ${top + 66} Q${cx + 38} ${top + 66} ${cx + 38} ${top + 56} L${cx + 30} ${top}`;
  const ly = top + 66 - 60 * coffee;
  return `<path d="${path} Z" fill="${SHEET}"/>${coffee > 0 ? `<path d="M${cx - 37 + (ly - top) * 0} ${ly} L${cx - 38} ${top + 56} Q${cx - 38} ${top + 66} ${cx - 28} ${top + 66} L${cx + 28} ${top + 66} Q${cx + 38} ${top + 66} ${cx + 38} ${top + 56} L${cx + 37} ${ly} Z" fill="${COFFEE}" fill-opacity=".8" stroke="none"/>` : ''}
    <path d="${path}"/><path d="M${cx + 34} ${top + 12} C${cx + 58} ${top + 12} ${cx + 58} ${top + 44} ${cx + 36} ${top + 46}" stroke-width="4"/>`;
}
const bed = (cx, y, w) => `<path d="M${cx - w} ${y} Q${cx} ${y - 8} ${cx + w} ${y}" fill="${CREMA}" stroke-width="2"/>`;
// V60: конус зі спіральними ребрами і ручкою
export function v60(cx, rim, { water = false } = {}) {
  return `<path d="M${cx - 52} ${rim} L${cx - 9} ${rim + 72} L${cx + 9} ${rim + 72} L${cx + 52} ${rim} Z" fill="${SHEET}"/>
    ${water ? `<path d="M${cx - 40} ${rim + 18} L${cx + 40} ${rim + 18} L${cx + 9} ${rim + 66} L${cx - 9} ${rim + 66} Z" fill="${WATER}" fill-opacity=".4" stroke="none"/>` : bed(cx, rim + 44, 22)}
    <path d="M${cx - 30} ${rim + 8} Q${cx - 18} ${rim + 40} ${cx - 6} ${rim + 66} M${cx + 30} ${rim + 8} Q${cx + 18} ${rim + 40} ${cx + 6} ${rim + 66} M${cx} ${rim + 8} L${cx} ${rim + 30}" stroke-width="1.6"/>
    <path d="M${cx - 52} ${rim} L${cx + 52} ${rim}"/>
    <ellipse cx="${cx}" cy="${rim + 76}" rx="40" ry="6" fill="${SHEET}"/>
    <path d="M${cx + 47} ${rim + 8} C${cx + 72} ${rim + 8} ${cx + 72} ${rim + 40} ${cx + 30} ${rim + 42}" stroke-width="4"/>`;
}
// Orea: широке плоске дно, хвиляста паперова стінка
export function orea(cx, rim) {
  const wave = Array.from({ length: 9 }, (_, i) => `${i ? 'Q' : 'M'}${cx - 52 + i * 13 - (i ? 6.5 : 0)} ${rim - (i % 2 ? 7 : 0)} ${i ? `${cx - 52 + i * 13} ${rim}` : ''}`).join(' ');
  return `<path d="M${cx - 54} ${rim} L${cx - 36} ${rim + 54} L${cx + 36} ${rim + 54} L${cx + 54} ${rim} Z" fill="${SHEET}"/>
    ${[-30, -15, 0, 15, 30].map(d => `<path d="M${cx + d * 1.4} ${rim + 4} L${cx + d} ${rim + 50}" stroke-width="1.6"/>`).join('')}
    <path d="${wave}" stroke="${BERRY}" stroke-width="2.4"/>${bed(cx, rim + 36, 30)}
    <ellipse cx="${cx}" cy="${rim + 58}" rx="40" ry="5" fill="${SHEET}"/>`;
}
// Origami: гофрований конус
export function origami(cx, rim) {
  const n = 9, pts = Array.from({ length: n * 2 + 1 }, (_, i) => `${cx - 54 + i * (108 / (n * 2))} ${rim + (i % 2 ? 6 : 0)}`);
  return `<path d="M${cx - 54} ${rim} L${cx - 8} ${rim + 70} L${cx + 8} ${rim + 70} L${cx + 54} ${rim}" fill="${SHEET}"/>
    <path d="M${pts.join(' L')}" fill="${SHEET}" stroke-width="2.4"/>
    ${Array.from({ length: n + 1 }, (_, i) => { const x = cx - 54 + i * (108 / n); return `<path d="M${x} ${rim + 6} L${cx + (x - cx) * 0.16} ${rim + 68}" stroke-width="1.6"/>`; }).join('')}
    <path d="M${cx - 54} ${rim} L${cx - 8} ${rim + 70} L${cx + 8} ${rim + 70} L${cx + 54} ${rim}"/>
    <ellipse cx="${cx}" cy="${rim + 74}" rx="34" ry="5" fill="${SHEET}"/>`;
}
// дріпер із клапаном (як Hario Switch / Clever): конус на основі з кулькою-клапаном
export function valve(cx, rim, { open = false } = {}) {
  return `<path d="M${cx - 50} ${rim} L${cx - 10} ${rim + 64} L${cx + 10} ${rim + 64} L${cx + 50} ${rim} Z" fill="${SHEET}"/>
    <path d="M${cx - 38} ${rim + 16} L${cx + 38} ${rim + 16} L${cx + 10} ${rim + 60} L${cx - 10} ${rim + 60} Z" fill="${open ? WATER : COFFEE}" fill-opacity="${open ? '.35' : '.75'}" stroke="none"/>
    <path d="M${cx - 50} ${rim} L${cx + 50} ${rim}"/>
    <path d="M${cx - 36} ${rim + 64} L${cx + 36} ${rim + 64} L${cx + 32} ${rim + 84} L${cx - 32} ${rim + 84} Z" fill="${SHEET}"/>
    <circle cx="${cx + 36}" cy="${rim + 74}" r="6" fill="${open ? GOLD : BERRY}"/>
    ${open ? `<path class="flow" d="M${cx} ${rim + 84} L${cx} ${rim + 100}" stroke="${COFFEE}" stroke-width="3"/>` : ''}`;
}
// чашка зверху з «шапкою» гущі (каппінг / заварювання в чашці)
export function cupTop(cx, cy, { broken = false, rx = 100, ry = 54 } = {}) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${SHEET}"/><ellipse cx="${cx}" cy="${cy}" rx="${rx - 12}" ry="${ry - 9}" fill="${broken ? COFFEE : CREMA}" stroke="none"/>
    ${broken ? `<path d="M${cx - 50} ${cy - 4} Q${cx} ${cy + 18} ${cx + 50} ${cy - 2}" stroke="${CREMA}" stroke-width="6"/>` : bubbles(cx, cy, 22, rx * 1.4, 11)}`;
}

// маленька іконка пристрою для карток (кадр 120×110)
export function deviceIcon(kind) {
  const f = {
    v60: () => `${v60(60, 14)}`, orea: () => `${orea(60, 26)}`, origami: () => `${origami(60, 14)}`, valve: () => `${valve(60, 8)}`,
    solo: () => `${v60(60, 14)}`, aero: () => `${aeropress(60, 104, { press: 0.2 })}`, aeroInv: () => `${aeropress(60, 106, { inverted: true })}`,
    cezve: () => `<g transform="translate(-14 0) scale(.9)">${cezve(70, 108, { foam: 0.6 })}</g>`, moka: () => `${moka(56, 106)}`,
    espresso: () => `<g transform="scale(.7) translate(10 6)">${espresso(80, 0, { flow: true, cupY: 108 })}</g>`,
    superauto: () => `<g transform="scale(.6) translate(30 10)">${superauto(70, 176)}</g>`,
    cup: () => `${cupTop(60, 60, { rx: 50, ry: 28 })}`,
  }[kind];
  return f ? svg('0 0 120 110', f()) : '';
}

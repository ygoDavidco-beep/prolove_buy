// Колір смаку PROLOVE. Один модуль для сервера і браузера (ES module, без залежностей).
// Слова з етикетки → дескриптори → категорії (довідник у структурі SCA/WCR Flavor Wheel)
// → позиція на шкалі вогню 0…1 → колір. Колесо SCA не відтворюємо (CC BY-NC-ND 4.0).

const ENDINGS = ['ами', 'ями', 'ові', 'еві', 'ого', 'ому', 'ими', 'ій', 'ий', 'ої', 'ою', 'ею', 'ом', 'ем', 'ах', 'ях', 'ів', 'ям', 'ам', 'а', 'я', 'у', 'ю', 'о', 'е', 'і', 'и', 'ь', 'й'];

export const norm = s => String(s ?? '').toLowerCase().replace(/[’`ʼ]/g, "'").replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

export function stem(word) {
  const w = norm(word);
  if (w.length < 5) return w;
  for (const e of ENDINGS) if (w.endsWith(e) && w.length - e.length >= 3) return w.slice(0, -e.length);
  return w;
}

const tokens = s => norm(s).split(/[^a-zа-яіїєґ'-]+/i).filter(Boolean);

/** «Смак: Вишня в Шоколаді, Жасмин , Темний Ром.» → ['вишня в шоколаді', 'жасмин', 'темний ром'] */
export function splitTerms(taste) {
  const raw = Array.isArray(taste) ? taste : String(taste ?? '').replace(/^\s*смак\s*:\s*/i, '').split(/[,;/]+/);
  return raw.map(t => norm(t).replace(/[.!…]+$/, '').trim()).filter(Boolean);
}

/** Готує словник: стеми для кожного слова й аліасу. Викликати після кожної зміни словника. */
export function compile(fm) {
  const cats = new Map(fm.categories.map(c => [c.code, c]));
  const forms = [];
  for (const d of fm.descriptors) {
    for (const phrase of [d.word, ...(d.aliases || [])]) {
      const st = tokens(phrase).map(stem);
      if (st.length) forms.push({ d, stems: st });
    }
  }
  return { ...fm, _cats: cats, _forms: forms };
}

const wordMatches = (termStem, descStem) => descStem.length <= 3 ? termStem === descStem : termStem.startsWith(descStem);

function matchTerm(term, cfm) {
  const tStems = tokens(term).map(stem);
  let hits = [];
  for (const f of cfm._forms) {
    const covered = [];
    let ok = true;
    for (const ds of f.stems) {
      const idx = tStems.findIndex((ts, i) => !covered.includes(i) && wordMatches(ts, ds));
      if (idx < 0) { ok = false; break; }
      covered.push(idx);
    }
    if (ok) hits.push({ d: f.d, covered });
  }
  // довша фраза перемагає коротшу: «вишневе варення» прибирає «вишня» і «варення»
  hits = hits.filter(h => !hits.some(o => o !== h && o.covered.length > h.covered.length && h.covered.every(i => o.covered.includes(i))));
  // одне слово — один раз
  const seen = new Set();
  hits = hits.filter(h => (seen.has(h.d.word) ? false : seen.add(h.d.word)));
  // модифікатори: «сушені …» перекривають свіжі ягоди і фрукти
  for (const [cat, drop] of Object.entries(cfm.overrides || {})) {
    if (hits.some(h => h.d.cat === cat)) hits = hits.filter(h => !drop.includes(h.d.cat));
  }
  return hits.map(h => h.d);
}

export const descriptorFlame = (d, cfm) => d.flame ?? cfm._cats.get(d.cat)?.flame ?? 0.5;
export const descriptorColor = (d, cfm) => d.color || flameColor(descriptorFlame(d, cfm), cfm.flame_stops);

function lev(a, b) {
  const m = a.length, n = b.length, dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= n; j++) { const t = dp[j]; dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
  }
  return dp[n];
}

/** Підказки для незнайденого слова: найближчі слова словника за написанням. */
export function suggest(term, cfm, limit = 3) {
  const t = norm(term);
  return cfm.descriptors
    .map(d => ({ word: d.word, cat: d.cat, dist: Math.min(...[d.word, ...(d.aliases || [])].map(w => lev(t, norm(w)))) }))
    .filter(x => x.dist <= Math.max(2, Math.round(t.length * 0.34)) || norm(x.word).slice(0, 4) === t.slice(0, 4))
    .sort((a, b) => a.dist - b.dist).slice(0, limit);
}

/**
 * Колір лота. Ланцюжок запасних варіантів:
 * 1) ручне значення адміна → 2) середнє знайдених слів → 3) колір за обробкою → 4) нейтральний.
 */
export function lotFlavor(lot, cfm) {
  const terms = splitTerms(lot.taste);
  const matched = [], unknown = [];
  let sum = 0, wsum = 0;
  terms.forEach((term, i) => {
    const w = cfm.weights_by_order[Math.min(i, cfm.weights_by_order.length - 1)];
    const hits = matchTerm(term, cfm);
    if (!hits.length) { unknown.push({ term, suggestions: suggest(term, cfm) }); return; }
    for (const d of hits) {
      const f = descriptorFlame(d, cfm), share = w / hits.length;
      matched.push({ term, word: d.word, cat: d.cat, flame: f, color: descriptorColor(d, cfm), weight: Math.round(share * 100) / 100 });
      sum += f * share; wsum += share;
    }
  });
  let flame = null, source = 'neutral';
  if (lot.flame_override !== null && lot.flame_override !== undefined && lot.flame_override !== '') { flame = clamp(+lot.flame_override); source = 'manual'; }
  else if (wsum) { flame = Math.round((sum / wsum) * 1000) / 1000; source = 'auto'; }
  else if (cfm.process_defaults?.[lot.process] !== undefined) { flame = cfm.process_defaults[lot.process]; source = 'process'; }
  const color = flame === null ? cfm.neutral_color || '#F6F0EB' : flameColor(flame, cfm.flame_stops);
  return { flame, color, source, matched, unknown, terms };
}

const clamp = t => Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0.5));

function hexToHsl(h) {
  const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let s = 0, hh = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    hh = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  }
  return [hh, s * 100, l * 100];
}

/** Колір на шкалі вогню. HSL, коротка дуга відтінку — без сірої середини. */
export function flameColor(t, stops) {
  const S = [...stops].sort((a, b) => a[0] - b[0]);
  t = clamp(t);
  if (t <= S[0][0]) return S[0][1];
  if (t >= S[S.length - 1][0]) return S[S.length - 1][1];
  for (let i = 1; i < S.length; i++) {
    if (t <= S[i][0]) {
      const [a, ca] = S[i - 1], [b, cb] = S[i], k = (t - a) / (b - a || 1);
      const A = hexToHsl(ca), B = hexToHsl(cb);
      let dh = B[0] - A[0];
      if (dh > 180) dh -= 360;
      if (dh < -180) dh += 360;
      const r = x => Math.round(x * 10) / 10;
      return `hsl(${r((A[0] + dh * k + 360) % 360)} ${r(A[1] + (B[1] - A[1]) * k)}% ${r(A[2] + (B[2] - A[2]) * k)}%)`;
    }
  }
  return S[S.length - 1][1];
}

/** CSS-градієнт шкали, який точно збігається з flameColor (дрібні кроки). */
export function gradientCss(stops, steps = 24) {
  const parts = [];
  for (let i = 0; i <= steps; i++) { const t = i / steps; parts.push(`${flameColor(t, stops)} ${Math.round(t * 1000) / 10}%`); }
  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

export function sortByMood(lots, moodFlame) {
  return [...lots].sort((a, b) => Math.abs((a.flame ?? 0.5) - moodFlame) - Math.abs((b.flame ?? 0.5) - moodFlame));
}

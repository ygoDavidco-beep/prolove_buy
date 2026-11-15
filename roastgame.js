// «Вивантаж вчасно» — фізика міні-гри. Чиста й детермінована: той самий seed і ті самі натискання дають той самий результат.
// Тому згодом сервер зможе сам «прокрутити» гру й перевірити виграш (браузеру не довіряємо).
// Час обсмаження йде швидше за реальний (SPEED): 1 с на екрані = 4 с у барабані.

export const SPEED = 4;
export const WIN = [212, 212.5];          // вікно вивантаження, °C
export const BLACK = 218;                 // далі — чорне зерно, гру зупиняємо
export const GAS_STEP = 0.25;

// маленький детермінований генератор випадкових чисел
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Новий барабан. Кожного разу інша «піч»: сила пальника, інерція й природне падіння RoR — випадкові в межах. */
export function makeRoast(seed) {
  const r = rng(seed);
  return {
    seed, t: 0,
    BT: 204.2 + r() * 1.2,                // температура зерна
    RoR: 6 + r() * 2,                     // °C/хв
    gas: 0.2, gasEff: 0.2,                // поставлений газ і той, що реально «дійшов» до зерна
    k: 62 + r() * 22,                     // скільки RoR дає повний газ
    decay: 2.2 + r() * 0.5,             // наскільки RoR сам падає з ростом температури
    lift: r() * 2,
    tauG: 18 + r() * 10,                  // інерція барабана й газу, с
    tauR: 10 + r() * 6,
    low: 0, note: null, over: null,
  };
}

/** Один крок фізики, dt — секунди обсмаження. */
export function step(s, dt) {
  if (s.over) return s;
  s.t += dt;
  s.gasEff += (s.gas - s.gasEff) * Math.min(1, dt / s.tauG);
  const target = s.k * s.gasEff - s.decay * (s.BT - 204) + s.lift;
  s.RoR += (target - s.RoR) * Math.min(1, dt / s.tauR);
  s.BT += (s.RoR / 60) * dt;
  // RoR провис — кава запікається
  s.low = s.RoR < 1.5 ? s.low + dt : 0;
  if (s.low > 30) s.over = { kind: 'baked', BT: s.BT, t: s.t };
  if (s.BT >= BLACK) s.over = { kind: 'black', BT: s.BT, t: s.t };
  return s;
}

/** Газ більше / менше. Різко скинути газ, коли RoR уже низький, не дає — «запіканка». */
export function gas(s, dir) {
  if (s.over) return false;
  if (dir > 0) { s.gas = Math.min(1, s.gas + GAS_STEP); s.note = null; return true; }
  const next = Math.max(0, s.gas - GAS_STEP);
  if (s.RoR < 6 && next < 0.5) { s.note = 'zapik'; return false; }
  s.gas = next; s.note = null; return true;
}

/** Вивантаження: оцінка за температурою зерна. */
export function unload(s) {
  if (s.over) return s.over;
  const BT = s.BT;
  const kind = BT < WIN[0] ? 'under' : BT <= WIN[1] ? 'win' : 'over';
  s.over = { kind, BT, t: s.t };
  return s.over;
}

/** Повна симуляція для перевірки: дії — [{t, a:'up'|'down'|'drop'}] у секундах обсмаження. */
export function replay(seed, actions, dt = 0.05) {
  const s = makeRoast(seed);
  const acts = [...actions].sort((x, y) => x.t - y.t);
  let i = 0;
  while (!s.over && s.t < 600) {
    while (i < acts.length && acts[i].t <= s.t) {
      const a = acts[i++].a;
      if (a === 'up') gas(s, 1); else if (a === 'down') gas(s, -1); else if (a === 'drop') unload(s);
    }
    if (!s.over) step(s, dt);
  }
  return s.over;
}

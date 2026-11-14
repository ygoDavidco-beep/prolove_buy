// Локальний режим Бориса без моделі ШІ: підбір лота за словами смаку і способом приготування.
// Чистий модуль (без Node API) — той самий код працює на сервері і в демо в браузері.
import { lotFlavor, norm } from './flavor.js';
import { METHODS, methodKeys, methodsInText } from './methods.js';

const SUPPORT_RE = /доставк|оплат|поверн|замовлен|трек|накладн|рахун/i;
// людина описує свій шот → їй потрібна картка еспресо, а не підбір лота
const DIAL_RE = /тече|секунд|\bсек\b|швидко|повільно|пролив|помел|млин|доза|вихід|екстрак|ристрет|холдер|кошик|шот/i;
const ESPRESSO_RE = /еспресо|espresso|кисл|гірк/i;

export function localAnswer(question, lots, cfm, contacts) {
  const q = norm(question);
  if (SUPPORT_RE.test(q)) return { text: `З оплатою, доставкою чи замовленням краще допоможе жива людина — напиши нам: ${contacts.support}`, lots: [] };
  if (DIAL_RE.test(q)) return { text: 'Натисни «Налаштувати еспресо» і введи дозу, вихід, час та смак — я скажу одну конкретну дію за протоколом.', lots: [], espresso: true };
  const meth = methodsInText(q);
  const fits = l => !meth.length || meth.every(k => methodKeys(l.methods).includes(k));
  const want = lotFlavor({ taste: q.split(/[\s,.;!?]+/).filter(w => w.length > 2).join(', ') }, cfm);
  const how = meth.map(k => METHODS[k].for).join(' і ');
  if (meth.length && !want.matched.length) {
    const pick = lots.filter(fits).slice(0, 2);
    if (pick.length) return { text: `Для ${how} раджу ${pick.map(l => `${l.name} — ${l.taste.toLowerCase()}`).join('; або ')}.`, lots: pick.map(l => l.id) };
  }
  const pool = lots.some(fits) ? lots.filter(fits) : lots;
  const ranked = pool.map(l => {
    const f = lotFlavor(l, cfm), words = new Set(f.matched.map(m => m.word));
    const overlap = want.matched.filter(m => words.has(m.word)).length;
    const dist = want.flame === null || f.flame === null ? 1 : Math.abs(want.flame - f.flame);
    return { l, score: overlap * 2 - dist };
  }).sort((a, b) => b.score - a.score);
  if (want.matched.length && ranked.length) {
    const pick = ranked.slice(0, 2).map(r => r.l);
    const words = [...new Set(want.matched.map(m => m.word))].slice(0, 3).join(', ');
    return { text: `Якщо хочеться «${words}»${meth.length ? ` для ${how}` : ''}, подивись ${pick.map(l => `${l.name} — ${l.taste.toLowerCase()}`).join('; або ')}.`, lots: pick.map(l => l.id) };
  }
  if (ESPRESSO_RE.test(q)) return { text: 'Натисни «Налаштувати еспресо» і введи дозу, вихід, час та смак — я скажу одну конкретну дію за протоколом.', lots: [], espresso: true };
  return { text: 'Розкажи, який смак тобі подобається (ягоди, шоколад, горіхи, фрукти, щось винне) або як готуєш: турка, гейзер, фільтр, суперавтомат. А якщо налаштовуєш каву на барі — натисни «Налаштувати еспресо».', lots: [] };
}

/**
 * Пошук лотів для Матриці: слова смаку + спосіб приготування + назва/країна лота.
 * Повертає до `limit` лотів із поясненням, які слова збіглися.
 */
// Наміри й вайби людською мовою → слова зі словника смаків (і бажаний бік шкали вогню).
// «хочу солодку каву», «без кислинки», «дощовий вечір» — Матриця розуміє, навіть якщо смаків не названо.
const INTENTS = [
  { re: /солодк|десерт|ласощ|цукерк/, words: 'карамель, мед, шоколад, ваніль, родзинки', flame: 0.8, say: 'солодке' },
  { re: /без\s*кисл|не\s*кисл|некисл|м['’]?як|мягк|класичн|звичайн|як у дитинств/, words: 'шоколад, горіх, карамель, какао', flame: 0.85, say: 'без кислинки' },
  { re: /кисл|яскрав|соковит|свіж|бадьор/, words: 'цитрус, лимон, ягоди, смородина, журавлина', flame: 0.15, say: 'яскраве' },
  { re: /фрукт|тропі/, words: 'фрукти, тропічні фрукти, ананас, персик', flame: 0.35, say: 'фруктове' },
  { re: /ягід|ягод/, words: 'ягоди, малина, чорниця, вишня, смородина', flame: 0.3, say: 'ягідне' },
  { re: /квіт|чайн|ніжн|легк/, words: 'квіти, жасмин', flame: 0.25, say: 'ніжне' },
  { re: /шоколад|какао/, words: 'шоколад, какао', flame: 0.85, say: 'шоколадне' },
  { re: /горіх|горiх/, words: 'горіх', flame: 0.85, say: 'горіхове' },
  { re: /п['’]?ян|алкогол|ром|вин/, words: 'ром, вишня, слива', flame: 0.6, say: 'з п\'янкою ноткою' },
  { re: /гірк|міцн|насичен|щільн|ситн/, words: 'шоколад, горіх, какао', flame: 0.9, say: 'насичене' },
  { re: /дощ|вечір|затишн|зим|осін|холодн|плед/, words: 'шоколад, горіх, карамель, родзинки', flame: 0.8, say: 'вайб затишного вечора' },
  { re: /ранок|ранк|літ|сонц|гори|прогулян|спекот/, words: 'цитрус, квіти, ягоди, персик', flame: 0.25, say: 'вайб ранку' },
];
// Країни кави → регіон: якщо такої зараз немає, підкажемо схожі з того ж краю.
const ORIGINS = [
  ['гватемал', 'Гватемала', 'ca'], ['коста', 'Коста-Рика', 'ca'], ['панам', 'Панама', 'ca'], ['нікарагу', 'Нікарагуа', 'ca'], ['мексик', 'Мексика', 'ca'],
  ['сальвадор', 'Сальвадор', 'ca'], ['гондурас', 'Гондурас', 'ca'],
  ['колумб', 'Колумбія', 'sa'], ['бразил', 'Бразилія', 'sa'], ['перу', 'Перу', 'sa'], ['еквадор', 'Еквадор', 'sa'], ['болів', 'Болівія', 'sa'],
  ['ефіоп', 'Ефіопія', 'af'], ['кені', 'Кенія', 'af'], ['руанд', 'Руанда', 'af'], ['бурунд', 'Бурунді', 'af'], ['уганд', 'Уганда', 'af'], ['танзан', 'Танзанія', 'af'], ['конго', 'Конго', 'af'], ['малав', 'Малаві', 'af'], ['ємен', 'Ємен', 'af'],
  ['індонез', 'Індонезія', 'as'], ['суматр', 'Суматра', 'as'], ['ява', 'Ява', 'as'], ['інді', 'Індія', 'as'], ["в['’]?єтнам", "В'єтнам", "as"], ['китай', 'Китай', 'as'], ['папуа', 'Папуа — Нова Гвінея', 'as'],
];
const REGION = { ca: 'Центральна Америка', sa: 'Південна Америка', af: 'Африка', as: 'Азія' };
const regionOf = text => { const t = norm(text); return ORIGINS.filter(([stem]) => new RegExp(stem).test(t)).map(o => o[2]); };

export function matchLots(query, lots, cfm, limit = 3) {
  const raw = norm(query);
  const intents = INTENTS.filter(i => i.re.test(raw));
  // «без кислинки» не повинно спрацювати ще й як «кисле»
  const picked = intents.some(i => i.say === 'без кислинки') ? intents.filter(i => i.say !== 'яскраве') : intents;
  const q = picked.length ? `${raw}, ${picked.map(i => i.words).join(', ')}` : raw;
  // країна, якої зараз немає
  const asked = ORIGINS.filter(([stem]) => new RegExp(stem).test(raw));
  const have = o => lots.some(l => new RegExp(o[0]).test(norm(l.country || '')));
  const missing = asked.length && !asked.some(have) ? asked[0] : null;
  if (missing) {
    const [, name, reg] = missing;
    const near = lots.filter(l => regionOf(l.country || '').includes(reg));
    const rest = raw.replace(new RegExp(missing[0] + '\\S*', 'g'), ' ').trim();
    const res = matchLots(rest || 'шоколад', near.length ? near : lots, cfm, limit);
    const lotsOut = res.lots.length ? res.lots : (near.length ? near : lots).slice(0, limit).map(l => ({ id: l.id, score: 0, words: [], methods: [] }));
    return { ...res, lots: lotsOut, missing: { name, region: REGION[reg], near: near.length > 0 } };
  }
  const meth = methodsInText(q);
  const want = lotFlavor({ taste: q.split(/[\s,.;!?]+/).filter(w => w.length > 2).join(', ') }, cfm);
  const words = [...new Set(want.matched.map(m => m.word))];
  const nameHit = l => norm(`${l.name} ${l.country || ''}`).split(/[\s,+%()0-9]+/).filter(w => w.length > 3)
    .some(w => q.split(/[\s,.;!?]+/).some(t => t.length > 3 && (t.startsWith(w.slice(0, 4)) || w.startsWith(t.slice(0, 4)))));
  if (!meth.length && !words.length && !lots.some(nameHit)) return { lots: [], words, methods: meth, intents: picked.map(i => i.say) };
  const fits = l => !meth.length || meth.every(k => methodKeys(l.methods).includes(k));
  const pool = lots.filter(l => fits(l) || nameHit(l));
  const ranked = (pool.length ? pool : lots).map(l => {
    const f = lotFlavor(l, cfm), own = new Set(f.matched.map(m => m.word));
    const hit = words.filter(w => own.has(w));
    const goal = picked.length ? picked.reduce((a, i) => a + i.flame, 0) / picked.length : want.flame;
    const dist = goal === null || f.flame === null ? 0.5 : Math.abs(goal - f.flame);
    const score = (nameHit(l) ? 6 : 0) + hit.length * 2 + (meth.length && fits(l) ? 1.5 : 0) - dist;
    return { id: l.id, score: Math.round(score * 100) / 100, words: hit, methods: meth.filter(k => methodKeys(l.methods).includes(k)) };
  }).sort((a, b) => b.score - a.score);
  return { lots: ranked.slice(0, limit), words, methods: meth, intents: picked.map(i => i.say) };
}

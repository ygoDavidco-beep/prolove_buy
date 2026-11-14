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
export function matchLots(query, lots, cfm, limit = 3) {
  const q = norm(query);
  const meth = methodsInText(q);
  const want = lotFlavor({ taste: q.split(/[\s,.;!?]+/).filter(w => w.length > 2).join(', ') }, cfm);
  const words = [...new Set(want.matched.map(m => m.word))];
  const nameHit = l => norm(`${l.name} ${l.country || ''}`).split(/[\s,+%()0-9]+/).filter(w => w.length > 3)
    .some(w => q.split(/[\s,.;!?]+/).some(t => t.length > 3 && (t.startsWith(w.slice(0, 4)) || w.startsWith(t.slice(0, 4)))));
  if (!meth.length && !words.length && !lots.some(nameHit)) return { lots: [], words, methods: meth };
  const fits = l => !meth.length || meth.every(k => methodKeys(l.methods).includes(k));
  const pool = lots.filter(l => fits(l) || nameHit(l));
  const ranked = (pool.length ? pool : lots).map(l => {
    const f = lotFlavor(l, cfm), own = new Set(f.matched.map(m => m.word));
    const hit = words.filter(w => own.has(w));
    const dist = want.flame === null || f.flame === null ? 0.5 : Math.abs(want.flame - f.flame);
    const score = (nameHit(l) ? 6 : 0) + hit.length * 2 + (meth.length && fits(l) ? 1.5 : 0) - dist;
    return { id: l.id, score: Math.round(score * 100) / 100, words: hit, methods: meth.filter(k => methodKeys(l.methods).includes(k)) };
  }).sort((a, b) => b.score - a.score);
  return { lots: ranked.slice(0, limit), words, methods: meth };
}

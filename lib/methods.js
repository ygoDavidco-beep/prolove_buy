// Способи приготування і призначення лота. Ключі зберігаються в lots.methods (JSON-масив).
export const METHODS = {
  espresso: { for: 'еспресо', uk: 'Еспресо-машина', short: 'еспресо', group: 'method', words: ['еспресо', 'espresso', 'кавомашин', 'холдер', 'ристрет', 'американо'] },
  superauto: { for: 'суперавтомата', uk: 'Суперавтомат', short: 'суперавтомат', group: 'method', words: ['суперавтомат', 'автомат', 'кавоварк', 'delonghi', 'philips', 'jura', 'saeco'] },
  moka: { for: 'гейзера', uk: 'Гейзер', short: 'гейзер', group: 'method', words: ['гейзер', 'мока', 'moka'] },
  cezve: { for: 'турки', uk: 'Турка', short: 'турка', group: 'method', words: ['турк', 'джезв', 'cezve'] },
  filter: { for: 'фільтра', uk: 'Фільтр', short: 'фільтр', group: 'method', words: ['фільтр', 'пуровер', 'v60', 'кемекс', 'chemex', 'калита', 'аеропрес', 'aeropress', 'френч', 'крапельн', 'дріп'] },
  milk: { for: 'молочних напоїв', uk: 'Молочні напої', short: 'молочні напої', group: 'use', words: ['молок', 'капуч', 'лате', 'латте', 'флет', 'флат', 'раф', 'кортадо'] },
  cafe: { for: "кав'ярні", uk: "Для кав'ярень", short: "кав'ярні", group: 'use', words: ["кав'ярн", 'кавярн', 'бар', 'заклад', 'кафе'] },
};
export const methodKeys = v => {
  let a = v;
  if (typeof v === 'string') { try { a = JSON.parse(v); } catch { a = v.split(/[,;\s]+/); } }
  return [...new Set((Array.isArray(a) ? a : []).map(String).filter(k => METHODS[k]))];
};
export const methodList = v => methodKeys(v).map(k => ({ key: k, uk: METHODS[k].uk, short: METHODS[k].short, group: METHODS[k].group }));
/** Які способи згадано в тексті людини */
export const methodsInText = text => { const t = String(text || '').toLowerCase(); return Object.entries(METHODS).filter(([, m]) => m.words.some(w => t.includes(w))).map(([k]) => k); };

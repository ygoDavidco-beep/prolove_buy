// Ціни і знижки PROLOVE. Рахується лише на сервері; браузер показує те, що повернув сервер.
//
// Правила (з прайсу власника, 07.11.2026):
//  • 1 кг: якщо вага всього замовлення ≥ 7 кг → −10 %.
//  • 250 г: партнер (підтверджена кав'ярня) → −20 %; від 28 пачок 250 г у замовленні → −30 %.
//    Діє більша знижка. Запобіжник: 4 пачки не дешевші за оптовий 1 кг (−10 %) + 100 грн.

export const DEFAULT_RULES = {
  bulk_kg: 7, bulk_discount: 0.10,
  partner_250_discount: 0.20,
  packs_250_min: 28, packs_250_discount: 0.30,
  pack_floor_markup: 100,
};

export function rulesFrom(saved) {
  return { ...DEFAULT_RULES, ...(saved || {}) };
}

const pct = d => `−${Math.round(d * 100)}%`;

/** Оптова ціна 1 кг (від bulk_kg) */
export const bulkKg = (lot, R) => (lot.price1000 === null || lot.price1000 === undefined ? null : Math.round(lot.price1000 * (1 - R.bulk_discount)));

/** Найнижча допустима ціна пачки 250 г */
export function packFloor(lot, R) {
  const b = bulkKg(lot, R);
  return b === null ? 0 : Math.ceil((b + R.pack_floor_markup) / 4);
}

/**
 * @param lines [{lot, weight_g, qty}]
 * @param opts {partner, rules}
 * @returns {items:[{lot_id, weight_g, qty, base, price, sum, note}], total, base_total, total_kg, packs250, hints:[]}
 */
export function priceLines(lines, { partner = false, rules } = {}) {
  const R = rulesFrom(rules);
  const total_kg = lines.reduce((a, l) => a + (l.weight_g * l.qty) / 1000, 0);
  const packs250 = lines.filter(l => l.weight_g === 250).reduce((a, l) => a + l.qty, 0);
  const bulk = total_kg >= R.bulk_kg;

  const items = lines.map(({ lot, weight_g, qty }) => {
    let base = null, price = null, note = null;
    if (weight_g === 1000) {
      base = lot.price1000;
      price = base;
      if (base !== null && bulk) { price = bulkKg(lot, R); note = `${pct(R.bulk_discount)}, від ${R.bulk_kg} кг`; }
    } else if (weight_g === 250) {
      base = lot.price250;
      price = base;
      const opts = [];
      if (partner) opts.push([R.partner_250_discount, 'ціна партнера']);
      if (packs250 >= R.packs_250_min) opts.push([R.packs_250_discount, `від ${R.packs_250_min} пачок`]);
      if (base !== null && opts.length) {
        const [d, why] = opts.sort((a, b) => b[0] - a[0])[0];
        const raw = Math.round(base * (1 - d));
        const floor = Math.min(base, packFloor(lot, R));
        price = Math.max(raw, floor);
        const real = 1 - price / base;
        note = `${pct(real)}, ${why}`;
      }
    } else if (lot.price1000 !== null && lot.price1000 !== undefined) {
      base = Math.round((lot.price1000 * weight_g) / 1000);
      price = base;
    }
    return { lot_id: lot.id, weight_g, qty, base, price, sum: price === null ? null : price * qty, note };
  });

  const ok = items.every(i => i.price !== null);
  const total = ok ? items.reduce((a, i) => a + i.sum, 0) : null;
  const base_total = ok ? items.reduce((a, i) => a + i.base * i.qty, 0) : null;

  // м'які підказки «ще трохи — і дешевше», без тиску
  const hints = [];
  const kgLeft = Math.round((R.bulk_kg - total_kg) * 100) / 100;
  if (!bulk && items.some(i => i.weight_g === 1000) && kgLeft > 0 && kgLeft <= 3) hints.push(`Ще ${kgLeft.toLocaleString('uk-UA')} кг — і кілограмові пачки стануть на ${Math.round(R.bulk_discount * 100)}% дешевші`);
  const packsLeft = R.packs_250_min - packs250;
  if (packs250 > 0 && packsLeft > 0 && packsLeft <= 8 && !partner) hints.push(`Ще ${packsLeft} пач. по 250 г — і всі пачки 250 г зі знижкою до ${Math.round(R.packs_250_discount * 100)}%`);

  return { items, total, base_total, total_kg: Math.round(total_kg * 1000) / 1000, packs250, hints };
}

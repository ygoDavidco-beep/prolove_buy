// Двигун діагностики еспресо v2. Згенеровано з algorithm/diagnose.ts (tsc). Логіку правити там і перегенерувати.
/**
 * Prolove — двигун діагностики еспресо. Специфікація: ALGORITHM.md v2.
 *
 * Чиста детермінована функція без залежностей: однакові вхідні дані → однаковий результат.
 * Поточна дата передається через `input.now`, тому тести не залежать від годинника.
 * Усі пороги живуть у DEFAULT_CONFIG: технолог змінює конфіг, а не код.
 */
export const ALGORITHM_VERSION = '2.0.0';
export const DEFAULT_CONFIG = {
    // Протокол А5: ratio 1:1,8–2,5, крок корекції 0,2
    ratio: { concentratedBelow: 1.6, diluteAbove: 2.6, step: 0.2 },
    // Протокол А5: 25–32 с при 1:2. Вікно зсувається з ratio частково (преінфузія не росте з виходом)
    time: {
        minAtRef: 25, maxAtRef: 32, refRatio: 2.0, ratioElasticity: 0.6,
        roastShift: { light: 2, 'medium-light': 1, medium: 0, 'medium-dark': -1, dark: -2 },
    },
    grind: { secPerStep: 3 }, // типовий ефект одного кроку; уточнюється по млину
    temp: { min: 88, max: 96, step: 1 },
    beans: {
        restDays: { light: 10, 'medium-light': 8, medium: 7, 'medium-dark': 5, dark: 4 },
        staleAfterDays: 45,
        expectedFermentedProcesses: ['natural', 'anaerobic', 'wine_fermented'],
    },
    hard: { dose: [5, 30], yield: [5, 120], time: [5, 120], temp: [80, 100] },
    soft: { dose: [14, 22], time: [18, 45] },
    thresholds: { neutral: 0.3, strong: 0.8, strength: 0.5 },
};
// ---------- Допоміжне ----------
const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const clamp = (x, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, x));
const fmt = (x) => String(round(x, 2));
function plural(n) {
    if (!Number.isInteger(n))
        return 'поділки';
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11)
        return 'поділку';
    if (a >= 2 && a <= 4 && (b < 12 || b > 14))
        return 'поділки';
    return 'поділок';
}
export function timeWindow(ratio, roast, cfg = DEFAULT_CONFIG) {
    const f = 1 + cfg.time.ratioElasticity * (ratio / cfg.time.refRatio - 1);
    const shift = roast ? cfg.time.roastShift[roast] : 0;
    return { min: round(cfg.time.minAtRef * f + shift, 1), max: round(cfg.time.maxAtRef * f + shift, 1) };
}
function beanAge(i) {
    if (!i.bean?.roast_date)
        return null;
    const roast = Date.parse(i.bean.roast_date);
    const now = i.now ? Date.parse(i.now) : Date.now();
    if (Number.isNaN(roast) || Number.isNaN(now))
        return null;
    return Math.floor((now - roast) / 86_400_000);
}
// ---------- Валідація ----------
export function validate(i, cfg = DEFAULT_CONFIG) {
    const errors = [];
    const check = (name, v, [lo, hi], required) => {
        if (v === undefined || v === null) {
            if (required)
                errors.push(`${name}: не вказано`);
            return;
        }
        if (typeof v !== 'number' || !Number.isFinite(v)) {
            errors.push(`${name}: має бути числом`);
            return;
        }
        if (v < lo || v > hi)
            errors.push(`${name}: ${v} поза можливим діапазоном ${lo}–${hi}`);
    };
    check('Доза, г', i.dose_g, cfg.hard.dose, true);
    check('Вихід, г', i.yield_g, cfg.hard.yield, true);
    check('Час, с', i.time_sec, cfg.hard.time, true);
    check('Температура, °C', i.water_temp_c, cfg.hard.temp, false);
    return errors;
}
function collectEvidence(i, cfg, trace) {
    let under = 0, over = 0, strength = 0, n = 0, negatives = 0;
    const add = (v, why) => {
        if (v < 0)
            under += -v;
        else if (v > 0)
            over += v;
        if (v !== 0)
            trace.push(`evidence:${why}=${round(v)}`);
    };
    const neg = (cond) => { if (cond)
        negatives++; };
    if (i.first_impression) {
        n++;
        const w = { sour: -1, sharp: -0.8, flat: -0.3, balanced: 0, sweet: 0, bitter: 1, astringent: 0.7 };
        add(w[i.first_impression], `first_impression.${i.first_impression}`);
        if (i.first_impression === 'flat')
            strength -= 0.3;
        neg(!['balanced', 'sweet'].includes(i.first_impression));
    }
    if (i.acidity_quality) {
        n++;
        const w = { none: 0.3, bright_pleasant: 0, soft_round: 0, sharp_unpleasant: -0.8, overwhelming: -1 };
        const k = w[i.acidity_quality] < 0 ? (i.acidity_intensity ?? 3) / 3 : 1;
        add(w[i.acidity_quality] * k, `acidity.${i.acidity_quality}`);
        neg(i.acidity_quality === 'sharp_unpleasant' || i.acidity_quality === 'overwhelming');
    }
    if (i.sweetness_quality) {
        n++;
        if (i.sweetness_quality === 'hidden')
            add(-0.2, 'sweetness.hidden');
        neg(i.sweetness_quality === 'none');
    }
    if (i.body) {
        n++;
        const w = { watery: -1, light: -0.4, full: 0, heavy: 0.6, oily: 0.4 };
        strength += w[i.body];
        neg(i.body === 'watery');
    }
    if (i.finish) {
        n++;
        const w = { none: -0.3, bitter: 0.8, dry_astringent: 0.5, sweet_lingering: 0, clean: 0, complex: 0 };
        add(w[i.finish], `finish.${i.finish}`);
        neg(['none', 'bitter', 'dry_astringent'].includes(i.finish));
    }
    const defects = i.defects ?? [];
    if (defects.length)
        n++;
    for (const d of defects) {
        if (d === 'salty')
            add(-0.8, 'defect.salty');
        if (d === 'burnt')
            add(0.6, 'defect.burnt');
        if (d === 'woody')
            add(0.3, 'defect.woody');
        if (d === 'fermented' && expectedFermented(i, cfg))
            continue; // характер лота, не дефект
        negatives++;
    }
    return { under, over, strength, n, negatives };
}
function expectedFermented(i, cfg) {
    return !!i.bean?.process && cfg.beans.expectedFermentedProcesses.includes(i.bean.process);
}
export function qualityScore(i, cfg = DEFAULT_CONFIG) {
    const has = i.first_impression || i.acidity_quality || i.sweetness_quality || i.body || i.finish || (i.defects ?? []).length;
    if (!has)
        return null;
    let s = 50;
    if (i.first_impression)
        s += { balanced: 8, sweet: 8, sour: -8, bitter: -8, sharp: -10, astringent: -10, flat: -10 }[i.first_impression];
    if (i.acidity_quality)
        s += { bright_pleasant: 12, soft_round: 10, none: -5, sharp_unpleasant: -15, overwhelming: -18 }[i.acidity_quality];
    if (i.sweetness_quality)
        s += { rounded: 15, syrupy: 15, hidden: 3, overdominant: 0, none: -10 }[i.sweetness_quality];
    if (i.body)
        s += { full: 6, heavy: 2, oily: 2, light: 0, watery: -10 }[i.body];
    if (i.finish)
        s += { sweet_lingering: 12, complex: 12, clean: 8, none: -8, dry_astringent: -10, bitter: -15 }[i.finish];
    for (const d of i.defects ?? []) {
        if (d === 'fermented' && expectedFermented(i, cfg))
            continue;
        s -= d === 'channeling' ? 10 : 8;
    }
    return Math.round(clamp(s, 0, 100));
}
// ---------- Будівельники дій ----------
function grindAction(dir, steps, i, cfg, reasoning, warnings) {
    const unit = i.grinder?.step ?? 1;
    const amount = round(steps * unit, 2);
    const word = dir === 'finer' ? 'дрібніше' : 'грубіше';
    const g = parseFloat(String(i.grind_setting ?? '').replace(',', '.'));
    let text = `Помел ${word} на ${fmt(amount)} ${plural(amount)}`;
    if (!Number.isNaN(g) && i.grinder?.finer_is) {
        const sign = (dir === 'finer') === (i.grinder.finer_is === 'lower') ? -1 : 1;
        text = `Помел ${word}: з ${fmt(g)} на ${fmt(g + sign * amount)}`;
    }
    else if (!Number.isNaN(g)) {
        text += ` від поточних ${fmt(g)}`;
        warnings.push('Вкажи в профілі млина, в який бік число означає «дрібніше», і я писатиму точну поділку');
    }
    const sec = round(steps * cfg.grind.secPerStep, 1);
    return {
        parameter: 'grind', direction: dir, text, reasoning,
        expected: `Час ${dir === 'finer' ? 'зросте' : 'зменшиться'} приблизно на ${fmt(sec)} с. Після зміни зроби purge 3–5 г.`,
        delta: { value: dir === 'finer' ? -amount : amount, unit: 'поділка' },
    };
}
function yieldAction(dir, i, stepRatio, reasoning) {
    const r = i.yield_g / i.dose_g;
    let target = Math.round(i.dose_g * (r + (dir === 'increase' ? stepRatio : -stepRatio)));
    if (target === i.yield_g)
        target += dir === 'increase' ? 1 : -1;
    const d = target - i.yield_g;
    return {
        parameter: 'yield', direction: dir,
        text: `${dir === 'increase' ? 'Збільш' : 'Зменш'} вихід на ${Math.abs(d)} г: з ${fmt(i.yield_g)} г до ${target} г. Помел не чіпай`,
        reasoning,
        expected: `Ratio 1:${r.toFixed(1)} → 1:${(target / i.dose_g).toFixed(1)}; час ${dir === 'increase' ? 'трохи зросте' : 'трохи зменшиться'}, це нормально`,
        delta: { value: d, unit: 'г' },
    };
}
function tempAction(dir, i, cfg, reasoning, degrees = cfg.temp.step) {
    const t = i.water_temp_c;
    if (t !== undefined && ((dir === 'increase' && t >= cfg.temp.max) || (dir === 'decrease' && t <= cfg.temp.min)))
        return null;
    const sign = dir === 'increase' ? 1 : -1;
    return {
        parameter: 'temp', direction: dir,
        text: t !== undefined
            ? `${dir === 'increase' ? 'Підніми' : 'Знизь'} температуру на ${degrees} °C: з ${fmt(t)} до ${fmt(t + sign * degrees)} °C`
            : `${dir === 'increase' ? 'Підніми' : 'Знизь'} температуру на ${degrees} °C від поточної`,
        reasoning,
        expected: dir === 'increase' ? 'Більше солодкості й тіла, кислинка стане м\'якшою' : 'Менше гіркоти, чистіший фінал',
        delta: { value: sign * degrees, unit: '°C' },
    };
}
const act = (parameter, direction, text, reasoning, expected) => ({ parameter, direction, text, reasoning, ...(expected ? { expected } : {}) });
const DISTRIBUTION = (reason) => act('distribution', 'check', 'Рецепт не чіпай. Виправ розподіл: WDT голками, рівний темпінг без перекосу, не бий холдером. Повтори той самий шот', reason, 'Кислинка і гіркота мають зникнути одночасно');
// ---------- Головна функція ----------
export function diagnose(input, cfg = DEFAULT_CONFIG) {
    const trace = [];
    const warnings = [];
    const errors = validate(input, cfg);
    const i = { ...input, defects: [...new Set(input.defects ?? [])] };
    if (errors.length) {
        return {
            version: ALGORITHM_VERSION, label: 'invalid_input',
            primary: act('input', 'check', `Перевір цифри: ${errors.join('; ')}`, 'З такими числами порада буде неправдивою'),
            checks: [], causes: [{ category: 'input', title: 'Некоректні дані', explanation: errors.join('; ') }],
            confidence: 'low', quality_score: null,
            signals: { ratio: 0, ratio_class: 'normal', time_window: { min: 0, max: 0 }, time_class: 'normal', extraction: null, strength: 0, evidence_fields: 0, bean_age_days: null },
            oscillating: false, warnings: [], trace: ['gate:invalid_input'],
        };
    }
    // 1. Похідні сигнали
    const ratio = round(i.yield_g / i.dose_g, 2);
    const ratio_class = ratio < cfg.ratio.concentratedBelow ? 'concentrated' : ratio > cfg.ratio.diluteAbove ? 'dilute' : 'normal';
    const roast = i.bean?.roast_level;
    const win = timeWindow(ratio, roast, cfg);
    const time_class = i.time_sec < win.min ? 'fast' : i.time_sec > win.max ? 'slow' : 'normal';
    const age = beanAge(i);
    const ev = collectEvidence(i, cfg, trace);
    const T = cfg.thresholds;
    const extraction = ev.n ? round(clamp((ev.over - ev.under) / 1.5), 2) : null;
    const strength = round(clamp(ev.strength + (ratio_class === 'dilute' ? -0.5 : ratio_class === 'concentrated' ? 0.5 : 0)), 2);
    const quality = qualityScore(i, cfg);
    const defects = i.defects ?? [];
    const has = (d) => defects.includes(d);
    trace.push(`signals:ratio=${ratio}(${ratio_class}) time=${i.time_sec}/${win.min}-${win.max}(${time_class}) e=${extraction} s=${strength}`);
    // 2. М'які попередження
    if (i.dose_g < cfg.soft.dose[0])
        warnings.push(`Доза ${fmt(i.dose_g)} г низька для подвійного кошика`);
    if (i.dose_g > cfg.soft.dose[1])
        warnings.push(`Доза ${fmt(i.dose_g)} г висока — перевір розмір кошика`);
    if (i.basket_g && Math.abs(i.dose_g - i.basket_g) > 1.5)
        warnings.push(`Доза відрізняється від номіналу кошика (${i.basket_g} г) більш ніж на 1,5 г`);
    if (i.time_sec < cfg.soft.time[0])
        warnings.push('Час екстракції критично короткий');
    if (i.time_sec > cfg.soft.time[1])
        warnings.push('Час екстракції критично довгий');
    if (i.water_temp_c !== undefined && i.water_temp_c < cfg.temp.min)
        warnings.push(`Температура ${fmt(i.water_temp_c)} °C нижча за робочий діапазон`);
    if (i.water_temp_c !== undefined && i.water_temp_c > cfg.temp.max)
        warnings.push(`Температура ${fmt(i.water_temp_c)} °C вища за робочий діапазон`);
    const rest = roast ? cfg.beans.restDays[roast] : cfg.beans.restDays.medium;
    if (age !== null && age < rest)
        warnings.push(`Зерно свіже (${age} дн. після обсмаження) — екстракція може бути нестабільною`);
    if (age !== null && age > cfg.beans.staleAfterDays)
        warnings.push(`Зерно ${age} дн. після обсмаження — аромати слабшають`);
    // 3. Осциляція: попередня порада була протилежною
    const prev = i.previous?.primary;
    const opposite = { finer: 'coarser', coarser: 'finer', increase: 'decrease', decrease: 'increase' };
    const isOscillation = (p, d) => !!prev && prev.parameter === p && opposite[prev.direction] === d;
    let oscillating = false;
    const checks = [];
    const causes = [];
    const addCheck = (a) => { if (a && !checks.some(c => c.parameter === a.parameter))
        checks.push(a); };
    const done = (label, primary, confidence) => {
        trace.push(`label:${label} primary:${primary.parameter}.${primary.direction}`);
        return {
            version: ALGORITHM_VERSION, label, primary,
            checks: checks.filter(c => c.parameter !== primary.parameter).slice(0, 2),
            causes: causes.slice(0, 3), confidence, quality_score: quality,
            signals: { ratio, ratio_class, time_window: win, time_class, extraction, strength, evidence_fields: ev.n, bean_age_days: age },
            oscillating, warnings: [...new Set(warnings)], trace,
        };
    };
    // Перевірки за дефектами, що не змінюють рецепт
    if (has('metallic'))
        addCheck(act('water', 'check', 'Перевір воду: жорсткість і лужність за методикою «Вода для кави», картридж фільтра, накип у бойлері', 'Металевий присмак майже завжди від води або обладнання, а не від рецепта'));
    if (has('burnt'))
        addCheck(act('equipment', 'check', 'Зроби бекфлеш з засобом і почисть душ групи', 'Пригорілий присмак часто дає стара кавова олія на групі'));
    if (has('papery'))
        addCheck(act('beans', 'check', 'Перевір зберігання: закрита тара з клапаном, без світла і тепла; бункер не на цілий день', 'Паперовий присмак — ознака окислення зерна'));
    if (has('woody'))
        addCheck(act('beans', 'check', 'Деревні ноти: перевір, чи це не минулорічний урожай зеленого зерна', 'Деревність дає старе зелене зерно або перегріті жорна'));
    if (has('vinegary'))
        addCheck(act('beans', 'check', 'Оцтові ноти — це дефект навіть для ферментованого лота. Перевір партію зерна і повідом обсмажувальника', 'Оцтова кислота вказує на зіпсовану ферментацію'));
    if (has('fermented') && !expectedFermented(i, cfg))
        addCheck(act('beans', 'check', 'Ферментовані ноти в митому зерні — ознака дефекту зеленого зерна. Повідом обсмажувальника', 'Для митої обробки такий присмак не характерний'));
    if (has('fermented') && expectedFermented(i, cfg))
        trace.push('note:fermented_expected_for_process');
    if (i.flow === 'blond_early')
        addCheck(act('yield', 'check', 'Потік рано світлішає: можна зупинити шот на 1–2 г раніше', 'Світлий потік наприкінці додає водянистості й гіркоти'));
    // GATE 1. Нерівна екстракція (канали): рецепт не змінюємо
    const observedChannel = has('channeling') || i.flow === 'spurting' || i.flow === 'uneven';
    const mixed = ev.under >= T.strong && ev.over >= T.strong;
    if (observedChannel || mixed) {
        trace.push(`gate:uneven(observed=${observedChannel},mixed=${mixed})`);
        causes.push({ category: 'technique', title: 'Нерівна екстракція (канали)', explanation: 'Вода пройшла таблеткою нерівно: частина кави недотягнута (кислинка), частина перетягнута (гіркота). Це розподіл, а не рецепт.' });
        if (age !== null && age < rest) {
            addCheck(act('rest', 'check', `Зерну ${age} дн. — надлишок CO₂ теж рве таблетку. Дай відпочити ще ${rest - age} дн.`, 'Свіже зерно газує і створює канали'));
        }
        if (prev?.parameter === 'distribution')
            addCheck(act('equipment', 'check', 'Канали повторюються: перевір знос жорен, кошик і прокладку групи', 'Якщо техніка правильна, причина в обладнанні'));
        return done('uneven_extraction', DISTRIBUTION('Зміна помелу чи виходу не виправить нерівну екстракцію і зіб\'є налаштування'), observedChannel ? 'high' : 'medium');
    }
    // GATE 2. Смак у балансі — фіксуємо, навіть якщо цифри «нестандартні». Смак важливіший за цифри.
    const balanced = extraction !== null && Math.abs(extraction) < T.neutral && Math.abs(strength) < T.strength
        && ev.negatives === 0 && (['balanced', 'sweet'].includes(i.first_impression ?? '') || (quality ?? 0) >= 60);
    if (balanced) {
        trace.push('gate:balanced');
        if (time_class !== 'normal')
            warnings.push(`Час ${i.time_sec} с поза типовим вікном ${win.min}–${win.max} с, але смак у балансі. Довіряй смаку`);
        causes.push({ category: 'extraction', title: 'Шот у балансі', explanation: 'Кислотність, солодкість і тіло в гармонії.' });
        return done('balanced', act('recipe', 'keep', `Зафіксуй рецепт: ${fmt(i.dose_g)} г → ${fmt(i.yield_g)} г за ${fmt(i.time_sec)} с${i.grind_setting ? `, помел ${i.grind_setting}` : ''}`, 'Не змінюй те, що працює. Збережи рецепт для цього зерна'), ev.n >= 2 ? 'high' : 'medium');
    }
    // GATE 3. Зерно: занадто старе з типовими ознаками
    const staleSigns = has('papery') || has('woody') || i.first_impression === 'flat';
    if (age !== null && age > cfg.beans.staleAfterDays && staleSigns) {
        trace.push('gate:beans_stale');
        causes.push({ category: 'beans', title: 'Зерно застаре', explanation: `${age} дн. після обсмаження: аромати втрачені, смак пласкіший. Рецептом цього не виправити.` });
        return done('beans_stale', act('beans', 'replace', 'Відкрий свіжішу пачку і налаштуй шот на ній', 'Старе зерно не дасть смаку при жодному рецепті'), 'medium');
    }
    // GATE 4. Лише вода/обладнання: смак не зміщений, але є металевий чи пригорілий присмак
    if ((has('metallic') || has('burnt')) && (extraction === null || Math.abs(extraction) < T.neutral)) {
        trace.push('gate:equipment_or_water');
        causes.push({ category: 'equipment', title: 'Вода або обладнання', explanation: 'Екстракція в нормі, але є сторонній присмак. Його джерело поза рецептом.' });
        const primary = checks.find(c => c.parameter === (has('metallic') ? 'water' : 'equipment'));
        return done('equipment_or_water', primary, 'medium');
    }
    // GATE 4b. Паперовий присмак без зміщення екстракції — зерно
    if (has('papery') && (extraction === null || Math.abs(extraction) < T.neutral)) {
        trace.push('gate:papery');
        causes.push({ category: 'beans', title: 'Окислене зерно', explanation: 'Паперовий присмак з\'являється, коли зерно довго контактує з повітрям.' });
        return done(age !== null && age > cfg.beans.staleAfterDays ? 'beans_stale' : 'inconclusive', checks.find(c => c.parameter === 'beans'), 'medium');
    }
    const under = extraction !== null && extraction <= -T.neutral;
    const over = extraction !== null && extraction >= T.neutral;
    // GATE 5. Температура за межами робочого діапазону — виправляємо викид першим
    if (i.water_temp_c !== undefined) {
        if (under && i.water_temp_c < cfg.temp.min) {
            trace.push('gate:temp_outlier_low');
            causes.push({ category: 'temperature', title: 'Холодна вода', explanation: 'Нижче робочого діапазону кава недоекстрагується.' });
            return done('underextracted', tempAction('increase', i, cfg, 'Температура нижча за робочий діапазон — спершу прибери цей викид', 2), 'high');
        }
        if (over && i.water_temp_c > cfg.temp.max) {
            trace.push('gate:temp_outlier_high');
            causes.push({ category: 'temperature', title: 'Гаряча вода', explanation: 'Вище робочого діапазону швидше витягується гіркота.' });
            return done('overextracted', tempAction('decrease', i, cfg, 'Температура вища за робочий діапазон — спершу прибери цей викид', 2), 'high');
        }
    }
    // GATE 6. Суперечність: час каже одне, смак — інше. Помел тут не причина.
    if (under && time_class === 'slow') {
        trace.push('gate:contradiction_slow_sour');
        causes.push({ category: 'extraction', title: 'Повільно, але кисло', explanation: 'Грубіший помел зробить шот ще кислішим. Причина частіше в дозі, свіжому зерні, світлій обсмажці або низькій температурі.' });
        addCheck(act('grind', 'keep', 'Не роби помел грубішим: стане ще кисліше', 'Час і смак суперечать один одному'));
        if (i.basket_g && i.dose_g > i.basket_g + 1) {
            return done('contradiction', { parameter: 'dose', direction: 'decrease', text: `Зменш дозу на 1 г: з ${fmt(i.dose_g)} до ${fmt(i.dose_g - 1)} г`, reasoning: `Кошик ${i.basket_g} г переповнений: таблетка надто щільна, вода проходить повільно і нерівно`, expected: 'Потік пришвидшиться, смак стане солодшим', delta: { value: -1, unit: 'г' } }, 'medium');
        }
        if (age !== null && age < rest) {
            return done('beans_too_fresh', act('rest', 'check', `Дай зерну відпочити ще ${rest - age} дн. Поки що працюй з іншою пачкою`, `${age} дн. після обсмаження: CO₂ гальмує потік і заважає екстракції`), 'medium');
        }
        const t = tempAction('increase', i, cfg, 'Вища температура краще розчиняє солодкі сполуки, не змінюючи потоку');
        if (t)
            return done('contradiction', t, 'low');
        return done('contradiction', act('beans', 'check', 'Перевір дату обсмаження і ступінь обсмажки: для дуже світлого зерна збільш ratio до 1:2,3–2,5', 'Температура вже на максимумі'), 'low');
    }
    if (over && time_class === 'fast') {
        trace.push('gate:contradiction_fast_bitter');
        causes.push({ category: 'technique', title: 'Швидко, але гірко', explanation: 'Швидкий потік з гіркотою — типова ознака каналів або зависокої температури, а не надто грубого помелу.' });
        addCheck(tempAction('decrease', i, cfg, 'Якщо розподіл рівний, а гіркота лишилась — знизь температуру'));
        return done('contradiction', DISTRIBUTION('Гіркота при швидкому потоці — найчастіше канали'), 'low');
    }
    // GATE 7. Екстракція зміщена — один важіль
    const oscStep = (p, d) => { if (isOscillation(p, d)) {
        oscillating = true;
        trace.push('note:oscillation');
        return 0.5;
    } return 1; };
    if (under || over) {
        const dir = under ? 'under' : 'over';
        const timeAgrees = (under && time_class === 'fast') || (over && time_class === 'slow');
        const confScore = (timeAgrees ? 1 : 0) + (ev.n >= 2 ? 1 : 0) + (Math.abs(extraction) >= T.strong / 1.5 ? 1 : 0);
        const confidence = confScore >= 2 ? 'high' : confScore === 1 ? 'medium' : 'low';
        causes.push(under
            ? { category: 'extraction', title: 'Недоекстракція', explanation: 'Кава віддала замало: переважають кислоти і солоність, бракує солодкості.' }
            : { category: 'extraction', title: 'Переекстракція', explanation: 'Кава віддала забагато: з\'явились гіркі й в\'яжучі сполуки.' });
        if (roast === 'light' && under)
            addCheck(tempAction('increase', i, cfg, 'Світла обсмажка любить вищу температуру і довший ratio (до 1:2,3–2,5)'));
        if (roast === 'dark' && over)
            addCheck(tempAction('decrease', i, cfg, 'Темна обсмажка любить нижчу температуру і коротший ratio (1:1,8–2,0)'));
        if (Math.abs(strength) >= T.strength)
            addCheck(act('yield', 'check', strength < 0 ? 'Тіло водянисте — після корекції екстракції перевір ratio' : 'Тіло важке — після корекції екстракції перевір ratio', 'Сила напою — окрема вісь від екстракції'));
        if (timeAgrees) {
            const dev = time_class === 'fast' ? win.min - i.time_sec : i.time_sec - win.max;
            const gdir = under ? 'finer' : 'coarser';
            const steps = (dev <= 4 ? 1 : dev <= 9 ? 2 : 3) * oscStep('grind', gdir);
            trace.push(`gate:grind(${gdir},dev=${round(dev, 1)},steps=${steps})`);
            const reason = `Час ${fmt(i.time_sec)} с ${time_class === 'fast' ? 'коротший' : 'довший'} за вікно ${win.min}–${win.max} с для ratio 1:${ratio.toFixed(1)}. Помел керує часом, тож спершу виправляємо його`;
            const a = grindAction(gdir, steps, i, cfg, oscillating ? `${reason}. Ти перескочив оптимум — роби пів кроку` : reason, warnings);
            return done(dir === 'under' ? 'underextracted' : 'overextracted', a, confidence);
        }
        // Час у вікні → баланс через ratio (протокол: «Ratio → коригує смак»)
        const ydir = under ? 'increase' : 'decrease';
        const stepR = cfg.ratio.step * oscStep('yield', ydir);
        const next = ratio + (under ? stepR : -stepR);
        if (next <= cfg.ratio.diluteAbove && next >= cfg.ratio.concentratedBelow) {
            trace.push(`gate:ratio(${ydir})`);
            return done(dir === 'under' ? 'underextracted' : 'overextracted', yieldAction(ydir, i, stepR, `Час у нормі, отже помел правильний. ${under ? 'Різку кислинку і пустоту' : 'Гіркоту і сухість'} виправляє ${under ? 'більший' : 'менший'} вихід`), confidence);
        }
        trace.push('gate:ratio_at_limit→temp');
        const t = tempAction(under ? 'increase' : 'decrease', i, cfg, `Ratio вже на межі (1:${ratio.toFixed(1)}), тому наступний важіль — температура`);
        if (t)
            return done(dir === 'under' ? 'underextracted' : 'overextracted', t, confidence);
        return done(dir === 'under' ? 'underextracted' : 'overextracted', grindAction(under ? 'finer' : 'coarser', 0.5, i, cfg, 'Ratio і температура на межі — лишається пів кроку помелу', warnings), 'low');
    }
    // GATE 8. Екстракція нейтральна, але сила напою не та
    if (extraction !== null && Math.abs(strength) >= T.strength) {
        if (strength < 0) {
            trace.push('gate:dilute');
            causes.push({ category: 'ratio', title: 'Розведено', explanation: 'Смак правильний, але слабкий: забагато води відносно кави.' });
            if (ratio - cfg.ratio.step >= cfg.ratio.concentratedBelow) {
                return done('dilute', yieldAction('decrease', i, cfg.ratio.step * oscStep('yield', 'decrease'), 'Менший вихід зробить напій щільнішим, не зсуваючи баланс'), ratio_class === 'dilute' ? 'high' : 'medium');
            }
            return done('dilute', { parameter: 'dose', direction: 'increase', text: `Збільш дозу на 0,5 г: з ${fmt(i.dose_g)} до ${fmt(i.dose_g + 0.5)} г, вихід лиши`, reasoning: 'Ratio вже короткий, тому щільність додаємо дозою', expected: 'Тіло стане щільнішим; час трохи зросте', delta: { value: 0.5, unit: 'г' } }, 'medium');
        }
        trace.push('gate:concentrated');
        causes.push({ category: 'ratio', title: 'Занадто концентровано', explanation: 'Вихід замалий відносно дози: смак затиснутий.' });
        return done('concentrated', yieldAction('increase', i, cfg.ratio.step * oscStep('yield', 'increase'), 'Більший вихід розкриє смак, не зсуваючи баланс'), ratio_class === 'concentrated' ? 'high' : 'medium');
    }
    // GATE 9. Смаку не описано або він невизначений — працюємо з часом, але чесно кажемо про низьку впевненість
    if (time_class !== 'normal') {
        trace.push('gate:time_only');
        const gdir = time_class === 'fast' ? 'finer' : 'coarser';
        const dev = time_class === 'fast' ? win.min - i.time_sec : i.time_sec - win.max;
        causes.push({ category: 'input', title: 'Смак не описано', explanation: 'Порада лише за часом. Опиши смак — і вона стане точнішою.' });
        return done('inconclusive', grindAction(gdir, (dev <= 4 ? 1 : 2) * oscStep('grind', gdir), i, cfg, `Час поза вікном ${win.min}–${win.max} с`, warnings), 'low');
    }
    trace.push('gate:inconclusive');
    causes.push({ category: 'input', title: 'Профіль невизначений', explanation: 'Цифри в нормі, а опис смаку не вказує на конкретний зсув.' });
    if (age !== null && age > cfg.beans.staleAfterDays)
        addCheck(act('beans', 'check', 'Спробуй свіжішу пачку', `Зерну ${age} дн.`));
    return done('inconclusive', act('input', 'check', 'Опиши смак точніше: перше враження, кислотність, фінал. Або зроби ще один шот і порівняй', 'Без чіткого сигналу краще нічого не змінювати'), 'low');
}

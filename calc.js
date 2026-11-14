// Калькулятор порції: кава ↔ вода ↔ чашка. Вводиш будь-яке поле — інші перераховуються.
// Налаштування на блоці: data-ratio (г кави на 100 мл води, типово 6), data-loss (% води, що лишається в каві, типово 10), data-coffee (стартова доза).
const num = v => { const x = parseFloat(String(v).replace(',', '.').replace(/[^\d.]/g, '')); return Number.isFinite(x) && x > 0 ? x : null; };
const g1 = x => String(Math.round(x * 10) / 10).replace('.', ',');
const ml = x => String(Math.round(x));

for (const box of document.querySelectorAll('[data-calc]')) {
  const ratio = +box.dataset.ratio || 6, keep = 1 - (+box.dataset.loss || 10) / 100;
  box.innerHTML = `
    <div class="calc-head"><h3>Калькулятор порції</h3><p>${g1(ratio)} г кави на 100 мл води · у чашці на ${Math.round((1 - keep) * 100)}% менше — стільки вбирає кава</p></div>
    <div class="calc-row">
      <label><span>Кава</span><input data-f="coffee" inputmode="decimal" autocomplete="off" aria-label="Кава, грамів"><i>г</i></label>
      <b aria-hidden="true">→</b>
      <label><span>Вода</span><input data-f="water" inputmode="decimal" autocomplete="off" aria-label="Вода, мілілітрів"><i>мл</i></label>
      <b aria-hidden="true">→</b>
      <label class="cup"><span>У чашці</span><input data-f="cup" inputmode="decimal" autocomplete="off" aria-label="Готовий напій, мілілітрів"><i>мл</i></label>
    </div>
    <p class="calc-say" aria-live="polite"></p>`;
  const f = Object.fromEntries([...box.querySelectorAll('input')].map(i => [i.dataset.f, i]));
  const say = box.querySelector('.calc-say');
  const fill = (from, v) => {
    const water = from === 'coffee' ? v / ratio * 100 : from === 'water' ? v : v / keep;
    const coffee = water * ratio / 100, cup = water * keep;
    if (from !== 'coffee') f.coffee.value = g1(coffee);
    if (from !== 'water') f.water.value = ml(water);
    if (from !== 'cup') f.cup.value = ml(cup);
    box._v = { coffee, water, cup };
    box.dispatchEvent(new CustomEvent('calc', { detail: box._v }));
    say.textContent = coffee > 60 ? 'Це багато кави за раз — для великої компанії краще заварити в дві порції.' : '';
  };
  for (const [k, input] of Object.entries(f)) {
    input.addEventListener('input', () => { const v = num(input.value); if (v) fill(k, v); });
    input.addEventListener('focus', () => input.select());
  }
  const start = num(box.dataset.coffee) || 12;
  f.coffee.value = g1(start); fill('coffee', start);
}

// «Заварити» з картки лота: /brew?m=cezve — показуємо, що є для цього способу.
const NAMES = { espresso: 'еспресо', superauto: 'суперавтомата', moka: 'гейзера', cezve: 'турки', filter: 'фільтра' };
const m = new URLSearchParams(location.search).get('m');
const box = document.getElementById('mHint');
if (box && NAMES[m]) {
  box.hidden = false;
  if (m === 'filter') {
    box.querySelector('.cap').innerHTML = '<h3>Для <em>фільтра</em></h3><p>Калькулятор порції і секундомір — одразу нижче: обери вагу, тисни «Старт», і він підкаже кожне вливання.</p>';
  } else {
    box.querySelector('.cap').innerHTML = `<h3>Для <em>${NAMES[m]}</em></h3><p>Комікс-інструкцію для ${NAMES[m]} саме малюємо. Поки напиши нам в Instagram — підкажемо рецепт під твій лот.</p><p><a class="btn" href="https://instagram.com/prolove_coffee" target="_blank" rel="noopener">Написати в Instagram</a></p>`;
  }
}

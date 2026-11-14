// Звичайний (не модульний) скрипт у <head>: позначає перехід «назад», щоб сторінка від'їжджала праворуч, як в Instagram.
addEventListener('pagereveal', function (e) {
  try {
    if (e.viewTransition && window.navigation && navigation.activation && navigation.activation.navigationType === 'traverse') e.viewTransition.types.add('back');
  } catch (err) { /* браузер без переходів — просто без анімації */ }
});
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-back]');
  if (!b) return;
  try {
    if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) { e.preventDefault(); history.back(); }
  } catch (err) { /* звичайне посилання */ }
});

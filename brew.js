// «Заварити»: хаб способів. З картки лота приходить /brew?m=cezve — одразу відкриваємо сторінку способу.
import { METHODS, ORDER, FROM_LOT } from './methods.js?v=mwht0uki';
import { deviceIcon } from './art.js?v=mwht0uki';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sfx = location.pathname.endsWith('.html') ? '.html' : '';
const m = new URLSearchParams(location.search).get('m');
if (FROM_LOT[m]) location.replace(`method${sfx}?m=${FROM_LOT[m]}`);

const box = document.getElementById('methods');
if (box) {
  box.innerHTML = ORDER.map((k, i) => {
    const x = METHODS[k];
    return `<a href="method${sfx}?m=${k}"><article class="pnl"><span class="no">${i + 2}</span><div class="art">${deviceIcon(x.icon)}</div>
      <div class="cap"><h3>${esc(x.title)}</h3><p>${esc(x.stamp)}${x.champs?.length ? ' · <b>рецепти чемпіонів</b>' : ''}</p></div></article></a>`;
  }).join('');
}

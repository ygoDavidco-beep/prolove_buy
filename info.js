// «Інфо»: підставляє контакти, реквізити продавця і знижки з налаштувань сайту.
const $ = s => document.querySelector(s);
const nicePhone = p => { const d = String(p).replace(/\D/g, '').replace(/^380/, '0'); return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : p; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
(async () => {
  let d;
  try { d = await fetch('/api/info').then(r => r.json()); } catch { return; }
  const c = d.contacts || {};
  $('#contacts').innerHTML = [
    c.telegram && `<a class="hot" href="${esc(c.telegram)}" target="_blank" rel="noopener">Telegram<small>напиши — відповімо особисто</small></a>`,
    c.instagram && `<a href="${esc(c.instagram)}" target="_blank" rel="noopener">Instagram<small>@prolove_coffee</small></a>`,
    c.support && c.support !== c.telegram && c.support !== c.instagram && `<a href="${esc(c.support)}" target="_blank" rel="noopener">Підтримка<small>питання щодо замовлення</small></a>`,
    (c.phone || d.seller?.phone) && `<a href="tel:${esc((c.phone || d.seller.phone).replace(/[^\d+]/g, ''))}">Телефон<small>${esc(nicePhone(c.phone || d.seller.phone))}</small></a>`,
    d.seller?.email && `<a href="mailto:${esc(d.seller.email)}">Email<small>${esc(d.seller.email)}</small></a>`,
  ].filter(Boolean).join('');
  if (c.hours) $('#hours').textContent = `Відповідаємо ${c.hours}. У «Запитай» напиши !ростер — і ростер приєднається до розмови.`;
  const r = d.rules;
  if (r) {
    const p = x => Math.round(x * 100);
    $('#disc').innerHTML = `<b>−${p(r.bulk_discount)}%</b><span>на кілограмові пачки, коли в замовленні від ${r.bulk_kg} кг</span>
      <b>−${p(r.partner_250_discount)}%</b><span>на пачки 250 г для партнерів</span>
      <b>до −${p(r.packs_250_discount)}%</b><span>на 250 г від ${r.packs_250_min} пачок у замовленні</span>`;
  }
  const s = d.seller || {};
  const row = (k, v) => (v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '');
  $('#seller').innerHTML = row('Бренд', 'PROLOVE') + row('Продавець', s.name) + row('ІПН / ЄДРПОУ', s.code) + row(s.name ? 'Адреса' : 'Місто', s.address) + row('Телефон', s.phone) + row('Email', s.email);
})();

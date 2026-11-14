// Вхід через Telegram і заявка на партнерство.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const views = ['vIn', 'vCode', 'vMe'];
const show = id => views.forEach(v => { $('#' + v).hidden = v !== id; });
const ss = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { /* */ } } };

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Помилка'), j);
  return j;
}

let token = ss.get('pl_login_token'), poll = null;

function showMe(me) {
  show('vMe');
  $('#hi').textContent = `Привіт, ${me.first_name || 'друже'}`;
  const ST = { client: ['клієнт', 'var(--muted)'], partner_pending: ['заявку на розгляді', '#F2B33D'], partner: ['партнер', '#5EC4CC'] }[me.status] || [me.status, 'var(--muted)'];
  $('#who').innerHTML = `<div style="font-weight:800;font-size:17px">${esc(me.phone)}</div>
    ${me.tg_username ? `<div style="color:var(--muted);font-size:14px">@${esc(me.tg_username)}</div>` : ''}
    ${me.cafe ? `<div style="margin-top:6px">${esc(me.cafe)}</div>` : ''}
    <div style="margin-top:10px"><span class="st" style="color:${ST[1]}">${ST[0]}</span></div>`;
  $('#apply').hidden = me.status !== 'client';
  $('#pending').hidden = me.status !== 'partner_pending';
  $('#partner').hidden = me.status !== 'partner';
}

function showCode(link) {
  show('vCode');
  $('#openBot').hidden = !link;
  if (link) $('#openBot').href = link;
  $('#codeHint').textContent = link
    ? 'Відкрий бота PROLOVE у Telegram, натисни «Поділитися номером» — бот надішле код.'
    : 'Код надіслано тобі в Telegram. Введи його нижче.';
  $('#code').value = ''; $('#msg').textContent = '';
  clearInterval(poll);
  if (link) poll = setInterval(async () => {
    const s = await fetch('/api/auth/status?token=' + encodeURIComponent(token)).then(r => r.json()).catch(() => ({}));
    if (s.status === 'code_sent') { $('#msg').textContent = 'Код надіслано в Telegram ✓'; $('#code').focus(); clearInterval(poll); }
    if (s.status === 'missing') clearInterval(poll);
  }, 2500);
}

$('#tgBtn').onclick = async () => {
  // вікно відкриваємо одразу, щоб браузер не заблокував перехід у Telegram
  const w = window.open('', '_blank');
  try {
    const j = await post('/api/auth/telegram/start');
    token = j.token; ss.set('pl_login_token', token); ss.set('pl_login_link', j.link);
    if (w) w.location.href = j.link; else location.href = j.link;
    showCode(j.link);
  } catch (e) { w?.close(); toast(e.message); }
};
$('#phoneBtn').onclick = async () => {
  try {
    const j = await post('/api/auth/phone/start', { phone: $('#phone').value });
    token = j.token; ss.set('pl_login_token', token); ss.set('pl_login_link', null);
    showCode(null);
    if (j.via === 'sms') $('#codeHint').textContent = 'Код надіслано в SMS. Введи його нижче.';
  } catch (e) { toast(e.message); }
};
$('#code').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); if (e.target.value.length === 6) $('#verify').click(); };
$('#verify').onclick = async () => {
  try {
    const j = await post('/api/auth/verify', { token, code: $('#code').value });
    clearInterval(poll); ss.set('pl_login_token', null); ss.set('pl_login_link', null);
    showMe(j.me);
  } catch (e) { $('#msg').textContent = e.left !== undefined ? `${e.message}. Залишилось спроб: ${e.left}` : e.message; }
};
$('#back').onclick = () => { clearInterval(poll); ss.set('pl_login_token', null); token = null; show('vIn'); };
$('#applyBtn').onclick = async () => {
  try { const j = await post('/api/me/partner', { cafe: $('#cafe').value }); showMe(j.me); } catch (e) { $('#msg2').textContent = e.message; }
};
$('#logout').onclick = async () => { await post('/api/auth/logout'); show('vIn'); };

function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }

(async () => {
  const [{ me }, cfg] = await Promise.all([fetch('/api/me').then(r => r.json()), fetch('/api/auth/config').then(r => r.json())]);
  if (me) return showMe(me);
  $('#tgBtn').disabled = !cfg.telegram;
  if (!cfg.telegram) $('#tgBtn').textContent = 'Вхід через Telegram скоро';
  $('#phoneBox').hidden = !cfg.phone;
  $('#phoneBtn').textContent = cfg.phone_via === 'sms' ? 'Надіслати код SMS' : 'Надіслати код у Telegram';
  if (token) showCode(ss.get('pl_login_link')); else show('vIn');
})();

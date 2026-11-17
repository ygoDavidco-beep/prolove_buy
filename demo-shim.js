// Демо PROLOVE без сервера: /api/* відповідає прямо в браузері тим самим кодом, що й сервер.
// Замовлення нікуди не відправляються; ШІ працює в локальному режимі (підбір за словником смаку).
import { compile, lotFlavor, descriptorColor, gradientCss, norm } from './lib/flavor.js';
import { priceLines, bulkKg, DEFAULT_RULES } from './lib/pricing.js';
import { diagnose } from './lib/diagnose.js';
import { localAnswer, matchLots } from './lib/local-answer.js';
import { METHODS, methodList } from './lib/methods.js';

const realFetch = window.fetch.bind(window);
const CONTACTS = { instagram: 'https://instagram.com/prolove_coffee', telegram: '', support: 'https://instagram.com/prolove_coffee' };
const ready = Promise.all([realFetch('data/flavor-seed.json').then(r => r.json()), realFetch('data/lots.json').then(r => r.json())])
  .then(([seed, lots]) => ({ m: compile(seed), lots: lots.filter(l => l.active !== 0) }));

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const lotById = (lots, id) => lots.find(l => l.id === id);

function publicLot(l, m) {
  const f = lotFlavor(l, m);
  return {
    id: l.id, name: l.name, country: l.country, taste: l.taste, process_label: l.process_label, farm: l.farm, altitude: l.altitude, variety: l.variety, methods: methodList(l.methods),
    description: l.description, price250: l.price250, price1000: l.price1000, price1000_bulk: bulkKg(l, DEFAULT_RULES),
    flame: f.flame, color: f.color, words: f.matched.map(x => ({ term: x.term, word: x.word, color: x.color, cat: x.cat })),
    categories: [...new Set(f.matched.map(x => x.cat))].map(code => ({ code, uk: m._cats.get(code).uk, color: descriptorColor({ cat: code }, m) })),
  };
}

function espressoInput(b, lot) {
  const n = (v, lo, hi) => { const x = Number(String(v ?? '').replace(',', '.')); if (!Number.isFinite(x) || x < lo || x > hi) throw new Error('Перевір цифри: доза, вихід і час'); return x; };
  const i = { dose_g: n(b.dose_g, 5, 30), yield_g: n(b.yield_g, 5, 120), time_sec: n(b.time_sec, 5, 120) };
  if (['sharp', 'sour', 'balanced', 'sweet', 'flat', 'bitter', 'astringent'].includes(b.first_impression)) i.first_impression = b.first_impression;
  if (['even', 'spurting', 'uneven', 'blond_early', 'gushing', 'slow_drip'].includes(b.flow)) i.flow = b.flow;
  const process = lot?.process && lot.process !== 'other' ? lot.process : undefined;
  if (process) i.bean = { name: lot.name, process };
  if (b.previous?.parameter && b.previous?.direction) i.previous = { primary: { parameter: String(b.previous.parameter), direction: String(b.previous.direction) } };
  return i;
}

async function handle(path, method, body) {
  const { m, lots } = await ready;
  if (path === '/api/lots') return json(lots.map(l => publicLot(l, m)));
  if (path === '/api/flavor-map') return json({ flame_stops: m.flame_stops, gradient: gradientCss(m.flame_stops), moods: m.moods, neutral_color: m.neutral_color, methods: Object.entries(METHODS).map(([key, x]) => ({ key, uk: x.uk, short: x.short, group: x.group })), categories: m.categories.map(c => ({ ...c, color: descriptorColor({ cat: c.code }, m) })) });
  if (path === '/api/me') return json({ me: null });
  if (path === '/api/auth/config') return json({ telegram: false, bot_username: null, phone: false, phone_via: null });
  if (path === '/api/ask/config') return json({ ai: false, contacts: CONTACTS });
  if (path === '/api/quote' || path === '/api/orders') {
    const lines = (body.items || []).map(i => ({ lot: lotById(lots, i.id), weight_g: +i.w === 1000 ? 1000 : 250, qty: Math.max(1, Math.round(+i.qty || 1)) })).filter(x => x.lot);
    const q = priceLines(lines, { partner: false, rules: DEFAULT_RULES });
    if (path === '/api/quote') return json({ items: q.items, total: q.total, base_total: q.base_total, total_kg: q.total_kg, hints: q.hints, partner: false });
    if (!String(body.name || '').trim()) return json({ error: "Вкажи ім'я" }, 400);
    if (!String(body.delivery || '').trim() && !(String(body.np_city || '').trim() && String(body.np_branch || '').trim())) return json({ error: 'Вкажи місто і відділення Нової пошти' }, 400);
    return json({ ok: true, number: 'ДЕМО — не відправлено', total: q.total, invoice: null });
  }
  if (path === '/api/match') {
    const q = String(body.q || '').slice(0, 300);
    if (!q.trim()) return json({ error: 'Порожній запит' }, 400);
    return json(matchLots(q, lots, m));
  }
  // демо без сервера: розмова = лише пошук Матриці (ні ШІ, ні ростера на зв'язку)
  if (path === '/api/chat' && method === 'POST') {
    const text = String(body.text || '').trim().slice(0, 500);
    if (!text) return json({ error: 'Порожнє повідомлення' }, 400);
    return json({ token: 'demo', messages: [{ id: Date.now(), role: 'user', text, lots: [] }], match: matchLots(text, lots, m), human: false, owner: false });
  }
  if (path === '/api/chat') return json({ messages: [], human: false });
  if (path === '/api/info') return json({ contacts: CONTACTS, rules: DEFAULT_RULES, seller: { name: 'PROLOVE (демо)', code: '', address: '', phone: '', email: '' } });
  if (path === '/api/espresso') {
    try {
      const r = diagnose({ ...espressoInput(body, lotById(lots, body.lot_id)), now: new Date().toISOString() });
      return json({ label: r.label, primary: r.primary, checks: r.checks, causes: r.causes.slice(0, 3), confidence: r.confidence, quality_score: r.quality_score, warnings: r.warnings, signals: { ratio: r.signals.ratio, time_window: r.signals.time_window }, version: r.version });
    } catch (e) { return json({ error: e.message }, 400); }
  }
  if (path === '/api/ask') {
    const question = (body.messages || []).filter(x => x.role === 'user').at(-1)?.content || '';
    const a = localAnswer(question, lots, m, CONTACTS);
    const sse = `event: delta\ndata: ${JSON.stringify({ t: a.text })}\n\nevent: done\ndata: ${JSON.stringify({ lots: a.lots, mode: 'local', espresso: !!a.espresso })}\n\n`;
    return new Response(sse, { headers: { 'Content-Type': 'text/event-stream' } });
  }
  return json({ error: 'У демо цього немає' }, 404);
}

window.fetch = (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  if (!/\/api\//.test(url.pathname)) return realFetch(input, init);
  const path = url.pathname.slice(url.pathname.indexOf('/api/'));
  let body = {};
  try { body = init.body ? JSON.parse(init.body) : {}; } catch { /* порожньо */ }
  return handle(path, (init.method || 'GET').toUpperCase(), body);
};

// мітка «демо», щоб ніхто не прийняв за справжній магазин
const tag = document.createElement('div');
tag.textContent = 'демо';
tag.setAttribute('aria-label', 'Демо-версія: замовлення не відправляються');
tag.style.cssText = 'position:fixed;left:max(10px,env(safe-area-inset-left,0px));top:calc(env(safe-area-inset-top,0px) + 54px);z-index:60;font:800 10px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#120D0F;background:#F2B33D;border-radius:999px;padding:4px 8px;pointer-events:none;opacity:.9';
document.addEventListener('DOMContentLoaded', () => document.body.append(tag));

// Демо на GitHub Pages живе в підпапці (/prolove_buy/), а скрипти сайту малюють посилання від кореня ("/brew?m=…").
// Перехоплюємо такі кліки й ведемо на статичні файли демо, інакше GitHub показує «сторінки немає».
(() => {
  const PAGES = { '': 'index.html', brew: 'brew.html', drip: 'drip.html', info: 'info.html', partners: 'partners.html', method: 'method.html', read: 'read.html', roast: 'roast.html' };
  const base = new URL('.', location.href);
  const map = href => {
    const u = new URL(href, location.origin);
    const [, first = '', second = ''] = u.pathname.split('/');
    const file = first === 'legal' ? `legal-${second}.html` : PAGES[first];
    return file ? new URL(file + u.search + u.hash, base).href : null;
  };
  document.addEventListener('click', e => {
    if (e.defaultPrevented) return; // сторінка сама обробила клік (напр. перехід усередині стрічки)
    const a = e.target.closest && e.target.closest('a[href^="/"]:not([href^="//"])');
    if (!a) return;
    const to = map(a.getAttribute('href'));
    if (!to) return;
    e.preventDefault();
    if (a.target === '_blank') window.open(to, '_blank', 'noopener'); else location.href = to;
  });
})();

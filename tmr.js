// Спільне для таймерів заварювання: формат часу, сигнал, «екран не гасне», лінійна карта з відмітками.
export const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

let audio = null;
export function beep(times = 1) {
  try { navigator.vibrate?.(times > 1 ? [160, 90, 160] : 180); } catch { /* немає вібро */ }
  try {
    audio ||= new AudioContext();
    for (let k = 0; k < times; k++) {
      const o = audio.createOscillator(), g = audio.createGain(), at = audio.currentTime + k * 0.28;
      o.frequency.value = 880; g.gain.setValueAtTime(0.15, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
      o.connect(g).connect(audio.destination); o.start(at); o.stop(at + 0.26);
    }
  } catch { /* без звуку */ }
}

export function wake() {
  let lock = null;
  return {
    async on() { try { lock = await navigator.wakeLock?.request('screen'); } catch { /* не дозволено */ } },
    off() { try { lock?.release(); } catch { /* */ } lock = null; },
  };
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// marks: [{ at: секунди, label?: 'текст під відміткою', approx?: true, minor?: true, rec?: true — рекомендована (порожня) відмітка }]
export function timeline(el, marks, now, total) {
  total = Math.max(total, 30);
  const pct = x => Math.min(100, Math.max(0, (x / total) * 100));
  el.innerHTML = `<div class="tl-line"><i style="width:${pct(now)}%"></i></div>${marks.map(m => {
    const p = pct(m.at), side = p > 82 ? 'r' : p < 10 ? 'l' : '';
    return `<span class="tl-mk${m.minor ? ' minor' : ''}${m.rec ? ' rec' : ''}${!m.rec && now >= m.at ? ' done' : ''} ${side}" style="left:${p}%">${m.minor ? '' : `<b>${m.approx ? '~' : ''}${fmt(m.at)}</b>${esc(m.label || '')}`}</span>`;
  }).join('')}<span class="tl-now" style="left:${pct(now)}%"></span>`;
}

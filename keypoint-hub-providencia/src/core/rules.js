// Reglas de dominio puras: no leen ni escriben datos. Se usan igual en el navegador y en el servidor.

export const pad = n => String(n).padStart(2, '0');

// ---- Documento de identidad -------------------------------------------------
export const normDoc = v => String(v ?? '').replace(/[.\s-]/g, '').toUpperCase();
/** Dígito verificador del RUT (módulo 11). */
export function dv(body) {
  let s = 0, m = 2;
  for (let i = body.length - 1; i >= 0; i--) { s += +body[i] * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (s % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
export const rutOk = v => { v = normDoc(v); return /^\d{7,9}[\dK]$/.test(v) && dv(v.slice(0, -1)) === v.slice(-1); };
export const fmtDoc = (v, type = 'rut') => { v = normDoc(v); return type === 'pasaporte' || v.length < 3 ? v : v.slice(0, -1).replace(/\B(?=(\d{3})+$)/g, '.') + '-' + v.slice(-1); };
export const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || '');

// ---- Fechas -----------------------------------------------------------------
export const dayKey = d => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const period = d => dayKey(d).slice(0, 7);
export const minsOf = d => { d = new Date(d); return d.getHours() * 60 + d.getMinutes(); };
export const atMin = (d, m) => { d = new Date(d); d.setHours(0, 0, 0, 0); return new Date(+d + m * 60000); };
export const addDays = (d, n) => { d = new Date(d); d.setDate(d.getDate() + n); return d; };
export const hm = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
export const hmOf = d => hm(minsOf(d));
export const dur = m => { m = Math.round(m); const h = Math.floor(Math.abs(m) / 60), r = Math.abs(m) % 60; return (m < 0 ? '−' : '') + (h ? `${h} h` : '') + (h && r ? ' ' : '') + (r || !h ? `${r} min` : ''); };
export const overlaps = (a1, a2, b1, b2) => +new Date(a1) < +new Date(b2) && +new Date(b1) < +new Date(a2);
export function age(birth, now = new Date()) {
  if (!birth) return null;
  const b = new Date(birth + 'T00:00:00'), n = new Date(now);
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

// ---- Horarios y bloques -----------------------------------------------------
/** Horario del día según la configuración: [abre, cierra] en minutos, o null si está cerrado. */
export const hoursFor = (hours, d) => hours[new Date(d).getDay()] || null;
/** Inicios de bloque del día (salas y gaming): uno por hora desde la apertura, mientras el bloque quepa. */
export function slotsFor(hours, d, blockMin = 50, gapMin = 10) {
  const h = hoursFor(hours, d); if (!h) return [];
  const out = [];
  for (let s = h[0]; s + blockMin <= h[1]; s += blockMin + gapMin) out.push(s);
  return out;
}
/** Duración de n bloques seguidos: 1 → 50 min, 2 → 110 min, 3 → 170 min… */
export const blocksDur = (n, blockMin = 50, gapMin = 10) => n * (blockMin + gapMin) - gapMin;
/** Laboratorios: el tiempo declarado se redondea hacia arriba a horas completas (1 h 15 → 2 h). */
export const roundUpHours = min => Math.max(60, Math.ceil(min / 60) * 60);

// ---- Varios -----------------------------------------------------------------
export const extOf = name => { const m = /\.[a-z0-9]+$/i.exec(name || ''); return m ? m[0].toLowerCase() : ''; };
export const sizeText = b => b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
/** Contraste WCAG entre dos colores #RRGGBB. */
export function contrast(a, b) {
  const L = c => { const v = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255).map(x => x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const [x, y] = [L(a), L(b)].sort((p, q) => q - p);
  return (x + .05) / (y + .05);
}

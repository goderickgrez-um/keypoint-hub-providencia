// Formulario de registro configurable (fuente única para el navegador y el servidor).
// Etapa 1: los campos opcionales del perfil se muestran u ocultan, se marcan obligatorios y sus opciones se editan.
// Etapa 2: administración agrega campos nuevos; sus respuestas van en users.extra (cifrado en el servidor)
// y los que no son de contacto ni texto libre se analizan en Datos.
// Documento, nombre, correo, fecha de nacimiento y declaraciones son fijos: de ellos dependen el ingreso,
// el QR, la regla de edad y los menores de edad.
import { emailOk } from './rules.js';
import { DEFAULTS } from './catalog.js';

/** Campos del perfil que se pueden configurar, en el orden en que aparecen. */
export const BASE = {
  phone: { name: 'Celular', stat: null, missing: 'el celular' },
  comuna: { name: 'Comuna', stat: 'comuna', missing: 'la comuna' },
  activity: { name: 'Actividad en Providencia', ask: '¿Qué actividad realizas en Providencia?', stat: 'actividad en Providencia', missing: 'tu actividad en Providencia', choice: true },
  occupation: { name: 'Ocupación', ask: '¿A qué te dedicas?', stat: 'ocupación', missing: 'a qué te dedicas', choice: true },
  gender: { name: 'Género', stat: 'género', missing: 'el género', choice: true },
  reduced_mobility: { name: 'Movilidad reducida', ask: 'Tengo movilidad reducida', stat: 'movilidad reducida', check: true },
};
/** Tipos de los campos nuevos. */
export const TYPES = { choice: 'Una opción', multi: 'Varias opciones', yesno: 'Sí o no', number: 'Número', date: 'Fecha', text: 'Texto', phone: 'Teléfono', email: 'Correo' };
/** Tipos que no se grafican ni ve la analista: pueden identificar a la persona. */
export const PRIVATE = ['text', 'phone', 'email'];
export const isPrivate = f => PRIVATE.includes(f?.type);
const CONTACT = ['phone', 'email']; // en el registro asistido (recepción) son opcionales, como el correo y el celular del perfil

/** Formulario vigente: lo guardado en Reglas sobre los valores por defecto. */
export function regForm(db) {
  const c = db.cfg('reg_form') || {}, d = DEFAULTS.reg_form, base = {};
  for (const k of Object.keys(BASE)) base[k] = { show: true, required: !BASE[k].check, ...(d.base?.[k] || {}), ...(c.base?.[k] || {}) };
  for (const k of Object.keys(BASE)) if (BASE[k].choice) base[k].options = (base[k].options || []).map(o => (typeof o === 'string' ? { label: o } : o));
  return { base, extra: (Array.isArray(c.extra) ? c.extra : []).map(f => ({ ...f, options: f.options || [] })) };
}
/** Campos nuevos en uso (los archivados conservan sus respuestas, pero no se piden ni se grafican). */
export const liveFields = F => F.extra.filter(f => !f.archived);
export const liveOptions = f => (f.options || []).filter(o => !o.archived);
export const isEmpty = v => v == null || v === '' || (Array.isArray(v) && !v.length);

const clip = (v, n = 200) => String(v ?? '').trim().slice(0, n);
const dayOk = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + 'T12:00:00')) && new Date(v + 'T12:00:00').toISOString().slice(0, 10) === v;

/** Valida los campos del perfil (etapa 1).
 *  mode: 'register' (todos), 'self' (la persona edita los suyos) o 'staff' (recepción corrige; no exige obligatorios).
 *  Devuelve solo las columnas que se guardan. Un campo oculto no se pide y conserva lo que ya tenía. */
export function checkBase(F, d, { mode = 'register', prev = null, assisted = false, fail }) {
  const out = {};
  for (const [k, def] of Object.entries(BASE)) {
    const b = F.base[k];
    if (mode !== 'register' && d[k] === undefined) continue;
    if (!b.show) { if (mode === 'register') out[k] = def.check ? false : null; continue; }
    if (def.check) { out[k] = !!d[k]; continue; }
    const v = clip(d[k]);
    if (v && def.choice && !b.options.some(o => o.label === v) && v !== prev?.[k]) fail(`Elige una opción válida en «${def.name}»`);
    if (!v && b.required && mode !== 'staff' && !(assisted && k === 'phone')) fail('Falta ' + def.missing);
    out[k] = v || null;
  }
  return out;
}

/** Normaliza la respuesta a un campo nuevo; undefined = sin respuesta. */
export function normalize(f, v, prev, fail) {
  if (isEmpty(v)) return undefined;
  const name = `«${f.label}»`;
  switch (f.type) {
    case 'number': { const n = +String(v).replace(',', '.'); if (!Number.isFinite(n)) fail(`${name} debe ser un número`);
      if ((f.min != null && f.min !== '' && n < +f.min) || (f.max != null && f.max !== '' && n > +f.max)) fail(`${name} debe estar entre ${f.min ?? '…'} y ${f.max ?? '…'}`); return n; }
    case 'phone': { const s = clip(v, 30); if (!/^\+?[\d\s().-]{7,20}$/.test(s) || (s.match(/\d/g) || []).length < 7) fail(`Revisa el teléfono en ${name}`); return s; }
    case 'email': { const s = clip(v, 120).toLowerCase(); if (!emailOk(s)) fail(`Revisa el correo en ${name}`); return s; }
    case 'date': { const s = clip(v, 10); if (!dayOk(s)) fail(`Revisa la fecha en ${name}`); return s; }
    case 'yesno': if (v === true || v === 'si' || v === 'true') return true; if (v === false || v === 'no' || v === 'false') return false; fail(`Responde sí o no en ${name}`); break;
    case 'choice': { const s = String(v); if (!liveOptions(f).some(o => o.id === s) && s !== prev) fail(`Elige una opción válida en ${name}`); return s; }
    case 'multi': { const ids = [...new Set((Array.isArray(v) ? v : String(v).split(',')).map(String).filter(Boolean))], had = Array.isArray(prev) ? prev : [];
      if (ids.some(i => !liveOptions(f).some(o => o.id === i) && !had.includes(i))) fail(`Elige opciones válidas en ${name}`); return ids.length ? ids : undefined; }
    default: return clip(v, 300);
  }
}

/** Valida las respuestas a los campos nuevos (etapa 2) y las combina con las anteriores.
 *  Solo se leen los campos que vienen en input; los archivados y los que no vienen conservan su respuesta. */
export function checkExtra(F, input, { mode = 'register', prev = null, assisted = false, fail }) {
  const out = { ...(prev || {}) }, src = input || {};
  for (const f of liveFields(F)) {
    if (Object.prototype.hasOwnProperty.call(src, f.id)) { const v = normalize(f, src[f.id], out[f.id], fail); if (v === undefined) delete out[f.id]; else out[f.id] = v; }
    if (f.required && mode !== 'staff' && isEmpty(out[f.id]) && !(assisted && CONTACT.includes(f.type))) fail(`Falta «${f.label}»`);
  }
  return Object.keys(out).length ? out : null;
}

/** Campos obligatorios que la persona aún no responde (se le piden la próxima vez que entra). */
export function missingFor(F, u) {
  if (!u) return [];
  const out = [];
  for (const [k, def] of Object.entries(BASE)) { const b = F.base[k]; if (b.show && b.required && !def.check && isEmpty(u[k]) && !(k === 'phone' && !u.email)) out.push({ key: k, base: true }); }
  for (const f of liveFields(F)) if (f.required && isEmpty(u.extra?.[f.id]) && !(CONTACT.includes(f.type) && !u.email)) out.push({ key: f.id, field: f });
  return out;
}

/** Respuestas sin los campos que pueden identificar a la persona (lo que recibe la analista). */
export function publicExtra(F, extra) {
  if (!extra) return null;
  const priv = new Set(F.extra.filter(isPrivate).map(f => f.id)), out = {};
  for (const [k, v] of Object.entries(extra)) if (!priv.has(k)) out[k] = v;
  return out;
}

/** Nombre de una opción guardada, aunque esté archivada o ya no exista. */
export const optName = (f, id) => { const o = (f.options || []).find(x => x.id === id); return o ? o.label + (o.archived ? ' (opción archivada)' : '') : '(opción eliminada)'; };
/** Escala «redonda» para agrupar números: 1, 2, 5, 10, 20, 50… */
const nice = x => { const p = 10 ** Math.floor(Math.log10(x)), m = x / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
const fmt = n => String(Math.round(n * 100) / 100).replace('.', ',');
function bins(nums) {
  const lo = Math.min(...nums), hi = Math.max(...nums), ints = nums.every(Number.isInteger);
  if (ints && hi - lo <= 10) { const o = {}; nums.forEach(n => { o[n] = (o[n] || 0) + 1; }); return Object.keys(o).map(Number).sort((a, b) => a - b).map(n => ({ label: fmt(n), value: o[n] })); }
  const step = nice((hi - lo) / 5 || 1), start = Math.floor(lo / step) * step, out = [];
  for (let a = start; a <= hi; a += step) { const b = a + step, last = b > hi; out.push({ label: ints ? `${fmt(a)} a ${fmt(b - 1)}` : `${fmt(a)} a ${last ? fmt(b) : 'menos de ' + fmt(b)}`, value: nums.filter(n => n >= a && (last ? n <= b : n < b)).length }); }
  return out;
}
const countBy = (vals, key) => { const o = {}; for (const v of vals) { const k = key(v); o[k] = (o[k] || 0) + 1; } return Object.entries(o).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })); };

/** Análisis de los campos nuevos para Datos. users: perfiles activos. */
export function extraStats(F, users) {
  return liveFields(F).filter(f => !isPrivate(f)).map(f => {
    const vals = users.map(u => u.extra?.[f.id]).filter(v => !isEmpty(v)), base = { id: f.id, type: f.type, label: f.label, answered: vals.length, total: users.length };
    if (f.type === 'choice') return { ...base, items: countBy(vals, v => optName(f, v)) };
    if (f.type === 'multi') return { ...base, items: countBy(vals.flat(), v => optName(f, v)), note: 'Cada persona puede elegir varias opciones.' };
    if (f.type === 'yesno') return { ...base, items: countBy(vals, v => (v ? 'Sí' : 'No')) };
    if (f.type === 'date') { const o = {}; vals.forEach(v => { const k = String(v).slice(0, 7); o[k] = (o[k] || 0) + 1; });
      return { ...base, items: Object.keys(o).sort().map(k => ({ label: k.slice(5) + '/' + k.slice(0, 4), value: o[k] })) }; }
    const nums = vals.map(Number).filter(Number.isFinite); // número
    return { ...base, items: nums.length ? bins(nums) : [], avg: nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 10) / 10 : null, min: nums.length ? Math.min(...nums) : null, max: nums.length ? Math.max(...nums) : null };
  });
}

/** Texto legible de una respuesta (perfil, ficha y exportación). lab(o) traduce el nombre de una opción. */
export function answerText(f, v, lab = o => o.label) {
  if (isEmpty(v)) return '';
  const opt = id => { const o = (f.options || []).find(x => x.id === id); return o ? lab(o) : id; };
  if (f.type === 'choice') return opt(v);
  if (f.type === 'multi') return (Array.isArray(v) ? v : [v]).map(opt).join(', ');
  if (f.type === 'yesno') return v ? 'Sí' : 'No';
  return String(v);
}

/** Valida y ordena la configuración de los campos del perfil (etapa 1). Devuelve el bloque «base» y los cambios de nombre. */
export function cleanBase(F, input, fail) {
  const base = {}, renames = [];
  for (const [k, def] of Object.entries(BASE)) {
    const cur = F.base[k], x = input?.[k] || {}, b = { show: x.show !== undefined ? !!x.show : cur.show };
    if (!def.check) b.required = b.show && (x.required !== undefined ? !!x.required : cur.required);
    if (def.choice) {
      const opts = (x.options || cur.options).map(o => ({ label: clip(o.label, 120), en: clip(o.en, 120) || undefined, pt: clip(o.pt, 120) || undefined, was: o.was }));
      if (opts.some(o => !o.label)) fail(`Hay una opción sin nombre en «${def.name}»`);
      if (new Set(opts.map(o => o.label.toLowerCase())).size !== opts.length) fail(`Hay opciones repetidas en «${def.name}»`);
      if (b.show && opts.length < 2) fail(`«${def.name}» necesita al menos dos opciones`);
      for (const o of opts) { if (o.was && o.was !== o.label) renames.push([k, o.was, o.label]); delete o.was; if (!o.en) delete o.en; if (!o.pt) delete o.pt; }
      b.options = opts;
    }
    base[k] = b;
  }
  return { base, renames };
}

/** Valida un campo nuevo creado o editado en Reglas › Formulario de registro. old = versión guardada; answered = ids con respuestas. */
export function cleanField(x, { old = null, answered = new Set(), hasAnswers = false, newId, fail }) {
  const type = String(x.type || old?.type || '');
  if (!TYPES[type]) fail('Elige el tipo de campo');
  if (old && old.type !== type && hasAnswers) fail('No se puede cambiar el tipo de un campo que ya tiene respuestas. Archívalo y crea otro');
  const f = { id: old?.id || newId(), type, label: clip(x.label, 120), required: !!x.required };
  if (f.label.length < 2) fail('Escribe el nombre del campo');
  for (const k of ['label_en', 'label_pt', 'help', 'help_en', 'help_pt']) { const v = clip(x[k], k.startsWith('help') ? 240 : 120); if (v) f[k] = v; }
  if (type === 'number') for (const k of ['min', 'max']) if (x[k] !== '' && x[k] != null) { const n = +String(x[k]).replace(',', '.'); if (!Number.isFinite(n)) fail('El mínimo y el máximo deben ser números'); f[k] = n; }
  if (f.min != null && f.max != null && f.min > f.max) fail('El mínimo no puede ser mayor que el máximo');
  if (type === 'choice' || type === 'multi') {
    const given = (x.options || []).map(o => ({ id: o.id || null, label: clip(o.label, 120), en: clip(o.en, 120), pt: clip(o.pt, 120) })).filter(o => o.label || o.id);
    if (given.some(o => !o.label)) fail('Hay una opción sin nombre');
    if (new Set(given.map(o => o.label.toLowerCase())).size !== given.length) fail('Hay opciones repetidas');
    if (given.length < 2) fail('Agrega al menos dos opciones');
    const opts = given.map(o => { const y = { id: o.id && (old?.options || []).some(p => p.id === o.id) ? o.id : newId(), label: o.label }; if (o.en) y.en = o.en; if (o.pt) y.pt = o.pt; return y; });
    // Las opciones quitadas que ya tienen respuestas se archivan: no se ofrecen, pero se siguen contando
    for (const o of old?.options || []) if (!opts.some(p => p.id === o.id) && answered.has(o.id)) opts.push({ ...o, archived: true });
    f.options = opts;
  }
  return f;
}

// Campos configurables del formulario de registro en la interfaz: registro, perfil, completar perfil y recepción.
import { db, S, val, fill, field, select, check, esc, fDate, fmtN } from './kit.js';
import { t, getLang, locale } from './i18n.js';
import * as FORM from '../core/form.js';

export const regForm = () => FORM.regForm(db());
/** Claves de S.f de cada campo del perfil (se mantienen las que ya usaba cada formulario). */
const KEY = { phone: 'phone', comuna: 'comuna', activity: 'activity', occupation: 'occ', gender: 'gender', reduced_mobility: 'mob' };
export const bKey = (pre, k) => pre + KEY[k];
export const xKey = (pre, id) => pre + 'x_' + id;

/** Textos en el idioma elegido; si administración no escribió la traducción, se usa el español. */
const lang = () => getLang();
export const fLabel = f => (lang() !== 'es' && f['label_' + lang()]) || f.label;
export const fHelp = f => (lang() !== 'es' && f['help_' + lang()]) || f.help || '';
export const oLabel = o => (lang() !== 'es' && o[lang()]) || t(o.label);
const opt = label => `${label} (${t('opcional')})`;

/** Valor guardado de un campo del perfil, en el idioma elegido. */
export const baseText = (k, v) => { if (!v) return ''; const o = regForm().base[k]?.options?.find(x => x.label === v); return o ? oLabel(o) : t(v); };
export const shown = k => regForm().base[k].show;
/** Un campo del perfil (etapa 1), si está en uso. o: { assisted, staff, cls } */
export function baseInput(pre, k, o = {}) {
  const F = regForm(), b = F.base[k], def = FORM.BASE[k], key = bKey(pre, k);
  if (!b.show) return '';
  const req = b.required && !o.staff && !(o.assisted && k === 'phone'), ask = o.staff ? def.name : def.ask || def.name;
  if (def.check) return check(key, o.staff ? 'Persona con movilidad reducida' : def.ask);
  if (k === 'phone') return field(key, req ? t('Celular') : opt(t('Celular')), { type: 'tel', ph: '+56 9 1234 5678', attrs: 'autocomplete="tel"', cls: o.cls });
  if (k === 'comuna') return field(key, req ? t('Comuna') : opt(t('Comuna')), { cls: o.cls });
  const cur = val(key), opts = b.options.map(x => [x.label, oLabel(x)]);
  if (cur && !opts.some(x => x[0] === cur)) opts.push([cur, t(cur)]); // opción que ya no se ofrece pero la persona tenía
  return select(key, req ? t(ask) : opt(t(ask)), opts, { blank: 'Elige una opción', raw: true, cls: o.cls || (k === 'occupation' ? 'full' : '') });
}
export const baseInputs = (pre, keys, o) => keys.map(k => baseInput(pre, k, o)).join('');

/** Un campo agregado (etapa 2). */
export function extraInput(pre, f, o = {}) {
  const k = xKey(pre, f.id), req = f.required && !o.staff && !(o.assisted && ['phone', 'email'].includes(f.type));
  const label = esc(req ? fLabel(f) : opt(fLabel(f))), hint = fHelp(f) ? esc(fHelp(f)) : '';
  switch (f.type) {
    case 'choice': { const cur = val(k), opts = FORM.liveOptions(f).map(x => [x.id, oLabel(x)]); const old = cur && !opts.some(x => x[0] === cur) && f.options.find(x => x.id === cur); if (old) opts.push([old.id, oLabel(old)]);
      return select(k, label, opts, { blank: 'Elige una opción', raw: true, hint, cls: 'full' }); }
    case 'yesno': return select(k, label, [['si', t('Sí')], ['no', t('No')]], { blank: 'Elige una opción', raw: true, hint });
    case 'multi': return `<fieldset class="f full mf"${hint ? ` aria-describedby="h-${k}"` : ''}><legend>${label}</legend>${FORM.liveOptions(f).concat(f.options.filter(x => x.archived && val(k + '_' + x.id))).map(x => check(k + '_' + x.id, esc(oLabel(x)), { raw: true })).join('')}${hint ? `<small class="hint" id="h-${k}">${hint}</small>` : ''}</fieldset>`;
    case 'number': return field(k, label, { type: 'number', hint, attrs: `inputmode="decimal" step="any"${f.min != null ? ` min="${f.min}"` : ''}${f.max != null ? ` max="${f.max}"` : ''}` });
    case 'date': return field(k, label, { type: 'date', hint });
    case 'phone': return field(k, label, { type: 'tel', hint, ph: '+56 9 1234 5678' });
    case 'email': return field(k, label, { type: 'email', hint });
    default: return field(k, label, { hint, cls: 'full', attrs: 'maxlength="300"' });
  }
}
export const extraInputs = (pre, o = {}, only = null) => FORM.liveFields(regForm()).filter(f => !only || only.includes(f.id)).map(f => extraInput(pre, f, o)).join('');

/** Lee del formulario las respuestas a los campos agregados. */
export function readExtra(pre, only = null) {
  const out = {};
  for (const f of FORM.liveFields(regForm())) {
    if (only && !only.includes(f.id)) continue;
    const k = xKey(pre, f.id);
    if (f.type === 'multi') out[f.id] = f.options.filter(o => val(k + '_' + o.id)).map(o => o.id);
    else if (f.type === 'yesno') out[f.id] = val(k) === 'si' ? true : val(k) === 'no' ? false : null;
    else out[f.id] = val(k) === '' ? null : val(k);
  }
  return out;
}
/** Carga en el formulario las respuestas guardadas. */
export function fillExtra(pre, extra) {
  const o = {};
  for (const f of regForm().extra) {
    const v = extra?.[f.id], k = xKey(pre, f.id);
    if (f.type === 'multi') f.options.forEach(x => { o[k + '_' + x.id] = Array.isArray(v) && v.includes(x.id); });
    else if (f.type === 'yesno') o[k] = v === true ? 'si' : v === false ? 'no' : '';
    else o[k] = v ?? '';
  }
  fill(o);
}
export const fillBase = (pre, u) => fill(Object.fromEntries(Object.keys(KEY).map(k => [bKey(pre, k), k === 'reduced_mobility' ? !!u?.[k] : u?.[k] || ''])));
export const readBase = pre => { const F = regForm(), o = {}; for (const k of Object.keys(KEY)) if (F.base[k].show) o[k] = val(bKey(pre, k)); return o; };

/** Revisión en el navegador antes de enviar: devuelve el mensaje del primer obligatorio sin responder (en el idioma elegido). */
export function firstMissing(pre, o = {}, only = null) {
  const F = regForm();
  if (!o.extraOnly) for (const [k, def] of Object.entries(FORM.BASE)) { if (only && !only.includes(k)) continue; const b = F.base[k];
    if (b.show && b.required && !def.check && !(o.assisted && k === 'phone') && !String(val(bKey(pre, k))).trim()) return t('Completa «{0}»', t(o.staff ? def.name : def.ask || def.name)); }
  const x = readExtra(pre, only);
  for (const f of FORM.liveFields(F)) if ((!only || only.includes(f.id)) && f.required && !(o.assisted && ['phone', 'email'].includes(f.type)) && FORM.isEmpty(x[f.id])) return t('Completa «{0}»', fLabel(f));
  return null;
}

/** Respuestas para mostrar en el perfil o en la ficha: [[campo, respuesta]]. all = incluye archivados (equipo). */
export function extraRows(u, all = false) {
  const F = regForm(), rows = [];
  for (const f of all ? F.extra : FORM.liveFields(F)) { const v = u?.extra?.[f.id]; if (FORM.isEmpty(v)) continue;
    let s = f.type === 'yesno' ? t(v ? 'Sí' : 'No') : f.type === 'date' ? fDate(v + 'T12:00:00') : f.type === 'number' ? fmtN(v) : FORM.answerText(f, v, oLabel);
    rows.push([fLabel(f) + (f.archived ? ' (archivado)' : ''), esc(s)]); }
  return rows;
}

/** Variables que se usan para las estadísticas, en una frase («comuna, actividad… y edad»). */
export function statVars(es = false) {
  const F = regForm(), list = [], tr = x => (es ? x : t(x)), q = x => (!es && getLang() === 'en' ? `“${x}”` : `«${x}»`);
  for (const [k, def] of Object.entries(FORM.BASE)) if (def.stat && F.base[k].show) list.push(tr(def.stat));
  list.push(tr('edad'));
  let out; try { out = new Intl.ListFormat(es ? 'es-CL' : locale(), { type: 'conjunction' }).format(list); } catch { out = list.join(', '); }
  const xs = FORM.liveFields(F).filter(f => !FORM.isPrivate(f)).map(f => q(es ? f.label : fLabel(f)));
  return xs.length ? out + (es ? ', y las respuestas a ' : t(', y tus respuestas a ')) + xs.join(', ') : out;
}

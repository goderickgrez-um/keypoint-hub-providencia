// Consultas de solo lectura sobre el almacén: saldo, disponibilidad, ocupación y estadísticas.
import * as R from './rules.js';
import { ACTIVE } from './catalog.js';
import * as FORM from './form.js';

const T = d => +new Date(d);

export const rolesOf = (db, uid) => {
  const s = db.find('staff', x => x.user_id === uid && x.active);
  return s ? db.where('staff_roles', r => r.user_id === uid).map(r => r.role) : [];
};
/** Encargados de un espacio y espacios a cargo de una persona. */
export const managersOf = (db, spaceId) => db.where('space_managers', m => m.space_id === spaceId).map(m => m.user_id);
export const managedBy = (db, uid) => db.where('space_managers', m => m.user_id === uid).map(m => m.space_id);
/** Espacio donde queda registrada una persona sin reserva: el configurado o, si no hay, el cowork. */
export const defaultZone = db => { const id = db.cfg('default_zone'), sp = id != null && db.get('spaces', +id); return sp && sp.active ? sp : db.find('spaces', s => s.kind === 'cowork' && s.active); };
/** Fin de un evento: su término o, si no tiene, el final del día en que empieza. Un aviso sin fecha no termina. */
export const eventEnd = e => (e.end_at ? new Date(e.end_at) : e.start_at ? (d => (d.setHours(23, 59, 59, 999), d))(new Date(e.start_at)) : null);
/** Estado de un evento: 'terminado', 'en_curso', 'proximo' o 'aviso'. */
export const eventState = (e, now = new Date()) => { const end = eventEnd(e); if (end && +end < +now) return 'terminado'; if (!e.start_at) return 'aviso'; return +new Date(e.start_at) <= +now ? 'en_curso' : 'proximo'; };
/** Orden de los banners: el orden manual primero; sin orden, por fecha (los avisos sin fecha al final). */
export const eventOrder = (a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9) || (a.start_at ? +new Date(a.start_at) : 9e15) - (b.start_at ? +new Date(b.start_at) : 9e15) || a.id - b.id;
/** Orden de la lista de administración: los terminados siempre quedan al fondo (el más reciente primero). */
export const sortEvents = (list, now = new Date()) => { const done = e => eventState(e, now) === 'terminado'; return [...list].sort((a, b) => done(a) - done(b) || (done(a) ? +eventEnd(b) - +eventEnd(a) : eventOrder(a, b))); };
/** Banners que ve un usuario: publicados y no terminados (incluye los que ya empezaron). */
export const bannersFor = (db, now = new Date()) => db.where('events', e => e.published && eventState(e, now) !== 'terminado').sort(eventOrder);
/** Pisos del Hub, ordenados. */
export const floorsOf = db => Object.keys(db.cfg('floor_capacity') || { 1: 0 }).map(Number).sort((a, b) => a - b);
export const findUser = (db, code) => {
  const raw = String(code || '').trim(); if (!raw) return null;
  const n = R.normDoc(raw), e = raw.toLowerCase();
  return db.find('users', u => !u.deleted_at && (u.id === raw.toUpperCase() || u.doc_number === n || (u.email && u.email.toLowerCase() === e)));
};
export const activeBan = (db, uid, now = new Date()) =>
  db.find('bans', b => b.user_id === uid && !b.lifted_at && T(b.from_at) <= T(now) && (!b.until_at || T(b.until_at) > T(now)));

/** Certificación vigente del usuario para un espacio (devuelve el nivel más alto o 0). */
export function certLevel(db, uid, spaceId, now = new Date()) {
  let lvl = 0;
  for (const uc of db.where('user_certs', c => c.user_id === uid && (!c.expires_at || T(c.expires_at) > T(now)))) {
    const c = db.get('certifications', uc.certification_id);
    if (c && c.space_id === spaceId) lvl = Math.max(lvl, c.level);
  }
  return lvl;
}

/** Saldo de horas del mes para un usuario en un espacio. Todo en minutos. */
export function balance(db, uid, spaceId, when = new Date()) {
  const sp = db.get('spaces', spaceId), p = R.period(when);
  let quota = (+sp.monthly_hours || 0) * 60;
  if (rolesOf(db, uid).length && certLevel(db, uid, spaceId, when)) quota += db.cfg('staff_extra_hours') * 60;
  const adj = db.where('hour_adjustments', a => a.user_id === uid && a.space_id === spaceId && !a.forgiven && (a.period === p || a.period == null));
  const bonus = adj.reduce((s, a) => s + a.minutes, 0);
  const used = db.where('reservations', r => r.user_id === uid && r.space_id === spaceId && R.period(r.start_at) === p).reduce((s, r) => s + (r.charged_min || 0), 0);
  return { quota: quota + bonus, used, left: quota + bonus - used, penalties: adj.filter(a => a.minutes < 0) };
}

/** Espacio que una certificación bloquea durante sus sesiones: su lugar (o su laboratorio), o null si no bloquea. */
export const certPlace = c => (!c || c.block_place === false ? null : c.place_id || c.space_id);
/** Motivo por el que un espacio o equipo no está disponible en [start, end), o null si está libre. */
export function unavailable(db, sp, res, start, end, ignoreId = null) {
  const h = R.hoursFor(db.cfg('hours'), start);
  if (!h) return 'El Hub está cerrado ese día';
  const s = R.minsOf(start);
  if (s < h[0] || s >= h[1]) return 'Fuera del horario de atención';
  const closing = R.atMin(start, h[1]);
  if (T(end) > T(closing) && !sp.allow_overnight) return 'La reserva termina después del cierre';
  const bl = db.find('blocks', b => (b.space_id == null || b.space_id === sp.id) && R.overlaps(start, end, b.start_at, b.end_at));
  if (bl) return 'Ese horario está bloqueado' + (bl.reason ? ': ' + bl.reason : '');
  const cs = db.find('cert_sessions', c => c.status !== 'cancelada' && R.overlaps(start, end, c.start_at, c.end_at) && certPlace(db.get('certifications', c.certification_id)) === sp.id);
  if (cs) return 'Hay una certificación en ese horario';
  const gap = (sp.gap_min || 0) * 60000;
  const clash = db.find('reservations', r => r.id !== ignoreId && r.space_id === sp.id && ACTIVE.includes(r.status)
    && (!res || r.resource_id == null || r.resource_id === res.id)
    && T(start) < T(r.end_at) + gap && T(r.start_at) < T(end) + gap);
  return clash ? 'Ya está reservado en ese horario' : null;
}

/** Personas dentro del Hub ahora, por espacio y por piso. Una zona con reserva se ocupa cuando el usuario asiste. */
export function occupancy(db, now = new Date()) {
  const open = new Set(db.where('visits', v => !v.out_at).map(v => v.user_id));
  const spaces = db.where('spaces', s => s.active).map(s => ({ id: s.id, name: s.name, kind: s.kind, floor: s.floor, cap: s.capacity, n: 0 }));
  const by = Object.fromEntries(spaces.map(s => [s.id, s]));
  const placed = new Set();
  for (const r of db.where('reservations', r => r.status === 'en_curso' && T(r.start_at) <= T(now) && T(now) < T(r.end_at))) {
    const ids = [r.user_id, ...db.where('reservation_guests', g => g.reservation_id === r.id).map(g => g.user_id)];
    for (const id of ids) if (open.has(id) && !placed.has(id) && by[r.space_id]) { placed.add(id); by[r.space_id].n++; }
  }
  const cowork = spaces.find(s => s.kind === 'cowork');
  if (cowork) cowork.n = Math.max(0, open.size - placed.size);
  const caps = db.cfg('floor_capacity'), floors = {};
  for (const f of Object.keys(caps)) floors[f] = { n: spaces.filter(s => s.floor === +f).reduce((a, s) => a + s.n, 0), cap: caps[f] };
  return { inside: open.size, spaces, floors };
}

/** Promedio de personas dentro por día de la semana (lun a vie) y hora (8 a 18), en el rango. */
export function heat(db, from, to) {
  const m = Array.from({ length: 5 }, () => Array(11).fill(0)), days = Array(5).fill(0);
  for (let d = new Date(from); T(d) <= T(to); d = R.addDays(d, 1)) { const w = d.getDay(); if (w >= 1 && w <= 5) days[w - 1]++; }
  for (const v of db.all('visits')) {
    if (T(v.in_at) < T(from) || T(v.in_at) > T(to) + 864e5) continue;
    const w = new Date(v.in_at).getDay(); if (w < 1 || w > 5) continue;
    const a = R.minsOf(v.in_at), b = v.out_at ? R.minsOf(v.out_at) : a + 120;
    for (let h = 8; h <= 18; h++) if (a <= h * 60 + 30 && h * 60 + 30 < b) m[w - 1][h - 8]++;
  }
  return m.map((row, i) => row.map(x => days[i] ? x / days[i] : 0));
}

const count = (rows, key) => { const o = {}; for (const r of rows) { const k = key(r); if (k != null && k !== '') o[k] = (o[k] || 0) + 1; } return Object.entries(o).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })); };

/** Indicadores del periodo [from, to] para la pantalla de Datos. */
export function stats(db, from, to, now = new Date()) {
  const inR = d => T(d) >= T(from) && T(d) <= T(to) + 864e5 - 1;
  const visits = db.where('visits', v => inR(v.in_at));
  const res = db.where('reservations', r => inR(r.start_at) && ['completada', 'en_curso'].includes(r.status));
  const spaces = db.all('spaces'), name = id => spaces.find(s => s.id === id)?.name || '—';
  const bySpace = count(res, r => name(r.space_id));
  const cw = spaces.find(s => s.kind === 'cowork');
  if (cw) bySpace.unshift({ label: cw.name, value: Math.max(0, visits.length - res.length) });
  db.where('history_stats', h => inR(h.day + 'T12:00:00')).forEach(h => { const e = bySpace.find(b => b.label === h.space); e ? e.value += h.visits : bySpace.push({ label: h.space, value: h.visits }); });
  const perDay = {};
  for (const v of visits) { const k = R.dayKey(v.in_at); (perDay[k] ||= new Set()).add(v.user_id); }
  const users = db.where('users', u => u.status === 'activo' && !u.deleted_at);
  const ages = users.map(u => R.age(u.birth_date, now)).filter(a => a != null);
  const hours = {};
  for (const r of res) hours[name(r.space_id)] = (hours[name(r.space_id)] || 0) + (r.real_min ?? r.est_min) / 60;
  const fails = db.where('failure_reports', f => inR(f.created_at)), F = FORM.regForm(db);
  return {
    shown: Object.fromEntries(Object.entries(F.base).map(([k, b]) => [k, b.show])), // campos del perfil en uso (los ocultos no se grafican)
    extra: FORM.extraStats(F, users),
    visits: visits.length, uniqueVisitors: new Set(visits.map(v => v.user_id)).size, bySpace,
    perDay: Object.keys(perDay).sort().map(k => ({ label: k.slice(8) + '/' + k.slice(5, 7), value: perDay[k].size })),
    hours: Object.entries(hours).map(([label, value]) => ({ label, value: Math.round(value * 10) / 10 })).sort((a, b) => b.value - a.value),
    users: users.length, avgAge: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length * 10) / 10 : null,
    minors: ages.filter(a => a < 18).length, mobility: users.filter(u => u.reduced_mobility).length,
    byActivity: count(users, u => u.activity), byOccupation: count(users, u => u.occupation), byGender: count(users, u => u.gender),
    byComuna: count(users, u => u.comuna).slice(0, 8),
    failByResource: count(fails, f => db.get('resources', f.resource_id)?.name || name(f.space_id)), failByCategory: count(fails, f => f.category),
    noShows: db.where('reservations', r => inR(r.start_at) && r.status === 'no_asistio').length,
    heat: heat(db, from, to),
  };
}

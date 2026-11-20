// Pantallas del equipo del Hub: operación diaria, recepción, laboratorios y usuarios.
import * as R from '../core/rules.js';
import * as Q from '../core/queries.js';
import { ACTIVE, WEEKDAYS, DOC_TYPES, ACTIVITIES, OCCUPATIONS, GENDERS } from '../core/catalog.js';
import { t } from './i18n.js';
import { openCamera } from './camera.js';
import { regForm, occupancyCard } from './user.js';
import { heatPlan, floorSeg } from './plan.js';
import { labOnly, App, S, db, me, myRoles, can, manages, mySpaces, screens, actions, go, run, toast, modal, esc, icon, field, area, select, check, btn, seg, pill, empty, back, meter, stat, table, avatar, stPill, qrSvg, openDays, dayChips, heatGrid, barsH, fDay, fDate, fTime, fDT, fRange, fmtN, val, fill, readImage, download, confirmBox, memo } from './kit.js';

const T = d => +new Date(d), cfg = k => db().cfg(k);
export const anon = () => { const r = myRoles(); return r.length > 0 && r.every(x => x === 'analista'); };
export const uname = id => { const u = db().get('users', id); return !u ? '—' : anon() ? 'Usuario ' + String(id).slice(-5) : u.name; };
export const sname = id => db().get('spaces', id)?.name || '—';
const rname = id => db().get('resources', id)?.name || '';
const closeQuiet = () => { S.modal = null; };
const occ = () => App.occ || memo('occ', () => Q.occupancy(db()));
const todayRes = (day = new Date()) => db().where('reservations', r => R.dayKey(r.start_at) === R.dayKey(day) && !['cancelada', 'rechazada'].includes(r.status)).sort((a, b) => T(a.start_at) - T(b.start_at));
const FILE_ST = { pendiente: ['En espera', 'warn'], aprobado: ['Aprobado', 'ok'], rechazado: ['Rechazado', 'bad'], observado: ['Observado', 'warn'], eliminado: ['Borrado', ''] };

export const NAV = [
  ['Operación', [['a-panel', 'Panel', 'chart'], ['a-ahora', 'Reservas actuales', 'clock'], ['a-uso', 'Detalle de uso', 'users'], ['a-prox', 'Próximas reservas', 'cal'], ['a-scan', 'Recepción y QR', 'qr']]],
  ['Laboratorios', [['a-rev', 'Revisión de archivos', 'file'], ['a-solic', 'Solicitudes', 'list'], ['a-cert', 'Certificaciones', 'award'], ['a-fallas', 'Fallas de máquinas', 'alert']]],
  ['Comunidad', [['a-husr', 'Usuarios', 'search'], ['a-eventos', 'Eventos y banners', 'star']]],
  ['Hub', [['a-esp', 'Espacios', 'map'], ['a-agenda', 'Agenda y bloqueos', 'lock']]],
  ['Datos', [['a-datos', 'Datos', 'chart'], ['a-imp', 'Importar históricos', 'down']]],
  ['Mi cuenta', [['a-perfil', 'Mi perfil', 'user'], ['a-ayuda', 'Ayuda y preguntas', 'help']]],
  ['Sistema', [['a-emp', 'Empleados', 'users'], ['a-reglas', 'Reglas', 'gear'], ['a-apar', 'Apariencia', 'paint'], ['a-audit', 'Auditoría', 'shield']]],
];
const ALL = ['admin', 'encargado', 'recepcion', 'analista'];

// ============================================================ Mi perfil (personal)
screens['a-perfil'] = { roles: ALL, render() {
  const u = me(), s = db().find('staff', x => x.user_id === u.id), rs = myRoles(), labs = Q.managedBy(db(), u.id).map(id => db().get('spaces', id)).filter(Boolean);
  const ROLE = { admin: 'Administración', encargado: 'Encargado de laboratorio', recepcion: 'Recepción', analista: 'Analista de datos' };
  return `<h1>Mi perfil</h1><div class="card row">${avatar(u)}<div class="sp"><h2 style="margin:0">${esc(u.name)}</h2><span class="mu sm">${u.id} · ${esc(s?.position || 'Equipo del Hub')}</span><br><span class="mu sm">${esc(u.email || '')}</span></div></div>
    <h2>Credenciales</h2><div class="chips">${rs.map(r => pill(ROLE[r] || r, 'info')).join('')}</div>
    ${labs.length ? `<h2>Espacios a mi cargo</h2><div class="list">${labs.map(l => `<div class="li"><span class="sp"><b>${esc(l.name)}</b><span>Piso ${l.floor} · aforo ${l.capacity}</span></span></div>`).join('')}</div>` : ''}
    <div class="list" style="margin-top:8px"><button class="li" data-a="to-user">${icon('user')}<span class="sp"><b>Ir a la app de usuario</b><span>Mi credencial QR, reservas y datos personales</span></span>${icon('chev')}</button></div>
    ${btn('Cerrar sesión', 'logout', { cls: 'block plain', icon: 'out' })}`;
} };

// ============================================================ Panel
function labPanel() {
  const now = new Date(), o = occ(), ids = mySpaces().map(s => s.id), res = todayRes().filter(r => ids.includes(r.space_id));
  const pend = db().where('files', f => f.status === 'pendiente' && ids.includes(f.space_id)).length, fails = db().where('failure_reports', f => f.status === 'abierta' && ids.includes(f.space_id)).length;
  const next = db().where('reservations', r => ids.includes(r.space_id) && ACTIVE.includes(r.status) && T(r.end_at) > +now).sort((a, b) => T(a.start_at) - T(b.start_at)).slice(0, 8);
  return `<div class="head"><h1>Mis laboratorios</h1><span class="mu sm">${fDT(now)}</span></div><p class="mu">${esc(mySpaces().map(s => s.name).join(' · '))}</p>
    <div class="kpis">${stat('Reservas de hoy', res.length)}${stat('Archivos por revisar', pend)}${stat('Fallas abiertas', fails)}${stat('Inasistencias de hoy', res.filter(r => r.status === 'no_asistio').length)}</div>
    <div class="grid"><div class="card stack"><h3>Ocupación ahora</h3>${mySpaces().map(sp => { const s = o.spaces.find(x => x.id === sp.id); return meter(sp.name, s?.n || 0, sp.capacity); }).join('')}</div>
      <div class="card stack"><h3>Próximas reservas</h3>${next.length ? `<div class="list">${next.map(r => `<div class="li"><span class="sp"><b>${esc(sname(r.space_id))}${r.resource_id ? ' · ' + esc(rname(r.resource_id)) : ''}</b><span>${fRange(r.start_at, r.end_at)} · ${esc(uname(r.user_id))}</span></span>${stPill(r.status)}</div>`).join('')}</div>` : empty('No hay reservas próximas.')}</div></div>
    ${pend ? btn('Revisar archivos', 'go', { v: 'a-rev', cls: 'block', icon: 'file' }) : ''}`;
}
screens['a-panel'] = { roles: ALL, render() {
  if (labOnly()) return labPanel();
  const now = new Date(), o = occ(), res = todayRes(), mine = mySpaces().map(s => s.id), floor = S.planFloor || 1;
  const pend = db().where('files', f => f.status === 'pendiente' && mine.includes(f.space_id)).length, m = memo('heat', () => Q.heat(db(), R.addDays(now, -30), now));
  const h = R.hoursFor(cfg('hours'), now), next = [];
  if (h) for (let i = 1; i <= 3; i++) { const hr = now.getHours() + i; if (hr * 60 < h[1] && hr >= 8 && now.getDay() >= 1 && now.getDay() <= 5) next.push([hr, Math.round(m[now.getDay() - 1][hr - 8] + res.filter(r => new Date(r.start_at).getHours() === hr).length * .5)]); }
  const live = Object.fromEntries(o.spaces.map(s => [s.id, { v: s.cap ? Math.min(1, s.n / s.cap) : 0, text: `${s.n} / ${s.cap}` }]));
  return `<div class="head"><h1>Panel de administración</h1><span class="mu sm">${fDT(now)}${h ? '' : ' · Hub cerrado'}</span></div>
    <div class="kpis">${stat('Dentro del Hub ahora', o.inside)}${stat('Reservas de hoy', res.length)}${stat('Archivos por revisar', pend)}${stat('Inasistencias de hoy', res.filter(r => r.status === 'no_asistio').length)}</div>
    <div class="grid"><div><h2>Ocupación en vivo</h2>${occupancyCard()}</div>
      <div><h2>Mapa de calor · últimos 30 días</h2><div class="card stack">${heatGrid(m)}${next.length ? `<div><h3>Próximas horas</h3><div class="chips" style="margin-top:6px">${next.map(([hr, n]) => `<span class="pill info">${hr}:00 · cerca de ${n} personas</span>`).join('')}</div><p class="sm mu">Promedio del mismo día y hora, más las reservas ya agendadas.</p></div>` : ''}</div></div></div>
    <div class="head"><h2>Plano en vivo</h2>${floorSeg('plan-floor', floor)}</div><div class="card">${heatPlan(floor, live)}</div>`;
} };
actions['plan-floor'] = v => { S.planFloor = +v; go(S.k); };

// ============================================================ Reservas actuales
screens['a-ahora'] = { roles: ALL, render() {
  const now = Date.now(), o = occ(), res = todayRes();
  const state = (sp, eq) => { const mine = res.filter(r => r.space_id === sp.id && (r.resource_id == null || !eq || r.resource_id === eq.id) && ACTIVE.includes(r.status));
    const cur = mine.find(r => T(r.start_at) <= now && now < T(r.end_at)), nx = mine.find(r => T(r.start_at) > now);
    return cur ? pill(cur.status === 'en_curso' ? `En uso hasta ${fTime(cur.end_at)}` : `Reservado ${fTime(cur.start_at)}–${fTime(cur.end_at)}, sin llegar`, cur.status === 'en_curso' ? 'info' : 'warn') : nx ? pill(`Libre · próxima ${fTime(nx.start_at)}`, 'ok') : pill('Libre', 'ok'); };
  return `<h1>Reservas actuales</h1><p class="mu">Estado de cada espacio en este momento. Se actualiza solo.</p><div class="grid">${(labOnly() ? mySpaces() : db().where('spaces', s => s.active)).map(sp => { const s = o.spaces.find(x => x.id === sp.id), eqs = db().where('resources', r => r.space_id === sp.id && r.active);
    return `<div class="card stack"><div class="row between"><h3>${esc(sp.name)}</h3><span class="mu sm">Piso ${sp.floor}</span></div>${meter('Personas', s?.n || 0, sp.capacity)}
      ${sp.mode !== 'reserva' ? '' : sp.kind === 'sala' ? state(sp, null) : `<div class="list">${eqs.map(e => `<div class="li"><span class="sp"><b>${esc(e.name)}</b></span>${state(sp, e)}</div>`).join('')}</div>`}</div>`; }).join('')}</div>`;
} };

// ============================================================ Detalle de uso
screens['a-uso'] = { roles: ALL, render() {
  const day = val('uso_day', R.dayKey(new Date())), d = new Date(day + 'T12:00:00'), spaces = can('recepcion', 'analista') ? db().where('spaces', s => s.active) : mySpaces();
  const res = todayRes(d), visits = db().where('visits', v => R.dayKey(v.in_at) === day).sort((a, b) => T(a.in_at) - T(b.in_at)), booked = new Set(res.filter(r => r.attended_at).map(r => r.user_id));
  return `<h1>Detalle de uso</h1>${field('uso_day', 'Día', { type: 'date', value: day, live: true })}
    ${spaces.filter(s => s.mode === 'reserva').map(sp => { const rows = res.filter(r => r.space_id === sp.id); return `<h2>${esc(sp.name)}</h2>${table(['Equipo', 'Persona', 'Horario', 'Estado', 'Tiempo real'], rows.map(r => {
      const gs = db().where('reservation_guests', g => g.reservation_id === r.id).map(g => esc(uname(g.user_id)) + (g.attended ? ' ✓' : ''));
      return [esc(rname(r.resource_id) || (r.title || 'Sala completa')), `<b>${esc(uname(r.user_id))}</b>${gs.length ? `<br><span class="sm mu">${gs.join(', ')}</span>` : ''}`, `${fTime(r.start_at)} – ${fTime(r.end_at)}`, stPill(r.status), r.real_min != null ? R.dur(r.real_min) : '']; }), 'Sin reservas este día.')}`; }).join('')}
    ${spaces.some(s => s.kind === 'cowork') ? `<h2>Cowork y visitas sin reserva</h2>${table(['Persona', 'Entrada', 'Salida', 'Registro'], visits.filter(v => !booked.has(v.user_id)).map(v => [esc(uname(v.user_id)), fTime(v.in_at), v.out_at ? fTime(v.out_at) + (v.out_source === 'auto' ? ' (cierre automático)' : '') : pill('Dentro', 'ok'), { qr: 'QR', rut: 'RUT en mesón', offline: 'Sin conexión' }[v.source] || v.source]), 'Sin visitas este día.')}` : ''}`;
} };

// ============================================================ Próximas reservas
screens['a-prox'] = { roles: ['admin', 'encargado', 'recepcion'], render() {
  const days = openDays(10), day = S.proxDay && days.some(d => R.dayKey(d) === S.proxDay) ? S.proxDay : R.dayKey(days[0] || new Date()), ok = can('recepcion') ? null : mySpaces().map(s => s.id);
  const rows = todayRes(new Date(day + 'T12:00:00')).filter(r => ACTIVE.includes(r.status) && (!ok || ok.includes(r.space_id)));
  return `<h1>Próximas reservas</h1>${dayChips('prox-day', day, days)}${table(['Hora', 'Espacio', 'Persona', 'Asistentes', 'Estado', ''], rows.map(r => [`<b>${fTime(r.start_at)}</b> – ${fTime(r.end_at)}`, esc(sname(r.space_id)) + (r.resource_id ? ' · ' + esc(rname(r.resource_id)) : ''), esc(uname(r.user_id)),
    db().where('reservation_guests', g => g.reservation_id === r.id).length + 1, stPill(r.status), manages(r.space_id) || can('recepcion') ? btn('Cancelar', 'st-cancel', { v: r.id, cls: 's plain' }) : '']), 'No hay reservas para este día.')}`;
} };
actions['prox-day'] = v => { S.proxDay = v; go(S.k); };
actions['st-cancel'] = id => { const r = db().get('reservations', +id); modal({ html: `<h2 style="margin:0">¿Cancelar la reserva?</h2><p>${esc(sname(r.space_id))} · ${fRange(r.start_at, r.end_at)} · ${esc(uname(r.user_id))}</p><p class="sm mu">La persona recibirá un aviso y recupera sus horas.</p><div class="row">${btn('Sí, cancelar', 'st-cancel-ok', { v: id, cls: 'danger sp' })}${btn('Volver', 'modal-close', { cls: 'plain' })}</div>` }); };
actions['st-cancel-ok'] = id => { closeQuiet(); run('res.cancel', { id: +id }, 'Reserva cancelada'); };

// ============================================================ Recepción: lector de QR, entrada y salida
const queue = v => { try { if (v === undefined) return JSON.parse(localStorage.getItem('hub-queue') || '[]'); localStorage.setItem('hub-queue', JSON.stringify(v)); } catch { return v === undefined ? (S.q || []) : (S.q = v); } };
const sc = () => (S.scan ||= { auto: true, offline: false, result: null });
async function doScan(code, dry) {
  code = String(code || '').trim(); if (!code) return;
  S.f.scan = '';
  const park = () => { queue([...queue(), { code, at: new Date().toISOString() }]); sc().result = { queued: true, code }; go(S.k); };
  if (sc().offline) return park();
  try { sc().result = { ...(await App.data.call('access.scan', { code, dry: !!dry })), code, dry: !!dry }; }
  catch (e) { if (e.offline) return park(); return toast(e.user ? e.message : 'Algo salió mal. Intenta de nuevo.'); }
  go(S.k);
}
export async function flushQueue() { const q = queue(); if (!q.length || sc().offline) return; const r = await run('access.sync', { items: q }); if (r) { queue([]); toast(`Se sincronizaron ${r.applied} de ${r.total} registros guardados sin conexión`); } }
function scanResult(r) {
  if (!r) return `<div class="card flat c mu">${icon('qr')} Esperando un código. El lector USB escribe aquí automáticamente.</div>`;
  if (r.queued) return `<div class="result card warn"><h2>Guardado sin conexión</h2><p>${esc(r.code)} · se registrará al volver la conexión.</p></div>`;
  if (!r.found) return `<div class="result card bad"><h2>No encontramos ese código</h2><p>${esc(r.code)}</p><div class="row" style="justify-content:center;margin-top:10px">${btn('Registrar usuario nuevo', 'go', { v: 'a-reg', cls: 's' })}</div></div>`;
  const u = r.user, A = { entrada: ['ok', 'Entrada registrada'], salida: ['tone', 'Salida registrada'], restringido: ['bad', 'Acceso restringido'], pendiente: ['warn', 'Perfil pendiente'], duplicado: ['warn', 'Ya se registró hace un momento'] }[r.action] || ['flat', r.inside ? 'Está dentro del Hub' : 'Está fuera del Hub'];
  return `<div class="result card ${A[0]}">${avatar(u)}<h2>${A[1]}</h2><p class="b">${esc(u.name)}</p>
      ${r.ban ? `<p>${r.ban.until_at ? 'Hasta el ' + fDT(r.ban.until_at) : 'De forma permanente'}${r.ban.reason ? ' · ' + esc(r.ban.reason) : ''}</p>` : ''}
      ${r.action === 'pendiente' ? `<p>${u.status === 'pendiente_adulto' ? 'Falta la autorización de un adulto responsable.' : 'Falta confirmar el correo.'}</p>` : ''}
      ${r.action === 'entrada' && r.zone ? `<p>${icon('map')} ${r.zoneByReservation ? 'Con reserva en' : 'Sin reserva: queda registrada en'} <b>${esc(r.zone)}</b></p>` : ''}</div>
    <div class="list"><div class="li"><span class="mu" style="flex:0 0 34%">ID</span><span class="sp b">${u.id}</span></div><div class="li"><span class="mu" style="flex:0 0 34%">${DOC_TYPES[u.doc_type] || 'Documento'}</span><span class="sp">${esc(R.fmtDoc(u.doc_number, u.doc_type))}</span></div>
      <div class="li"><span class="mu" style="flex:0 0 34%">Correo</span><span class="sp">${esc(u.email || 'No tiene')}</span></div><div class="li"><span class="mu" style="flex:0 0 34%">Teléfono</span><span class="sp">${esc(u.phone || 'No tiene')}</span></div>
      ${u.minor ? `<div class="li"><span class="mu" style="flex:0 0 34%">Adulto responsable</span><span class="sp">${esc(u.guardian || 'Sin asignar')}</span></div>` : ''}${u.reduced_mobility ? '<div class="li"><span class="sp">Persona con movilidad reducida</span></div>' : ''}</div>
    ${r.dry && !r.ban && u.status === 'activo' ? btn(r.inside ? 'Confirmar salida' : 'Confirmar entrada', 'scan-confirm', { v: u.id, cls: 'block' }) : ''}
    ${r.today?.length ? `<h3>Reservas de hoy</h3><div class="list">${r.today.map(x => `<div class="li"><span class="sp"><b>${esc(x.space)}${x.resource ? ' · ' + esc(x.resource) : ''}</b><span>${fTime(x.start_at)} – ${fTime(x.end_at)}</span></span>${stPill(x.status)}</div>`).join('')}</div>` : ''}
    ${r.notifications?.length ? `<h3>Avisos para esta persona</h3><div class="list">${r.notifications.map(n => `<div class="li">${icon('bell')}<span class="sp"><b>${esc(n.title)}</b><span>${esc(n.text || '')}</span></span></div>`).join('')}</div>` : ''}
    <div class="row w">${btn('Actualizar sus datos', 'usr-edit', { v: u.id, cls: 's plain', icon: 'edit' })}${btn('Reserva asistida', 'assist-start', { v: u.id, cls: 's plain', icon: 'cal' })}${btn('Ver historial', 'usr-open', { v: u.id, cls: 's plain', icon: 'search' })}</div>`;
}
screens['a-scan'] = { roles: ['admin', 'recepcion'], render() {
  const s = sc(), q = queue(), last = db().where('visits', v => R.dayKey(v.in_at) === R.dayKey(new Date())).sort((a, b) => T(b.out_at || b.in_at) - T(a.out_at || a.in_at)).slice(0, 8);
  return `<div class="head"><h1>Recepción</h1><span class="mu sm">Entradas y salidas con QR o RUT</span></div>
    <div class="grid"><div class="stack">
      <div class="card stack"><label class="f">Código QR, ID o RUT<input id="f-scan" class="scanbox" data-i="scan" data-enter="scan" data-af="1" autocomplete="off" placeholder="Escanea o escribe y presiona Enter" value="${esc(val('scan'))}"></label>
        <div class="row">${btn('Registrar', 'scan', { cls: 'sp' })}${btn('Cámara', 'scan-cam', { cls: 'plain', icon: 'cam' })}</div>
        <label class="ck"><input type="checkbox" data-a="scan-opt" data-v="auto" ${s.auto ? 'checked' : ''}><span><b>Registro automático.</b> Al leer el código se marca la entrada o la salida sin confirmar. Desactívalo para ver los datos antes.</span></label>
        ${App.mode === 'demo' ? `<label class="ck"><input type="checkbox" data-a="scan-opt" data-v="offline" ${s.offline ? 'checked' : ''}><span>Simular que no hay conexión <span class="demo">DEMO</span></span></label>` : ''}
        ${q.length ? `<div class="card warn row">${icon('offline')}<span class="sp">${q.length} registros guardados sin conexión</span>${btn('Sincronizar', 'scan-sync', { cls: 's', off: s.offline })}</div>` : ''}</div>
      <div class="row w">${btn('Registrar usuario nuevo', 'go', { v: 'a-reg', cls: 'sec sp', icon: 'plus' })}</div>
      <h3>Últimos movimientos de hoy</h3>${table(['Persona', 'Entrada', 'Salida'], last.map(v => [esc(uname(v.user_id)), fTime(v.in_at), v.out_at ? fTime(v.out_at) : pill('Dentro', 'ok')]), 'Aún no hay movimientos hoy.')}
    </div><div class="stack" aria-live="polite">${scanResult(s.result)}</div></div>`;
} };
actions.scan = () => doScan(val('scan'), !sc().auto);
actions['scan-confirm'] = id => doScan(id, false);
actions['scan-cam'] = () => openCamera(code => doScan(code, !sc().auto), { continuous: true });
actions['scan-opt'] = (k, el) => { sc()[k] = el.checked; go(S.k); if (k === 'offline' && !el.checked) flushQueue(); };
actions['scan-sync'] = () => flushQueue();
actions['assist-start'] = id => { S.assist = id; S.bk = null; go('a-asist'); };

screens['a-reg'] = { roles: ['admin', 'recepcion'], render() {
  const u = S.newUser && db().get('users', S.newUser);
  return `${back('a-scan')}<h1>Registrar usuario nuevo</h1>${u ? `<div class="card qr"><div class="code">${qrSvg(u.id)}</div><div class="id">${u.id}</div><p class="b">${esc(u.name)}</p>
      ${u.status === 'pendiente_adulto' ? '<p class="sm">Falta que el adulto responsable confirme la autorización desde su perfil.</p>' : '<p class="sm mu">Perfil creado. La persona puede fotografiar este código o entrar siempre con su RUT en el mesón.</p>'}
      <div class="row w" style="justify-content:center">${btn('Registrar otra persona', 'reg-again', { cls: 's sec' })}${btn('Marcar su entrada', 'scan-confirm', { v: u.id, cls: 's' })}</div></div>`
    : `<p class="mu">Registro asistido: confirma la identidad con la cédula. El correo y el celular son opcionales; quien no los tenga recibirá sus avisos en el mesón.</p>${regForm(true)}`}`;
} };
actions['reg-again'] = () => { S.newUser = null; go(S.k); };
screens['a-asist'] = { roles: ['admin', 'recepcion'], render() {
  const u = S.assist && db().get('users', S.assist);
  return `${back('a-scan')}<h1>Reserva asistida</h1>${u ? `<div class="card row">${avatar(u, 's')}<span class="sp"><b>${esc(u.name)}</b><br><span class="mu sm">${u.id}</span></span>${btn('Cambiar', 'assist-clear', { cls: 's plain' })}</div>
    <div class="list">${[['u-sala', 'door', 'Sala de reuniones'], ['u-gaming', 'game', 'Sala gaming'], ['u-lab', 'flask', 'Laboratorio']].map(([k, i, l]) => `<button class="li" data-a="go" data-v="${k}">${icon(i)}<span class="sp"><b>${l}</b></span>${icon('chev')}</button>`).join('')}</div>
    <p class="sm mu">La reserva funciona igual que la que hace la persona desde su teléfono, con sus mismas reglas y saldo.</p>` : `<div class="card stack">${field('as_code', 'ID, RUT o correo de la persona', { attrs: 'data-enter="assist-find"' })}${btn('Buscar', 'assist-find', { cls: 'block' })}</div>`}`;
} };
actions['assist-find'] = () => { const u = Q.findUser(db(), val('as_code')); if (!u) return toast('No encontramos a esa persona'); S.assist = u.id; S.f = {}; go(S.k); };
actions['assist-clear'] = () => { S.assist = null; go(S.k); };

// ============================================================ Revisión de archivos
screens['a-rev'] = { roles: ['admin', 'encargado'], render() {
  const ids = mySpaces().map(s => s.id), all = S.revAll, list = db().where('files', f => ids.includes(f.space_id) && f.status !== 'eliminado' && (all || f.status === 'pendiente')).sort((a, b) => T(b.created_at) - T(a.created_at)).slice(0, 80);
  return `<div class="head"><h1>Revisión de archivos</h1>${seg('rev-filter', all ? 1 : 0, [[0, 'En espera'], [1, 'Todos']])}</div>
    <p class="sm mu">Toca el nombre para descargar el archivo. Amarillo: en espera. Verde: aprobado. Rojo: rechazado.</p>
    ${table(['Archivo', 'Peso', 'Tiempo estimado', 'Usuario', 'Laboratorio y horario', ''], list.map(f => { const r = db().get('reservations', f.reservation_id), u = db().get('users', f.user_id), st = FILE_ST[f.status];
      return [`<button class="pill ${st[1]}" data-a="file-get" data-v="${f.id}" title="Descargar">${icon('down')} ${esc(f.name)}</button><br><span class="sm mu">${st[0]}</span>`, R.sizeText(f.size), r ? `${R.dur(r.est_min)} → reserva de ${R.dur((T(r.end_at) - T(r.start_at)) / 60000)}` : '—',
        `<b>${esc(u?.name)}</b><br><span class="sm mu">${esc(u?.email || u?.phone || f.user_id)}</span>`, `${esc(sname(f.space_id))}${r ? `<br><span class="sm mu">${esc(rname(r.resource_id))} · ${fRange(r.start_at, r.end_at)}</span>` : ''}`,
        `<div class="row w">${f.status === 'pendiente' ? btn('Aprobar', 'file-ok', { v: f.id, cls: 's' }) + btn('Observar', 'file-note', { v: f.id + ':observado', cls: 's plain' }) + btn('Rechazar', 'file-note', { v: f.id + ':rechazado', cls: 's danger' }) : ''}${can('encargado') ? `<button class="icb" data-a="file-del" data-v="${f.id}" aria-label="Borrar archivo">${icon('trash')}</button>` : ''}</div>`]; }), all ? 'No hay archivos.' : 'No hay archivos en espera de revisión.')}`;
} };
actions['rev-filter'] = v => { S.revAll = v === '1'; go(S.k); };
actions['file-get'] = async id => { const f = db().get('files', +id), blob = f.storage ? await App.data.getFile(f.storage).catch(() => null) : null; blob ? download(f.name, blob) : toast('Este archivo de ejemplo no tiene contenido para descargar'); };
actions['file-ok'] = id => run('file.review', { id: +id, decision: 'aprobado' }, 'Archivo aprobado');
actions['file-note'] = v => { const [id, d] = v.split(':'), f = db().get('files', +id); fill({ fn_text: '' }); S.fileNote = { id: +id, d };
  modal({ html: `<h2 style="margin:0">${d === 'rechazado' ? 'Rechazar' : 'Observar'} ${esc(f.name)}</h2><p class="sm mu">${d === 'rechazado' ? 'La reserva se libera y las horas se devuelven.' : 'La reserva se mantiene; el usuario verá tu observación.'} El texto llega a su perfil y a su correo.</p>
    ${area('fn_text', 'Observación para el usuario')}<div class="row">${btn(d === 'rechazado' ? 'Rechazar archivo' : 'Enviar observación', 'file-note-ok', { cls: (d === 'rechazado' ? 'danger ' : '') + 'sp' })}${btn('Cancelar', 'modal-close', { cls: 'plain' })}</div>` }); };
actions['file-note-ok'] = async () => { const r = await run('file.review', { id: S.fileNote.id, decision: S.fileNote.d, text: val('fn_text') }); if (r) { closeQuiet(); toast('Se avisó al usuario'); } };
actions['file-del'] = async id => { const r = await run('file.remove', { id: +id }, 'Archivo borrado'); if (r?.storage) App.data.delFile(r.storage); };

// ============================================================ Solicitudes de laboratorios y sala gaming
screens['a-solic'] = { roles: ['admin', 'encargado'], render() {
  const ids = mySpaces().filter(s => ['lab', 'gaming'].includes(s.kind)).map(s => s.id), now = Date.now();
  const list = db().where('reservations', r => ids.includes(r.space_id) && ACTIVE.includes(r.status) && T(r.end_at) > now).sort((a, b) => T(a.start_at) - T(b.start_at));
  return `<h1>Solicitudes</h1><p class="mu">Reservas de hoy y futuras en los espacios a tu cargo. Se confirman solas cuando la persona está certificada, tiene saldo y el horario está libre.</p>
    ${table(['Cuándo', 'Espacio', 'Persona', 'Tiempo declarado', 'Estado', ''], list.map(r => { const u = db().get('users', r.user_id);
      return [fRange(r.start_at, r.end_at), `${esc(sname(r.space_id))}<br><span class="sm mu">${esc(rname(r.resource_id) || r.title || 'Sala completa')}</span>`, `<b>${esc(u?.name)}</b><br><span class="sm mu">${esc(u?.phone || u?.email || '')}</span>`, R.dur(r.est_min), stPill(r.status),
        `<div class="row w">${T(r.start_at) <= now ? btn('Cerrar con tiempo real', 'st-finish', { v: r.id, cls: 's' }) : ''}${btn('Cancelar', 'st-cancel', { v: r.id, cls: 's plain' })}</div>`]; }), 'No hay solicitudes pendientes.')}`;
} };
actions['st-finish'] = async id => { const r = await run('res.finish', { id: +id }); if (r) toast(`Reserva cerrada. Se descontaron ${R.dur(r.real_min)}`); };

// ============================================================ Certificaciones
const certFill = c => fill({ ce_name: c?.name || '', ce_space: c?.space_id || mySpaces().find(s => s.kind === 'lab')?.id || '', ce_level: c?.level || 1, ce_valid: c?.validity_months || '', ce_day: c?.weekday ?? 2, ce_time: R.hm(c?.time_min ?? 720), ce_dur: c?.duration_min || 90, ce_seats: c?.seats || 6, ce_cost: c?.cost || 0, ce_dip: c ? c.diploma_download : true, ce_inst: c?.instructor_id || '', ce_on: c ? c.active : true });
screens['a-cert'] = { roles: ['admin', 'encargado'], render() {
  const ids = mySpaces().map(s => s.id), certs = db().where('certifications', c => ids.includes(c.space_id)), cur = S.cert === 0 ? null : db().get('certifications', S.cert) || certs[0] || null;
  if (S.certLoaded !== (cur?.id ?? 0)) { certFill(cur); S.certLoaded = cur?.id ?? 0; S.session = null; }
  const ses = cur ? db().where('cert_sessions', s => s.certification_id === cur.id && T(s.end_at) > Date.now() - 14 * 864e5).sort((a, b) => T(a.start_at) - T(b.start_at)) : [];
  const s = ses.find(x => x.id === S.session) || ses.find(x => db().find('cert_enrollments', e => e.session_id === x.id)) || ses[0], enr = s ? db().where('cert_enrollments', e => e.session_id === s.id) : [];
  const holders = cur ? db().where('user_certs', c => c.certification_id === cur.id).sort((a, b) => T(b.granted_at) - T(a.granted_at)) : [];
  return `<h1>Certificaciones</h1><div class="hs">${certs.map(c => `<button class="chip ${cur?.id === c.id ? 'on' : ''}" data-a="cert-pick" data-v="${c.id}">${esc(c.name)}</button>`).join('')}<button class="chip ${!cur ? 'on' : ''}" data-a="cert-pick" data-v="0">${icon('plus')} Nueva</button></div>
    <div class="grid"><div class="stack">
      ${cur ? `<div class="card stack"><h3>Lista de la sesión</h3><div class="hs">${ses.map(x => `<button class="chip ${s?.id === x.id ? 'on' : ''}" data-a="cert-session" data-v="${x.id}">${fDay(x.start_at)}</button>`).join('')}</div>
        ${s ? `<p class="sm mu">${fDT(s.start_at)} · ${enr.length} de ${s.seats} cupos${s.status === 'cerrada' ? ' · calificada' : ''}</p>${enr.length ? enr.map(e => `<div class="row"><span class="sp">${esc(uname(e.user_id))}</span><div style="flex:0 0 150px">${select('gr_' + e.user_id, '', [['inscrito', 'Inscrito'], ['aprobado', 'Aprobado'], ['reprobado', 'Reprobado'], ['ausente', 'Ausente']], { value: e.status, attrs: `aria-label="Resultado de ${esc(uname(e.user_id))}"` })}</div></div>`).join('') + btn('Guardar resultados', 'cert-grade', { v: s.id, cls: 'block' }) : '<p class="mu">Nadie se ha inscrito en esta sesión.</p>'}` : '<p class="mu">No hay sesiones próximas.</p>'}</div>
      <div class="card stack"><h3>Certificar directamente</h3><p class="sm mu">Para quien aprobó fuera de una sesión agendada.</p><div class="row">${field('ce_grant', 'ID, RUT o correo', { cls: 'sp', attrs: 'data-enter="cert-grant"' })}<button class="btn" style="margin-top:18px" data-a="cert-grant">Certificar</button></div></div>
      <h3>Personas certificadas (${holders.length})</h3>${table(['Persona', 'Desde', 'Vence', 'Diploma', ''], holders.slice(0, 40).map(h => [esc(uname(h.user_id)), fDate(h.granted_at), h.expires_at ? fDate(h.expires_at) : 'No vence', h.diploma ? pill('Subido', 'ok') : `<button class="btn s plain" data-a="dip-pick" data-v="${h.id}">Subir</button>`, `<button class="icb" data-a="cert-revoke" data-v="${h.id}" aria-label="Quitar certificación">${icon('trash')}</button>`]))}
      <input type="file" id="dip-file" accept="image/*,application/pdf" data-file="diploma" hidden>` : ''}</div>
    <div class="card stack"><h3>${cur ? 'Configuración' : 'Nueva certificación'}</h3><div class="form">${field('ce_name', 'Nombre', { cls: 'full', ph: 'Impresión 3D filamento · FDM 2' })}
      ${select('ce_space', 'Laboratorio', mySpaces().map(x => [x.id, x.name]), { raw: true })}${field('ce_level', 'Nivel (1 = básico)', { type: 'number', attrs: 'min="1" max="9"' })}
      ${select('ce_day', 'Día de la sesión semanal', WEEKDAYS.map((w, i) => [i, w]).slice(1, 6), { raw: true })}${field('ce_time', 'Hora', { type: 'time' })}
      ${field('ce_dur', 'Duración (min)', { type: 'number', attrs: 'min="1"' })}${field('ce_seats', 'Cupos por sesión', { type: 'number', attrs: 'min="1"' })}
      ${field('ce_valid', 'Vigencia en meses (vacío = no vence)', { type: 'number' })}${field('ce_cost', 'Valor en pesos (0 = sin costo; se paga en el mesón)', { type: 'number' })}
      ${field('ce_inst', 'Quién la imparte (ID, RUT o correo)', { cls: 'full' })}</div>
      ${check('ce_dip', 'El usuario puede descargar su diploma')}${check('ce_on', 'Certificación activa')}${btn(cur ? 'Guardar cambios' : 'Crear certificación', 'cert-save', { cls: 'block' })}</div></div>`;
} };
actions['cert-pick'] = v => { S.cert = +v; S.certLoaded = -1; go(S.k); };
actions['cert-session'] = v => { S.session = +v; go(S.k); };
actions['cert-save'] = async () => { const [h, m] = String(val('ce_time', '12:00')).split(':').map(Number);
  const r = await run('cert.save', { id: S.certLoaded || undefined, name: val('ce_name'), space_id: +val('ce_space'), level: val('ce_level'), validity_months: val('ce_valid'), weekday: val('ce_day'), time_min: h * 60 + m, duration_min: val('ce_dur'), seats: val('ce_seats'), cost: val('ce_cost'), diploma_download: val('ce_dip'), instructor_id: val('ce_inst'), active: val('ce_on') });
  if (r) { S.cert = r.id; S.certLoaded = -1; toast('Certificación guardada'); } };
actions['cert-grade'] = sid => { const results = {}; db().where('cert_enrollments', e => e.session_id === +sid).forEach(e => { results[e.user_id] = val('gr_' + e.user_id, e.status); }); run('cert.grade', { session_id: +sid, results }, 'Resultados guardados'); };
actions['cert-grant'] = async () => { const r = await run('cert.grant', { certification_id: S.certLoaded, user: val('ce_grant') }); if (r) { S.f.ce_grant = ''; toast(`${r.name} quedó con la certificación`); } };
actions['cert-revoke'] = id => run('cert.revoke', { id: +id }, 'Certificación retirada');
actions['dip-pick'] = id => { S.dipFor = +id; document.getElementById('dip-file')?.click(); };
actions['file:diploma'] = async f => { if (f.size > 3 * 1048576) return toast('El diploma debe pesar menos de 3 MB'); const data = f.type.startsWith('image/') ? await readImage(f, 1600) : await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); }); run('cert.diploma', { id: S.dipFor, data }, 'Diploma guardado'); };

// ============================================================ Fallas de máquinas
export const rangeOf = () => { const k = S.range || '30', now = new Date(); if (k === 'x') return [new Date((val('rg_from') || R.dayKey(R.addDays(now, -30))) + 'T00:00:00'), new Date((val('rg_to') || R.dayKey(now)) + 'T00:00:00')]; return [R.atMin(R.addDays(now, -(+k - 1)), 0), R.atMin(now, 0)]; };
export const rangeBar = () => `<div class="row w">${seg('range', S.range || '30', [['7', 'Semana'], ['30', 'Mes'], ['90', '3 meses'], ['x', 'Otro periodo']])}${S.range === 'x' ? `<div style="flex:0 0 150px">${field('rg_from', 'Desde', { type: 'date', live: true, value: R.dayKey(R.addDays(new Date(), -30)) })}</div><div style="flex:0 0 150px">${field('rg_to', 'Hasta', { type: 'date', live: true, value: R.dayKey(new Date()) })}</div>` : ''}</div>`;
actions.range = v => { S.range = v; go(S.k); };
screens['a-fallas'] = { roles: ['admin', 'encargado', 'analista'], render() {
  const [from, to] = rangeOf(), ids = can('analista') ? null : mySpaces().map(s => s.id), inR = d => T(d) >= +from && T(d) < +to + 864e5;
  const list = db().where('failure_reports', f => inR(f.created_at) && (!ids || ids.includes(f.space_id))).sort((a, b) => T(b.created_at) - T(a.created_at));
  const cnt = key => Object.entries(list.reduce((o, f) => { const k = key(f); o[k] = (o[k] || 0) + 1; return o; }, {})).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  return `<h1>Fallas de máquinas</h1>${rangeBar()}<div class="grid"><div class="card stack"><h3>Fallas por máquina</h3>${barsH(cnt(f => rname(f.resource_id) || sname(f.space_id)))}</div><div class="card stack"><h3>Fallas por tipo</h3>${barsH(cnt(f => f.category))}</div></div>
    <h2>Reportes</h2>${table(['Fecha', 'Máquina', 'Tipo', 'Descripción', 'Reportó', 'Estado'], list.map(f => [fDate(f.created_at), esc(rname(f.resource_id) || sname(f.space_id)), esc(f.category), esc(f.description || ''), esc(uname(f.user_id)), f.status === 'abierta' ? (manages(f.space_id) ? btn('Marcar resuelta', 'fail-close', { v: f.id, cls: 's plain' }) : pill('Abierta', 'warn')) : pill('Resuelta', 'ok')]), 'Sin reportes en este periodo.')}`;
} };
actions['fail-close'] = id => run('failure.close', { id: +id }, 'Falla marcada como resuelta');

// ============================================================ Usuarios: historial, penalizaciones y restricciones
screens['a-husr'] = { roles: ['admin', 'encargado', 'recepcion'], render() {
  const q = val('usr_q').trim().toLowerCase(), n = R.normDoc(q), u = S.usr && db().get('users', S.usr);
  const found = q.length < 2 ? [] : db().where('users', x => !x.deleted_at && (x.name.toLowerCase().includes(q) || x.id.toLowerCase().includes(q) || (n.length > 3 && x.doc_number.includes(n)) || (x.email || '').includes(q))).slice(0, 12);
  return `<h1>Usuarios</h1><div class="grid"><div class="stack">${field('usr_q', 'Buscar por nombre, ID, RUT o correo', { live: true, ph: 'Escribe al menos 2 letras' })}
      ${q.length < 2 ? '' : found.length ? `<div class="list">${found.map(x => `<button class="li" data-a="usr-open" data-v="${x.id}">${avatar(x, 's')}<span class="sp"><b>${esc(x.name)}</b><span>${x.id} · ${esc(R.fmtDoc(x.doc_number, x.doc_type))}</span></span>${Q.activeBan(db(), x.id) ? pill('Restringido', 'bad') : ''}${icon('chev')}</button>`).join('')}</div>` : empty('Sin resultados.')}</div>
    <div class="stack">${u ? userDetail(u) : empty('Elige una persona para ver su historial.')}</div></div>`;
} };
function userDetail(u) {
  const now = Date.now(), ban = Q.activeBan(db(), u.id), labs = db().where('spaces', s => s.active && s.monthly_hours > 0), mine = labs.filter(s => manages(s.id)), g = u.guardian_id && db().get('users', u.guardian_id);
  const adj = db().where('hour_adjustments', a => a.user_id === u.id && !a.forgiven && (a.period === R.period(new Date()) || a.period == null)), res = db().where('reservations', r => r.user_id === u.id).sort((a, b) => T(b.start_at) - T(a.start_at)).slice(0, 8);
  const visits = db().where('visits', v => v.user_id === u.id), bans = db().where('bans', b => b.user_id === u.id).sort((a, b) => T(b.from_at) - T(a.from_at));
  return `<div class="card stack"><div class="row">${avatar(u)}<div class="sp"><h2 style="margin:0">${esc(u.name)}</h2><span class="mu sm">${u.id} · ${esc(R.fmtDoc(u.doc_number, u.doc_type))} · ${R.age(u.birth_date) ?? '—'} años</span></div>${pill({ activo: 'Activo', pendiente_adulto: 'Espera a un adulto', pendiente_correo: 'Correo sin confirmar' }[u.status], u.status === 'activo' ? 'ok' : 'warn')}</div>
      <p class="sm">${icon('mail')} ${esc(u.email || 'Sin correo')} · ${esc(u.phone || 'Sin teléfono')} · ${esc(u.comuna || '')}${g ? ` · Adulto responsable: ${esc(g.name)}` : ''}</p>
      ${ban ? `<div class="card bad row"><span class="sp">${icon('lock')} Acceso restringido ${ban.until_at ? 'hasta el ' + fDT(ban.until_at) : 'de forma permanente'}${ban.reason ? ' · ' + esc(ban.reason) : ''}</span>${can() ? btn('Levantar', 'ban-lift', { v: ban.id, cls: 's plain' }) : ''}</div>` : ''}
      <div class="row w">${mine.length ? btn('Penalizar horas', 'adj-ask', { v: 'penalizacion', cls: 's danger' }) + btn('Premiar con horas', 'adj-ask', { v: 'premio', cls: 's sec' }) : ''}${can() && !ban ? btn('Restringir acceso al Hub', 'ban-ask', { cls: 's danger', icon: 'lock' }) : ''}
        ${can('recepcion') ? btn('Actualizar datos', 'usr-edit', { v: u.id, cls: 's plain', icon: 'edit' }) + btn('Reserva asistida', 'assist-start', { v: u.id, cls: 's plain', icon: 'cal' }) : ''}${can() && u.id !== App.uid ? btn('Borrar datos o perfil', 'erase-ask', { v: u.id, cls: 's danger', icon: 'trash' }) : ''}</div></div>
    <div class="card stack"><h3>Certificaciones y saldo del mes</h3><div class="chips">${db().where('user_certs', c => c.user_id === u.id).map(c => pill(db().get('certifications', c.certification_id)?.name || '', 'ok')).join('') || '<span class="mu sm">Sin certificaciones</span>'}</div>
      ${labs.map(sp => { const b = Q.balance(db(), u.id, sp.id); return meter(sp.name, Math.max(0, b.left), Math.max(1, b.quota), `${R.dur(Math.max(0, b.left))} de ${fmtN(b.quota / 60)} h`, true); }).join('')}
      ${adj.map(a => `<div class="row sm">${pill((a.minutes > 0 ? '+' : '') + R.dur(a.minutes), a.minutes < 0 ? 'bad' : 'ok')}<span class="sp">${esc(sname(a.space_id))}${a.reason ? ' · ' + esc(a.reason) : ''}${a.period == null ? ' · todos los meses' : ''}</span>${manages(a.space_id) ? btn(a.minutes < 0 ? 'Perdonar' : 'Quitar', 'adj-forgive', { v: a.id, cls: 's plain' }) : ''}</div>`).join('')}</div>
    <div class="card stack"><h3>Actividad</h3><p class="sm mu">${visits.length} visitas registradas${visits.length ? ' · última el ' + fDate(visits.reduce((m, v) => (T(v.in_at) > T(m.in_at) ? v : m)).in_at) : ''} · ${db().where('reservations', r => r.user_id === u.id && r.status === 'no_asistio').length} inasistencias</p>
      ${table(['Reserva', 'Cuándo', 'Estado'], res.map(r => [esc(sname(r.space_id)) + (r.resource_id ? ' · ' + esc(rname(r.resource_id)) : ''), fRange(r.start_at, r.end_at), stPill(r.status)]), 'Sin reservas.')}
      ${bans.filter(b => b !== ban).length ? `<p class="sm mu">Restricciones anteriores: ${bans.filter(b => b !== ban).map(b => fDate(b.from_at) + (b.reason ? ' (' + esc(b.reason) + ')' : '')).join(', ')}</p>` : ''}</div>`;
}
actions['usr-open'] = id => { S.usr = id; go('a-husr'); };
// Borrar historial, perfil o ambos: elige, escribe la contraseña de administración y confirma
const ERASE = {
  datos: ['Borrar solo el historial', 'Se borran visitas, reservas, archivos subidos, observaciones, avisos y ajustes de horas. La cuenta sigue activa con su ID y su QR.'],
  perfil: ['Borrar solo el perfil', 'Se borra la cuenta: nombre, RUT, correo, teléfono, foto y contraseña. Sus visitas y reservas pasadas quedan como “Usuario eliminado” para las estadísticas. Sus reservas futuras se cancelan.'],
  ambos: ['Borrar historial y perfil', 'Se borra todo lo relacionado con la persona. No quedará en las estadísticas del Hub.'] };
actions['erase-ask'] = id => { const u = db().get('users', id); S.usr = id; fill({ er_scope: S.f.er_scope || 'datos', er_pass: '' });
  modal({ html: `<h2 id="dlg-t" style="margin:0">Borrar datos de ${esc(u.name)}</h2><p class="sm mu">${u.id}. Elige qué borrar. Esta acción no se puede deshacer.</p>
    <fieldset class="stack" style="border:0;padding:0;margin:0"><legend class="sm b">Qué borrar</legend>${Object.entries(ERASE).map(([k, [l, d]]) => `<label class="ck"><input type="radio" name="er_scope" data-i="er_scope" value="${k}"${val('er_scope') === k ? ' checked' : ''}><span><b>${l}.</b> ${d}</span></label>`).join('')}</fieldset>
    ${Q.rolesOf(db(), id).length ? '<div class="card warn sm">Esta persona tiene credenciales del equipo. Para borrar su perfil, quítalas primero en Empleados.</div>' : ''}
    <div class="form">${field('er_pass', 'Tu contraseña de administración', { type: 'password', cls: 'full', attrs: 'autocomplete="current-password" data-enter="erase-next"' })}</div>
    <div class="row">${btn('Continuar', 'erase-next', { cls: 'danger sp' })}${btn('Cancelar', 'modal-close', { cls: 'plain' })}</div>` }); };
actions['erase-next'] = () => { const scope = val('er_scope'), pass = val('er_pass'), u = db().get('users', S.usr); if (!pass) return toast('Escribe tu contraseña de administración');
  S.f.er_pass = ''; // la contraseña no queda guardada en la pantalla
  confirmBox({ title: '¿Confirmas el borrado?', danger: true, ok: ERASE[scope][0], text: `<p><b>${esc(u.name)}</b> · ${u.id}</p><p>${ERASE[scope][1]}</p><p><b>No se puede deshacer.</b></p>`,
    fn: async () => { const r = await run('user.erase', { id: S.usr, scope, password: pass }); if (r) { if (scope !== 'datos') S.usr = null; toast(scope === 'datos' ? 'Historial borrado' : 'Perfil borrado'); } } }); };
actions['adj-ask'] = kind => { const mine = db().where('spaces', s => s.active && s.monthly_hours > 0 && manages(s.id)), pen = kind === 'penalizacion'; fill({ aj_space: mine[0]?.id, aj_hours: 1, aj_reason: '', aj_perm: false }); S.adjKind = kind;
  modal({ html: `<h2 style="margin:0">${pen ? 'Penalizar horas' : 'Premiar con horas'}</h2><p class="sm mu">${esc(db().get('users', S.usr)?.name)} · ${pen ? 'Las horas se descuentan del saldo de este mes en el laboratorio elegido.' : 'Las horas se suman al saldo del laboratorio elegido.'}</p>
    <div class="form">${select('aj_space', 'Laboratorio o sala', mine.map(s => [s.id, s.name]), { raw: true })}${field('aj_hours', 'Horas', { type: 'number', attrs: 'min="0.5" step="0.5"' })}${field('aj_reason', 'Motivo', { cls: 'full' })}</div>
    ${pen ? '' : check('aj_perm', 'Sumar estas horas todos los meses')}<div class="row">${btn(pen ? 'Aplicar penalización' : 'Agregar horas', 'adj-ok', { cls: (pen ? 'danger ' : '') + 'sp' })}${btn('Cancelar', 'modal-close', { cls: 'plain' })}</div>` }); };
actions['adj-ok'] = async () => { const r = await run('hours.adjust', { user_id: S.usr, space_id: +val('aj_space'), hours: val('aj_hours'), kind: S.adjKind, reason: val('aj_reason'), permanent: val('aj_perm') }); if (r) { closeQuiet(); toast('Listo. La persona recibió un aviso'); } };
actions['adj-forgive'] = id => run('hours.forgive', { id: +id }, 'Ajuste retirado');
actions['ban-ask'] = () => { fill({ bn_amount: 3, bn_unit: 'dias', bn_reason: '' });
  modal({ html: `<h2 style="margin:0">Restringir acceso al Hub</h2><p class="sm mu">${esc(db().get('users', S.usr)?.name)} no podrá entrar ni reservar. Recepción verá el aviso al escanear su código y sus reservas del periodo se cancelan.</p>
    <div class="form">${field('bn_amount', 'Duración', { type: 'number', attrs: 'min="1"' })}${select('bn_unit', 'Unidad', [['horas', 'Horas'], ['dias', 'Días'], ['permanente', 'Permanente']], { raw: true })}${field('bn_reason', 'Motivo', { cls: 'full' })}</div>
    <div class="row">${btn('Restringir acceso', 'ban-ok', { cls: 'danger sp' })}${btn('Cancelar', 'modal-close', { cls: 'plain' })}</div>` }); };
actions['ban-ok'] = async () => { const r = await run('ban.set', { user_id: S.usr, amount: val('bn_amount'), unit: val('bn_unit'), reason: val('bn_reason') }); if (r) { closeQuiet(); toast('Acceso restringido'); } };
actions['ban-lift'] = id => run('ban.lift', { id: +id }, 'Restricción levantada');
actions['usr-edit'] = id => { const u = db().get('users', id); S.usr = id; fill({ ue_type: u.doc_type, ue_doc: R.fmtDoc(u.doc_number, u.doc_type), ue_name: u.name, ue_email: u.email || '', ue_phone: u.phone || '', ue_comuna: u.comuna || '', ue_activity: u.activity || '', ue_occ: u.occupation || '', ue_gender: u.gender || '', ue_birth: u.birth_date || '', ue_mob: u.reduced_mobility });
  modal({ html: `<h2 style="margin:0">Actualizar datos</h2><p class="sm mu">${u.id}. Úsalo también para reemplazar un RUT provisorio o pasaporte por el RUT definitivo.</p>
    <div class="form">${select('ue_type', 'Documento', Object.entries(DOC_TYPES), { raw: true })}${field('ue_doc', 'Número')}${field('ue_name', 'Nombre completo', { cls: 'full' })}${field('ue_email', 'Correo', { type: 'email' })}${field('ue_phone', 'Celular', { type: 'tel' })}${field('ue_comuna', 'Comuna')}${field('ue_birth', 'Fecha de nacimiento', { type: 'date' })}
      ${select('ue_activity', 'Actividad en Providencia', ACTIVITIES, { raw: true })}${select('ue_gender', 'Género', GENDERS, { raw: true })}${select('ue_occ', 'Ocupación', OCCUPATIONS, { cls: 'full', raw: true })}</div>${check('ue_mob', 'Persona con movilidad reducida')}
    <div class="row">${btn('Guardar cambios', 'usr-save', { cls: 'sp' })}${btn('Cancelar', 'modal-close', { cls: 'plain' })}</div>` }); };
actions['usr-save'] = async () => { const r = await run('user.update', { id: S.usr, patch: { doc_type: val('ue_type'), doc_number: val('ue_doc'), name: val('ue_name'), email: val('ue_email'), phone: val('ue_phone'), comuna: val('ue_comuna'), birth_date: val('ue_birth'), activity: val('ue_activity'), gender: val('ue_gender'), occupation: val('ue_occ'), reduced_mobility: val('ue_mob') } }); if (r) { closeQuiet(); toast('Datos actualizados'); } };

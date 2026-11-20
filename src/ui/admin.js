// Pantallas de administración: espacios, agenda, eventos, apariencia, reglas, empleados, datos.
import * as R from '../core/rules.js';
import * as Q from '../core/queries.js';
import { KINDS, MODES, ROLES, WEEKDAYS, PALETTE, THEME, DEFAULTS } from '../core/catalog.js';
import { applyTheme, themeOf, themeMode } from './theme.js';
import { heatPlan, floorSeg } from './plan.js';
import { uname, sname, rangeOf, rangeBar, anon } from './staff.js';
import { logoSrc } from './user.js';
import { fileInput, confirmBox, memo, labOnly, App, S, db, me, myRoles, can, manages, mySpaces, screens, actions, go, run, toast, modal, esc, icon, field, area, select, check, btn, seg, pill, empty, back, stat, table, avatar, swatches, openDays, dayChips, heatGrid, barsH, colChart, fDay, fDate, fTime, fDT, fRange, fmtN, val, fill, readImage, readText, download, csv } from './kit.js';

const T = d => +new Date(d), cfg = k => db().cfg(k);
const closeQuiet = () => { S.modal = null; };
const local = d => { d = new Date(d); return `${R.dayKey(d)}T${R.hmOf(d)}`; }; // para <input type="datetime-local">

// ============================================================ Eventos y banners
const evFill = e => fill({ ev_kind: e?.kind || 'evento', ev_title: e?.title || '', ev_desc: e?.description || '', ev_start: e?.start_at ? local(e.start_at) : '', ev_end: e?.end_at ? local(e.end_at) : '', ev_seats: e?.seats || '', ev_space: e?.space_id || '', ev_pub: e ? e.published : true });
screens['a-eventos'] = { roles: ['admin'], render() {
  const list = [...db().all('events')].sort(Q.eventOrder), cur = db().get('events', S.ev), now = new Date();
  if (S.evLoaded !== (cur?.id ?? 0)) { evFill(cur); S.evLoaded = cur?.id ?? 0; S.evImg = {}; }
  const img = k => S.evImg?.[k] ?? cur?.[k], att = cur ? db().where('event_attendance', a => a.event_id === cur.id) : [];
  return `<h1>Eventos y banners</h1><p class="mu">Lo que publiques aquí aparece como banner en el inicio de los usuarios. El sistema no publica en redes sociales.</p>
    <div class="grid"><div class="stack"><div class="row w between"><p class="sm mu" style="margin:0">Los banners se muestran en este orden. Usa las flechas para moverlos.</p>${list.length > 1 ? btn('Ordenar por fecha: más cercanos primero', 'ev-bydate', { cls: 's plain', icon: 'cal' }) : ''}</div>
      <div class="list" role="list">${list.map((e, i) => { const st = Q.eventState(e, now);
        return `<div class="li evrow${S.ev === e.id ? ' on' : ''}" role="listitem"><button class="sp evpick" data-a="ev-pick" data-v="${e.id}"><b>${esc(e.title)}</b><span>${e.kind === 'aviso' && !e.start_at ? 'Aviso sin fecha' : fRange(e.start_at, e.end_at || e.start_at)}${e.seats ? ` · ${db().where('event_attendance', a => a.event_id === e.id).length}/${e.seats} inscritos` : ''}</span></button>
          ${st === 'terminado' ? pill('Terminado', 'warn') : st === 'en_curso' ? pill('En curso', 'info') : ''}${e.published ? pill(st === 'terminado' ? 'No se muestra' : 'Publicado', st === 'terminado' ? '' : 'ok') : pill('Oculto')}
          <span class="ord"><button class="icb" data-a="ev-move" data-v="${e.id}:-1" aria-label="Subir ${esc(e.title)}"${i ? '' : ' disabled'}>${icon('up')}</button><button class="icb" data-a="ev-move" data-v="${e.id}:1" aria-label="Bajar ${esc(e.title)}"${i < list.length - 1 ? '' : ' disabled'}>${icon('dn')}</button></span></div>`; }).join('') || '<div class="li mu">Aún no hay eventos.</div>'}</div>
      ${btn('Nuevo evento o aviso', 'ev-pick', { v: 0, cls: 'sec block', icon: 'plus' })}</div>
    <div class="card stack"><h3>${cur ? 'Editar' : 'Nuevo'}</h3><div class="form">${select('ev_kind', 'Tipo', [['evento', 'Evento con fecha'], ['aviso', 'Aviso sin fecha']], { raw: true, live: true })}${field('ev_title', 'Título', { cls: 'full' })}${area('ev_desc', 'Descripción')}
      ${val('ev_kind') === 'evento' ? field('ev_start', 'Inicio', { type: 'datetime-local' }) + field('ev_end', 'Término', { type: 'datetime-local' }) + field('ev_seats', 'Cupos (vacío = sin límite)', { type: 'number', attrs: 'min="1"' }) + select('ev_space', 'Lugar', db().all('spaces').map(s => [s.id, s.name]), { raw: true, blank: 'Sin lugar fijo' }) : ''}</div>
      <label class="f">Imagen del banner (recomendado 1200 × 400 px)${fileInput('ev-banner', 'image/*')}</label>${img('banner_img') ? `<img src="${esc(img('banner_img'))}" alt="" style="width:100%;border-radius:10px;aspect-ratio:3/1;object-fit:cover">` : ''}
      <label class="f">Imagen del anuncio que se abre al tocar el banner (mayor calidad, hasta 1600 px)${fileInput('ev-poster', 'image/*')}</label>${img('poster_img') ? `<img src="${esc(img('poster_img'))}" alt="" style="max-height:160px;border-radius:10px;align-self:flex-start">` : ''}
      ${check('ev_pub', 'Publicado: visible para los usuarios')}<div class="row">${btn('Guardar', 'ev-save', { cls: 'sp' })}${cur ? btn('Borrar', 'ev-del', { v: cur.id, cls: 'danger' }) : ''}</div>
      ${cur?.kind === 'evento' ? `<p class="sm mu">${att.length} inscritos · ${att.filter(a => a.status === 'asistio').length} asistieron</p>${att.length ? btn('Descargar lista de asistentes', 'ev-csv', { v: cur.id, cls: 's plain', icon: 'down' }) : ''}` : ''}</div></div>`;
} };
actions['ev-pick'] = v => { S.ev = +v; S.evLoaded = -1; go(S.k); };
actions['ev-move'] = async v => { const [id, d] = v.split(':').map(Number), ids = [...db().all('events')].sort(Q.eventOrder).map(e => e.id), i = ids.indexOf(id), j = i + d;
  if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; await run('event.order', { ids });
  requestAnimationFrame(() => document.querySelector(`[data-a="ev-move"][data-v="${id}:${d}"]:not([disabled])`)?.focus()); };
/** Por fecha, más cercanos primero: en curso y próximos por inicio, luego avisos sin fecha y al final los terminados (el más reciente primero). */
actions['ev-bydate'] = () => confirmBox({ title: '¿Ordenar por fecha?', ok: 'Ordenar', text: '<p>Primero los eventos en curso y los más cercanos, luego los avisos sin fecha y al final los terminados. Reemplaza el orden manual.</p>',
  fn: async () => { const now = new Date(), rank = e => ({ en_curso: 0, proximo: 0, aviso: 1, terminado: 2 })[Q.eventState(e, now)];
    const ids = [...db().all('events')].sort((a, b) => rank(a) - rank(b) || (rank(a) === 2 ? T(b.start_at) - T(a.start_at) : (a.start_at ? T(a.start_at) : 0) - (b.start_at ? T(b.start_at) : 0)) || a.id - b.id).map(e => e.id);
    await run('event.order', { ids }, 'Banners ordenados por fecha'); } });
actions['file:ev-banner'] = async f => { (S.evImg ||= {}).banner_img = await readImage(f, 1200); go(S.k); };
actions['file:ev-poster'] = async f => { (S.evImg ||= {}).poster_img = await readImage(f, 1600); go(S.k); };
actions['ev-save'] = async () => { const r = await run('event.save', { id: S.evLoaded || undefined, kind: val('ev_kind'), title: val('ev_title'), description: val('ev_desc'), start_at: val('ev_kind') === 'evento' && val('ev_start') ? new Date(val('ev_start')) : null, end_at: val('ev_kind') === 'evento' && val('ev_end') ? new Date(val('ev_end')) : null, seats: val('ev_seats'), space_id: val('ev_space'), published: val('ev_pub'), ...(S.evImg || {}) });
  if (r) { S.ev = r.id; S.evLoaded = -1; toast('Evento guardado'); } };
actions['ev-del'] = id => { run('event.remove', { id: +id }, 'Evento borrado'); S.ev = 0; S.evLoaded = -1; };
actions['ev-csv'] = id => download('asistentes-evento-' + id + '.csv', csv(['ID', 'Nombre', 'Estado', 'Fecha'], db().where('event_attendance', a => a.event_id === +id).map(a => [a.user_id, uname(a.user_id), a.status, fDT(a.at)])));

// ============================================================ Espacios
screens['a-esp'] = { roles: ['admin', 'encargado'], render() {
  const log = db().where('audit_log', a => a.entity === 'spaces').sort((a, b) => T(b.at) - T(a.at)).slice(0, 12);
  return `<div class="head"><h1>Espacios</h1>${can() ? btn('Crear espacio', 'sp-open', { v: 0, cls: 's', icon: 'plus' }) : ''}</div>
    ${table(['Espacio', 'Tipo', 'Piso', 'Aforo', 'Accesible', 'Encargados', ''], (labOnly() ? mySpaces() : db().all('spaces')).map(s => [`<b>${esc(s.name)}</b>${s.active ? '' : ' ' + pill('Inactivo')}`, `${KINDS[s.kind] || s.kind} · ${MODES[s.mode]}`, s.floor, s.capacity, s.accessible ? 'Sí' : 'No', esc(Q.managersOf(db(), s.id).map(uname).join(', ') || 'Administración'), manages(s.id) ? btn('Editar', 'sp-open', { v: s.id, cls: 's plain', icon: 'edit' }) : '']))}
    <p class="sm mu">Aforo máximo por piso: ${Object.entries(cfg('floor_capacity')).map(([f, c]) => `piso ${f}, ${c} personas`).join(' · ')}. Se cambia en Reglas; los pisos se agregan o quitan en el plano.</p>
    <h2>Cambios recientes</h2>${table(['Fecha', 'Quién', 'Cambio', 'Detalle'], log.map(a => [fDT(a.at), esc(uname(a.actor_id)), `${esc(a.action)} · ${esc(sname(+a.entity_id))}`, `<span class="sm">${esc(a.detail || '')}</span>`]), 'Aún no hay cambios registrados.')}
    ${can() ? btn('Editar el plano del Hub', 'go', { v: 'a-plano', cls: 'block sec', icon: 'map' }) : ''}`;
} };
actions['sp-open'] = id => { const s = db().get('spaces', +id); S.space = +id;
  fill({ sp_cday: 2, sp_ctime: '12:00', sp_name: s?.name || '', sp_kind: s?.kind || 'lab', sp_mode: s?.mode || 'reserva', sp_floor: s?.floor || Q.floorsOf(db()).slice(-1)[0] || 1, sp_cap: s?.capacity ?? 6, sp_acc: s ? s.accessible : true, sp_cert: s ? s.requires_cert : false, sp_lvl: s?.min_level || 1, sp_hours: s?.monthly_hours ?? 48,
    sp_gap: s?.gap_min ?? 30, sp_tol: s?.tolerance_min ?? '', sp_max: s?.max_hours ?? '', sp_night: s ? s.allow_overnight : false, sp_accept: s?.accept || '', sp_notes: s?.notes || '', sp_on: s ? s.active : true, eq_name: '', eq_model: '', eq_specs: '', eq_cap: 1 }); S.eq = 0; go('a-espd'); };
screens['a-espd'] = { roles: ['admin', 'encargado'], render() {
  const s = db().get('spaces', S.space), adm = can(), eqs = s ? db().where('resources', r => r.space_id === s.id) : [], grp = val('sp_kind') === 'residencia';
  if (S.space == null) return back('a-esp') + empty('Elige un espacio desde la lista.');
  return `${back('a-esp', 'Espacios')}<h1>${s ? esc(s.name) : 'Nuevo espacio'}</h1><div class="grid"><div class="card stack"><h3>Datos del espacio</h3><div class="form">${field('sp_name', 'Nombre', { cls: 'full' })}
      ${adm ? select('sp_kind', 'Tipo de espacio (define cómo se reserva)', Object.entries(KINDS), { raw: true, live: true }) + select('sp_mode', 'Forma de uso (con reserva, libre o solo eventos)', Object.entries(MODES), { raw: true }) + select('sp_floor', 'Piso (se agregan pisos en el plano)', Q.floorsOf(db()).map(f => [f, 'Piso ' + f]), { raw: true }) : ''}
      ${field('sp_cap', 'Aforo (personas al mismo tiempo)', { type: 'number', attrs: 'min="0"' })}${field('sp_hours', 'Horas al mes por persona (0 = sin límite)', { type: 'number', attrs: 'min="0"' })}
      ${field('sp_gap', 'Minutos entre reservas (limpieza o preparación)', { type: 'number', attrs: 'min="0"' })}${field('sp_tol', `Minutos de atraso antes de liberar (vacío = ${cfg('tolerance_min')})`, { type: 'number', attrs: 'min="0"' })}
      ${field('sp_max', `Duración máxima de una reserva (horas; vacío = ${cfg('max_hours')})`, { type: 'number', attrs: 'min="0"' })}${field('sp_lvl', 'Nivel de certificación exigido (1 = básico)', { type: 'number', attrs: 'min="1"' })}
      ${field('sp_accept', 'Archivos que se piden al reservar (formatos separados por coma; vacío = no se pide archivo)', { cls: 'full', ph: '.stl,.3mf,.obj' })}
      ${area('sp_notes', 'Notas internas (solo las ve el equipo)')}</div>
      ${s && ['lab', 'gaming'].includes(s.kind) ? `<p class="sm"><b>Encargados:</b> ${esc(Q.managersOf(db(), s.id).map(uname).join(', ') || 'sin asignar')}${adm ? ` · <button class="pill info" data-a="go" data-v="a-emp">Asignar en Empleados</button>` : ''}</p>` : ''}
      ${check('sp_acc', 'Accesible para personas con movilidad reducida')}${check('sp_cert', 'Exige certificación para reservar (solo personas certificadas)', { live: true })}
      ${val('sp_cert') && !(s && db().find('certifications', c => c.space_id === s.id)) ? `<div class="card stack" style="background:var(--tint)"><p class="sm"><b>Se creará la certificación de este espacio.</b> Indica cuándo se imparte cada semana (se puede cambiar después en Certificaciones).</p>
        <div class="form">${select('sp_cday', 'Día de la sesión semanal', WEEKDAYS.map((d, i) => [i, d]), { raw: true })}${field('sp_ctime', 'Hora de inicio', { type: 'time' })}</div></div>` : ''}
      ${check('sp_night', 'Permite trabajos que terminan después del cierre (quedan sin supervisión)')}${check('sp_on', 'Espacio activo (visible para reservar)')}
      ${btn(s ? 'Guardar cambios' : 'Crear espacio', 'sp-save', { cls: 'block' })}${s && adm ? btn('Eliminar espacio', 'sp-del', { v: s.id, cls: 'block danger', icon: 'trash' }) : ''}</div>
    ${s ? `<div class="stack"><h3>${grp ? 'Grupos de residencia' : 'Equipos'} (${eqs.filter(e => e.active).length})</h3>
      <div class="list">${eqs.map(e => `<div class="li"><span class="sp"><b>${esc(e.name)}${e.active ? '' : ' ' + pill('Fuera de servicio', 'warn')}</b><span>${esc([e.model, e.specs].filter(Boolean).join(' · '))}${grp || e.capacity > 1 ? ` · ${e.capacity} cupos` : ''}</span></span><button class="icb" data-a="eq-edit" data-v="${e.id}" aria-label="Editar">${icon('edit')}</button><button class="icb" data-a="eq-del" data-v="${e.id}" aria-label="Quitar">${icon('trash')}</button></div>`).join('') || '<div class="li mu">Sin equipos registrados.</div>'}</div>
      <div class="card stack"><h3>${S.eq ? 'Editar' : 'Agregar'} ${grp ? 'grupo' : 'equipo'}</h3><div class="form">${field('eq_name', 'Nombre')}${field('eq_model', 'Modelo')}${field('eq_cap', 'Cupos', { type: 'number', attrs: 'min="1"' })}${area('eq_specs', 'Especificaciones')}</div>
        ${check('eq_on', 'En servicio', { value: true })}<div class="row">${btn(S.eq ? 'Guardar equipo' : 'Agregar', 'eq-save', { cls: 'sp sec' })}${S.eq ? btn('Cancelar', 'eq-edit', { v: 0, cls: 'plain' }) : ''}</div></div></div>` : ''}</div>`;
} };
actions['sp-save'] = async () => { const r = await run('space.save', { id: S.space || undefined, name: val('sp_name'), kind: val('sp_kind'), mode: val('sp_mode'), floor: val('sp_floor'), capacity: val('sp_cap'), accessible: val('sp_acc'), requires_cert: val('sp_cert'), min_level: val('sp_lvl'),
  monthly_hours: val('sp_hours'), gap_min: val('sp_gap'), tolerance_min: val('sp_tol'), max_hours: val('sp_max'), allow_overnight: val('sp_night'), accept: val('sp_accept'), notes: val('sp_notes'), active: val('sp_on'), cert_weekday: val('sp_cday'), cert_time: val('sp_ctime') });
  if (r) { const nc = !S.space && val('sp_cert'); S.space = r.id; toast(nc ? 'Espacio y certificación creados' : 'Espacio guardado'); } };
actions['sp-del'] = id => { const s = db().get('spaces', +id), d = db(), used = d.find('reservations', r => r.space_id === s.id) || d.find('visits', v => v.space_id === s.id) || d.find('files', f => f.space_id === s.id);
  const fut = d.where('reservations', r => r.space_id === s.id && ['confirmada', 'en_revision', 'en_curso'].includes(r.status) && T(r.end_at) > Date.now()).length;
  confirmBox({ title: '¿Eliminar este espacio?', danger: true, ok: used ? 'Desactivar espacio' : 'Eliminar espacio',
    text: `<p><b>${esc(s.name)}</b></p><p>${used ? 'Este espacio tiene historial, así que se <b>desactivará</b>: deja de aparecer para reservar y su historial se conserva para las estadísticas.' : 'Se borrará junto con sus equipos, bloqueos y certificación.'}</p>${fut ? `<p>${fut} reservas futuras se cancelarán y sus dueños recibirán un aviso.</p>` : ''}`,
    fn: async () => { const r = await run('space.remove', { id: s.id }); if (r) { toast(r.removed ? 'Espacio eliminado' : 'Espacio desactivado'); S.space = null; go('a-esp'); } } }); };
actions['eq-edit'] = id => { const e = db().get('resources', +id); S.eq = +id; fill({ eq_name: e?.name || '', eq_model: e?.model || '', eq_specs: e?.specs || '', eq_cap: e?.capacity || 1, eq_on: e ? e.active : true }); go(S.k); };
actions['eq-save'] = async () => { const r = await run('resource.save', { id: S.eq || undefined, space_id: S.space, name: val('eq_name'), model: val('eq_model'), specs: val('eq_specs'), capacity: val('eq_cap'), active: val('eq_on', true) }); if (r) actions['eq-edit'](0); };
actions['eq-del'] = id => run('resource.remove', { id: +id }, 'Equipo retirado');

// ============================================================ Agenda y bloqueos
screens['a-agenda'] = { roles: ['admin', 'encargado', 'recepcion'], render() {
  const edit = can('encargado'), scopes = [...(can() ? [['', 'Todo el Hub']] : []), ...mySpaces().map(s => [s.id, s.name])], sc = S.agSpace ?? (scopes[0]?.[0] ?? ''), spaceId = sc === '' ? null : +sc;
  const days = openDays(14), day = S.agDay && days.some(d => R.dayKey(d) === S.agDay) ? S.agDay : R.dayKey(days[0] || new Date()), d0 = new Date(day + 'T00:00:00'), h = R.hoursFor(cfg('hours'), d0) || [510, 1080];
  const blocks = db().where('blocks', b => T(b.end_at) > Date.now()).sort((a, b) => T(a.start_at) - T(b.start_at)), hours = []; for (let m = h[0]; m < h[1]; m += 60) hours.push(m);
  const pend = agPend(), hit = m => agHit(d0, m, h[1], spaceId);
  const dayBlocks = blocks.filter(b => (b.space_id == null || b.space_id === spaceId) && R.overlaps(d0, R.addDays(d0, 1), b.start_at, b.end_at));
  const n = pend.add.size + pend.free.size;
  return `<h1>Agenda y bloqueos</h1><p class="mu">Bloquea horas o días por feriados, eventos o mantención. Las reservas afectadas se cancelan con aviso y devolución de horas.</p>
    ${edit ? `<div class="card stack"><div class="hs" role="group" aria-label="Espacio">${scopes.map(([v, l]) => `<button class="chip ${String(sc) === String(v) ? 'on' : ''}" aria-pressed="${String(sc) === String(v)}" data-a="ag-space" data-v="${v}">${esc(l)}</button>`).join('')}</div>${dayChips('ag-day', day, days)}
      <p class="sm mu">1. Toca las horas que quieres bloquear o liberar en <b>${esc(spaceId ? sname(spaceId) : 'todo el Hub')}</b>. 2. Revisa la lista. 3. Toca <b>Guardar cambios</b>.</p>
      <div class="chips" role="group" aria-label="Horas del día">${hours.map(m => { const b = hit(m), add = pend.add.has(m), fr = pend.free.has(m), on = (b && !fr) || add;
        const past = +R.atMin(d0, m + 60) <= Date.now();
        return `<button class="chip ${on ? 'on' : ''}${add || fr ? ' pend' : ''}" aria-pressed="${on}" data-a="ag-hour" data-v="${m}"${past ? ' disabled' : ''} title="${esc(b?.reason || '')}">${icon(on ? 'lock' : 'clock')} ${R.hm(m)}${add ? ' · nuevo' : fr ? ' · se libera' : ''}</button>`; }).join('')}</div>
      <div class="card stack" aria-live="polite" style="background:var(--tint)"><b>Horas bloqueadas:</b>${dayBlocks.length || pend.add.size ? `<ul class="blist">${dayBlocks.map(b => `<li>${fTime(T(b.start_at) < +d0 ? d0 : b.start_at)} – ${fTime(T(b.end_at) > +R.addDays(d0, 1) ? R.addDays(d0, 1) : b.end_at)} · ${esc(b.space_id ? sname(b.space_id) : 'Todo el Hub')}${b.reason ? ' · ' + esc(b.reason) : ''}</li>`).join('')}${ranges([...pend.add]).map(([a, z]) => `<li class="new">${R.hm(a)} – ${R.hm(z)} · <b>nuevo, sin guardar</b></li>`).join('')}</ul>` : '<span class="sm mu">Ninguna para este día.</span>'}
        ${pend.free.size ? `<span class="sm"><b>Se liberarán:</b> ${ranges([...pend.free]).map(([a, z]) => `${R.hm(a)} – ${R.hm(z)}`).join(', ')}</span>` : ''}</div>
      <div class="form">${field('ag_reason', 'Motivo del bloqueo (lo verán los usuarios)', { cls: 'full', ph: 'Feriado, mantención, evento…' })}</div>
      <div class="row w">${btn(n ? `Guardar cambios (${n})` : 'Guardar cambios', 'ag-save', { cls: 'sp', off: !n, raw: true, icon: 'check' })}${n ? btn('Descartar', 'ag-discard', { cls: 'plain' }) : ''}</div>
      <details><summary class="sm b">Bloquear un periodo más largo o el día completo</summary><div class="stack" style="margin-top:8px"><div class="form">${field('ag_from', 'Desde', { type: 'datetime-local', value: local(R.atMin(d0, h[0])) })}${field('ag_to', 'Hasta', { type: 'datetime-local', value: local(R.atMin(d0, h[1])) })}</div>
        <div class="row w">${btn('Bloquear ese periodo', 'ag-range', { cls: 's sp' })}${btn('Bloquear el día completo', 'ag-allday', { cls: 's plain' })}</div></div></details></div>` : ''}
    <h2>Bloqueos vigentes</h2>${table(['Espacio', 'Desde', 'Hasta', 'Motivo', ''], blocks.map(b => [esc(b.space_id ? sname(b.space_id) : 'Todo el Hub'), fDT(b.start_at), fDT(b.end_at), esc(b.reason || ''), (b.space_id ? manages(b.space_id) : can()) ? btn('Quitar', 'ag-del', { v: b.id, cls: 's plain' }) : '']), 'No hay bloqueos vigentes.')}`;
} };
const agScope = () => { const sc = S.agSpace ?? (can() ? '' : mySpaces()[0]?.id); return sc === '' || sc == null ? null : +sc; };
const agDay = () => new Date((S.agDay && openDays(14).some(d => R.dayKey(d) === S.agDay) ? S.agDay : R.dayKey(openDays(1)[0] || new Date())) + 'T00:00:00');
/** Cambios de agenda sin guardar, por espacio y día. */
const agPend = () => { const k = agScope() + '|' + R.dayKey(agDay()); S.agP ||= {}; return (S.agP[k] ||= { add: new Set(), free: new Set() }); };
const agHit = (d0, m, end, sp) => db().find('blocks', b => (b.space_id == null || b.space_id === sp) && R.overlaps(R.atMin(d0, m), R.atMin(d0, Math.min(m + 60, end)), b.start_at, b.end_at));
/** Une horas seguidas en tramos: [600, 660, 780] → [[600, 720], [780, 840]] */
const ranges = ms => ms.sort((a, b) => a - b).reduce((o, m) => { const l = o[o.length - 1]; if (l && l[1] === m) l[1] = m + 60; else o.push([m, m + 60]); return o; }, []);
actions['ag-space'] = v => { S.agSpace = v; go(S.k); };
actions['ag-day'] = v => { S.agDay = v; delete S.f.ag_from; delete S.f.ag_to; go(S.k); };
actions['ag-hour'] = m => { m = +m; const d0 = agDay(), sp = agScope(), p = agPend(), h = R.hoursFor(cfg('hours'), d0) || [510, 1080], b = agHit(d0, m, h[1], sp);
  if (p.add.has(m)) p.add.delete(m); else if (p.free.has(m)) p.free.delete(m);
  else if (!b) p.add.add(m);
  else if ((b.space_id ?? null) !== sp) return toast('Esa hora está bloqueada para todo el Hub. Libérala eligiendo “Todo el Hub”');
  else p.free.add(m);
  go(S.k); };
actions['ag-discard'] = () => { const p = agPend(); p.add.clear(); p.free.clear(); go(S.k); };
actions['ag-save'] = () => { const p = agPend(), d0 = agDay(), sp = agScope(), add = ranges([...p.add]), free = ranges([...p.free]), when = rs => rs.map(([a, z]) => `${R.hm(a)} – ${R.hm(z)}`).join(', ');
  const hits = db().where('reservations', r => ['confirmada', 'en_revision'].includes(r.status) && (sp == null || r.space_id === sp) && add.some(([a, z]) => R.overlaps(R.atMin(d0, a), R.atMin(d0, z), r.start_at, r.end_at))).length;
  confirmBox({ title: 'Confirmar cambios de agenda', ok: 'Guardar cambios', text: `<p>${esc(sp ? sname(sp) : 'Todo el Hub')} · ${fDay(d0)}</p>${add.length ? `<p><b>Horas bloqueadas:</b> ${when(add)}${val('ag_reason') ? ' · ' + esc(val('ag_reason')) : ''}</p>` : ''}${free.length ? `<p><b>Horas liberadas:</b> ${when(free)}</p>` : ''}${hits ? `<p>${hits} reservas en esas horas se cancelarán y sus dueños recibirán un aviso con devolución de horas.</p>` : ''}`,
    fn: async () => { const r = await run('block.batch', { space_id: sp, add: add.map(([a, z]) => [R.atMin(d0, a), R.atMin(d0, z)]), free: free.map(([a, z]) => [R.atMin(d0, a), R.atMin(d0, z)]), reason: val('ag_reason') });
      if (r) { p.add.clear(); p.free.clear(); toast(`Cambios guardados${add.length ? ` · horas bloqueadas: ${when(add)}` : ''}${free.length ? ` · liberadas: ${when(free)}` : ''}`); } } }); };
actions['ag-range'] = () => { if (!val('ag_from') || !val('ag_to')) return toast('Indica desde y hasta cuándo'); const a = new Date(val('ag_from')), z = new Date(val('ag_to')), sp = agScope();
  confirmBox({ title: '¿Bloquear este periodo?', ok: 'Bloquear', text: `<p>${esc(sp ? sname(sp) : 'Todo el Hub')}: ${fDT(a)} – ${fDT(z)}${val('ag_reason') ? ' · ' + esc(val('ag_reason')) : ''}</p><p>Las reservas en ese periodo se cancelan con aviso.</p>`, fn: () => run('block.add', { space_id: sp, start: a, end: z, reason: val('ag_reason') }, 'Periodo bloqueado') }); };
actions['ag-allday'] = () => { const d0 = agDay(), sp = agScope();
  confirmBox({ title: '¿Bloquear el día completo?', ok: 'Bloquear el día', text: `<p>${esc(sp ? sname(sp) : 'Todo el Hub')} · ${fDay(d0)}</p><p>Las reservas de ese día se cancelan con aviso.</p>`, fn: () => run('block.add', { space_id: sp, start: d0, end: R.addDays(d0, 1), reason: val('ag_reason') || 'Cierre' }, 'Día bloqueado') }); };
actions['ag-del'] = id => { const b = db().get('blocks', +id); confirmBox({ title: '¿Quitar este bloqueo?', ok: 'Quitar bloqueo', text: `<p>${esc(b.space_id ? sname(b.space_id) : 'Todo el Hub')}: ${fDT(b.start_at)} – ${fDT(b.end_at)}</p>`, fn: () => run('block.remove', { id: +id }, 'Bloqueo quitado') }); };

// ============================================================ Apariencia
const TOKENS = [['bg', 'Fondo de la app', 'bg'], ['bg2', 'Segundo color del fondo (degradado)', 'bg'], ['surface', 'Tarjetas y paneles', 'bg'], ['text', 'Texto', 'text'], ['muted', 'Texto secundario', 'text'],
  ['accent', 'Color de acento (botones y enlaces)', 'accent'], ['onAccent', 'Texto sobre el acento', 'on'], ['bar', 'Barra superior e inferior', 'barbg'], ['barText', 'Texto de las barras', 'on']];
screens['a-apar'] = { roles: ['admin'], render() {
  const mode = S.thMode || themeMode(), th = themeOf(mode), P = { bg: PALETTE[mode].bg, text: [...PALETTE[mode].text, THEME[mode].muted], accent: PALETTE.accent, on: [...PALETTE.onColor, ...PALETTE[mode].text.slice(0, 2)], barbg: [...PALETTE[mode].bg, ...PALETTE.accent.slice(0, 5)] };
  const low = [['text', 'surface', 'El texto sobre las tarjetas'], ['onAccent', 'accent', 'El texto sobre el acento'], ['barText', 'bar', 'El texto de las barras'], ['text', 'bg', 'El texto sobre el fondo']].filter(([a, b]) => R.contrast(th[a], th[b]) < 4.5);
  fill({ ap_name: val('ap_name', cfg('system_name')), ap_tag: val('ap_tag', cfg('tagline')) });
  return `<h1>Apariencia</h1><p class="mu">Define los colores de cada elemento para el tema claro y el oscuro. El tema claro solo ofrece fondos claros y el oscuro solo fondos oscuros.</p>
    ${seg('th-mode', mode, [['light', 'Tema claro'], ['dark', 'Tema oscuro']])}
    <div class="grid"><div class="card stack">${TOKENS.map(([k, label, pal]) => `<div class="stack" style="gap:5px"><span class="sm b">${label}</span><div class="row w" style="align-items:flex-start">${swatches('th-set:' + k, th[k], [...new Set(P[pal])])}<label class="cw sm mu" title="Elegir cualquier color"><input type="color" data-color="${k}" value="${th[k]}" aria-label="${label}: más colores">Más colores</label></div></div>`).join('')}
      ${low.map(([, , what]) => `<div class="card warn sm">${icon('alert')} ${what} tiene poco contraste y puede costar leerlo.</div>`).join('')}${btn('Restablecer este tema', 'th-reset', { cls: 's plain' })}</div>
    <div class="stack"><h3>Vista previa</h3><div style="border-radius:16px;overflow:hidden;box-shadow:0 0 0 1px var(--ln);background:linear-gradient(165deg,${th.bg},${th.bg2});color:${th.text}">
        <div style="background:${th.bar};color:${th.barText};padding:12px 14px;font-weight:650">${esc(cfg('system_name'))}</div>
        <div style="padding:14px"><div style="background:${th.surface};border-radius:14px;padding:14px"><b>Tu próxima reserva</b><p style="color:${th.muted};font-size:.85rem;margin:2px 0 10px">Sala de reuniones 2 · 10:30 – 12:20</p><span style="display:inline-block;background:${th.accent};color:${th.onAccent};padding:9px 16px;border-radius:12px;font-weight:650">Confirmar reserva</span></div></div></div>
      <div class="card stack"><h3>Identidad</h3><div class="row">${`<img class="logo" src="${logoSrc()}" alt="">`}<label class="f sp">Logo (imagen cuadrada)${fileInput('logo', 'image/*')}</label></div>
        ${field('ap_name', 'Nombre del sistema')}${field('ap_tag', 'Lema')}<div class="row">${btn('Guardar identidad', 'ap-save', { cls: 'sp sec' })}${cfg('logo') ? btn('Volver al logo original', 'logo-reset', { cls: 'plain s' }) : ''}</div>
        <p class="sm mu">Los banners del inicio se administran en Eventos y banners.</p></div></div></div>`;
} };
actions['th-mode'] = v => { S.thMode = v; go(S.k); };
const saveTheme = async th => { const mode = S.thMode || themeMode(), all = { ...THEME, ...(cfg('theme') || {}) }; await run('config.set', { key: 'theme', value: { ...all, [mode]: th } }); applyTheme(); };
/** Rueda de colores: cualquier color, salvo que el fondo no corresponda al tema (claro con fondos claros, oscuro con fondos oscuros). */
actions['th-color'] = (k, v) => {
  const mode = S.thMode || themeMode(), lum = R.contrast(v.toUpperCase(), '#000000');
  if (['bg', 'bg2', 'surface'].includes(k) && (mode === 'light' ? lum < 9 : lum > 3.6)) return toast(mode === 'light' ? 'En el tema claro el fondo debe ser un color claro' : 'En el tema oscuro el fondo debe ser un color oscuro');
  saveTheme({ ...themeOf(mode), [k]: v.toUpperCase() });
};
for (const [k] of TOKENS) actions['th-set:' + k] = v => { const mode = S.thMode || themeMode(); saveTheme({ ...themeOf(mode), [k]: v }); };
actions['th-reset'] = () => saveTheme({ ...THEME[S.thMode || themeMode()] });
actions['file:logo'] = async f => run('config.set', { key: 'logo', value: await readImage(f, 256) }, 'Logo actualizado');
actions['logo-reset'] = () => run('config.set', { key: 'logo', value: null }, 'Logo restablecido');
actions['ap-save'] = async () => { await run('config.set', { key: 'system_name', value: val('ap_name') || DEFAULTS.system_name }); await run('config.set', { key: 'tagline', value: val('ap_tag') }, 'Identidad guardada'); };

// ============================================================ Reglas
const NUM = [['block_min', 'Duración del bloque de salas y gaming (min)'], ['block_gap_min', 'Pausa entre bloques (min)'], ['cancel_notice_min', 'Aviso mínimo para cancelar sin perder horas (min)'], ['tolerance_min', 'Espera antes de liberar una reserva (min)'],
  ['max_active', 'Reservas activas por persona'], ['max_hours', 'Duración máxima de una reserva (h)'], ['staff_extra_hours', 'Horas extra del personal por laboratorio'], ['release_room_after_min', 'Liberar sala sin anfitrión tras (min)'],
  ['code_minutes', 'Vigencia de los códigos enviados por correo (min)'], ['file_max_mb', 'Tamaño máximo de archivo (MB)'], ['keep_rejected_days', 'Días que se guarda un archivo rechazado'], ['keep_approved_days', 'Días mínimos que se guarda un archivo aprobado'], ['min_age', 'Edad mínima para registrarse (años)'], ['max_age', 'Edad máxima para registrarse (años)']];
screens['a-reglas'] = { roles: ['admin'], render() {
  if (!S.rgLoaded) { const h = cfg('hours'), m = cfg('mail'), fc = cfg('floor_capacity'); NUM.forEach(([k]) => { S.f['rg_' + k] = cfg(k); }); for (const f in fc) S.f['rg_f' + f] = fc[f];
    for (let d = 0; d < 7; d++) { S.f['rg_o' + d] = h[d] ? R.hm(h[d][0]) : ''; S.f['rg_c' + d] = h[d] ? R.hm(h[d][1]) : ''; }
    fill({ rg_zone: cfg('default_zone') ?? '', rg_host: cfg('release_room_without_host'), rg_mh: m.host, rg_mp: m.port, rg_mu: m.user, rg_mf: m.from, rg_g: cfg('google_client_id'), rg_ms: cfg('microsoft_client_id') }); S.rgLoaded = true; }
  const out = [...db().all('outbox')].reverse().slice(0, 8);
  return `<h1>Reglas del sistema</h1><p class="mu">Estos valores rigen para todo el Hub. Las horas mensuales y los minutos entre trabajos se definen en cada espacio.</p>
    <div class="grid"><div class="card stack"><h3>Horario de atención</h3><p class="sm mu">Deja un día vacío para marcarlo como cerrado.</p>
      ${[1, 2, 3, 4, 5, 6, 0].map(d => `<div class="row"><span style="flex:0 0 84px">${WEEKDAYS[d]}</span>${field('rg_o' + d, '', { type: 'time', cls: 'sp', attrs: `aria-label="${WEEKDAYS[d]}: abre"` })}${field('rg_c' + d, '', { type: 'time', cls: 'sp', attrs: `aria-label="${WEEKDAYS[d]}: cierra"` })}</div>`).join('')}
      <h3>Personas sin reserva</h3><p class="sm mu">Quien entra sin una reserva para esa hora queda registrado en esta zona.</p>
      ${select('rg_zone', 'Zona por defecto', db().where('spaces', s => s.active && s.mode !== 'reserva').map(s => [s.id, s.name]), { raw: true, blank: 'Cowork (predeterminado)' })}
      <h3>Aforo por piso</h3><div class="form">${Q.floorsOf(db()).map(f => field('rg_f' + f, 'Piso ' + f + ' (personas)', { type: 'number', attrs: 'min="0"' })).join('')}</div></div>
    <div class="card stack"><h3>Reservas y archivos</h3><div class="form">${NUM.map(([k, l]) => field('rg_' + k, l, { type: 'number', attrs: 'min="0"' })).join('')}</div>${check('rg_host', 'Liberar la sala de reuniones si el anfitrión no llega (por defecto se mantiene para los invitados)')}</div>
    <div class="card stack"><h3>Correo y cuentas</h3><p class="sm mu">Cuenta que envía confirmaciones y avisos. La contraseña de aplicación va en el archivo .env del servidor, nunca aquí.</p>
      <div class="form">${field('rg_mh', 'Servidor SMTP')}${field('rg_mp', 'Puerto', { type: 'number' })}${field('rg_mu', 'Cuenta de correo', { type: 'email' })}${field('rg_mf', 'Nombre del remitente')}
      ${field('rg_g', 'ID de cliente de Google (ingreso con Google)', { cls: 'full' })}${field('rg_ms', 'ID de cliente de Microsoft (pendiente de activar)', { cls: 'full' })}</div></div></div>
    ${btn('Guardar reglas', 'rg-save', { cls: 'block' })}
    <h2>Últimos correos generados</h2>${table(['Fecha', 'Para', 'Asunto', 'Estado'], out.map(o => [fDT(o.created_at), esc(o.to_email), esc(o.subject), o.sent_at ? pill('Enviado', 'ok') : pill(App.mode === 'demo' ? 'Simulado en la demo' : 'En cola', 'warn')]), 'Aún no se generan correos.')}`;
} };
actions['rg-save'] = async () => { const mins = v => { const [h, m] = String(v).split(':').map(Number); return h * 60 + m; }, hours = {};
  for (let d = 0; d < 7; d++) if (val('rg_o' + d) && val('rg_c' + d)) { hours[d] = [mins(val('rg_o' + d)), mins(val('rg_c' + d))]; if (hours[d][1] <= hours[d][0]) return toast(`Revisa el horario del ${WEEKDAYS[d].toLowerCase()}`); }
  const set = (key, value) => App.data.call('config.set', { key, value });
  try { await set('hours', hours); for (const [k] of NUM) await set(k, Math.max(0, +val('rg_' + k) || 0));
    await set('floor_capacity', Object.fromEntries(Q.floorsOf(db()).map(f => [f, +val('rg_f' + f) || 0]))); await set('release_room_without_host', !!val('rg_host')); await set('default_zone', val('rg_zone') ? +val('rg_zone') : null);
    await set('mail', { host: val('rg_mh'), port: +val('rg_mp') || 465, user: val('rg_mu'), from: val('rg_mf') }); await set('google_client_id', val('rg_g').trim()); await set('microsoft_client_id', val('rg_ms').trim()); toast('Reglas guardadas'); }
  catch (e) { toast(e.user ? e.message : 'No se pudieron guardar las reglas'); } };

// ============================================================ Empleados
const LABS = () => db().where('spaces', x => ['lab', 'gaming'].includes(x.kind) && x.active);
const labChecklist = pref => `<div class="list">${LABS().map(l => `<label class="li ck" style="margin:0"><input type="checkbox" data-i="${pref}${l.id}"${val(pref + l.id) ? ' checked' : ''}><span class="sp"><b>${esc(l.name)}</b><span>Piso ${l.floor} · ${esc(Q.managersOf(db(), l.id).map(uname).join(', ') || 'sin encargado')}</span></span></label>`).join('')}</div>`;
const pickedLabs = pref => LABS().filter(l => val(pref + l.id)).map(l => l.id);
screens['a-emp'] = { roles: ['admin'], render() {
  const staff = db().where('staff', s => s.active), newLab = !!val('em_encargado');
  return `<h1>Empleados</h1><p class="mu">Cada persona del equipo debe tener primero su perfil de usuario. Aquí se le asignan cargo y credenciales; una misma persona puede tener varias. Un encargado de laboratorio puede tener uno o más laboratorios y solo ve los datos de esos laboratorios.</p>
    <div class="grid"><div class="list">${staff.map(s => { const u = db().get('users', s.user_id), rs = Q.rolesOf(db(), s.user_id), labs = Q.managedBy(db(), s.user_id).map(id => db().get('spaces', id)?.name).filter(Boolean);
      return `<div class="li" style="flex-wrap:wrap">${avatar(u, 's')}<span class="sp"><b>${esc(u?.name)}</b><span>${esc(s.position || 'Sin cargo')} · ${s.user_id}</span>${rs.includes('encargado') ? `<span>${icon('flask')} ${esc(labs.join(', ') || 'Sin laboratorios')}</span>` : ''}</span>
        ${rs.includes('encargado') ? btn('Laboratorios', 'emp-labs', { v: s.user_id, cls: 's plain', icon: 'edit' }) : ''}
        <div class="chips" style="flex:1 0 100%">${Object.entries(ROLES).map(([k, l]) => `<button class="chip ${rs.includes(k) ? 'on' : ''}" data-a="emp-role" data-v="${s.user_id}:${k}">${l}</button>`).join('')}</div></div>`; }).join('')}</div>
    <div class="card stack"><h3>Registrar empleado</h3>${field('em_user', 'ID, RUT o correo de su perfil de usuario')}${field('em_pos', 'Cargo')}
      <div>${Object.entries(ROLES).map(([k, l]) => check('em_' + k, l, { raw: true, live: k === 'encargado' })).join('')}</div>
      ${newLab ? `<div class="stack"><h3>Laboratorios a cargo</h3><p class="sm mu">Marca uno o más.</p>${labChecklist('eml_')}</div>` : ''}
      ${btn('Agregar al equipo', 'emp-add', { cls: 'block' })}
      <p class="sm mu">Al asignar un laboratorio, el encargado recibe su certificación y ${cfg('staff_extra_hours')} horas extra al mes en ese laboratorio.</p></div></div>`;
} };
/** Ventana con la lista de laboratorios para un encargado; al continuar pide confirmación. */
function labsModal(uid, roles, position) {
  S.empEdit = { uid, roles, position };
  const mine = Q.managedBy(db(), uid); LABS().forEach(l => { S.f['ml_' + l.id] = mine.includes(l.id); });
  modal({ html: `<h2 style="margin:0">Laboratorios de ${esc(uname(uid))}</h2><p class="sm mu">Marca los laboratorios que tendrá a cargo. Solo verá los datos de estos espacios.</p>${labChecklist('ml_')}
    <div class="row">${btn('Continuar', 'emp-labs-next', { cls: 'sp' })}${btn('Cancelar', 'modal-close', { cls: 'plain' })}</div>` });
}
function confirmLabs(uid, labs, then) {
  S.empConfirm = then;
  modal({ html: `<h2 style="margin:0">¿Confirmar asignación?</h2><p><b>${esc(uname(uid))}</b> quedará como encargado de:</p><ul style="margin:0">${labs.map(id => `<li>${esc(db().get('spaces', id).name)}</li>`).join('')}</ul>
    <p class="sm mu">Podrá revisar archivos, certificar, bloquear horarios y ajustar horas solo en estos espacios.</p><div class="row">${btn('Sí, asignar', 'emp-confirm', { cls: 'sp' })}${btn('Volver', 'modal-close', { cls: 'plain' })}</div>` });
}
actions['emp-confirm'] = async () => { const fn = S.empConfirm; S.empConfirm = null; S.modal = null; await fn(); };
actions['emp-labs'] = uid => { const s = db().find('staff', x => x.user_id === uid); labsModal(uid, Q.rolesOf(db(), uid), s?.position); };
actions['emp-labs-next'] = () => { const { uid, roles, position } = S.empEdit, labs = pickedLabs('ml_');
  if (!labs.length) return toast('Elige al menos un laboratorio');
  S.modal = null; confirmLabs(uid, labs, () => run('staff.save', { user: uid, position, roles: [...new Set([...roles, 'encargado'])], labs }, 'Laboratorios asignados')); };
actions['emp-role'] = v => { const [uid, role] = v.split(':'), rs = Q.rolesOf(db(), uid), s = db().find('staff', x => x.user_id === uid);
  if (role === 'encargado' && !rs.includes('encargado')) return labsModal(uid, rs, s?.position);
  run('staff.save', { user: uid, position: s?.position, roles: rs.includes(role) ? rs.filter(r => r !== role) : [...rs, role] }, 'Credenciales actualizadas'); };
actions['emp-add'] = async () => { const roles = Object.keys(ROLES).filter(k => val('em_' + k)), labs = roles.includes('encargado') ? pickedLabs('eml_') : [], user = val('em_user');
  if (!user) return toast('Escribe el ID, RUT o correo de la persona');
  const save = async () => { const r = await run('staff.save', { user, position: val('em_pos'), roles, labs }); if (r) { S.f = {}; toast('Empleado registrado'); } };
  if (!roles.includes('encargado')) return save();
  if (!labs.length) return toast('Elige al menos un laboratorio para el encargado');
  const u = Q.findUser(db(), user); if (!u) return toast('Esa persona debe crear primero su perfil de usuario');
  confirmLabs(u.id, labs, save); };

// ============================================================ Datos
screens['a-datos'] = { roles: ['admin', 'analista'], render() {
  const [from, to] = rangeOf(), st = memo('stats' + from + to, () => Q.stats(db(), from, to)), floor = S.planFloor || 1, max = Math.max(1, ...st.bySpace.map(b => b.value));
  const byId = Object.fromEntries(db().all('spaces').map(s => { const v = st.bySpace.find(b => b.label === s.name)?.value || 0; return [s.id, { v: v / max, text: fmtN(v) + ' usos' }]; }));
  return `<div class="head"><h1>Datos</h1>${myRoles().includes('analista') ? btn('Descargar datos', 'data-export', { cls: 's', icon: 'down' }) : ''}</div>${rangeBar()}
    <p class="sm mu">${fDate(from)} – ${fDate(to)}. Para el análisis se usan solo comuna, actividad, ocupación, género, edad y movilidad reducida, sin nombres ni RUT.</p>
    <div class="kpis">${stat('Visitas en el periodo', fmtN(st.visits), `${fmtN(st.uniqueVisitors)} personas distintas`)}${stat('Usuarios registrados', fmtN(st.users), `${st.minors} menores de edad`)}${stat('Edad promedio', st.avgAge ?? '—', 'años')}${stat('Movilidad reducida', fmtN(st.mobility), `${Math.round(st.mobility / Math.max(1, st.users) * 100)} % de los usuarios`)}${stat('Inasistencias', fmtN(st.noShows), 'reservas sin llegar')}</div>
    <div class="grid"><div class="card stack"><h3>Visitas por espacio</h3>${barsH(st.bySpace)}</div><div class="card stack"><h3>Horas de uso por laboratorio y sala</h3>${barsH(st.hours, { unit: ' h' })}</div></div>
    <div class="card stack"><h3>Personas distintas por día</h3>${colChart(st.perDay, { label: 'Personas distintas por día', x: 'Día', y: 'Personas' })}</div>
    <div class="grid"><div class="card stack"><h3>Ocupación promedio por día y hora</h3>${heatGrid(st.heat)}</div>
      <div class="card stack"><div class="row between"><h3>Uso por zona del plano</h3>${floorSeg('plan-floor', floor)}</div>${heatPlan(floor, byId)}</div></div>
    <h2>Quiénes usan el Hub</h2><div class="grid"><div class="card stack"><h3>Actividad en Providencia</h3>${barsH(st.byActivity)}</div><div class="card stack"><h3>Género</h3>${barsH(st.byGender)}</div>
      <div class="card stack"><h3>A qué se dedican</h3>${barsH(st.byOccupation)}</div><div class="card stack"><h3>Comuna</h3>${barsH(st.byComuna)}</div></div>
    <h2>Fallas de máquinas</h2><div class="grid"><div class="card stack"><h3>Por máquina</h3>${barsH(st.failByResource)}</div><div class="card stack"><h3>Por tipo</h3>${barsH(st.failByCategory)}</div></div>`;
} };
actions['data-export'] = () => { const [from, to] = rangeOf(), inR = d => T(d) >= +from && T(d) < +to + 864e5, now = new Date();
  download('hub-usuarios.csv', csv(['id', 'comuna', 'actividad', 'ocupacion', 'genero', 'edad', 'movilidad_reducida', 'registrado'], db().all('users').map(u => [u.id, u.comuna, u.activity, u.occupation, u.gender, R.age(u.birth_date, now), u.reduced_mobility ? 'si' : 'no', R.dayKey(u.created_at)])));
  download('hub-visitas.csv', csv(['usuario', 'entrada', 'salida', 'registro'], db().where('visits', v => inR(v.in_at)).map(v => [v.user_id, v.in_at, v.out_at, v.source])));
  download('hub-reservas.csv', csv(['usuario', 'espacio', 'equipo', 'inicio', 'termino', 'estado', 'min_estimados', 'min_reales', 'min_descontados'], db().where('reservations', r => inR(r.start_at)).map(r => [r.user_id, sname(r.space_id), db().get('resources', r.resource_id)?.name, r.start_at, r.end_at, r.status, r.est_min, r.real_min, r.charged_min])));
  download('hub-fallas.csv', csv(['fecha', 'espacio', 'equipo', 'tipo', 'descripcion', 'estado'], db().where('failure_reports', f => inR(f.created_at)).map(f => [f.created_at, sname(f.space_id), db().get('resources', f.resource_id)?.name, f.category, f.description, f.status]))); };

// ============================================================ Importar históricos
screens['a-imp'] = { roles: ['admin', 'analista'], render() {
  const tot = Object.entries(db().all('history_stats').reduce((o, h) => { const k = h.source || 'Sin origen'; (o[k] ||= { n: 0, v: 0 }); o[k].n++; o[k].v += h.visits; return o; }, {}));
  return `<h1>Importar históricos</h1><p class="mu">Los registros anteriores de Power BI y Google Forms se cargan solo como estadística, sin nombres ni RUT. No se crean cuentas: cada persona se registra en el sistema nuevo por decisión propia.</p>
    <div class="card stack">${select('im_src', 'Origen', ['Power BI', 'Google Forms', 'Libro de registro'], { raw: true })}
      <label class="f">Archivo CSV con las columnas: fecha (AAAA-MM-DD); espacio; visitas${fileInput('imp', '.csv,text/csv')}</label>
      ${S.impRows ? `<p>${S.impRows.length} filas leídas.</p>${btn('Importar', 'imp-go', { cls: 'block' })}` : ''}${S.impDone ? `<div class="card ok">Se importaron ${S.impDone.added} filas. Se omitieron ${S.impDone.skipped} por formato.</div>` : ''}
      <details><summary>Ver un ejemplo del archivo</summary><pre class="sm">fecha;espacio;visitas\n2026-08-03;Cowork;41\n2026-08-03;Sala gaming;6</pre></details></div>
    <h2>Históricos cargados</h2>${table(['Origen', 'Filas', 'Visitas'], tot.map(([k, v]) => [esc(k), v.n, fmtN(v.v)]), 'Aún no se ha importado nada.')}`;
} };
actions['file:imp'] = async f => { const txt = await readText(f); S.impRows = txt.split(/\r?\n/).slice(1).filter(l => l.trim()).map(l => { const [day, space, visits] = l.split(/[;,\t]/).map(x => x.trim().replace(/^"|"$/g, '')); return { day, space, visits }; }); S.impDone = null; go(S.k); };
actions['imp-go'] = async () => { const r = await run('import.stats', { rows: S.impRows, source: val('im_src', 'Power BI') }); if (r) { S.impDone = r; S.impRows = null; go(S.k); } };

// ============================================================ Auditoría
screens['a-audit'] = { roles: ['admin'], render: () => `<h1>Auditoría</h1><p class="mu">Acciones del equipo sobre perfiles, reservas, espacios y configuración.</p>
  ${table(['Fecha', 'Quién', 'Acción', 'Sobre', 'Detalle'], [...db().all('audit_log')].sort((a, b) => T(b.at) - T(a.at)).slice(0, 120).map(a => [fDT(a.at), esc(uname(a.actor_id)), esc(a.action), esc([a.entity, a.entity_id].filter(Boolean).join(' ')), `<span class="sm">${esc(a.detail || '')}</span>`]))}` };

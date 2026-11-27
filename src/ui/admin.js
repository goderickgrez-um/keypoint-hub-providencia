// Pantallas de administración: espacios, agenda, eventos, apariencia, reglas, empleados, datos.
import * as R from '../core/rules.js';
import * as Q from '../core/queries.js';
import { KINDS, MODES, ROLES, WEEKDAYS, PALETTE, THEME, DEFAULTS } from '../core/catalog.js';
import { applyTheme, themeOf, themeMode } from './theme.js';
import { heatPlan, floorSeg } from './plan.js';
import { uname, sname, rangeOf, rangeBar, anon } from './staff.js';
import { logoSrc } from './user.js';
import * as FORM from '../core/form.js';
import * as LEGAL from '../core/legal.js';
import { regForm as formCfg, baseInputs, baseInput, extraInputs, statVars } from './formui.js';
import { fileInput, confirmBox, memo, qrSvg, labOnly, App, S, db, me, myRoles, can, manages, mySpaces, screens, actions, go, run, toast, modal, esc, icon, field, area, select, check, btn, seg, pill, empty, back, stat, table, avatar, swatches, openDays, dayChips, heatGrid, barsH, colChart, fDay, fDate, fTime, fDT, fRange, fmtN, val, fill, readImage, readText, download, csv } from './kit.js';

const T = d => +new Date(d), cfg = k => db().cfg(k);
const closeQuiet = () => { S.modal = null; };
const local = d => { d = new Date(d); return `${R.dayKey(d)}T${R.hmOf(d)}`; }; // para <input type="datetime-local">

// ============================================================ Eventos y banners
const evFill = e => fill({ ev_balt: e?.banner_alt || '', ev_palt: e?.poster_alt || '', ev_kind: e?.kind || 'evento', ev_title: e?.title || '', ev_desc: e?.description || '', ev_start: e?.start_at ? local(e.start_at) : '', ev_end: e?.end_at ? local(e.end_at) : '', ev_seats: e?.seats || '', ev_space: e?.space_id || '', ev_pub: e ? e.published : true });
screens['a-eventos'] = { roles: ['admin'], render() {
  const now = new Date(), list = Q.sortEvents(db().all('events'), now), cur = db().get('events', S.ev);
  if (S.evLoaded !== (cur?.id ?? 0)) { evFill(cur); S.evLoaded = cur?.id ?? 0; S.evImg = {}; }
  const img = k => S.evImg?.[k] ?? cur?.[k], att = cur ? db().where('event_attendance', a => a.event_id === cur.id) : [];
  return `<h1>Eventos y banners</h1><p class="mu">Lo que publiques aquí aparece como banner en el inicio de los usuarios. El sistema no publica en redes sociales.</p>
    <div class="grid"><div class="stack"><div class="row w between"><p class="sm mu" style="margin:0">Los banners se muestran en este orden. Usa las flechas para moverlos; los terminados pasan solos al final.</p>${list.length > 1 ? btn('Ordenar por fecha: más cercanos primero', 'ev-bydate', { cls: 's plain', icon: 'cal' }) : ''}</div>
      <div class="list" role="list">${list.map((e, i) => { const st = Q.eventState(e, now);
        return `<div class="li evrow${S.ev === e.id ? ' on' : ''}" role="listitem"><button class="sp evpick" data-a="ev-pick" data-v="${e.id}"><b>${esc(e.title)}</b><span>${e.kind === 'aviso' && !e.start_at ? 'Aviso sin fecha' : fRange(e.start_at, e.end_at || e.start_at)}${e.seats ? ` · ${db().where('event_attendance', a => a.event_id === e.id).length}/${e.seats} inscritos` : ''}</span></button>
          ${st === 'terminado' ? pill('Terminado', 'warn') : st === 'en_curso' ? pill('En curso', 'info') : ''}${e.published ? pill(st === 'terminado' ? 'No se muestra' : 'Publicado', st === 'terminado' ? '' : 'ok') : pill('Oculto')}
          <span class="ord"><button class="icb" data-a="ev-move" data-v="${e.id}:-1" aria-label="Subir ${esc(e.title)}"${i && !(st !== 'terminado' && false) && !(st === 'terminado' && Q.eventState(list[i - 1], now) !== 'terminado') ? '' : ' disabled'}>${icon('up')}</button><button class="icb" data-a="ev-move" data-v="${e.id}:1" aria-label="Bajar ${esc(e.title)}"${i < list.length - 1 && !(st !== 'terminado' && Q.eventState(list[i + 1], now) === 'terminado') ? '' : ' disabled'}>${icon('dn')}</button></span></div>`; }).join('') || '<div class="li mu">Aún no hay eventos.</div>'}</div>
      ${btn('Nuevo evento o aviso', 'ev-pick', { v: 0, cls: 'sec block', icon: 'plus' })}</div>
    <div class="card stack"><h3>${cur ? 'Editar' : 'Nuevo'}</h3><div class="form">${select('ev_kind', 'Tipo', [['evento', 'Evento con fecha'], ['aviso', 'Aviso sin fecha']], { raw: true, live: true })}${field('ev_title', 'Título', { cls: 'full' })}${area('ev_desc', 'Descripción')}
      ${val('ev_kind') === 'evento' ? field('ev_start', 'Inicio', { type: 'datetime-local' }) + field('ev_end', 'Término', { type: 'datetime-local' }) + field('ev_seats', 'Cupos (vacío = sin límite)', { type: 'number', attrs: 'min="1"' }) + select('ev_space', 'Lugar', db().all('spaces').map(s => [s.id, s.name]), { raw: true, blank: 'Sin lugar fijo' }) : ''}</div>
      <label class="f">Imagen del banner (recomendado 1200 × 400 px)${fileInput('ev-banner', 'image/*')}</label>${img('banner_img') ? `<img src="${esc(img('banner_img'))}" alt="${esc(val('ev_balt') || 'Vista previa del banner')}" style="width:100%;border-radius:10px;aspect-ratio:3/1;object-fit:cover">${area('ev_balt', 'Texto alternativo del banner (obligatorio): describe la imagen y escribe el texto que aparece en ella', { attrs: 'maxlength="300" rows="2"' })}` : ''}
      <label class="f">Imagen del anuncio que se abre al tocar el banner (mayor calidad, hasta 1600 px)${fileInput('ev-poster', 'image/*')}</label>${img('poster_img') ? `<img src="${esc(img('poster_img'))}" alt="${esc(val('ev_palt') || 'Vista previa del anuncio')}" style="max-height:160px;border-radius:10px;align-self:flex-start">${area('ev_palt', 'Texto alternativo del anuncio (obligatorio): lo que dice y muestra la imagen', { attrs: 'maxlength="300" rows="2"' })}` : ''}
      ${check('ev_pub', 'Publicado: visible para los usuarios')}<div class="row">${btn('Guardar', 'ev-save', { cls: 'sp' })}${cur ? btn('Borrar', 'ev-del', { v: cur.id, cls: 'danger' }) : ''}</div>
      ${cur?.kind === 'evento' ? `<p class="sm mu">${att.length} inscritos · ${att.filter(a => a.status === 'asistio').length} asistieron</p>${att.length ? btn('Descargar lista de asistentes', 'ev-csv', { v: cur.id, cls: 's plain', icon: 'down' }) : ''}` : ''}</div></div>`;
} };
actions['ev-pick'] = v => { S.ev = +v; S.evLoaded = -1; go(S.k); };
actions['ev-move'] = async v => { const [id, d] = v.split(':').map(Number), ids = Q.sortEvents(db().all('events')).map(e => e.id), i = ids.indexOf(id), j = i + d;
  if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; await run('event.order', { ids });
  requestAnimationFrame(() => document.querySelector(`[data-a="ev-move"][data-v="${id}:${d}"]:not([disabled])`)?.focus()); };
/** Por fecha, más cercanos primero: en curso y próximos por inicio, luego avisos sin fecha y al final los terminados (el más reciente primero). */
actions['ev-bydate'] = () => confirmBox({ title: '¿Ordenar por fecha?', ok: 'Ordenar', text: '<p>Primero los eventos en curso y los más cercanos, luego los avisos sin fecha y al final los terminados. Reemplaza el orden manual.</p>',
  fn: async () => { const now = new Date(), rank = e => ({ en_curso: 0, proximo: 0, aviso: 1, terminado: 2 })[Q.eventState(e, now)];
    const ids = [...db().all('events')].sort((a, b) => rank(a) - rank(b) || (rank(a) === 2 ? T(b.start_at) - T(a.start_at) : (a.start_at ? T(a.start_at) : 0) - (b.start_at ? T(b.start_at) : 0)) || a.id - b.id).map(e => e.id);
    await run('event.order', { ids }, 'Banners ordenados por fecha'); } });
actions['file:ev-banner'] = async f => { (S.evImg ||= {}).banner_img = await readImage(f, 1200); go(S.k); };
actions['file:ev-poster'] = async f => { (S.evImg ||= {}).poster_img = await readImage(f, 1600); go(S.k); };
actions['ev-save'] = async () => { const r = await run('event.save', { id: S.evLoaded || undefined, kind: val('ev_kind'), title: val('ev_title'), description: val('ev_desc'), start_at: val('ev_kind') === 'evento' && val('ev_start') ? new Date(val('ev_start')) : null, end_at: val('ev_kind') === 'evento' && val('ev_end') ? new Date(val('ev_end')) : null, seats: val('ev_seats'), space_id: val('ev_space'), published: val('ev_pub'), banner_alt: val('ev_balt'), poster_alt: val('ev_palt'), ...(S.evImg || {}) });
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
        ${check('eq_on', 'En servicio', { value: true })}<div class="row">${btn(S.eq ? 'Guardar equipo' : 'Agregar', 'eq-save', { cls: 'sp sec' })}${S.eq ? btn('Cancelar', 'eq-edit', { v: 0, cls: 'plain' }) : ''}</div></div></div>` : ''}${spaceQrCard(s)}</div>`;
} };
/** Dirección que lleva el QR de un espacio. */
const spaceUrl = s => `${(cfg('public_url') || location.origin + location.pathname).replace(/[?#].*$/, '')}?espacio=${s.id}-${s.qr_key}`;
export const spaceQrCard = s => !s?.id ? '' : `<div class="card stack"><h3>QR del espacio</h3>
  <p class="sm mu" style="margin:0">Imprímelo y ponlo en la entrada. Quien tenga una reserva lo escanea desde «Entrar a tu reserva» para confirmar que llegó${+cfg('intern_space') === s.id ? '; las personas con pasantía lo usan para entrar a la oficina' : ''}.</p>
  ${s.qr_key ? `<div class="spqr">${qrSvg(spaceUrl(s))}</div><p class="c" style="margin:0">Código: <b class="mono">${s.id}-${s.qr_key}</b></p>
    <div class="row w">${btn('Descargar cartel para imprimir', 'sp-qr-png', { v: s.id, cls: 's sp', icon: 'down' })}${btn('Generar un QR nuevo', 'sp-qr-new', { v: s.id, cls: 's plain' })}</div>` : btn('Generar el QR', 'sp-qr', { v: s.id, cls: 'sp', icon: 'qr' })}</div>`;
actions['sp-qr'] = id => run('space.qr', { id: +id }, 'QR generado');
actions['sp-qr-new'] = id => confirmBox({ title: '¿Generar un QR nuevo?', danger: true, ok: 'Generar QR nuevo', text: '<p>El QR impreso actual dejará de funcionar. Tendrás que imprimir y pegar el nuevo.</p>', fn: () => run('space.qr', { id: +id, renew: true }, 'QR nuevo generado') });
actions['sp-qr-png'] = async id => { const s = db().get('spaces', +id), W = 1240, H = 1754, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#1D1D1F'; g.textAlign = 'center';
  g.font = '700 84px -apple-system, "Segoe UI", Roboto, Arial, sans-serif'; g.fillText(s.name, W / 2, 200, W - 160);
  g.font = '400 44px -apple-system, "Segoe UI", Roboto, Arial, sans-serif'; g.fillStyle = '#555'; g.fillText(+cfg('intern_space') === s.id ? 'Escanea para entrar a la oficina de pasantía' : 'Escanea para empezar tu reserva', W / 2, 290);
  const svg = new Blob([qrSvg(spaceUrl(s)).replace('<svg ', '<svg width="900" height="900" ')], { type: 'image/svg+xml' }), url = URL.createObjectURL(svg);
  const img = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; }); if (img) g.drawImage(img, (W - 900) / 2, 380, 900, 900); URL.revokeObjectURL(url);
  g.fillStyle = '#1D1D1F'; g.font = '600 56px ui-monospace, Menlo, Consolas, monospace'; g.fillText(`${s.id}-${s.qr_key}`, W / 2, 1400);
  g.fillStyle = '#555'; g.font = '400 36px -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  ['En la app: Inicio › «Entrar a tu reserva» › Abrir la cámara.', 'Si la cámara no funciona, escribe el código de arriba.'].forEach((l, i) => g.fillText(l, W / 2, 1490 + i * 56));
  g.fillText(cfg('system_name') || 'Hub Providencia', W / 2, 1660);
  download(`qr-${s.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '-').toLowerCase()}.png`, cv.toDataURL('image/png')); };
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
actions['ap-save'] = () => run('config.setMany', { values: [['system_name', val('ap_name') || DEFAULTS.system_name], ['tagline', val('ap_tag')]] }, 'Identidad guardada');

/** Aviso mientras llega el historial (primeros segundos después de entrar con servidor). */
const partialNote = () => (App.partial ? `<p class="sm mu" role="status"><span class="spin" aria-hidden="true"></span> Cargando el historial…</p>` : '');
/** Diagnóstico de conexión (modo con servidor): separa la demora de la red de la del servidor. */
const ms = x => (x == null || isNaN(x) ? '—' : x < 1000 ? `${Math.round(x)} ms` : `${(x / 1000).toFixed(1)} s`);
function netCard() {
  if (App.mode !== 'remote' || !App.data.net) return '';
  const recent = App.data.net.filter(x => x.path === '/api/rpc').slice(-8).reverse(), r = S.netRes;
  const verdict = r && (r.server > 300 ? 'La demora está en el computador del servidor: revisa que esté enchufado, en modo de alto rendimiento y sin otros programas pesados.'
    : r.total - r.server > 800 ? 'La demora está en la red: la conexión entre este dispositivo y el servidor (Tailscale Funnel o el internet del Hub). El servidor responde rápido.'
    : r.total - r.server > 300 ? 'La red es algo lenta, pero aceptable. El servidor responde rápido.' : 'La conexión y el servidor responden bien.');
  return `<div class="card stack"><h3>Conexión con el servidor</h3><p class="sm mu">Mide cuánto tarda cada pedido en ir y volver, y cuánto de eso es trabajo del servidor. La diferencia es la red.</p>
    ${r ? `<div class="kpis">${stat('Ida y vuelta', ms(r.total), 'mediana de 5 pedidos')}${stat('Servidor', ms(r.server), 'procesando')}${stat('Red', ms(r.total - r.server), 'internet y Tailscale')}</div><p class="sm">${verdict}</p>` : ''}
    ${recent.length ? `<details><summary class="sm b">Últimas acciones (${recent.length})</summary>${table(['Acción', 'Total', 'Servidor'], recent.map(x => [esc(x.name || x.path), ms(x.total), ms(x.server)]))}</details>` : ''}
    ${btn(r ? 'Medir de nuevo' : 'Medir la conexión', 'net-test', { cls: 's plain' })}</div>`;
}
actions['net-test'] = async () => { toast('Midiendo…'); try { S.netRes = await App.data.ping(5); go(S.k); } catch (e) { toast(e.message); } };

/** Vista previa de un correo tal como sale: texto + pie con contacto, versión y (en avisos) el enlace de baja. */
actions['ob-view'] = async id => {
  const o = db().get('outbox', +id || id); if (!o) return;
  const contact = { ...DEFAULTS.hub_contact, ...(cfg('hub_contact') || {}) }, links = {};
  if (o.kind === 'aviso' && o.user_id && App.mode === 'demo') links.unsubscribe = `${location.href.split('#')[0]}#baja=${o.user_id}.${await LEGAL.unsubToken('demo', o.user_id)}`;
  else if (o.kind === 'aviso') links.unsubscribe = '(enlace personal de baja)';
  const text = (o.body || '') + '\n' + LEGAL.mailFooter({ kind: o.kind || 'cuenta', contact, version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '', links });
  modal({ html: `<h2 id="dlg-t" style="margin:0">${esc(o.subject)}</h2><p class="sm mu">Para: ${esc(o.to_email)} · ${o.kind === 'aviso' ? 'Aviso' : 'Correo de cuenta'}</p><pre class="mailpv">${esc(text)}</pre>${App.mode === 'demo' && links.unsubscribe?.startsWith('http') ? btn('Probar el enlace de baja', 'ob-try', { v: links.unsubscribe.split('#baja=')[1], cls: 's plain' }) : ''}<div class="row">${btn('Cerrar', 'modal-close', { cls: 'sp' })}</div>` });
};

/** Demo: abre la confirmación de baja como si se hubiera tocado el enlace del correo. */
actions['ob-try'] = v => { const [u, tk] = String(v).split('.'); S.baja = { u, t: tk }; S.bajaDone = false; actions['modal-close'](); setTimeout(() => go('u-baja'), 120); };
// ============================================================ Reglas
const NUM = [['block_min', 'Duración del bloque de salas y gaming (min)'], ['block_gap_min', 'Pausa entre bloques (min)'], ['cancel_notice_min', 'Aviso mínimo para cancelar sin perder horas (min)'], ['tolerance_min', 'Espera antes de liberar una reserva (min)'],
  ['max_active', 'Reservas activas por persona'], ['max_hours', 'Duración máxima de una reserva (h)'], ['staff_extra_hours', 'Horas extra del personal por laboratorio'], ['release_room_after_min', 'Liberar sala sin anfitrión tras (min)'],
  ['code_minutes', 'Vigencia de los códigos enviados por correo (min)'], ['file_max_mb', 'Tamaño máximo de archivo (MB)'], ['keep_rejected_days', 'Días que se guarda un archivo rechazado'], ['keep_approved_days', 'Días mínimos que se guarda un archivo aprobado'], ['min_age', 'Edad mínima para registrarse (años)'], ['max_age', 'Edad máxima para registrarse (años)']];
screens['a-reglas'] = { roles: ['admin'], render() {
  if (!S.rgLoaded || S.f.rg_two === undefined) { const h = cfg('hours'), hc = { ...DEFAULTS.hub_contact, ...(cfg('hub_contact') || {}) }, m = cfg('mail'), fc = cfg('floor_capacity'); NUM.forEach(([k]) => { S.f['rg_' + k] = cfg(k); }); for (const f in fc) S.f['rg_f' + f] = fc[f];
    for (let d = 0; d < 7; d++) { S.f['rg_o' + d] = h[d] ? R.hm(h[d][0]) : ''; S.f['rg_c' + d] = h[d] ? R.hm(h[d][1]) : ''; }
    fill({ rg_two: !!cfg('two_step'), rg_fw: cfg('finish_window_min') ?? 5, rg_url: cfg('public_url') || '', rg_intern: cfg('intern_space') ?? '', rg_zone: cfg('default_zone') ?? '', rg_host: cfg('release_room_without_host'), rg_mh: m.host, rg_mp: m.port, rg_mu: m.user, rg_mf: m.from, rg_g: cfg('google_client_id'), rg_ms: cfg('microsoft_client_id'), rg_co: hc.owner, rg_cp: hc.phone, rg_ce: hc.email, rg_ca: hc.address, rg_ch: hc.hours }); S.rgLoaded = true; }
  const out = [...db().all('outbox')].reverse().slice(0, 8);
  return `<h1>Reglas del sistema</h1><p class="mu">Estos valores rigen para todo el Hub. Las horas mensuales y los minutos entre trabajos se definen en cada espacio.</p>
    <div class="grid"><div class="card stack"><h3>Horario de atención</h3><p class="sm mu">Deja un día vacío para marcarlo como cerrado.</p>
      ${[1, 2, 3, 4, 5, 6, 0].map(d => `<div class="row"><span style="flex:0 0 84px">${WEEKDAYS[d]}</span>${field('rg_o' + d, '', { type: 'time', cls: 'sp', attrs: `aria-label="${WEEKDAYS[d]}: abre"` })}${field('rg_c' + d, '', { type: 'time', cls: 'sp', attrs: `aria-label="${WEEKDAYS[d]}: cierra"` })}</div>`).join('')}
      <h3>Personas sin reserva</h3><p class="sm mu">Quien entra sin una reserva para esa hora queda registrado en esta zona.</p>
      ${select('rg_zone', 'Zona por defecto', db().where('spaces', s => s.active && s.mode !== 'reserva').map(s => [s.id, s.name]), { raw: true, blank: 'Cowork (predeterminado)' })}
      <h3>Asistencia a reservas</h3>${check('rg_two', 'Confirmación en dos pasos: la reserva empieza al escanear el QR del espacio (o cuando recepción la inicia), no solo al entrar al Hub')}
      ${field('rg_fw', 'Minutos para pasar por recepción tras «Terminar» (si no, se registra la salida del Hub)', { type: 'number', attrs: 'min="1" max="60"' })}
      ${field('rg_url', 'Dirección pública de la app (la que llevan los QR de los espacios; vacío = la dirección actual)', { ph: 'https://usuario.github.io/keypoint-hub-providencia/', attrs: 'type="url"' })}
      <h3>Pasantía</h3>${select('rg_intern', 'Oficina de pasantía (espacio al que entran las personas con pasantía)', db().where('spaces', s => s.active).map(s => [s.id, `${s.name} · aforo ${s.capacity}`]), { raw: true, blank: 'Sin oficina de pasantía' })}
      <h3>Aforo por piso</h3><div class="form">${Q.floorsOf(db()).map(f => field('rg_f' + f, 'Piso ' + f + ' (personas)', { type: 'number', attrs: 'min="0"' })).join('')}</div></div>
    <div class="card stack"><h3>Reservas y archivos</h3><div class="form">${NUM.map(([k, l]) => field('rg_' + k, l, { type: 'number', attrs: 'min="0"' })).join('')}</div>${check('rg_host', 'Liberar la sala de reuniones si el anfitrión no llega (por defecto se mantiene para los invitados)')}</div>
    <div class="card stack"><h3>Correo y cuentas</h3><p class="sm mu">Cuenta que envía confirmaciones y avisos. La contraseña de aplicación va en el archivo .env del servidor, nunca aquí.</p>
      <div class="form">${field('rg_mh', 'Servidor SMTP')}${field('rg_mp', 'Puerto', { type: 'number' })}${field('rg_mu', 'Cuenta de correo', { type: 'email' })}${field('rg_mf', 'Nombre del remitente')}
      ${field('rg_g', 'ID de cliente de Google (ingreso con Google)', { cls: 'full' })}${field('rg_ms', 'ID de cliente de Microsoft (pendiente de activar)', { cls: 'full' })}</div></div>
    <div class="card stack"><h3>Contacto del Hub</h3><p class="sm mu">Aparece en el pie de la app, en la ayuda, al final de cada correo y en la política de privacidad (como responsable de los datos). El teléfono que viene de ejemplo es inventado: reemplázalo por el real.</p>
      <div class="form">${field('rg_co', 'Responsable (nombre que verán las personas)', { cls: 'full' })}${field('rg_cp', 'Teléfono', { type: 'tel' })}${field('rg_ce', 'Correo de contacto', { type: 'email' })}${field('rg_ca', 'Dirección (opcional)', { cls: 'full' })}${field('rg_ch', 'Horario de atención (opcional, texto libre)', { cls: 'full', ph: 'Lunes a viernes, 9:00 a 18:00' })}</div></div></div>
    ${btn('Guardar reglas', 'rg-save', { cls: 'block' })}
    ${netCard()}
    <h2>Últimos correos generados</h2><p class="sm mu">Los avisos llevan al final un enlace para dejar de recibirlos; los correos de cuenta (códigos, restablecimiento) se envían siempre.</p>${table(['Fecha', 'Para', 'Asunto', 'Tipo', 'Estado', ''], out.map(o => [fDT(o.created_at), esc(o.to_email), esc(o.subject), o.kind === 'aviso' ? 'Aviso' : 'Cuenta', o.sent_at ? pill('Enviado', 'ok') : pill(App.mode === 'demo' ? 'Simulado en la demo' : 'En cola', 'warn'), btn('Ver', 'ob-view', { v: o.id, cls: 's plain' })]), 'Aún no se generan correos.')}`;
} };
actions['rg-save'] = async () => { const mins = v => { const [h, m] = String(v).split(':').map(Number); return h * 60 + m; }, hours = {};
  for (let d = 0; d < 7; d++) if (val('rg_o' + d) && val('rg_c' + d)) { hours[d] = [mins(val('rg_o' + d)), mins(val('rg_c' + d))]; if (hours[d][1] <= hours[d][0]) return toast(`Revisa el horario del ${WEEKDAYS[d].toLowerCase()}`); }
  if (val('rg_url') && !/^https:\/\/[^\s]+$/.test(val('rg_url'))) return toast('La dirección pública debe empezar con https://');
  // Todo en una sola llamada (antes eran unas 20): se guarda completo o no se guarda nada.
  const values = [['hours', hours], ...NUM.map(([k]) => [k, Math.max(0, +val('rg_' + k) || 0)]),
    ['floor_capacity', Object.fromEntries(Q.floorsOf(db()).map(f => [f, +val('rg_f' + f) || 0]))], ['release_room_without_host', !!val('rg_host')], ['default_zone', val('rg_zone') ? +val('rg_zone') : null],
    ['two_step', !!val('rg_two')], ['finish_window_min', Math.min(60, Math.max(1, +val('rg_fw') || 5))], ['intern_space', val('rg_intern') ? +val('rg_intern') : null], ['public_url', val('rg_url').trim()],
    ['mail', { host: val('rg_mh'), port: +val('rg_mp') || 465, user: val('rg_mu'), from: val('rg_mf') }], ['google_client_id', val('rg_g').trim()], ['microsoft_client_id', val('rg_ms').trim()],
    ['hub_contact', { owner: val('rg_co'), phone: val('rg_cp'), email: val('rg_ce'), address: val('rg_ca'), hours: val('rg_ch') }]];
  try { await App.data.call('config.setMany', { values }); toast('Reglas guardadas'); }
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
  return `<div class="head"><h1>Datos</h1>${myRoles().includes('analista') ? btn('Descargar datos', 'data-export', { cls: 's', icon: 'down' }) : ''}</div>${partialNote()}${rangeBar()}
    <p class="sm mu">${fDate(from)} – ${fDate(to)}. Para el análisis se usan solo ${esc(statVars(true))}, sin nombres ni RUT.</p>
    <div class="kpis">${stat('Visitas en el periodo', fmtN(st.visits), `${fmtN(st.uniqueVisitors)} personas distintas`)}${stat('Usuarios registrados', fmtN(st.users), `${st.minors} menores de edad`)}${stat('Edad promedio', st.avgAge ?? '—', 'años')}${st.shown.reduced_mobility ? stat('Movilidad reducida', fmtN(st.mobility), `${Math.round(st.mobility / Math.max(1, st.users) * 100)} % de los usuarios`) : ''}${stat('Inasistencias', fmtN(st.noShows), 'reservas sin llegar')}</div>
    <div class="grid"><div class="card stack"><h3>Visitas por espacio</h3>${barsH(st.bySpace, { id: 'bySpace' })}</div><div class="card stack"><h3>Horas de uso por laboratorio y sala</h3>${barsH(st.hours, { id: 'hours', unit: ' h' })}</div></div>
    <div class="card stack"><h3>Personas distintas por día</h3>${colChart(st.perDay, { label: 'Personas distintas por día', x: 'Día', y: 'Personas' })}</div>
    <div class="grid"><div class="card stack"><h3>Ocupación promedio por día y hora</h3>${heatGrid(st.heat)}</div>
      <div class="card stack"><div class="row between"><h3>Uso por zona del plano</h3>${floorSeg('plan-floor', floor)}</div>${heatPlan(floor, byId)}</div></div>
    <h2>Quiénes usan el Hub</h2><div class="grid">${[['activity', 'Actividad en Providencia', 'byActivity'], ['gender', 'Género', 'byGender'], ['occupation', 'A qué se dedican', 'byOccupation'], ['comuna', 'Comuna', 'byComuna']].filter(([k]) => st.shown[k]).map(([, h, id]) => `<div class="card stack"><h3>${h}</h3>${barsH(st[id], { id })}</div>`).join('')}</div>
    ${st.extra.length ? `<h2>Preguntas agregadas al formulario</h2><p class="sm mu">Respuestas de las personas registradas. Las preguntas de texto libre, teléfono o correo no se grafican.</p><div class="grid">${st.extra.map(extraCard).join('')}</div>` : ''}
    <h2>Fallas de máquinas</h2><div class="grid"><div class="card stack"><h3>Por máquina</h3>${barsH(st.failByResource, { id: 'failByResource' })}</div><div class="card stack"><h3>Por tipo</h3>${barsH(st.failByCategory, { id: 'failByCategory' })}</div></div>`;
} };
/** Tarjeta de Datos para una pregunta agregada al formulario. */
function extraCard(x) {
  const pct = Math.round(x.answered / Math.max(1, x.total) * 100), sub = `${fmtN(x.answered)} de ${fmtN(x.total)} personas respondieron (${pct} %)`;
  const num = x.type === 'number' && x.answered ? `<p class="sm">Promedio <b>${fmtN(x.avg)}</b> · mínimo ${fmtN(x.min)} · máximo ${fmtN(x.max)}</p>` : '';
  return `<div class="card stack"><h3>${esc(x.label)}</h3><p class="sm mu" style="margin:0">${sub}${x.note ? '. ' + x.note : ''}</p>${num}${barsH(x.items, { id: 'x:' + x.id })}</div>`;
}
const csvExtra = (F, u, all) => FORM.liveFields(F).filter(f => all || !FORM.isPrivate(f)).map(f => FORM.answerText(f, u.extra?.[f.id]));
actions['data-export'] = () => { const [from, to] = rangeOf(), inR = d => T(d) >= +from && T(d) < +to + 864e5, now = new Date(), F = formCfg(), xs = FORM.liveFields(F).filter(f => !FORM.isPrivate(f));
  download('hub-usuarios.csv', csv(['id', 'comuna', 'actividad', 'ocupacion', 'genero', 'edad', 'movilidad_reducida', 'registrado', ...xs.map(f => f.label)], db().all('users').map(u => [u.id, u.comuna, u.activity, u.occupation, u.gender, R.age(u.birth_date, now), u.reduced_mobility ? 'si' : 'no', R.dayKey(u.created_at), ...csvExtra(F, u, false)])));
  download('hub-visitas.csv', csv(['usuario', 'entrada', 'salida', 'registro'], db().where('visits', v => inR(v.in_at)).map(v => [v.user_id, v.in_at, v.out_at, v.source])));
  download('hub-reservas.csv', csv(['usuario', 'espacio', 'equipo', 'inicio', 'termino', 'estado', 'min_estimados', 'min_reales', 'min_descontados'], db().where('reservations', r => inR(r.start_at)).map(r => [r.user_id, sname(r.space_id), db().get('resources', r.resource_id)?.name, r.start_at, r.end_at, r.status, r.est_min, r.real_min, r.charged_min])));
  download('hub-fallas.csv', csv(['fecha', 'espacio', 'equipo', 'tipo', 'descripcion', 'estado'], db().where('failure_reports', f => inR(f.created_at)).map(f => [f.created_at, sname(f.space_id), db().get('resources', f.resource_id)?.name, f.category, f.description, f.status]))); };

// ============================================================ Formulario de registro
// Etapa 1: campos del perfil (mostrar, obligatorio, opciones). Etapa 2: preguntas agregadas, con su análisis en Datos.
const FT = FORM.TYPES;
screens['a-form'] = { roles: ['admin'], render() {
  const F = formCfg(), users = db().where('users', u => !u.deleted_at), live = FORM.liveFields(F), arch = F.extra.filter(f => f.archived);
  if (!S.fmLoaded || S.f.fm_s_phone === undefined) { for (const k of Object.keys(FORM.BASE)) { S.f['fm_s_' + k] = F.base[k].show; S.f['fm_r_' + k] = !!F.base[k].required; }
    S.fmOpts = Object.fromEntries(Object.entries(F.base).filter(([k]) => FORM.BASE[k].choice).map(([k, b]) => [k, b.options.map(o => ({ ...o, was: o.label }))])); S.fmLoaded = true; }
  const answered = id => users.filter(u => !FORM.isEmpty(u.extra?.[id])).length;
  const baseRow = ([k, def]) => `<div class="li" style="flex-wrap:wrap"><span class="sp"><b>${def.name}</b><span>${def.check ? 'Casilla' : def.choice ? `${S.fmOpts[k].length} opciones` : 'Texto'}${def.stat ? ' · se usa en Datos' : ' · dato de contacto, no se grafica'}</span></span>
    ${check('fm_s_' + k, 'Mostrar', { live: true })}${def.check ? '' : check('fm_r_' + k, 'Obligatorio', { attrs: val('fm_s_' + k) ? '' : 'disabled' })}${def.choice ? btn('Opciones', 'fm-opts', { v: k, cls: 's plain', icon: 'edit' }) : ''}</div>`;
  const fieldRow = (f, i) => { const n = answered(f.id);
    return `<div class="li" style="flex-wrap:wrap"><span class="sp"><b>${esc(f.label)}</b><span>${FT[f.type]}${f.options?.length ? ` · ${FORM.liveOptions(f).length} opciones` : ''} · ${n} ${n === 1 ? 'respuesta' : 'respuestas'}</span></span>
      ${f.required ? pill('Obligatoria', 'warn') : pill('Opcional')}${FORM.isPrivate(f) ? pill('No se grafica', '') : pill('En Datos', 'ok')}
      <span class="ops row">${btn('', 'fm-move', { v: f.id + ':up', cls: 's plain', icon: 'up', off: i === 0, attrs: `aria-label="Subir ${esc(f.label)}"`, raw: true })}${btn('', 'fm-move', { v: f.id + ':down', cls: 's plain', icon: 'dn', off: i === live.length - 1, attrs: `aria-label="Bajar ${esc(f.label)}"`, raw: true })}${btn('Editar', 'fm-edit', { v: f.id, cls: 's plain', icon: 'edit' })}${btn('Quitar', 'fm-del', { v: f.id, cls: 's danger', icon: 'trash' })}</span></div>`; };
  return `<h1>Formulario de registro</h1><p class="mu">Define qué datos se piden al crear una cuenta. Documento, nombre, correo, fecha de nacimiento, contraseña y declaraciones son fijos: de ellos dependen el ingreso, el código QR, la regla de edad y los menores de edad.</p>
    <div class="grid"><div class="card stack"><h3>Campos del perfil</h3><p class="sm mu">Un campo oculto deja de pedirse y de graficarse; lo que ya respondieron las personas se conserva. Si cambias el nombre de una opción, se actualiza en los perfiles que la tenían.</p>
      <div class="list fx">${Object.entries(FORM.BASE).map(baseRow).join('')}</div>${btn('Guardar campos del perfil', 'fm-base-save', { cls: 'block' })}</div>
    <div class="card stack"><div class="row between"><h3>Preguntas agregadas</h3>${btn('Agregar pregunta', 'fm-edit', { v: '', cls: 's', icon: 'plus' })}</div>
      <p class="sm mu">Aparecen en el registro bajo «Más información», en el perfil y en «Actualizar datos». Las de una opción, varias opciones, sí o no, número y fecha se analizan en Datos; las de texto, teléfono y correo solo las ve el equipo en la ficha. Si una pregunta nueva es obligatoria, a quienes ya están registrados se les pide al entrar.</p>
      ${live.length ? `<div class="list fx">${live.map(fieldRow).join('')}</div>` : empty('Aún no hay preguntas agregadas.')}
      ${arch.length ? `<details><summary class="sm">Archivadas (${arch.length}): conservan sus respuestas</summary><div class="list">${arch.map(f => `<div class="li"><span class="sp"><b>${esc(f.label)}</b><span>${FT[f.type]} · ${answered(f.id)} respuestas</span></span>${btn('Restaurar', 'fm-restore', { v: f.id, cls: 's plain' })}</div>`).join('')}</div></details>` : ''}
      ${btn('Descargar respuestas (CSV)', 'fm-export', { cls: 's plain', icon: 'down' })}</div></div>
    <h2>Vista previa</h2><p class="sm mu">Así ven estos campos las personas al registrarse (sin guardar los cambios pendientes de «Campos del perfil»).</p>
    <div class="card stack"><div class="form">${baseInputs('pv_', ['gender', 'phone', 'comuna', 'activity', 'occupation'])}${extraInputs('pv_')}</div>${baseInput('pv_', 'reduced_mobility')}</div>`;
} };
actions['fm-base-save'] = async () => {
  const base = Object.fromEntries(Object.keys(FORM.BASE).map(k => [k, { show: !!val('fm_s_' + k), required: !!val('fm_r_' + k), ...(S.fmOpts[k] ? { options: S.fmOpts[k] } : {}) }]));
  const r = await run('form.base', { base }); if (r) { S.fmLoaded = false; toast('Campos del perfil guardados' + (r.moved ? `. Se actualizó la opción en ${r.moved} perfiles` : '')); } };
// Opciones de un campo del perfil (Actividad, Ocupación, Género): se editan en una ventana y se guardan con «Guardar campos del perfil»
const syncOpts = () => { const k = S.fmKey; S.fmOpts[k] = S.fmOpts[k].map((o, i) => ({ ...o, label: val(`fo_${i}_l`), en: val(`fo_${i}_en`), pt: val(`fo_${i}_pt`) })); };
const loadOpts = () => S.fmOpts[S.fmKey].forEach((o, i) => { S.f[`fo_${i}_l`] = o.label; S.f[`fo_${i}_en`] = o.en || ''; S.f[`fo_${i}_pt`] = o.pt || ''; });
const optEditor = (list, pre, act, title, sub) => `<h2 id="dlg-t" style="margin:0">${title}</h2><p class="sm mu">${sub}</p>
  <div class="stack">${list.map((o, i) => `<div class="card flat optrow">${field(`${pre}_${i}_l`, `Opción ${i + 1}`, { attrs: `aria-label="Opción ${i + 1}"` })}
    <span class="row">${btn('', act + '-mv', { v: i + ':up', cls: 's plain', icon: 'up', off: i === 0, attrs: `aria-label="Subir opción ${i + 1}"`, raw: true })}${btn('', act + '-mv', { v: i + ':down', cls: 's plain', icon: 'dn', off: i === list.length - 1, attrs: `aria-label="Bajar opción ${i + 1}"`, raw: true })}${btn('', act + '-del', { v: i, cls: 's danger', icon: 'trash', attrs: `aria-label="Quitar opción ${i + 1}"`, raw: true })}</span>
    <div class="tr">${field(`${pre}_${i}_en`, 'En inglés (opcional)')}${field(`${pre}_${i}_pt`, 'En portugués (opcional)')}</div></div>`).join('')}</div>
  ${btn('Agregar opción', act + '-add', { cls: 's plain', icon: 'plus' })}`;
actions['fm-opts'] = k => { S.fmKey = k; loadOpts();
  modal({ render: () => `${optEditor(S.fmOpts[S.fmKey], 'fo', 'fo', 'Opciones de «' + FORM.BASE[S.fmKey].name + '»', 'Sin traducción, la opción se muestra en español en la app en inglés o portugués (las opciones originales ya están traducidas).')}<div class="row">${btn('Listo', 'fo-done', { cls: 'sp' })}</div>` }); };
actions['fo-add'] = () => { syncOpts(); S.fmOpts[S.fmKey].push({ label: '' }); loadOpts(); UI_render(); };
actions['fo-del'] = i => { syncOpts(); S.fmOpts[S.fmKey].splice(+i, 1); loadOpts(); UI_render(); };
actions['fo-mv'] = v => { syncOpts(); const [i, d] = v.split(':'), a = S.fmOpts[S.fmKey], j = +i + (d === 'up' ? -1 : 1); [a[+i], a[j]] = [a[j], a[+i]]; loadOpts(); UI_render(); };
actions['fo-done'] = () => { syncOpts(); closeQuiet(); toast('Opciones listas: recuerda «Guardar campos del perfil»'); };
const UI_render = () => go(S.k);

// Preguntas agregadas
const feSync = () => { S.fe.options = S.fe.options.map((o, i) => ({ ...o, label: val(`fe_${i}_l`), en: val(`fe_${i}_en`), pt: val(`fe_${i}_pt`) })); };
const feLoad = () => S.fe.options.forEach((o, i) => { S.f[`fe_${i}_l`] = o.label; S.f[`fe_${i}_en`] = o.en || ''; S.f[`fe_${i}_pt`] = o.pt || ''; });
actions['fm-edit'] = id => { const f = formCfg().extra.find(x => x.id === id);
  S.fe = { id: f?.id || null, options: f ? FORM.liveOptions(f).map(o => ({ ...o })) : [{ label: '' }, { label: '' }] };
  fill({ fe_type: f?.type || 'choice', fe_label: f?.label || '', fe_label_en: f?.label_en || '', fe_label_pt: f?.label_pt || '', fe_help: f?.help || '', fe_help_en: f?.help_en || '', fe_help_pt: f?.help_pt || '', fe_req: !!f?.required, fe_min: f?.min ?? '', fe_max: f?.max ?? '' }); feLoad();
  modal({ render: () => { const ty = val('fe_type'), opts = ty === 'choice' || ty === 'multi', has = S.fe.id && db().all('users').some(u => !FORM.isEmpty(u.extra?.[S.fe.id]));
    return `<h2 id="dlg-t" style="margin:0">${S.fe.id ? 'Editar pregunta' : 'Agregar pregunta'}</h2>
      <div class="form">${field('fe_label', 'Pregunta (como la verá la persona)', { cls: 'full', attrs: 'maxlength="120"' })}
      ${select('fe_type', 'Tipo de respuesta', Object.entries(FT), { raw: true, live: true, attrs: has ? 'disabled' : '', hint: has ? 'El tipo no se puede cambiar porque ya hay respuestas.' : FORM.isPrivate({ type: ty }) ? 'Este tipo no se grafica en Datos: solo lo ve el equipo en la ficha de cada persona.' : 'Las respuestas se analizan en Datos.' })}
      ${field('fe_help', 'Ayuda bajo la pregunta (opcional)', { attrs: 'maxlength="240"' })}
      ${ty === 'number' ? field('fe_min', 'Mínimo (opcional)', { type: 'number', attrs: 'step="any"' }) + field('fe_max', 'Máximo (opcional)', { type: 'number', attrs: 'step="any"' }) : ''}</div>
      ${check('fe_req', 'Obligatoria (a quienes ya están registrados se les pedirá al entrar)')}
      <details><summary class="sm">Traducciones (opcional)</summary><div class="form">${field('fe_label_en', 'Pregunta en inglés')}${field('fe_label_pt', 'Pregunta en portugués')}${field('fe_help_en', 'Ayuda en inglés')}${field('fe_help_pt', 'Ayuda en portugués')}</div></details>
      ${opts ? `<h3 style="margin:4px 0 0">Opciones</h3>${optEditor(S.fe.options, 'fe', 'fe', '', 'Si quitas una opción que alguien ya eligió, se archiva: deja de ofrecerse pero se sigue contando en Datos.').replace('<h2 id="dlg-t" style="margin:0"></h2>', '')}` : ''}
      <div class="row">${btn('Guardar pregunta', 'fe-save', { cls: 'sp' })}${btn('Cancelar', 'modal-close', { cls: 'plain' })}</div>`; } }); };
actions['fe-add'] = () => { feSync(); S.fe.options.push({ label: '' }); feLoad(); UI_render(); };
actions['fe-del'] = i => { feSync(); S.fe.options.splice(+i, 1); feLoad(); UI_render(); };
actions['fe-mv'] = v => { feSync(); const [i, d] = v.split(':'), a = S.fe.options, j = +i + (d === 'up' ? -1 : 1); [a[+i], a[j]] = [a[j], a[+i]]; feLoad(); UI_render(); };
actions['fe-save'] = async () => { feSync(); const ty = val('fe_type');
  const field_ = { id: S.fe.id, type: ty, label: val('fe_label'), label_en: val('fe_label_en'), label_pt: val('fe_label_pt'), help: val('fe_help'), help_en: val('fe_help_en'), help_pt: val('fe_help_pt'), required: !!val('fe_req'), min: val('fe_min'), max: val('fe_max'),
    options: ty === 'choice' || ty === 'multi' ? S.fe.options : [] };
  const r = await run('form.field', { field: field_ }); if (r) { closeQuiet(); toast(S.fe.id ? 'Pregunta guardada' : 'Pregunta agregada al formulario'); } };
actions['fm-move'] = v => { const [id, dir] = v.split(':'); run('form.move', { id, dir }); };
actions['fm-del'] = id => { const f = formCfg().extra.find(x => x.id === id), n = db().all('users').filter(u => !FORM.isEmpty(u.extra?.[id])).length;
  confirmBox({ title: '¿Quitar la pregunta?', ok: 'Quitar', text: `<p><b>${esc(f.label)}</b></p><p>${n ? `${n} personas ya la respondieron: se archivará y se conservan sus respuestas. Puedes restaurarla después.` : 'Nadie la ha respondido: se borrará.'}</p>`,
    fn: async () => { const r = await run('form.remove', { id }); if (r) toast(r.archived ? 'Pregunta archivada' : 'Pregunta borrada'); } }); };
actions['fm-restore'] = id => run('form.restore', { id }, 'Pregunta restaurada');
actions['fm-export'] = () => { const F = formCfg(), xs = FORM.liveFields(F), now = new Date();
  download('hub-formulario.csv', csv(['id', 'nombre', 'correo', ...Object.values(FORM.BASE).map(b => b.name), 'edad', ...xs.map(f => f.label)],
    db().where('users', u => !u.deleted_at).map(u => [u.id, u.name, u.email, ...Object.keys(FORM.BASE).map(k => (k === 'reduced_mobility' ? (u[k] ? 'Sí' : 'No') : u[k])), R.age(u.birth_date, now), ...csvExtra(F, u, true)]))); };

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
screens['a-audit'] = { roles: ['admin'], render: () => `<h1>Auditoría</h1>${partialNote()}<p class="mu">Acciones del equipo sobre perfiles, reservas, espacios y configuración.</p>
  ${table(['Fecha', 'Quién', 'Acción', 'Sobre', 'Detalle'], [...db().all('audit_log')].sort((a, b) => T(b.at) - T(a.at)).slice(0, 120).map(a => [fDT(a.at), esc(uname(a.actor_id)), esc(a.action), esc([a.entity, a.entity_id].filter(Boolean).join(' ')), `<span class="sm">${esc(a.detail || '')}</span>`]))}` };

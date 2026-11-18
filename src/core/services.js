// Casos de uso del sistema. Cada servicio recibe ctx = { db, uid, now, demo } y sus argumentos.
// Corren en el navegador (modo demo) y en el servidor (modo real) sin cambios: aquí viven las reglas
// de negocio y los permisos, de modo que la interfaz nunca decide qué está permitido.
import * as R from './rules.js';
import * as Q from './queries.js';
import { ACTIVE, FAILURES } from './catalog.js';

const N = ctx => (ctx.now ? new Date(ctx.now) : new Date());
const iso = d => new Date(d).toISOString();
const T = d => +new Date(d);
export function fail(msg) { const e = new Error(msg); e.user = true; throw e; }

const me = ctx => (ctx.uid && ctx.db.get('users', ctx.uid)) || fail('Inicia sesión para continuar');
const roles = ctx => (ctx.uid ? Q.rolesOf(ctx.db, ctx.uid) : []);
const has = (ctx, ...r) => { const rs = roles(ctx); return rs.includes('admin') || r.some(x => rs.includes(x)); };
const need = (ctx, ...r) => has(ctx, ...r) || fail('Tu credencial no permite esta acción');
const manages = (ctx, spaceId) => { const rs = roles(ctx); return rs.includes('admin') || (rs.includes('encargado') && ctx.db.get('spaces', spaceId)?.manager_id === ctx.uid); };
const needSpace = (ctx, spaceId) => manages(ctx, spaceId) || fail('Solo el encargado de este espacio o administración puede hacerlo');
const audit = (ctx, action, entity, id, detail) => ctx.db.insert('audit_log', { at: iso(N(ctx)), actor_id: ctx.uid, action, entity, entity_id: id == null ? null : String(id), detail: detail || null });

function mail(ctx, user, subject, body) { if (user?.email) ctx.db.insert('outbox', { to_email: user.email, subject, body, created_at: iso(N(ctx)) }); }
function notify(ctx, uid, title, text, kind = 'aviso', data = null) {
  ctx.db.insert('notifications', { user_id: uid, kind, title, text, data, created_at: iso(N(ctx)) });
  mail(ctx, ctx.db.get('users', uid), title, text || title);
}
const minorAt = (ctx, u) => (R.age(u.birth_date, N(ctx)) ?? 99) < 18;
/** Recalcula el estado del perfil: correo pendiente → autorización de adulto pendiente → activo. */
const settle = (ctx, u) => ctx.db.update('users', u.id, { status: !u.email_verified ? 'pendiente_correo' : minorAt(ctx, u) && !u.guardian_ok ? 'pendiente_adulto' : 'activo' });
const usable = (ctx, u) => {
  if (u.status !== 'activo') fail(u.status === 'pendiente_adulto' ? 'El perfil espera la autorización de un adulto' : 'Confirma tu correo para continuar');
  const b = Q.activeBan(ctx.db, u.id, N(ctx));
  if (b) fail('Acceso restringido' + (b.until_at ? ' hasta el ' + new Date(b.until_at).toLocaleString('es-CL') : ' de forma permanente'));
};

// ---- Contraseñas ------------------------------------------------------------
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const rnd = n => hex(crypto.getRandomValues(new Uint8Array(n)));
async function derive(pass, salt) {
  if (!globalThis.crypto?.subtle) { let h = 5381; for (const c of salt + pass) h = (h * 33 ^ c.charCodeAt(0)) >>> 0; return 'x' + h.toString(16); } // solo en contextos sin WebCrypto (demo por http)
  const enc = new TextEncoder(), k = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, k, 256));
}
export const hashPass = async (p, salt = rnd(8)) => `pbkdf2$${salt}$${await derive(p, salt)}`;
export const checkPass = async (p, h) => { if (!h || !p) return false; const [, salt, x] = h.split('$'); return (await derive(p, salt)) === x; };

function sendCode(ctx, u, purpose) {
  const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  ctx.db.where('auth_codes', c => c.user_id === u.id && !c.used).forEach(c => ctx.db.update('auth_codes', c.id, { used: true }));
  ctx.db.insert('auth_codes', { user_id: u.id, code, purpose, expires_at: iso(T(N(ctx)) + 15 * 60000) });
  mail(ctx, u, 'Tu código de Hub Providencia', `Tu código es ${code}. Vence en 15 minutos.`);
  return ctx.demo ? code : undefined;
}
function useCode(ctx, u, code) {
  const c = ctx.db.find('auth_codes', x => x.user_id === u.id && !x.used && x.code === String(code || '').trim() && T(x.expires_at) > T(N(ctx)));
  if (!c) fail('El código no es correcto o ya venció');
  ctx.db.update('auth_codes', c.id, { used: true });
}

async function createUser(ctx, d, assisted) {
  const db = ctx.db, name = (d.name || '').trim();
  if (name.length < 3) fail('Escribe el nombre completo');
  const type = d.doc_type || 'rut', num = R.normDoc(d.doc_number);
  if (type !== 'pasaporte' ? !R.rutOk(num) : num.length < 5) fail(type === 'pasaporte' ? 'Escribe el número de pasaporte' : 'El RUT no es válido. Revisa el dígito verificador');
  if (db.find('users', u => u.doc_number === num)) fail('Ese documento ya tiene un perfil');
  const email = (d.email || '').trim().toLowerCase();
  if (email ? !R.emailOk(email) : !assisted) fail('Escribe un correo válido');
  if (email && db.find('users', u => u.email === email)) fail('Ese correo ya tiene un perfil');
  for (const [k, label] of [['comuna', 'la comuna'], ['activity', 'tu actividad en Providencia'], ['occupation', 'a qué te dedicas'], ['gender', 'el género'], ['birth_date', 'la fecha de nacimiento']]) if (!d[k]) fail('Falta ' + label);
  if (!assisted && !d.phone) fail('Falta el celular');
  const years = R.age(d.birth_date, N(ctx));
  if (years == null || years < 0 || years > 110) fail('Revisa la fecha de nacimiento');
  if (!d.consent_data || !d.consent_image || !d.consent_belongings) fail('Debes aceptar las tres declaraciones');
  if (d.password && d.password.length < 8) fail('La contraseña debe tener al menos 8 caracteres');
  if (!assisted && !d.password) fail('Crea una contraseña de al menos 8 caracteres');
  const verified = !!assisted || !email;
  return db.insert('users', {
    doc_type: type, doc_number: num, name, email: email || null, phone: d.phone || null, comuna: d.comuna, activity: d.activity,
    occupation: d.occupation, gender: d.gender, birth_date: d.birth_date, reduced_mobility: !!d.reduced_mobility, photo: d.photo || null,
    password_hash: d.password ? await hashPass(d.password) : null, email_verified: verified,
    status: !verified ? 'pendiente_correo' : years < 18 ? 'pendiente_adulto' : 'activo', guardian_ok: false,
    consent_data: true, consent_image: true, consent_belongings: true, lang: d.lang || 'es', created_at: iso(N(ctx)),
  });
}

function askGuardian(ctx, minor, code) {
  const db = ctx.db, adult = Q.findUser(db, code);
  if (!adult || adult.id === minor.id) fail('No encontramos a ese adulto. Debe tener un perfil en el Hub');
  if (adult.status !== 'activo' || minorAt(ctx, adult) || Q.activeBan(db, adult.id, N(ctx))) fail('Esa persona no puede autorizar perfiles');
  db.update('users', minor.id, { guardian_id: adult.id, guardian_ok: false });
  notify(ctx, adult.id, `${minor.name} pide tu autorización`, 'Confirma si autorizas su perfil como adulto responsable.', 'tutor', { minor_id: minor.id });
  return { adult: adult.name };
}

/** Marca asistencia a reservas y eventos cuando la persona está en el Hub en el momento t. */
function attend(ctx, uid, t) {
  const db = ctx.db, out = [], tol = 15 * 60000;
  for (const r of db.where('reservations', r => ['confirmada', 'en_revision'].includes(r.status) && T(r.start_at) - tol <= T(t) && T(t) < T(r.end_at))) {
    const g = db.find('reservation_guests', x => x.reservation_id === r.id && x.user_id === uid);
    if (r.user_id !== uid && !g) continue;
    if (g) db.update('reservation_guests', g.id, { attended: true });
    if (r.status === 'confirmada') { db.update('reservations', r.id, { status: 'en_curso', attended_at: iso(t) }); out.push(r.id); }
  }
  for (const a of db.where('event_attendance', a => a.user_id === uid && a.status === 'inscrito')) {
    const e = db.get('events', a.event_id);
    if (e?.start_at && T(e.start_at) - 30 * 60000 <= T(t) && T(t) <= T(e.end_at || e.start_at) + 36e5) db.update('event_attendance', a.id, { status: 'asistio', at: iso(t) });
  }
  return out;
}

function scan(ctx, { code, at, source = 'qr', dry }) {
  const db = ctx.db, t = at ? new Date(at) : N(ctx), u = Q.findUser(db, code);
  if (!u) return { found: false };
  const ban = Q.activeBan(db, u.id, t), g = u.guardian_id && db.get('users', u.guardian_id);
  const base = {
    found: true, ban: ban ? { until_at: ban.until_at, reason: ban.reason } : null,
    user: { id: u.id, name: u.name, doc_type: u.doc_type, doc_number: u.doc_number, email: u.email, phone: u.phone, photo: u.photo, status: u.status, minor: (R.age(u.birth_date, t) ?? 99) < 18, guardian: g?.name || null, reduced_mobility: u.reduced_mobility },
    inside: !!db.find('visits', v => v.user_id === u.id && !v.out_at),
    notifications: db.where('notifications', n => n.user_id === u.id && !n.read_at && n.kind !== 'tutor').slice(-5).map(n => ({ title: n.title, text: n.text })),
    today: db.where('reservations', r => (r.user_id === u.id || db.find('reservation_guests', x => x.reservation_id === r.id && x.user_id === u.id)) && ACTIVE.includes(r.status) && R.dayKey(r.start_at) === R.dayKey(t))
      .map(r => ({ id: r.id, space: db.get('spaces', r.space_id)?.name, resource: db.get('resources', r.resource_id)?.name || null, start_at: r.start_at, end_at: r.end_at, status: r.status })),
  };
  if (dry) return base;
  if (ban) return { ...base, action: 'restringido' };
  if (u.status !== 'activo') return { ...base, action: 'pendiente' };
  const open = db.find('visits', v => v.user_id === u.id && !v.out_at);
  if (open && T(t) - T(open.in_at) < 60000) return { ...base, action: 'duplicado' };
  if (open) { db.update('visits', open.id, { out_at: iso(t), out_source: source }); return { ...base, inside: false, action: 'salida' }; }
  db.insert('visits', { user_id: u.id, in_at: iso(t), source, by_staff: ctx.uid || null });
  return { ...base, inside: true, action: 'entrada', attended: attend(ctx, u.id, t) };
}

export const PUBLIC = ['auth.register', 'auth.verify', 'auth.login', 'auth.code', 'auth.codeLogin', 'auth.google', 'auth.guardian', 'system.tick'];

export const SERVICES = {
  // ---------------------------------------------------------------- Acceso
  async 'auth.register'(ctx, d) {
    const assisted = !!d.assisted && has(ctx, 'recepcion');
    const u = await createUser(ctx, d, assisted);
    if (assisted) audit(ctx, 'registro asistido', 'users', u.id);
    const out = { id: u.id, status: u.status };
    if (u.status === 'pendiente_correo') out.demo_code = sendCode(ctx, u, 'correo');
    if (d.guardian && minorAt(ctx, u)) out.guardian = askGuardian(ctx, u, d.guardian).adult;
    if (u.status !== 'pendiente_correo' && !assisted) out.session = u.id;
    return out;
  },
  'auth.verify'(ctx, { id, code }) {
    const u = ctx.db.get('users', id) || fail('No encontramos ese perfil');
    useCode(ctx, u, code);
    ctx.db.update('users', u.id, { email_verified: true }); settle(ctx, u);
    return { session: u.id };
  },
  async 'auth.login'(ctx, { ident, password }) {
    const u = Q.findUser(ctx.db, ident);
    if (!u || !(await checkPass(password, u.password_hash))) fail('RUT, correo o contraseña incorrectos');
    if (u.status === 'pendiente_correo') return { need: 'correo', id: u.id, demo_code: sendCode(ctx, u, 'correo') };
    return { session: u.id };
  },
  'auth.code'(ctx, { ident }) {
    const u = Q.findUser(ctx.db, ident);
    return { sent: true, demo_code: u?.email ? sendCode(ctx, u, 'ingreso') : undefined };
  },
  'auth.codeLogin'(ctx, { ident, code }) {
    const u = Q.findUser(ctx.db, ident) || fail('El código no es correcto o ya venció');
    useCode(ctx, u, code);
    if (!u.email_verified) { ctx.db.update('users', u.id, { email_verified: true }); settle(ctx, u); }
    return { session: u.id };
  },
  async 'auth.google'(ctx, { credential }) {
    const email = ctx.verifyGoogle ? await ctx.verifyGoogle(credential) : JSON.parse(atob(String(credential).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email;
    const u = email && ctx.db.find('users', x => x.email === String(email).toLowerCase());
    if (!u) fail('No hay un perfil con ese correo. Crea tu cuenta primero');
    if (!u.email_verified) { ctx.db.update('users', u.id, { email_verified: true }); settle(ctx, u); }
    return { session: u.id };
  },
  'auth.guardian'(ctx, { id, code }) {
    const u = ctx.db.get('users', id || ctx.uid) || fail('No encontramos ese perfil');
    if (u.status !== 'pendiente_adulto') fail('Este perfil no necesita autorización');
    return askGuardian(ctx, u, code);
  },
  async 'me.password'(ctx, { password }) {
    if (!password || password.length < 8) fail('La contraseña debe tener al menos 8 caracteres');
    ctx.db.update('users', me(ctx).id, { password_hash: await hashPass(password) });
  },
  'me.guardianAnswer'(ctx, { id, accept }) {
    const db = ctx.db, n = db.get('notifications', id), adult = me(ctx);
    if (!n || n.user_id !== adult.id || n.kind !== 'tutor' || n.read_at) fail('Esa solicitud ya fue respondida');
    const minor = db.get('users', n.data.minor_id);
    db.update('notifications', n.id, { read_at: iso(N(ctx)) });
    if (!minor || minor.guardian_id !== adult.id) return;
    if (accept) { db.update('users', minor.id, { guardian_ok: true }); settle(ctx, minor); notify(ctx, minor.id, 'Tu perfil fue autorizado', `${adult.name} quedó como adulto responsable.`); }
    else { db.update('users', minor.id, { guardian_id: null, guardian_ok: false }); notify(ctx, minor.id, 'No se pudo confirmar el permiso para tu perfil', 'El adulto no autorizó la solicitud. Puedes pedirla a otra persona.'); }
    audit(ctx, accept ? 'autoriza menor' : 'rechaza menor', 'users', minor.id);
  },
  'me.update'(ctx, p) { return updateUser(ctx, me(ctx), p); },
  'user.update'(ctx, { id, patch }) { need(ctx, 'recepcion'); const u = ctx.db.get('users', id) || fail('No encontramos ese perfil'); updateUser(ctx, u, patch); audit(ctx, 'actualiza perfil', 'users', id); },
  'me.readAll'(ctx) { const t = iso(N(ctx)); ctx.db.where('notifications', n => n.user_id === me(ctx).id && !n.read_at && n.kind !== 'tutor').forEach(n => ctx.db.update('notifications', n.id, { read_at: t })); },
  'me.deleteObs'(ctx, { id }) { const o = ctx.db.get('observations', id); if (!o || o.user_id !== me(ctx).id) fail('No encontramos esa observación'); ctx.db.remove('observations', id); },
  'me.dataRequest'(ctx, { kind }) {
    const u = me(ctx);
    ctx.db.where('staff_roles', r => r.role === 'admin').forEach(r => notify(ctx, r.user_id, `Solicitud de ${kind} de datos`, `${u.name} (${u.id}) pidió ${kind} de sus datos personales.`));
  },

  // ---------------------------------------------------------------- Reservas
  'res.create'(ctx, a) {
    const db = ctx.db, actor = me(ctx), now = N(ctx);
    let user = actor;
    if (a.for_user) { need(ctx, 'recepcion'); user = Q.findUser(db, a.for_user) || fail('No encontramos a esa persona'); }
    usable(ctx, user);
    const sp = db.get('spaces', a.space_id);
    if (!sp || !sp.active || sp.mode !== 'reserva') fail('Ese espacio no admite reservas');
    const res = a.resource_id ? db.get('resources', a.resource_id) : null;
    if (a.resource_id && (!res || res.space_id !== sp.id || !res.active)) fail('Ese equipo no está disponible');
    if (sp.kind === 'lab' && !res) fail('Elige una máquina');
    let min, est = 0;
    if (sp.kind === 'lab') { est = Math.round(+a.est_min); if (!(est > 0)) fail('Indica cuánto demora tu trabajo'); min = R.roundUpHours(est); }
    else min = R.blocksDur(Math.max(1, +a.slots || 1), db.cfg('block_min'), db.cfg('block_gap_min'));
    if (min > (sp.max_hours || db.cfg('max_hours')) * 60) fail(`La reserva supera el máximo de ${sp.max_hours || db.cfg('max_hours')} horas`);
    const start = new Date(a.start), end = new Date(T(start) + min * 60000);
    if (!(T(start) > T(now) - 60000)) fail('Ese horario ya pasó');
    const mine = db.where('reservations', r => r.user_id === user.id && ACTIVE.includes(r.status) && T(r.end_at) > T(now));
    if (mine.length >= db.cfg('max_active')) fail(`Puedes tener hasta ${db.cfg('max_active')} reservas activas a la vez`);
    if (sp.requires_cert && Q.certLevel(db, user.id, sp.id, start) < (sp.min_level || 1)) fail('Necesitas la certificación de este laboratorio');
    const why = Q.unavailable(db, sp, res, start, end); if (why) fail(why);
    if (sp.monthly_hours > 0 && min > Q.balance(db, user.id, sp.id, start).left) fail('No te alcanza el saldo de horas de este mes');
    const guests = [...new Set((a.guests || []).map(g => (Q.findUser(db, g) || fail(`No encontramos el perfil "${g}". Todos los asistentes deben estar registrados`)).id))].filter(id => id !== user.id);
    const cap = res ? res.capacity : sp.capacity;
    if (guests.length + 1 > cap) fail(`El espacio admite hasta ${cap} personas`);
    let file = null;
    if (sp.kind === 'lab' && sp.accept) {
      file = a.file; if (!file?.name) fail('Adjunta el archivo de tu trabajo');
      if (!sp.accept.split(',').includes(R.extOf(file.name))) fail('Formato no aceptado. Usa ' + sp.accept.replace(/,/g, ', '));
      if (file.size > db.cfg('file_max_mb') * 1048576) fail(`El archivo supera el máximo de ${db.cfg('file_max_mb') / 1024} GB`);
    }
    const r = db.insert('reservations', {
      user_id: user.id, space_id: sp.id, resource_id: res?.id ?? null, kind: guests.length || !res ? (sp.kind === 'sala' ? 'sala' : 'grupo') : 'equipo', title: a.title || null,
      start_at: iso(start), end_at: iso(end), status: file ? 'en_revision' : 'confirmada', est_min: est || min, charged_min: sp.monthly_hours > 0 ? min : 0,
      created_by: actor.id, created_at: iso(now),
    });
    guests.forEach(id => { db.insert('reservation_guests', { reservation_id: r.id, user_id: id }); notify(ctx, id, 'Te sumaron a una reserva', `${user.name} te incluyó en ${sp.name}, ${new Date(start).toLocaleString('es-CL')}.`); });
    if (file) {
      db.insert('files', { user_id: user.id, reservation_id: r.id, space_id: sp.id, name: file.name, size: file.size || 0, storage: file.storage || null, created_at: iso(now) });
      if (sp.manager_id) notify(ctx, sp.manager_id, 'Archivo por revisar', `${file.name} para ${sp.name}.`, 'revision');
    }
    notify(ctx, user.id, 'Reserva confirmada', `${sp.name}${res ? ' · ' + res.name : ''}, ${new Date(start).toLocaleString('es-CL')}.`);
    if (a.for_user) audit(ctx, 'reserva asistida', 'reservations', r.id, user.id);
    if (T(start) <= T(now) + 60000 && db.find('visits', v => v.user_id === user.id && !v.out_at)) attend(ctx, user.id, now);
    return { id: r.id, end_at: r.end_at, status: r.status };
  },
  'res.cancel'(ctx, { id }) {
    const db = ctx.db, r = db.get('reservations', id), u = me(ctx);
    if (!r || !ACTIVE.includes(r.status)) fail('Esa reserva ya no está activa');
    const staff = r.user_id !== u.id;
    if (staff && !(manages(ctx, r.space_id) || has(ctx, 'recepcion'))) fail('No puedes cancelar esta reserva');
    const late = !staff && T(r.start_at) - T(N(ctx)) < db.cfg('cancel_notice_min') * 60000;
    db.update('reservations', id, { status: 'cancelada', cancelled_at: iso(N(ctx)), charged_min: late ? r.charged_min : 0 });
    db.where('files', f => f.reservation_id === id && f.status === 'pendiente').forEach(f => db.update('files', f.id, { status: 'eliminado', storage: null }));
    if (late && r.charged_min) notify(ctx, r.user_id, 'Cancelación tardía', `Cancelaste con menos de ${db.cfg('cancel_notice_min')} minutos de aviso: las horas no se devuelven.`, 'penalizacion');
    if (staff) { notify(ctx, r.user_id, 'Tu reserva fue cancelada por el Hub', db.get('spaces', r.space_id)?.name); audit(ctx, 'cancela reserva', 'reservations', id); }
    return { late };
  },
  'res.finish'(ctx, { id }) {
    const db = ctx.db, r = db.get('reservations', id), now = N(ctx);
    if (!r || !['en_curso', 'confirmada'].includes(r.status)) fail('Esa reserva no está en curso');
    if (r.user_id !== me(ctx).id && !manages(ctx, r.space_id)) fail('No puedes cerrar esta reserva');
    if (T(now) < T(r.start_at)) fail('La reserva aún no empieza');
    const real = Math.max(1, Math.ceil((T(now) - T(r.start_at)) / 60000));
    db.update('reservations', id, { status: 'completada', finished_at: iso(now), real_min: real, charged_min: r.charged_min ? real : 0, attended_at: r.attended_at || r.start_at });
    return { real_min: real };
  },
  'res.failure'(ctx, { id, category, description }) {
    const db = ctx.db, r = db.get('reservations', id), u = me(ctx);
    if (!r || r.user_id !== u.id) fail('No encontramos esa reserva');
    if (!FAILURES.includes(category)) fail('Elige el tipo de falla');
    if ((description || '').length > 1000) fail('La descripción admite hasta 1.000 caracteres');
    const f = db.insert('failure_reports', { user_id: u.id, reservation_id: id, space_id: r.space_id, resource_id: r.resource_id, category, description: description || null, created_at: iso(N(ctx)) });
    const sp = db.get('spaces', r.space_id);
    if (sp?.manager_id) notify(ctx, sp.manager_id, 'Reporte de falla', `${db.get('resources', r.resource_id)?.name || sp.name}: ${category}.`, 'falla');
    return { id: f.id };
  },
  'failure.close'(ctx, { id }) { const f = ctx.db.get('failure_reports', id); needSpace(ctx, f.space_id); ctx.db.update('failure_reports', id, { status: 'resuelta' }); },

  // ---------------------------------------------------------------- Eventos y certificaciones (usuario)
  'event.signup'(ctx, { id, cancel }) {
    const db = ctx.db, u = me(ctx), e = db.get('events', id) || fail('No encontramos ese evento');
    const mine = db.find('event_attendance', a => a.event_id === id && a.user_id === u.id);
    if (cancel) { if (mine) db.remove('event_attendance', mine.id); return; }
    usable(ctx, u);
    if (mine) fail('Ya estás inscrito');
    if (e.seats && db.where('event_attendance', a => a.event_id === id).length >= e.seats) fail('No quedan cupos');
    db.insert('event_attendance', { event_id: id, user_id: u.id, at: iso(N(ctx)) });
  },
  'event.checkin'(ctx, { id }) {
    const db = ctx.db, u = me(ctx), e = db.get('events', id), now = N(ctx);
    if (!e?.start_at || T(now) < T(e.start_at) - 30 * 60000 || T(now) > T(e.end_at || e.start_at) + 36e5) fail('Solo puedes marcar asistencia durante el evento');
    usable(ctx, u);
    const mine = db.find('event_attendance', a => a.event_id === id && a.user_id === u.id);
    mine ? db.update('event_attendance', mine.id, { status: 'asistio', at: iso(now) }) : db.insert('event_attendance', { event_id: id, user_id: u.id, status: 'asistio', at: iso(now) });
  },
  'cert.enroll'(ctx, { session_id, cancel }) {
    const db = ctx.db, u = me(ctx), s = db.get('cert_sessions', session_id) || fail('No encontramos esa sesión');
    const mine = db.find('cert_enrollments', e => e.session_id === s.id && e.user_id === u.id);
    if (cancel) { if (mine?.status === 'inscrito') db.remove('cert_enrollments', mine.id); return; }
    usable(ctx, u);
    if (mine) fail('Ya estás inscrito en esta sesión');
    if (T(s.start_at) < T(N(ctx))) fail('Esa sesión ya pasó');
    if (db.where('cert_enrollments', e => e.session_id === s.id).length >= s.seats) fail('No quedan cupos en esta sesión');
    db.insert('cert_enrollments', { session_id: s.id, user_id: u.id });
    const c = db.get('certifications', s.certification_id);
    notify(ctx, u.id, 'Inscripción a certificación', `${c.name}, ${new Date(s.start_at).toLocaleString('es-CL')}.`);
  },

  // ---------------------------------------------------------------- Recepción
  'access.scan'(ctx, a) { need(ctx, 'recepcion'); return scan(ctx, a); },
  'access.sync'(ctx, { items }) {
    need(ctx, 'recepcion');
    const out = [...items].sort((a, b) => T(a.at) - T(b.at)).map(i => scan(ctx, { code: i.code, at: i.at, source: 'offline' }));
    audit(ctx, 'sincroniza registros sin conexión', 'visits', null, String(items.length));
    return { applied: out.filter(o => o.action === 'entrada' || o.action === 'salida').length, total: items.length };
  },

  // ---------------------------------------------------------------- Encargados de laboratorio
  'file.review'(ctx, { id, decision, text }) {
    const db = ctx.db, f = db.get('files', id) || fail('No encontramos ese archivo'), now = iso(N(ctx));
    needSpace(ctx, f.space_id);
    if (!['aprobado', 'rechazado', 'observado'].includes(decision)) fail('Decisión no válida');
    if (decision !== 'aprobado' && !(text || '').trim()) fail('Escribe la observación para el usuario');
    db.update('files', id, { status: decision, reviewed_by: ctx.uid, reviewed_at: now });
    const r = f.reservation_id && db.get('reservations', f.reservation_id);
    if (decision === 'aprobado') { if (r?.status === 'en_revision') db.update('reservations', r.id, { status: 'confirmada' }); notify(ctx, f.user_id, 'Archivo aprobado', `${f.name} fue aprobado. Tu reserva sigue en pie.`); }
    else {
      db.insert('observations', { file_id: id, user_id: f.user_id, author_id: ctx.uid, space_id: f.space_id, kind: decision === 'rechazado' ? 'rechazo' : 'observacion', text: text.trim(), created_at: now });
      if (decision === 'rechazado' && r && ACTIVE.includes(r.status)) db.update('reservations', r.id, { status: 'rechazada', charged_min: 0 });
      notify(ctx, f.user_id, decision === 'rechazado' ? 'Archivo rechazado' : 'Archivo con observaciones', `${f.name}: ${text.trim()}`, 'observacion');
    }
    audit(ctx, 'revisa archivo: ' + decision, 'files', id);
  },
  'file.remove'(ctx, { id }) { const f = ctx.db.get('files', id); if (!f) return; needSpace(ctx, f.space_id); if (!has(ctx, 'encargado')) fail('Solo el encargado del laboratorio puede borrar archivos'); ctx.db.update('files', id, { status: 'eliminado', storage: null }); audit(ctx, 'borra archivo', 'files', id); return { storage: f.storage }; },
  'cert.save'(ctx, c) {
    const db = ctx.db; needSpace(ctx, c.space_id);
    if (!(c.name || '').trim()) fail('Escribe el nombre de la certificación');
    const row = { space_id: c.space_id, name: c.name.trim(), level: +c.level || 1, validity_months: c.validity_months ? +c.validity_months : null, weekday: +c.weekday, time_min: +c.time_min, duration_min: +c.duration_min || 90, seats: +c.seats || 6, cost: +c.cost || 0, diploma_download: !!c.diploma_download, instructor_id: c.instructor_id ? (Q.findUser(db, c.instructor_id) || fail('El instructor debe tener un perfil en el Hub')).id : null, active: c.active !== false };
    const r = c.id ? db.update('certifications', c.id, row) : db.insert('certifications', row);
    audit(ctx, 'guarda certificación', 'certifications', r.id, row.name);
    ensureSessions(ctx);
    return { id: r.id };
  },
  'cert.grade'(ctx, { session_id, results }) {
    const db = ctx.db, s = db.get('cert_sessions', session_id), c = db.get('certifications', s.certification_id), now = N(ctx);
    needSpace(ctx, c.space_id);
    for (const e of db.where('cert_enrollments', e => e.session_id === s.id)) {
      const st = results[e.user_id]; if (!st || st === e.status) continue;
      db.update('cert_enrollments', e.id, { status: st });
      if (st === 'aprobado' && !db.find('user_certs', x => x.user_id === e.user_id && x.certification_id === c.id && (!x.expires_at || T(x.expires_at) > T(now)))) {
        const exp = c.validity_months ? new Date(now) : null; if (exp) exp.setMonth(exp.getMonth() + c.validity_months);
        db.insert('user_certs', { user_id: e.user_id, certification_id: c.id, granted_at: iso(now), expires_at: exp ? iso(exp) : null, granted_by: ctx.uid });
        notify(ctx, e.user_id, 'Certificación aprobada', `Ya puedes reservar en ${db.get('spaces', c.space_id).name}.`);
      }
    }
    db.update('cert_sessions', s.id, { status: 'cerrada' });
    audit(ctx, 'califica certificación', 'cert_sessions', s.id);
  },
  'cert.grant'(ctx, { certification_id, user }) {
    const db = ctx.db, c = db.get('certifications', certification_id) || fail('No encontramos esa certificación'), now = N(ctx);
    needSpace(ctx, c.space_id);
    const u = Q.findUser(db, user) || fail('No encontramos a esa persona');
    if (db.find('user_certs', x => x.user_id === u.id && x.certification_id === c.id && (!x.expires_at || T(x.expires_at) > T(now)))) fail('Esa persona ya tiene esta certificación');
    const exp = c.validity_months ? new Date(now) : null; if (exp) exp.setMonth(exp.getMonth() + c.validity_months);
    db.insert('user_certs', { user_id: u.id, certification_id: c.id, granted_at: iso(now), expires_at: exp ? iso(exp) : null, granted_by: ctx.uid });
    notify(ctx, u.id, 'Certificación aprobada', `Ya puedes reservar en ${db.get('spaces', c.space_id).name}.`);
    audit(ctx, 'certifica', 'users', u.id, c.name);
    return { name: u.name };
  },
  'cert.diploma'(ctx, { id, data }) { const uc = ctx.db.get('user_certs', id), c = ctx.db.get('certifications', uc.certification_id); needSpace(ctx, c.space_id); ctx.db.update('user_certs', id, { diploma: data }); },
  'cert.revoke'(ctx, { id }) { const uc = ctx.db.get('user_certs', id), c = ctx.db.get('certifications', uc.certification_id); needSpace(ctx, c.space_id); ctx.db.remove('user_certs', id); audit(ctx, 'revoca certificación', 'users', uc.user_id, c.name); },
  'hours.adjust'(ctx, { user_id, space_id, hours, kind, reason, permanent }) {
    const db = ctx.db; needSpace(ctx, space_id);
    const h = Math.abs(+hours); if (!(h > 0)) fail('Indica cuántas horas');
    if (!db.get('users', user_id)) fail('No encontramos a esa persona');
    const pen = kind === 'penalizacion', sp = db.get('spaces', space_id);
    db.insert('hour_adjustments', { user_id, space_id, period: permanent && !pen ? null : R.period(N(ctx)), minutes: Math.round(h * 60) * (pen ? -1 : 1), kind: pen ? 'penalizacion' : 'premio', reason: reason || null, by_id: ctx.uid, created_at: iso(N(ctx)) });
    notify(ctx, user_id, pen ? 'Penalización de horas' : 'Horas adicionales', `${pen ? 'Se descontaron' : 'Se agregaron'} ${h} h en ${sp.name}${reason ? ': ' + reason : ''}.`, pen ? 'penalizacion' : 'aviso');
    audit(ctx, pen ? 'penaliza horas' : 'premia horas', 'users', user_id, `${h} h · ${sp.name}`);
  },
  'hours.forgive'(ctx, { id }) { const a = ctx.db.get('hour_adjustments', id); needSpace(ctx, a.space_id); ctx.db.update('hour_adjustments', id, { forgiven: true }); notify(ctx, a.user_id, 'Penalización perdonada', ctx.db.get('spaces', a.space_id).name); audit(ctx, 'perdona penalización', 'users', a.user_id); },

  // ---------------------------------------------------------------- Administración
  'ban.set'(ctx, { user_id, amount, unit, reason }) {
    need(ctx); const db = ctx.db, now = N(ctx);
    if (!db.get('users', user_id)) fail('No encontramos a esa persona');
    if (Q.rolesOf(db, user_id).includes('admin')) fail('No se puede restringir a un administrador');
    const until = unit === 'permanente' ? null : iso(T(now) + (+amount > 0 ? +amount : fail('Indica la duración')) * (unit === 'dias' ? 864e5 : 36e5));
    db.insert('bans', { user_id, from_at: iso(now), until_at: until, reason: reason || null, by_id: ctx.uid });
    db.where('reservations', r => r.user_id === user_id && ACTIVE.includes(r.status) && (!until || T(r.start_at) < T(until))).forEach(r => db.update('reservations', r.id, { status: 'cancelada', charged_min: 0, cancelled_at: iso(now) }));
    notify(ctx, user_id, 'Acceso restringido al Hub', (until ? 'Hasta el ' + new Date(until).toLocaleString('es-CL') : 'De forma permanente') + (reason ? '. Motivo: ' + reason : ''), 'penalizacion');
    audit(ctx, 'restringe acceso', 'users', user_id, until || 'permanente');
  },
  'ban.lift'(ctx, { id }) { need(ctx); const b = ctx.db.get('bans', id); ctx.db.update('bans', id, { lifted_at: iso(N(ctx)) }); notify(ctx, b.user_id, 'Se levantó tu restricción de acceso', 'Ya puedes volver al Hub.'); audit(ctx, 'levanta restricción', 'users', b.user_id); },
  'space.save'(ctx, s) {
    const db = ctx.db, old = s.id ? db.get('spaces', s.id) : null;
    old ? needSpace(ctx, old.id) : need(ctx);
    if (!(s.name || '').trim()) fail('Escribe el nombre del espacio');
    const mgr = s.manager_id ? (Q.findUser(db, s.manager_id) || fail('El encargado debe tener un perfil en el Hub')) : null;
    if (mgr && !Q.rolesOf(db, mgr.id).length) fail('El encargado debe ser parte del equipo del Hub. Agrégalo primero en Empleados');
    const row = { name: s.name.trim(), kind: s.kind || 'otro', mode: s.mode || 'reserva', floor: +s.floor || 1, capacity: +s.capacity || 0, accessible: !!s.accessible, requires_cert: !!s.requires_cert, min_level: +s.min_level || 1, manager_id: mgr?.id || null, monthly_hours: +s.monthly_hours || 0, gap_min: +s.gap_min || 0, tolerance_min: s.tolerance_min === '' || s.tolerance_min == null ? null : +s.tolerance_min, max_hours: s.max_hours ? +s.max_hours : null, allow_overnight: !!s.allow_overnight, accept: (s.accept || '').replace(/\s/g, '') || null, notes: s.notes || null, active: s.active !== false };
    if (old && !has(ctx)) { row.manager_id = old.manager_id; row.kind = old.kind; row.mode = old.mode; row.floor = old.floor; }
    const diff = old ? Object.keys(row).filter(k => String(old[k] ?? '') !== String(row[k] ?? '')).map(k => `${k}: ${old[k] ?? '—'} → ${row[k] ?? '—'}`).join('; ') : 'creado';
    const r = old ? db.update('spaces', old.id, row) : db.insert('spaces', row);
    if (mgr) grantStaffCerts(ctx, mgr.id, r.id);
    if (diff) audit(ctx, old ? 'edita espacio' : 'crea espacio', 'spaces', r.id, diff);
    return { id: r.id };
  },
  'resource.save'(ctx, r) {
    const db = ctx.db; needSpace(ctx, r.space_id);
    if (!(r.name || '').trim()) fail('Escribe el nombre del equipo');
    const row = { space_id: r.space_id, name: r.name.trim(), model: r.model || null, specs: r.specs || null, capacity: +r.capacity || 1, active: r.active !== false };
    const x = r.id ? db.update('resources', r.id, row) : db.insert('resources', row);
    audit(ctx, r.id ? 'edita equipo' : 'agrega equipo', 'spaces', r.space_id, row.name);
    return { id: x.id };
  },
  'resource.remove'(ctx, { id }) { const r = ctx.db.get('resources', id); needSpace(ctx, r.space_id); if (ctx.db.find('reservations', x => x.resource_id === id)) ctx.db.update('resources', id, { active: false }); else ctx.db.remove('resources', id); audit(ctx, 'quita equipo', 'spaces', r.space_id, r.name); },
  'block.add'(ctx, { space_id, start, end, reason }) {
    const db = ctx.db; space_id ? needSpace(ctx, space_id) : need(ctx);
    if (!(T(end) > T(start))) fail('El término debe ser posterior al inicio');
    const b = db.insert('blocks', { space_id: space_id || null, start_at: iso(start), end_at: iso(end), reason: reason || null, by_id: ctx.uid });
    db.where('reservations', r => ACTIVE.includes(r.status) && (!space_id || r.space_id === space_id) && R.overlaps(start, end, r.start_at, r.end_at)).forEach(r => {
      db.update('reservations', r.id, { status: 'cancelada', charged_min: 0, cancelled_at: iso(N(ctx)) });
      notify(ctx, r.user_id, 'Tu reserva fue cancelada por un bloqueo', `${db.get('spaces', r.space_id).name}, ${new Date(r.start_at).toLocaleString('es-CL')}${reason ? '. Motivo: ' + reason : ''}. Las horas se devolvieron.`);
    });
    audit(ctx, 'bloquea agenda', 'blocks', b.id, reason);
    return { id: b.id };
  },
  'block.remove'(ctx, { id }) { const b = ctx.db.get('blocks', id); if (!b) return; b.space_id ? needSpace(ctx, b.space_id) : need(ctx); ctx.db.remove('blocks', id); audit(ctx, 'desbloquea agenda', 'blocks', id); },
  'event.save'(ctx, e) {
    need(ctx); const db = ctx.db;
    if (!(e.title || '').trim()) fail('Escribe el título');
    const row = { kind: e.kind || 'evento', title: e.title.trim(), description: e.description || null, start_at: e.start_at ? iso(e.start_at) : null, end_at: e.end_at ? iso(e.end_at) : null, seats: e.seats ? +e.seats : null, space_id: e.space_id ? +e.space_id : null, published: e.published !== false };
    if (e.banner_img !== undefined) row.banner_img = e.banner_img;
    if (e.poster_img !== undefined) row.poster_img = e.poster_img;
    const r = e.id ? db.update('events', e.id, row) : db.insert('events', { ...row, created_at: iso(N(ctx)) });
    audit(ctx, 'guarda evento', 'events', r.id, row.title);
    return { id: r.id };
  },
  'event.remove'(ctx, { id }) { need(ctx); ctx.db.where('event_attendance', a => a.event_id === id).forEach(a => ctx.db.remove('event_attendance', a.id)); ctx.db.remove('events', id); audit(ctx, 'borra evento', 'events', id); },
  'staff.save'(ctx, { user, position, roles: rs }) {
    need(ctx); const db = ctx.db, u = Q.findUser(db, user) || fail('Esa persona debe crear primero su perfil de usuario');
    const valid = (rs || []).filter(r => ['admin', 'encargado', 'recepcion', 'analista'].includes(r));
    if (u.id === ctx.uid && !valid.includes('admin')) fail('No puedes quitarte la credencial de administración');
    const s = db.find('staff', x => x.user_id === u.id);
    s ? db.update('staff', s.id, { position: position || null, active: valid.length > 0 }) : db.insert('staff', { user_id: u.id, position: position || null, active: valid.length > 0 });
    db.where('staff_roles', r => r.user_id === u.id).forEach(r => db.remove('staff_roles', r.id));
    valid.forEach(role => db.insert('staff_roles', { user_id: u.id, role }));
    if (!valid.includes('encargado')) db.where('spaces', sp => sp.manager_id === u.id).forEach(sp => db.update('spaces', sp.id, { manager_id: null }));
    audit(ctx, 'guarda empleado', 'users', u.id, valid.join(', ') || 'sin credenciales');
  },
  'config.set'(ctx, { key, value }) { need(ctx); ctx.db.setCfg(key, value); audit(ctx, 'cambia configuración', 'config', key, key === 'theme' || key === 'logo' ? '' : JSON.stringify(value).slice(0, 200)); },
  'plan.save'(ctx, { floor, shapes }) {
    need(ctx); const db = ctx.db;
    db.where('plan_shapes', s => s.floor === floor).forEach(s => db.remove('plan_shapes', s.id));
    shapes.forEach((s, i) => db.insert('plan_shapes', { floor, x: Math.round(s.x), y: Math.round(s.y), w: Math.round(s.w), h: Math.round(s.h), z: i, color: s.color, text_color: s.text_color || null, label: s.label || null, kind: s.kind || 'libre', capacity: +s.capacity || 0, space_id: s.space_id ? +s.space_id : null, group_id: s.group_id || null }));
    audit(ctx, 'guarda plano', 'plan_shapes', floor, shapes.length + ' zonas');
  },
  'import.stats'(ctx, { rows, source }) {
    need(ctx, 'analista'); let n = 0;
    for (const r of rows) if (/^\d{4}-\d{2}-\d{2}$/.test(r.day) && r.space && +r.visits >= 0) { ctx.db.insert('history_stats', { day: r.day, space: String(r.space).trim(), visits: Math.round(+r.visits), source: source || null }); n++; }
    audit(ctx, 'importa históricos', 'history_stats', null, `${n} filas`);
    return { added: n, skipped: rows.length - n };
  },

  // ---------------------------------------------------------------- Tareas automáticas
  'system.tick'(ctx) { return tick(ctx); },
};

function updateUser(ctx, u, p) {
  const db = ctx.db, row = {};
  for (const k of ['name', 'phone', 'comuna', 'activity', 'occupation', 'gender', 'lang', 'photo', 'birth_date']) if (p[k] !== undefined) row[k] = p[k] === '' ? null : p[k];
  if (p.reduced_mobility !== undefined) row.reduced_mobility = !!p.reduced_mobility;
  if (row.name != null && String(row.name).trim().length < 3) fail('Escribe el nombre completo');
  if (p.email !== undefined) {
    const e = (p.email || '').trim().toLowerCase();
    if (e && !R.emailOk(e)) fail('Escribe un correo válido');
    if (e && db.find('users', x => x.email === e && x.id !== u.id)) fail('Ese correo ya tiene un perfil');
    row.email = e || null;
  }
  if (p.doc_number !== undefined) {
    const type = p.doc_type || u.doc_type, num = R.normDoc(p.doc_number);
    if (type !== 'pasaporte' ? !R.rutOk(num) : num.length < 5) fail('El documento no es válido');
    if (db.find('users', x => x.doc_number === num && x.id !== u.id)) fail('Ese documento ya tiene un perfil');
    row.doc_type = type; row.doc_number = num;
  }
  db.update('users', u.id, row);
}

/** El personal encargado recibe la certificación de su laboratorio. */
function grantStaffCerts(ctx, uid, spaceId) {
  const db = ctx.db, top = db.where('certifications', c => c.space_id === spaceId && c.active).sort((a, b) => b.level - a.level)[0];
  if (top && !db.find('user_certs', x => x.user_id === uid && x.certification_id === top.id)) db.insert('user_certs', { user_id: uid, certification_id: top.id, granted_at: iso(N(ctx)), granted_by: ctx.uid || null });
}

/** Mantiene sesiones de certificación para las próximas cuatro semanas. */
function ensureSessions(ctx) {
  const db = ctx.db, now = N(ctx);
  for (const c of db.where('certifications', c => c.active)) for (let i = 0; i < 28; i++) {
    const d = R.addDays(now, i); if (d.getDay() !== c.weekday) continue;
    const start = R.atMin(d, c.time_min); if (T(start) < T(now)) continue;
    if (!db.find('cert_sessions', s => s.certification_id === c.id && R.dayKey(s.start_at) === R.dayKey(start)))
      db.insert('cert_sessions', { certification_id: c.id, start_at: iso(start), end_at: iso(T(start) + c.duration_min * 60000), seats: c.seats });
  }
}

/** Tareas que corren solas cada minuto: asistencia, inasistencias, cierres, limpieza. */
export function tick(ctx) {
  const db = ctx.db, now = N(ctx), cfg = k => db.cfg(k);
  ensureSessions(ctx);
  const inside = new Set(db.where('visits', v => !v.out_at).map(v => v.user_id));
  for (const r of db.where('reservations', r => ACTIVE.includes(r.status))) {
    const sp = db.get('spaces', r.space_id), tol = (sp?.tolerance_min ?? cfg('tolerance_min')) * 60000;
    if (r.status !== 'en_curso' && T(now) >= T(r.start_at) && T(now) < T(r.end_at)) {
      const guests = db.where('reservation_guests', g => g.reservation_id === r.id);
      const here = inside.has(r.user_id) || (guests.some(g => inside.has(g.user_id)) && !cfg('release_room_without_host'));
      if (here && r.status === 'confirmada') { db.update('reservations', r.id, { status: 'en_curso', attended_at: r.start_at }); guests.filter(g => inside.has(g.user_id)).forEach(g => db.update('reservation_guests', g.id, { attended: true })); continue; }
      if (!here && T(now) > T(r.start_at) + tol) {
        if (r.status === 'en_revision') { db.update('reservations', r.id, { status: 'rechazada', charged_min: 0 }); notify(ctx, r.user_id, 'Tu archivo no alcanzó a revisarse', `${sp?.name}: la reserva se liberó y las horas se devolvieron.`); }
        else { db.update('reservations', r.id, { status: 'no_asistio' }); notify(ctx, r.user_id, 'No asististe a tu reserva', `${sp?.name}: se liberó tras ${Math.round(tol / 60000)} minutos de espera. Las horas no se devuelven.`, 'penalizacion'); }
      }
    } else if (T(now) >= T(r.end_at)) {
      if (r.status === 'en_curso') db.update('reservations', r.id, { status: 'completada', finished_at: r.end_at, real_min: Math.round((T(r.end_at) - T(r.start_at)) / 60000) });
      else if (r.status === 'confirmada') db.update('reservations', r.id, { status: 'no_asistio' });
      else db.update('reservations', r.id, { status: 'rechazada', charged_min: 0 });
    }
  }
  for (const v of db.where('visits', v => !v.out_at)) {
    const h = R.hoursFor(cfg('hours'), v.in_at), close = R.atMin(v.in_at, h ? h[1] : 1080);
    if (T(now) > T(close)) db.update('visits', v.id, { out_at: iso(Math.max(T(close), T(v.in_at) + 60000)), out_source: 'auto' });
  }
  const keep = cfg('keep_rejected_days') * 864e5;
  db.where('files', f => ['rechazado', 'observado'].includes(f.status) && f.reviewed_at && T(now) - T(f.reviewed_at) > keep).forEach(f => db.update('files', f.id, { status: 'eliminado', storage: null }));
  return { at: iso(now) };
}

/** Ejecuta un servicio validando la sesión. */
export async function call(ctx, name, args = {}) {
  const fn = SERVICES[name]; if (!fn) fail('Operación desconocida: ' + name);
  if (!PUBLIC.includes(name) && !ctx.uid) fail('Inicia sesión para continuar');
  return (await fn(ctx, args || {})) ?? { ok: true };
}

/** Datos que puede ver quien inició sesión. El servidor envía solo esto al navegador. */
export function snapshot(ctx) {
  const db = ctx.db, uid = ctx.uid, rs = roles(ctx), staff = rs.length > 0, pii = rs.some(r => r !== 'analista');
  const all = t => db.all(t), mine = t => db.where(t, r => r.user_id === uid);
  const safe = u => { const { password_hash, ...x } = u; return x; };
  const out = { config: all('config'), spaces: all('spaces'), resources: all('resources'), certifications: all('certifications'), cert_sessions: all('cert_sessions'), blocks: all('blocks'), plan_shapes: all('plan_shapes'), events: staff ? all('events') : db.where('events', e => e.published) };
  if (!uid) return { tables: out, occ: Q.occupancy(db, N(ctx)) };
  if (staff) {
    for (const t of ['staff', 'staff_roles', 'cert_enrollments', 'user_certs', 'reservations', 'reservation_guests', 'files', 'observations', 'visits', 'hour_adjustments', 'bans', 'event_attendance', 'failure_reports', 'history_stats', 'audit_log']) out[t] = all(t);
    out.notifications = mine('notifications'); out.outbox = rs.includes('admin') ? all('outbox').slice(-30) : [];
    out.users = all('users').map(u => pii || u.id === uid ? safe(u) : { ...safe(u), name: 'Usuario ' + u.id.slice(-5), doc_number: '', email: null, phone: null, photo: null });
  } else {
    const myRes = new Set([...mine('reservations').map(r => r.id), ...mine('reservation_guests').map(g => g.reservation_id)]);
    const visible = new Set([uid, db.get('users', uid)?.guardian_id, ...db.where('users', u => u.guardian_id === uid).map(u => u.id)]);
    const named = new Set(db.where('reservation_guests', g => myRes.has(g.reservation_id)).map(g => g.user_id));
    db.where('reservations', r => myRes.has(r.id)).forEach(r => named.add(r.user_id));
    out.users = db.where('users', u => visible.has(u.id) || named.has(u.id)).map(u => visible.has(u.id) ? safe(u) : { id: u.id, name: u.name, status: u.status });
    out.staff = mine('staff'); out.staff_roles = mine('staff_roles');
    out.reservations = all('reservations').map(r => myRes.has(r.id) ? r : { id: r.id, space_id: r.space_id, resource_id: r.resource_id, start_at: r.start_at, end_at: r.end_at, status: r.status, user_id: null, charged_min: 0 });
    out.reservation_guests = db.where('reservation_guests', g => myRes.has(g.reservation_id));
    out.cert_enrollments = all('cert_enrollments').map(e => e.user_id === uid ? e : { ...e, user_id: null });
    out.event_attendance = all('event_attendance').map(e => e.user_id === uid ? e : { ...e, user_id: null });
    for (const t of ['user_certs', 'files', 'observations', 'visits', 'hour_adjustments', 'bans', 'notifications', 'failure_reports']) out[t] = mine(t);
  }
  return { tables: out, occ: Q.occupancy(db, N(ctx)) };
}

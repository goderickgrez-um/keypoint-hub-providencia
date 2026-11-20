// Datos de ejemplo para la demo. Todas las personas son ficticias, salvo la cuenta de administración
// del equipo de desarrollo. Las fechas se generan en torno al momento en que se crea la base.
import { Store } from './store.js';
import * as R from './rules.js';
import * as Q from './queries.js';
import { hashPass, tick } from './services.js';
import { DEFAULTS, ACTIVITIES, OCCUPATIONS, GENDERS, FAILURES, ACCEPT_3D, ACCEPT_LASER } from './catalog.js';

export const DEMO_PASSWORD = 'demo1234';
export const DEMO_ACCOUNTS = [
  { label: 'Usuario', ident: 'camila.rojas@ejemplo.cl' }, { label: 'Recepción', ident: 'marta.pizarro@ejemplo.cl' },
  { label: 'Encargado de laboratorio', ident: 'tomas.fuentes@ejemplo.cl' }, { label: 'Analista de datos', ident: 'ignacio.vera@ejemplo.cl' },
  { label: 'Administración', ident: 'roderick.grez@mayor.cl' },
];

const PC_SPECS = 'Ryzen 5 2900 · 16 GB RAM · RX 5060 · SSD 1 TB · Monitor 120 Hz 1080p · Mouse Redragon Gaming · Teclado Redragon Kumara';
const FEM = ['Camila', 'Valentina', 'Sofía', 'Martina', 'Isidora', 'Antonia', 'Josefa', 'Fernanda', 'Catalina', 'Javiera', 'Daniela', 'Paula', 'Carolina', 'Francisca', 'Macarena', 'Rocío', 'Elena', 'Gabriela'];
const MAS = ['Benjamín', 'Vicente', 'Matías', 'Tomás', 'Joaquín', 'Agustín', 'Cristóbal', 'Sebastián', 'Felipe', 'Nicolás', 'Diego', 'Andrés', 'Rodrigo', 'Pablo', 'Gonzalo', 'Ignacio', 'Mauricio', 'Héctor'];
const SUR = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutiérrez', 'Castro', 'Pizarro', 'Álvarez', 'Vásquez', 'Vera', 'Carrasco'];
const COMUNAS = ['Providencia', 'Providencia', 'Providencia', 'Providencia', 'Ñuñoa', 'Ñuñoa', 'Las Condes', 'Santiago', 'Santiago', 'La Reina', 'Macul', 'Vitacura', 'Recoleta', 'Maipú', 'La Florida'];
const FILES = { 5: ['soporte_monitor.stl', 'engranaje_v3.3mf', 'carcasa_sensor.stl', 'maceta_hexagonal.obj', 'clip_cable.stl'], 6: ['figura_dragon.ctb', 'molde_joya.stl', 'miniatura_set.ctb'], 7: ['logo_stand.svg', 'letrero_feria.dxf', 'caja_mdf.pdf', 'llaveros.svg'] };

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '.');
const banner = (title, sub, c1, c2, w, h) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
  `<rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * .86}" cy="${h * .2}" r="${h * .5}" fill="#fff" opacity=".1"/><circle cx="${w * .7}" cy="${h * 1.05}" r="${h * .45}" fill="#fff" opacity=".08"/>` +
  `<text x="${w * .06}" y="${h * .46}" font-family="system-ui,Segoe UI,sans-serif" font-size="${h * .16}" font-weight="700" fill="#fff">${title}</text>` +
  `<text x="${w * .06}" y="${h * .66}" font-family="system-ui,Segoe UI,sans-serif" font-size="${h * .085}" fill="#fff" opacity=".92">${sub}</text></svg>`);

export async function seed(nowArg = new Date()) {
  const now = new Date(nowArg), db = new Store(), ctx = { db, now, demo: true };
  let a = 20261117; const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = arr => arr[Math.floor(rnd() * arr.length)], int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const iso = d => new Date(d).toISOString(), day = n => R.addDays(now, n), at = (n, m) => R.atMin(day(n), m);
  const pass = await hashPass(DEMO_PASSWORD, 'keypoint');

  for (const [key, value] of Object.entries(DEFAULTS)) db.insert('config', { key, value });

  // ---- Personas
  let body = 10000000;
  const person = (name, o = {}) => {
    body += int(40000, 190000);
    const num = o.doc || String(body) + R.dv(String(body)), years = o.age ?? Math.max(18, Math.min(74, Math.round(37 + (rnd() + rnd() + rnd() - 1.5) * 26)));
    const b = new Date(now); b.setFullYear(b.getFullYear() - years); b.setDate(b.getDate() - int(1, 300));
    return db.insert('users', {
      doc_number: num, name, email: o.email === null ? null : o.email || slug(name) + '@ejemplo.cl', phone: o.email === null ? null : '+56 9 ' + int(1000, 9999) + ' ' + int(1000, 9999),
      comuna: o.comuna || pick(COMUNAS), activity: o.activity || pick(ACTIVITIES), occupation: o.occupation || pick(OCCUPATIONS), gender: o.gender || 'Prefiero no especificar',
      birth_date: R.dayKey(b), reduced_mobility: o.mob ?? rnd() < .05, password_hash: pass, email_verified: true, status: o.status || 'activo', guardian_id: o.guardian || null, guardian_ok: !!o.guardian && o.status !== 'pendiente_adulto',
      consent_data: true, consent_image: true, consent_belongings: true, created_at: iso(day(-int(5, 200))),
    });
  };
  const admin = person('Roderick Grez', { doc: '111111111', email: 'roderick.grez@mayor.cl', age: 24, comuna: 'Providencia', activity: 'Estudio', occupation: OCCUPATIONS[1], mob: false });
  const tomas = person('Tomás Fuentes', { gender: 'Hombre', age: 34, occupation: OCCUPATIONS[1], mob: false });
  const vale = person('Valentina Soto', { gender: 'Mujer', age: 29, occupation: OCCUPATIONS[14], mob: false });
  const felipe = person('Felipe Araya', { gender: 'Hombre', age: 27, occupation: OCCUPATIONS[15], mob: false });
  const marta = person('Marta Pizarro', { gender: 'Mujer', age: 41, occupation: OCCUPATIONS[3], mob: false });
  const ignacio = person('Ignacio Vera', { gender: 'Hombre', age: 31, occupation: OCCUPATIONS[1], mob: false });
  const camila = person('Camila Rojas', { doc: '123456785', gender: 'Mujer', age: 36, comuna: 'Providencia', activity: ACTIVITIES[3], occupation: OCCUPATIONS[10], mob: false });
  const benja = person('Benjamín Rojas', { gender: 'Hombre', age: 16, comuna: 'Providencia', activity: 'Estudio', occupation: 'Estudiante', guardian: camila.id, mob: false });
  const sofia = person('Sofía Rojas', { gender: 'Mujer', age: 14, comuna: 'Providencia', activity: 'Estudio', occupation: 'Estudiante', guardian: camila.id, status: 'pendiente_adulto', mob: false });
  const elena = person('Elena Carrasco', { gender: 'Mujer', age: 71, email: null, occupation: OCCUPATIONS[12], comuna: 'Providencia', mob: true });
  const people = [];
  for (let i = 0; i < 150; i++) {
    const g = rnd(), gender = g < .47 ? 'Mujer' : g < .93 ? 'Hombre' : g < .96 ? 'No binario' : 'Prefiero no especificar';
    people.push(person(`${pick(gender === 'Hombre' ? MAS : FEM)} ${pick(SUR)} ${pick(SUR)}`, { gender, email: undefined }));
  }
  people.forEach((u, i) => { if (db.find('users', x => x.email === u.email && x.id !== u.id)) u.email = u.email.replace('@', i + '@'); });

  // ---- Equipo del Hub
  const hire = (u, position, rs) => { db.insert('staff', { user_id: u.id, position }); rs.forEach(role => db.insert('staff_roles', { user_id: u.id, role })); };
  hire(admin, 'Encargado de desarrollo', ['admin']); hire(tomas, 'Encargado de impresión 3D', ['encargado']); hire(vale, 'Encargada de láser y textil', ['encargado']);
  hire(felipe, 'Encargado de sala gaming', ['encargado']); hire(marta, 'Recepcionista', ['recepcion']); hire(ignacio, 'Analista de datos', ['analista']);

  // ---- Espacios y equipos
  const space = s => db.insert('spaces', s);
  const cowork = space({ name: 'Cowork', kind: 'cowork', mode: 'libre', floor: 1, capacity: 60, color: '#5AC8C0' });
  const sala1 = space({ name: 'Sala de reuniones 1', kind: 'sala', floor: 1, capacity: 8, color: '#63B6D8' });
  const sala2 = space({ name: 'Sala de reuniones 2', kind: 'sala', floor: 1, capacity: 10, color: '#63B6D8' });
  const gaming = space({ name: 'Sala gaming', kind: 'gaming', floor: 2, capacity: 6, monthly_hours: 48, manager_id: felipe.id, color: '#8A5FBF' });
  const fil = space({ name: 'Impresión 3D filamento', kind: 'lab', floor: 2, capacity: 6, requires_cert: true, monthly_hours: 48, gap_min: 30, allow_overnight: true, accept: ACCEPT_3D, manager_id: tomas.id, color: '#2A7FA8' });
  const resi = space({ name: 'Impresión 3D resina', kind: 'lab', floor: 2, capacity: 2, requires_cert: true, monthly_hours: 48, gap_min: 30, allow_overnight: true, accept: ACCEPT_3D, manager_id: tomas.id, color: '#3B6FB6' });
  const laser = space({ name: 'Cortadora láser', kind: 'lab', floor: 2, capacity: 1, requires_cert: true, monthly_hours: 48, gap_min: 30, accept: ACCEPT_LASER, manager_id: vale.id, color: '#B26A1F' });
  const textil = space({ name: 'Laboratorio textil', kind: 'lab', floor: 2, capacity: 6, requires_cert: true, monthly_hours: 48, gap_min: 30, manager_id: vale.id, color: '#4E8D5B' });
  const audit = space({ name: 'Auditorio', kind: 'auditorio', mode: 'evento', floor: 2, capacity: 60, color: '#7FC8A0' });
  const office = space({ name: 'Oficina de pasantía', kind: 'otro', mode: 'libre', floor: 1, capacity: 8, color: '#9A8C5B', notes: 'Solo personas con pasantía' });
  const resid = space({ name: 'Residencias', kind: 'residencia', mode: 'evento', floor: 2, capacity: 30, color: '#0E7C86' });
  // Encargados: cada uno puede tener uno o más espacios (Valentina tiene láser y textil)
  for (const sp of db.all('spaces')) if (sp.manager_id) db.insert('space_managers', { space_id: sp.id, user_id: sp.manager_id });
  const eq = (sp, n, name, model, specs, capacity = 1) => { for (let i = 1; i <= n; i++) db.insert('resources', { space_id: sp.id, name: `${name} ${i}`, model, specs, capacity }); };
  eq(gaming, 6, 'PC', 'Acer Nitro 5', PC_SPECS);
  eq(fil, 6, 'Ender 3 n.º', 'Creality Ender 3', 'Volumen 220 × 220 × 250 mm · boquilla 0,4 mm · PLA y PETG');
  eq(resi, 2, 'Mars 4K n.º', 'Elegoo Mars 4K', 'Volumen 143 × 90 × 165 mm · capa 0,05 mm · resina estándar');
  eq(laser, 1, 'Cortadora láser', 'Cortadora láser CO₂ industrial estándar', 'Área 600 × 400 mm · MDF, acrílico, cartón y tela');
  eq(textil, 9, 'Máquina de coser', 'Máquina de coser básica estándar', 'Puntada recta y zigzag');
  eq(resid, 6, 'Residencia', null, 'Grupo de residencia', 5);

  // ---- Certificaciones
  const cert = (sp, name, weekday, level = 1) => db.insert('certifications', { space_id: sp.id, name, level, weekday, time_min: 720, duration_min: 90, seats: 6, instructor_id: sp.manager_id });
  const cFil = cert(fil, 'Impresión 3D filamento · FDM 1', 4), cRes = cert(resi, 'Impresión 3D resina', 3), cLas = cert(laser, 'Corte láser', 2), cTex = cert(textil, 'Maquinaria textil', 5);
  const grant = (u, c, ago = int(10, 150)) => db.insert('user_certs', { user_id: u.id, certification_id: c.id, granted_at: iso(day(-ago)), granted_by: db.get('spaces', c.space_id).manager_id });
  grant(tomas, cFil); grant(tomas, cRes); grant(vale, cLas); grant(vale, cTex); grant(camila, cLas, 60); grant(camila, cFil, 45); grant(benja, cFil, 20);
  const makers = people.filter(() => rnd() < .4);
  makers.forEach(u => { [cFil, cRes, cLas, cTex].filter(() => rnd() < .45).forEach(c => grant(u, c)); });

  // ---- Bloqueos: feriados cercanos y un cierre parcial
  for (const [m, d, why] of [[12, 8, 'Feriado: Inmaculada Concepción'], [12, 25, 'Feriado: Navidad'], [1, 1, 'Feriado: Año Nuevo'], [5, 1, 'Feriado: Día del Trabajo'], [9, 18, 'Feriado: Fiestas Patrias']]) {
    let f = new Date(now.getFullYear(), m - 1, d); if (+f < +now) f = new Date(now.getFullYear() + 1, m - 1, d);
    if ((+f - +now) / 864e5 < 75) db.insert('blocks', { space_id: null, start_at: iso(f), end_at: iso(R.addDays(f, 1)), reason: why, by_id: admin.id });
  }
  const workday = n => { let d = day(0), k = 0; while (k < Math.abs(n)) { d = R.addDays(d, Math.sign(n)); if (R.hoursFor(DEFAULTS.hours, d) && !db.find('blocks', b => b.space_id == null && R.overlaps(d, R.addDays(d, .5), b.start_at, b.end_at))) k++; } return d; };
  db.insert('blocks', { space_id: gaming.id, start_at: iso(R.atMin(workday(4), 810)), end_at: iso(R.atMin(workday(4), 1050)), reason: 'Torneo interno de la comunidad gaming', by_id: felipe.id });
  tick(ctx); // crea las sesiones de certificación de las próximas semanas

  // ---- Visitas de los últimos 90 días
  const freq = new Map([camila, benja, elena, ...people].map(u => [u.id, u === camila ? .6 : .04 + rnd() ** 2 * .7]));
  for (let n = -90; n <= 0; n++) {
    const d = day(n), h = R.hoursFor(DEFAULTS.hours, d); if (!h || db.find('blocks', b => b.space_id == null && R.overlaps(R.atMin(d, 600), R.atMin(d, 660), b.start_at, b.end_at))) continue;
    const peak = [2, 4].includes(d.getDay()) ? 1.35 : 1;
    for (const [uid, p] of freq) {
      if (rnd() > p * peak * .95) continue;
      const morning = rnd() < (peak > 1 ? .72 : .58), i = Math.max(h[0], Math.round((morning ? 560 : 840) + (rnd() + rnd() - 1) * 110));
      const o = Math.min(h[1], i + int(50, 300)), tin = R.atMin(d, i), tout = R.atMin(d, o);
      if (+tin > +now) continue;
      db.insert('visits', { user_id: uid, in_at: iso(tin), out_at: +tout > +now ? null : iso(tout), source: rnd() < .85 ? 'qr' : 'rut', out_source: +tout > +now ? null : rnd() < .8 ? 'qr' : 'auto', by_staff: marta.id });
    }
  }

  // ---- Reservas pasadas y futuras
  const certified = sp => db.where('user_certs', c => db.get('certifications', c.certification_id).space_id === sp.id).map(c => c.user_id).filter(id => !Q.rolesOf(db, id).length && id !== camila.id && id !== benja.id);
  const book = (u, sp, res, start, min, o = {}) => {
    const end = new Date(+start + min * 60000);
    if (Q.unavailable(db, sp, res, start, end)) return null;
    const past = +end < +now, real = past && sp.monthly_hours ? Math.max(20, Math.round(min * (.7 + rnd() * .4))) : null;
    const status = o.status || (past ? (rnd() < .06 ? 'no_asistio' : 'completada') : 'confirmada');
    return db.insert('reservations', {
      user_id: u, space_id: sp.id, resource_id: res?.id ?? null, kind: res ? 'equipo' : sp.kind === 'sala' ? 'sala' : 'grupo', title: o.title || null, start_at: iso(start), end_at: iso(end), status,
      est_min: o.est || min, real_min: status === 'completada' ? real ?? min : null, charged_min: !sp.monthly_hours || ['cancelada', 'rechazada'].includes(status) ? 0 : status === 'completada' ? real : min,
      attended_at: status === 'completada' ? iso(start) : null, finished_at: status === 'completada' ? iso(+start + (real ?? min) * 60000) : null, created_by: u, created_at: iso(+start - int(1, 6) * 864e5),
    });
  };
  const withFile = (r, sp, status) => { if (r && sp.accept) db.insert('files', { user_id: r.user_id, reservation_id: r.id, space_id: sp.id, name: pick(FILES[sp.id]), size: int(80, 48000) * 1024, status, reviewed_by: status === 'pendiente' ? null : sp.manager_id, reviewed_at: status === 'pendiente' ? null : iso(+new Date(r.created_at) + 36e5), created_at: r.created_at }); };
  // Reservas de la usuaria de demostración
  const mineOld = book(camila.id, fil, db.find('resources', r => r.space_id === fil.id && r.name.endsWith('2')), R.atMin(workday(-3), 870), 120, { est: 95 }) || db.find('reservations', r => r.space_id === fil.id && r.status === 'completada');
  if (mineOld) { mineOld.user_id = camila.id; db.where('files', f => f.reservation_id === mineOld.id).forEach(f => db.remove('files', f.id)); db.insert('files', { user_id: camila.id, reservation_id: mineOld.id, space_id: fil.id, name: 'soporte_monitor.stl', size: 2411520, status: 'aprobado', reviewed_by: tomas.id, reviewed_at: iso(workday(-4)), created_at: iso(workday(-5)) }); }
  const room = book(camila.id, sala2, null, R.atMin(workday(1), 630), R.blocksDur(2), { title: 'Reunión de proveedores' });
  if (room) [people[3], people[8], benja].forEach(g => db.insert('reservation_guests', { reservation_id: room.id, user_id: g.id }));
  const cut = book(camila.id, laser, db.find('resources', r => r.space_id === laser.id), R.atMin(workday(2), 570), 120, { est: 80, status: 'en_revision' });
  if (cut) db.insert('files', { user_id: camila.id, reservation_id: cut.id, space_id: laser.id, name: 'logo_stand.svg', size: 86016, status: 'pendiente', created_at: iso(now) });
  const rej = db.insert('files', { user_id: camila.id, space_id: fil.id, name: 'bandeja_v1.stl', size: 5347737, status: 'rechazado', reviewed_by: tomas.id, reviewed_at: iso(day(-2)), created_at: iso(day(-3)) });
  db.insert('observations', { file_id: rej.id, user_id: camila.id, author_id: tomas.id, space_id: fil.id, kind: 'rechazo', text: 'La pared mide menos de 1 mm y no se sostiene al imprimir. Aumenta el grosor a 1,6 mm y vuelve a subir el archivo.', created_at: iso(day(-2)) });

  for (let n = -60; n <= 8; n++) {
    const d = day(n), h = R.hoursFor(DEFAULTS.hours, d); if (!h) continue;
    for (const sp of [fil, resi, laser, textil]) {
      const users = certified(sp); if (!users.length) continue;
      for (const res of db.where('resources', r => r.space_id === sp.id)) for (const st of [510 + 60 * int(0, 1), 870]) {
        if (rnd() > (sp === textil ? .12 : .38)) continue;
        const est = int(35, st > 800 && d.getDay() !== 5 ? 170 : 115), r = book(pick(users), sp, res, R.atMin(d, st), R.roundUpHours(est), { est });
        if (r && n > -15) { const pend = r.status === 'confirmada' && rnd() < .3; withFile(r, sp, pend ? 'pendiente' : 'aprobado'); if (pend) r.status = 'en_revision'; }
      }
    }
    const slots = R.slotsFor(DEFAULTS.hours, d);
    for (const res of db.where('resources', r => r.space_id === gaming.id)) if (rnd() < .45) book(pick(people).id, gaming, res, R.atMin(d, pick(slots.slice(0, -2))), R.blocksDur(int(1, 2)));
    for (const sp of [sala1, sala2]) for (const s of slots.filter(() => rnd() < .22)) {
      const r = book(pick(people).id, sp, null, R.atMin(d, s), R.blocksDur(1));
      if (r) for (let i = int(1, 4); i > 0; i--) { const g = pick(people).id; if (g !== r.user_id && !db.find('reservation_guests', x => x.reservation_id === r.id && x.user_id === g)) db.insert('reservation_guests', { reservation_id: r.id, user_id: g, attended: r.status === 'completada' }); }
    }
  }
  // ---- Ajustes de horas, restricciones, fallas
  db.insert('hour_adjustments', { user_id: camila.id, space_id: fil.id, period: R.period(now), minutes: -120, kind: 'penalizacion', reason: 'No retiró la pieza en el plazo acordado', by_id: tomas.id, created_at: iso(day(-6)) });
  db.insert('hour_adjustments', { user_id: camila.id, space_id: laser.id, period: R.period(now), minutes: 240, kind: 'premio', reason: 'Apoyo en la feria de emprendedores', by_id: vale.id, created_at: iso(day(-9)) });
  db.insert('bans', { user_id: people[20].id, from_at: iso(day(-2)), until_at: iso(day(5)), reason: 'Uso de una máquina sin certificación', by_id: admin.id });
  const machines = db.where('resources', r => [fil.id, resi.id, laser.id, textil.id].includes(r.space_id));
  for (let i = 0; i < 16; i++) { const m = rnd() < .35 ? machines[1] : pick(machines); db.insert('failure_reports', { user_id: pick(people).id, space_id: m.space_id, resource_id: m.id, category: pick(FAILURES.slice(0, 6)), description: 'Reporte de ejemplo.', status: i < 4 ? 'abierta' : 'resuelta', created_at: iso(day(-int(1, 85))) }); }

  // ---- Eventos y avisos
  const ev = e => db.insert('events', { created_at: iso(day(-10)), ...e });
  const hoy = R.hoursFor(DEFAULTS.hours, now) ? 0 : 1;
  ev({ title: 'Semana del emprendimiento', description: 'Stands abiertos en el primer piso con emprendimientos de la comuna. Entrada liberada; marca tu asistencia al llegar.', start_at: iso(R.atMin(workday(hoy), 540)), end_at: iso(R.atMin(workday(hoy), 1020)), seats: 150, space_id: cowork.id, banner_img: banner('Semana del emprendimiento', 'Stands abiertos en el primer piso', '#0E7C86', '#3B6FB6', 1200, 400), poster_img: banner('Semana del emprendimiento', 'Hub Providencia · primer piso', '#0E7C86', '#3B6FB6', 1200, 1500) });
  const charla = ev({ title: 'Charla: formaliza tu emprendimiento', description: 'Pasos para iniciar actividades, obtener patente y emitir boletas. Incluye ronda de preguntas.', start_at: iso(R.atMin(workday(2), 960)), end_at: iso(R.atMin(workday(2), 1050)), seats: 60, space_id: audit.id, banner_img: banner('Formaliza tu emprendimiento', 'Charla en el auditorio', '#2A7FA8', '#4E8D5B', 1200, 400), poster_img: banner('Formaliza tu emprendimiento', 'Auditorio · segundo piso', '#2A7FA8', '#4E8D5B', 1200, 1500) });
  ev({ title: 'Feria de emprendedores de Providencia', description: 'Muestra y venta de productos de emprendimientos locales.', start_at: iso(R.atMin(workday(6), 600)), end_at: iso(R.atMin(workday(6), 960)), seats: null, space_id: cowork.id, banner_img: banner('Feria de emprendedores', 'Productos y servicios de la comuna', '#4E8D5B', '#0E7C86', 1200, 400), poster_img: banner('Feria de emprendedores', 'Hub Providencia', '#4E8D5B', '#0E7C86', 1200, 1500) });
  ev({ kind: 'aviso', title: 'Certificaciones todas las semanas', description: 'Láser los martes, resina los miércoles, filamento los jueves y textil los viernes, siempre a las 12:00. Inscríbete desde Reservar › Certificaciones.', banner_img: banner('Certifícate en los laboratorios', 'Sesiones semanales a las 12:00', '#3B6FB6', '#8A5FBF', 1200, 400) });
  db.insert('event_attendance', { event_id: charla.id, user_id: camila.id, at: iso(day(-1)) });
  db.all('events').filter(e => e.seats).forEach(e => people.filter(() => rnd() < .16).forEach(u => db.insert('event_attendance', { event_id: e.id, user_id: u.id, at: iso(day(-int(1, 6))) })));
  db.all('cert_sessions').slice(0, 6).forEach(s => people.filter(() => rnd() < .02).slice(0, 4).forEach(u => db.insert('cert_enrollments', { session_id: s.id, user_id: u.id })));

  // ---- Avisos
  const note = (u, title, text, kind = 'aviso', data = null, ago = 1) => db.insert('notifications', { user_id: u.id, kind, title, text, data, created_at: iso(day(-ago)) });
  note(camila, `${sofia.name} pide tu autorización`, 'Confirma si autorizas su perfil como adulto responsable.', 'tutor', { minor_id: sofia.id }, 0);
  note(camila, 'Archivo rechazado', 'bandeja_v1.stl: revisa la observación del encargado en tu perfil.', 'observacion', null, 2);
  note(camila, 'Horas adicionales', 'Se agregaron 4 h en Cortadora láser: apoyo en la feria de emprendedores.', 'aviso', null, 9);
  note(elena, 'Te sumaron a una reserva', 'Sala de reuniones 1, mañana a las 10:30.', 'aviso', null, 0);

  // ---- Plano de ejemplo
  const zone = (floor, x, y, w, h, sp, o = {}) => db.insert('plan_shapes', { floor, x, y, w, h, z: db.all('plan_shapes').length, color: sp?.color || o.color || '#9AA3A8', text_color: '#FFFFFF', label: o.label || sp?.name, kind: o.kind || sp?.mode || 'libre', capacity: o.capacity ?? sp?.capacity ?? 0, space_id: sp?.id || null, group_id: o.group || null });
  zone(1, 40, 40, 560, 330, cowork, { group: 1 }); zone(1, 40, 370, 300, 190, cowork, { group: 1 });
  zone(1, 640, 40, 320, 150, sala1); zone(1, 640, 220, 320, 150, sala2); zone(1, 380, 410, 580, 150, null, { label: 'Recepción y acceso', kind: 'otro', color: '#7D8790' });
  zone(2, 40, 40, 300, 240, gaming); zone(2, 370, 40, 300, 150, fil); zone(2, 700, 40, 260, 150, resi); zone(2, 370, 220, 300, 130, laser); zone(2, 700, 220, 260, 130, textil);
  zone(2, 40, 310, 300, 250, audit); zone(2, 370, 380, 590, 180, resid);

  db.insert('audit_log', { at: iso(day(-9)), actor_id: admin.id, action: 'crea espacio', entity: 'spaces', entity_id: String(textil.id), detail: 'Laboratorio textil' });
  db.insert('audit_log', { at: iso(day(-6)), actor_id: tomas.id, action: 'penaliza horas', entity: 'users', entity_id: camila.id, detail: '2 h · Impresión 3D filamento' });
  // Quien tiene una reserva en curso ahora mismo figura dentro del Hub, para que la ocupación se vea viva.
  db.where('reservations', r => r.status === 'confirmada' && +new Date(r.start_at) <= +now && +now < +new Date(r.end_at)).forEach(r => {
    if (rnd() < .85 && !db.find('visits', v => v.user_id === r.user_id && !v.out_at)) db.insert('visits', { user_id: r.user_id, in_at: iso(+new Date(r.start_at) - 5 * 60000), source: 'qr', by_staff: marta.id });
  });
  db.all('spaces').forEach(s => { s.manager_id = null; s.qr_key = Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[int(0, 31)]).join(''); }); // reemplazado por space_managers · QR de cada espacio
  db.setCfg('intern_space', office.id); db.update('users', camila.id, { intern: true }); // demo: Camila tiene pasantía
  // Reservas que van ahora: con la confirmación en dos pasos ya se iniciaron (escanearon el QR del espacio)
  db.where('reservations', r => r.status === 'confirmada' && +new Date(r.start_at) <= +now && +now < +new Date(r.end_at)).forEach(r => { const v = db.find('visits', x => x.user_id === r.user_id && !x.out_at);
    if (v) { db.update('reservations', r.id, { status: 'en_curso', attended_at: iso(+new Date(r.start_at) + 3 * 60000) }); db.update('visits', v.id, { space_id: r.space_id }); } });
  tick(ctx);
  db.take();
  return db.dump();
}

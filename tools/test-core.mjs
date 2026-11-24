// Pruebas de humo del núcleo: datos de ejemplo + reglas principales. Ejecutar con: npm test
import { ACTIVE } from '../src/core/catalog.js';
import { seed } from '../src/core/seed.js';
import { Store } from '../src/core/store.js';
import { call, snapshot, tick } from '../src/core/services.js';
import * as Q from '../src/core/queries.js';
import * as R from '../src/core/rules.js';
import assert from 'node:assert/strict';

// Lunes 16-11-2026 a las 10:15 hora local: el Hub está abierto.
const now = new Date(2026, 10, 16, 10, 15);
const db = new Store(await seed(now));
const ctx = uid => ({ db, uid, now, demo: true });
const U = e => db.find('users', u => u.email === e).id;
const [cam, marta, tomas, admin, ign] = ['camila.rojas@ejemplo.cl', 'marta.pizarro@ejemplo.cl', 'tomas.fuentes@ejemplo.cl', 'roderick.grez@mayor.cl', 'ignacio.vera@ejemplo.cl'].map(U);
const T = d => +new Date(d);
const rejects = async (p, re) => { try { await p; } catch (e) { assert.match(e.message, re); return; } assert.fail('debió fallar: ' + re); };
const sizes = Object.fromEntries(Object.entries(db.dump()).map(([k, v]) => [k, v.length]));
console.log(sizes);

assert.equal(R.rutOk('12.345.678-5'), true); assert.equal(R.rutOk('12.345.678-9'), false);
assert.equal(R.blocksDur(1), 50); assert.equal(R.blocksDur(2), 110); assert.equal(R.roundUpHours(75), 120);

// Ingreso
assert.equal((await call(ctx(null), 'auth.login', { ident: '12.345.678-5', password: 'demo1234' })).session, cam);
await rejects(call(ctx(null), 'auth.login', { ident: cam, password: 'mala' }), /incorrectos/);

// Registro con confirmación de correo
const reg = await call(ctx(null), 'auth.register', { name: 'Persona Nueva', doc_number: '15.555.555-6', email: 'nueva@ejemplo.cl', phone: '1', comuna: 'Providencia', activity: 'Vivo', occupation: 'Estudiante', gender: 'Mujer', birth_date: '1990-05-05', password: 'clave1234', consent_data: 1, consent_image: 1, consent_belongings: 1, consent_terms: 1 });
assert.equal(reg.status, 'pendiente_correo');
assert.equal((await call(ctx(null), 'auth.verify', { id: reg.id, code: reg.demo_code })).session, reg.id);
assert.equal(db.get('users', reg.id).status, 'activo');

// Menor de edad: necesita la autorización de un adulto
const kid = await call(ctx(null), 'auth.register', { name: 'Menor Prueba', doc_number: '24.000.000-' + R.dv('24000000'), email: 'menor@ejemplo.cl', phone: '1', comuna: 'Providencia', activity: 'Estudio', occupation: 'Estudiante', gender: 'Hombre', birth_date: '2012-01-01', password: 'clave1234', consent_data: 1, consent_image: 1, consent_belongings: 1, consent_terms: 1, guardian: cam });
await call(ctx(null), 'auth.verify', { id: kid.id, code: kid.demo_code });
assert.equal(db.get('users', kid.id).status, 'pendiente_adulto');
const ask = db.find('notifications', n => n.kind === 'tutor' && n.data.minor_id === kid.id);
await call(ctx(cam), 'me.guardianAnswer', { id: ask.id, accept: true });
assert.equal(db.get('users', kid.id).status, 'activo');

// Reserva de gaming: 2 bloques = 110 min, descuenta saldo
const gaming = db.find('spaces', s => s.kind === 'gaming'), pc = db.where('resources', r => r.space_id === gaming.id);
const day = R.addDays(now, 1), free = (sp, res, n, min) => { for (const s of R.slotsFor(db.cfg('hours'), day)) { const st = R.atMin(day, s); if (!Q.unavailable(db, sp, res, st, new Date(+st + min * 60000))) return st; } };
const before = Q.balance(db, reg.id, gaming.id, day).left;
const g = await call(ctx(reg.id), 'res.create', { space_id: gaming.id, resource_id: pc[0].id, start: free(gaming, pc[0], 2, 110), slots: 2 });
assert.equal(before - Q.balance(db, reg.id, gaming.id, day).left, 110);
await rejects(call(ctx(cam), 'res.create', { space_id: gaming.id, resource_id: pc[0].id, start: db.get('reservations', g.id).start_at, slots: 1 }), /reservado/);

// Laboratorio: exige certificación, archivo y redondea a horas
const laser = db.find('spaces', s => s.name === 'Cortadora láser'), cutter = db.find('resources', r => r.space_id === laser.id);
let t0; for (let d = 1; !t0 && d < 9; d++) for (const m of [510, 570, 630, 690, 750, 810, 870]) { const st = R.atMin(R.addDays(now, d), m); if (!Q.unavailable(db, laser, cutter, st, new Date(+st + 120 * 60000))) { t0 = st; break; } }
await rejects(call(ctx(reg.id), 'res.create', { space_id: laser.id, resource_id: cutter.id, start: t0, est_min: 75, file: { name: 'a.svg', size: 10 } }), /certificación/);
await rejects(call(ctx(cam), 'res.create', { space_id: laser.id, resource_id: cutter.id, start: t0, est_min: 75, file: { name: 'a.exe', size: 10 } }), /Formato/);
const lab = await call(ctx(cam), 'res.create', { space_id: laser.id, resource_id: cutter.id, start: t0, est_min: 75, file: { name: 'pieza.svg', size: 2048 } });
assert.equal(lab.status, 'en_revision');
assert.equal((+new Date(lab.end_at) - +t0) / 60000, 120);
const file = db.find('files', f => f.reservation_id === lab.id);
await rejects(call(ctx(tomas), 'file.review', { id: file.id, decision: 'aprobado' }), /encargado/);
await call(ctx(Q.managersOf(db, laser.id)[0]), 'file.review', { id: file.id, decision: 'aprobado' });
assert.equal(db.get('reservations', lab.id).status, 'confirmada');
await rejects(call(ctx(cam), 'res.create', { space_id: gaming.id, resource_id: pc[1].id, start: free(gaming, pc[1], 1, 50), slots: 1 }), /hasta 3/);

// Recepción: entrada, salida y acceso restringido
const s1 = await call(ctx(marta), 'access.scan', { code: reg.id });
assert.equal(s1.action, 'entrada');
assert.equal((await call(ctx(marta), 'access.scan', { code: reg.id, at: new Date(+now + 5 * 60000) })).action, 'salida');
await rejects(call(ctx(cam), 'access.scan', { code: reg.id }), /credencial/);
await call(ctx(admin), 'ban.set', { user_id: reg.id, amount: 2, unit: 'dias', reason: 'prueba' });
assert.equal((await call(ctx(marta), 'access.scan', { code: '15555555-6' })).action, 'restringido');
assert.equal(db.get('reservations', g.id).status, 'cancelada');

// Penalización por laboratorio y cancelación tardía
await call(ctx(tomas), 'hours.adjust', { user_id: cam, space_id: db.find('spaces', s => s.name.includes('filamento')).id, hours: 1, kind: 'penalizacion' });
await rejects(call(ctx(tomas), 'hours.adjust', { user_id: cam, space_id: laser.id, hours: 1, kind: 'penalizacion' }), /encargado/);

// Vista filtrada por rol
const snapUser = snapshot(ctx(cam)).tables, snapAna = snapshot(ctx(ign)).tables;
assert.ok(snapUser.users.every(u => !('password_hash' in u)));
assert.ok(snapUser.reservations.filter(r => r.user_id && r.user_id !== cam).every(r => snapUser.reservation_guests.some(x => x.reservation_id === r.id)));
assert.ok(snapAna.users.filter(u => u.id !== ign).every(u => u.email === null && u.name.startsWith('Usuario')));

// Códigos de correo: pedirlo dos veces entrega el mismo código, y acepta espacios
const c1 = await call(ctx(null), 'auth.code', { ident: 'camila.rojas@ejemplo.cl' }), c2 = await call(ctx(null), 'auth.code', { ident: 'camila.rojas@ejemplo.cl' });
assert.equal(c1.demo_code, c2.demo_code); assert.equal(c1.minutes, 15);
assert.equal((await call(ctx(null), 'auth.codeLogin', { ident: 'camila.rojas@ejemplo.cl', code: c1.demo_code.slice(0, 3) + ' ' + c1.demo_code.slice(3) })).session, cam);
await rejects(call(ctx(null), 'auth.codeLogin', { ident: 'camila.rojas@ejemplo.cl', code: c1.demo_code }), /no es correcto/);

// Encargados: uno o varios laboratorios; ven solo los datos de su laboratorio
const vale = U('valentina.soto@ejemplo.cl'), fil = db.find('spaces', s => s.name.includes('filamento')).id;
assert.deepEqual(Q.managedBy(db, vale).map(id => db.get('spaces', id).name).sort(), ['Cortadora láser', 'Laboratorio textil']);
await rejects(call(ctx(admin), 'staff.save', { user: reg.id, roles: ['encargado'], labs: [] }), /al menos un laboratorio/);
await call(ctx(admin), 'staff.save', { user: reg.id, position: 'Encargada', roles: ['encargado'], labs: [fil, laser.id] });
assert.deepEqual(Q.managedBy(db, reg.id).sort(), [fil, laser.id].sort());
const sv = snapshot(ctx(vale)).tables, labs = new Set(Q.managedBy(db, vale));
assert.ok(sv.reservations.every(r => labs.has(r.space_id) || r.user_id === vale) && sv.files.every(f => labs.has(f.space_id) || f.user_id === vale) && sv.visits.every(v => v.user_id === vale));
assert.ok(sv.users.length < db.all('users').length);
await call(ctx(admin), 'staff.save', { user: reg.id, roles: [] }); assert.equal(Q.managedBy(db, reg.id).length, 0);

// Sin reserva: queda registrado en la zona por defecto
const lone = db.find('users', u => u.status === 'activo' && !db.find('visits', v => v.user_id === u.id && !v.out_at) && !db.find('reservations', r => r.user_id === u.id && R.dayKey(r.start_at) === R.dayKey(now)) && !Q.rolesOf(db, u.id).length);
assert.equal((await call(ctx(marta), 'access.scan', { code: lone.id })).zone, 'Cowork');
await rejects(call(ctx(admin), 'config.set', { key: 'cosa', value: 1 }), /desconocida/);
await rejects(call(ctx(cam), 'me.update', { photo: 'javascript:alert(1)' }), /no válido/);

// v1.2 · Edad permitida entre 4 y 95 años
const base = { name: 'Edad Fuera', email: 'edad@ejemplo.cl', phone: '1', comuna: 'Providencia', activity: 'Vivo', occupation: 'Estudiante', gender: 'Mujer', password: 'clave1234', consent_data: 1, consent_image: 1, consent_belongings: 1, consent_terms: 1 };
await rejects(call(ctx(null), 'auth.register', { ...base, doc_number: '9.999.999-' + R.dv('9999999'), birth_date: '2024-01-01', guardian: cam }), /entre 4 y 95/);
await rejects(call(ctx(null), 'auth.register', { ...base, doc_number: '9.999.998-' + R.dv('9999998'), birth_date: '1920-01-01' }), /entre 4 y 95/);

// Espacios: laboratorio nuevo con certificación automática; eliminar con y sin historial
const nl = await call(ctx(admin), 'space.save', { name: 'Lab prueba', kind: 'laboratorio', mode: 'reserva', floor: 2, capacity: 4, requires_cert: true, cert_weekday: 3, cert_time: '16:30' });
const nc = db.find('certifications', c => c.space_id === nl.id); assert.ok(nc && nc.weekday === 3 && nc.time_min === 990);
assert.ok(db.find('cert_sessions', x => x.certification_id === nc.id));
await rejects(call(ctx(admin), 'space.save', { name: 'Otro', kind: 'sala', floor: 9 }), /piso no existe/);
assert.equal((await call(ctx(admin), 'space.remove', { id: nl.id })).removed, true); assert.ok(!db.get('spaces', nl.id) && !db.get('certifications', nc.id));
const fut = db.find('reservations', r => r.space_id === laser.id && ACTIVE.includes(r.status) && +new Date(r.end_at) > +now);
assert.equal((await call(ctx(admin), 'space.remove', { id: laser.id })).removed, false);
assert.equal(db.get('spaces', laser.id).active, false); if (fut) assert.equal(db.get('reservations', fut.id).status, 'cancelada');
db.update('spaces', laser.id, { active: true }); db.where('certifications', c => c.space_id === laser.id).forEach(c => db.update('certifications', c.id, { active: true }));

// Pisos
const fl = (await call(ctx(admin), 'floor.add', { capacity: 40 })).floor; assert.equal(fl, 3);
await call(ctx(admin), 'space.save', { name: 'Terraza', kind: 'sala', mode: 'reserva', floor: 3, capacity: 10 });
assert.equal((await call(ctx(admin), 'floor.remove', { floor: 3 })).deactivated, 1); assert.ok(!(3 in db.cfg('floor_capacity')));

// Agenda: guardar varios bloqueos y liberar parte de uno
const gday = R.addDays(now, 20), h = m => R.atMin(gday, m);
const b1 = await call(ctx(admin), 'block.batch', { space_id: gaming.id, add: [[h(600), h(720)], [h(900), h(950)]], reason: 'Mantención' }); assert.equal(b1.added, 2);
await call(ctx(admin), 'block.batch', { space_id: gaming.id, free: [[h(650), h(670)]] });
const bl = db.where('blocks', b => b.space_id === gaming.id && R.dayKey(b.start_at) === R.dayKey(gday)).map(b => [new Date(b.start_at).getHours() * 60 + new Date(b.start_at).getMinutes(), new Date(b.end_at).getHours() * 60 + new Date(b.end_at).getMinutes()]).sort((a, b) => a[0] - b[0]);
assert.deepEqual(bl, [[600, 650], [670, 720], [900, 950]]);

// Borrar datos de una persona: exige la contraseña de administración
const vic = db.find('users', u => u.status === 'activo' && !Q.rolesOf(db, u.id).length && db.find('visits', v => v.user_id === u.id) && u.id !== cam);
await rejects(call(ctx(admin), 'user.erase', { id: vic.id, scope: 'datos', password: 'mala' }), /no es correcta/);
await rejects(call(ctx(admin), 'user.erase', { id: admin, scope: 'ambos', password: 'demo1234' }), /propia cuenta|credenciales/);
await rejects(call(ctx(cam), 'user.erase', { id: vic.id, scope: 'datos', password: 'demo1234' }), /./);
await call(ctx(admin), 'user.erase', { id: vic.id, scope: 'datos', password: 'demo1234' });
assert.ok(db.get('users', vic.id) && !db.find('visits', v => v.user_id === vic.id) && !db.find('reservations', r => r.user_id === vic.id));
const vic2 = db.find('users', u => u.status === 'activo' && !Q.rolesOf(db, u.id).length && db.find('visits', v => v.user_id === u.id) && u.id !== cam && u.id !== vic.id), nv = db.where('visits', v => v.user_id === vic2.id).length, doc2 = vic2.doc_number;
await call(ctx(admin), 'user.erase', { id: vic2.id, scope: 'perfil', password: 'demo1234' });
assert.equal(db.where('visits', v => v.user_id === vic2.id).length, nv); assert.ok(db.get('users', vic2.id).deleted_at && !db.get('users', vic2.id).email);
assert.equal(Q.findUser(db, vic2.id), null); assert.equal(Q.findUser(db, doc2), null);
const vic3 = db.find('users', u => u.status === 'activo' && !Q.rolesOf(db, u.id).length && ![cam, vic.id, vic2.id].includes(u.id) && !db.where('users', x => x.guardian_id === u.id).length);
await call(ctx(admin), 'user.erase', { id: vic3.id, scope: 'ambos', password: 'demo1234' });
assert.ok(!db.get('users', vic3.id) && !db.find('visits', v => v.user_id === vic3.id));

// v1.3 · Estados de eventos, orden de banners y cupos que nunca son negativos
const evNow = +now;
const evA = await call(ctx(admin), 'event.save', { title: 'Pasado', start_at: new Date(evNow - 3 * 864e5), end_at: new Date(evNow - 3 * 864e5 + 36e5) });
const evB = await call(ctx(admin), 'event.save', { title: 'En curso sin término', start_at: new Date(evNow - 6e5) });
assert.equal(Q.eventState(db.get('events', evA.id), now), 'terminado'); assert.equal(Q.eventState(db.get('events', evB.id), now), 'en_curso');
const bn = Q.bannersFor(db, now).map(e => e.id); assert.ok(bn.includes(evB.id) && !bn.includes(evA.id));
await call(ctx(admin), 'event.order', { ids: [evB.id, ...bn.filter(x => x !== evB.id)].reverse() }); assert.equal(Q.bannersFor(db, now).slice(-1)[0].id, evB.id);
await rejects(call(ctx(admin), 'event.save', { title: 'Negativo', seats: -3 }), /cupos/);
await rejects(call(ctx(admin), 'space.save', { name: 'Neg', kind: 'sala', floor: 1, capacity: -2 }), /negativo/);
await rejects(call(ctx(admin), 'cert.save', { space_id: laser.id, name: 'Neg', weekday: 1, time_min: 600, seats: -1 }), /menor que 1/);
await rejects(call(ctx(cam), 'event.signup', { id: evA.id }), /terminó/);
await rejects(call(ctx(cam), 'event.order', { ids: [] }), /./);

// v1.4 · Reserva en dos pasos, «Terminar» con plazo en recepción, pasantía y QR de espacios
{
  const at = (d, h, m = 0) => { const x = R.addDays(now, d); x.setHours(h, m, 0, 0); return x; }, cx = (uid, t) => ({ db, uid, now: t, demo: true });
  const sala = db.find('spaces', s => s.kind === 'sala'), key = (await call(cx(admin, now), 'space.qr', { id: sala.id })).key, code = `https://hub.cl/app/?espacio=${sala.id}-${key}`;
  assert.ok(/^[A-Z2-9]{8}$/.test(key));
  const pu = db.find('users', u => u.status === 'activo' && !u.deleted_at && !Q.rolesOf(db, u.id).length && !u.guardian_id && !db.find('visits', v => v.user_id === u.id && !v.out_at) && !db.find('bans', b => b.user_id === u.id));
  const r = db.insert('reservations', { user_id: pu.id, space_id: sala.id, start_at: at(30, 10).toISOString(), end_at: at(30, 11).toISOString(), status: 'confirmada', charged_min: 0, created_at: now.toISOString() });
  await rejects(call(cx(pu.id, at(30, 10, 2)), 'space.checkin', { code }), /entrada al Hub/);
  const e1 = await call(cx(marta, at(30, 9, 55)), 'access.scan', { code: pu.id }); assert.equal(e1.action, 'entrada'); assert.equal(e1.next.id, r.id);
  assert.equal(db.get('reservations', r.id).status, 'confirmada'); // entrar al Hub no inicia la reserva
  await rejects(call(cx(pu.id, at(30, 10, 2)), 'space.checkin', { code: `${sala.id}-AAAAAAAA` }), /no es válido/);
  const ck = await call(cx(pu.id, at(30, 10, 2)), 'space.checkin', { code }); assert.equal(ck.started, r.id);
  assert.equal(db.get('reservations', r.id).status, 'en_curso'); assert.equal(db.find('visits', v => v.user_id === pu.id && !v.out_at).space_id, sala.id);
  const fin = await call(cx(pu.id, at(30, 10, 40)), 'res.finish', { id: r.id }); assert.ok(fin.requested); assert.equal(db.get('reservations', r.id).status, 'en_curso'); // queda pendiente de recepción
  const back = await call(cx(marta, at(30, 10, 43)), 'access.scan', { code: pu.id }); assert.equal(back.action, 'cowork'); assert.equal(back.real_min, 38); // dentro del plazo: término a la hora en que tocó «Terminar»
  assert.equal(db.get('reservations', r.id).status, 'completada'); assert.ok(db.find('visits', v => v.user_id === pu.id && !v.out_at && v.space_id !== sala.id));
  // Segunda reserva: «Terminar» y no pasa por recepción → el término no cuenta, la reserva sigue y se le avisa
  const r2 = db.insert('reservations', { user_id: pu.id, space_id: sala.id, start_at: at(30, 12).toISOString(), end_at: at(30, 13).toISOString(), status: 'confirmada', charged_min: 0, created_at: now.toISOString() });
  await call(cx(pu.id, at(30, 12)), 'space.checkin', { code: `${sala.id}-${key}` }); await call(cx(pu.id, at(30, 12, 30)), 'res.finish', { id: r2.id });
  tick(cx(null, at(30, 12, 36)));
  assert.equal(db.get('reservations', r2.id).status, 'en_curso'); assert.ok(db.get('reservations', r2.id).finish_missed_at && !db.get('reservations', r2.id).finish_req_at);
  assert.ok(db.find('notifications', n => n.user_id === pu.id && n.title === 'Expiró el plazo para pasar por recepción'));
  const v2 = db.find('visits', v => v.user_id === pu.id && !v.out_at); assert.ok(v2 && v2.space_id === sala.id && !v2.cowork_until); // sigue dentro, en el espacio
  const late = await call(cx(marta, at(30, 12, 50)), 'access.scan', { code: pu.id }); assert.equal(late.action, 'salida'); // registra su salida del Hub: termina su tiempo
  assert.equal(db.get('reservations', r2.id).status, 'completada'); assert.equal(db.get('reservations', r2.id).real_min, 50);
  // Tercera: sin «Terminar», el escaneo en recepción cierra la reserva y registra la salida
  const r3 = db.insert('reservations', { user_id: pu.id, space_id: sala.id, start_at: at(31, 10).toISOString(), end_at: at(31, 11).toISOString(), status: 'confirmada', charged_min: 0, created_at: now.toISOString() });
  const e3 = await call(cx(marta, at(31, 9, 58)), 'access.scan', { code: pu.id }); assert.equal(e3.action, 'entrada');
  const st3 = await call(cx(marta, at(31, 10, 1)), 'res.start', { id: r3.id }); assert.equal(st3.started, r3.id); // recepción la inicia
  const out3 = await call(cx(marta, at(31, 10, 20)), 'access.scan', { code: pu.id }); assert.equal(out3.action, 'salida'); assert.equal(out3.closed, sala.name); assert.equal(db.get('reservations', r3.id).status, 'completada');
  // Sin escanear el QR del espacio ni iniciar en recepción: no asistió (aunque esté dentro del Hub)
  const r4 = db.insert('reservations', { user_id: pu.id, space_id: sala.id, start_at: at(32, 10).toISOString(), end_at: at(32, 11).toISOString(), status: 'confirmada', charged_min: 0, created_at: now.toISOString() });
  await call(cx(marta, at(32, 9, 50)), 'access.scan', { code: pu.id }); tick(cx(null, at(32, 10, 20))); assert.equal(db.get('reservations', r4.id).status, 'no_asistio');
  await rejects(call(cx(cam, now), 'res.start', { id: r4.id }), /credencial/);
  // Pasantía
  const office = db.get('spaces', +db.cfg('intern_space')), okey = (await call(cx(admin, now), 'space.qr', { id: office.id })).key;
  await call(cx(admin, now), 'user.intern', { id: pu.id, on: false });
  await rejects(call(cx(pu.id, at(32, 10, 30)), 'space.checkin', { code: `${office.id}-${okey}` }), /solo para personas con pasantía/);
  await call(cx(admin, now), 'user.intern', { id: pu.id, on: true });
  assert.ok((await call(cx(pu.id, at(32, 10, 30)), 'space.checkin', { code: `${office.id}-${okey}` })).intern);
  assert.equal(db.find('visits', v => v.user_id === pu.id && !v.out_at).space_id, office.id);
  await call(cx(pu.id, at(32, 11)), 'intern.leave', {}); assert.notEqual(db.find('visits', v => v.user_id === pu.id && !v.out_at).space_id, office.id);
  // 2.7 · Al salir de la oficina queda en el cowork, sin plazo, hasta marcar salida en recepción
  { const v = db.find('visits', v => v.user_id === pu.id && !v.out_at); assert.equal(v.space_id, Q.defaultZone(db)?.id ?? null); assert.equal(v.cowork_until ?? null, null);
    tick(cx(null, at(32, 13))); assert.ok(db.find('visits', x => x.id === v.id && !x.out_at), 'sigue en el cowork horas después');
    assert.equal((await call(cx(marta, at(32, 14)), 'access.scan', { code: pu.id })).action, 'salida'); }
  await rejects(call(cx(pu.id, now), 'space.qr', { id: sala.id }), /./);
  // El QR de los espacios no sale en los datos de un usuario
  assert.ok(snapshot(cx(pu.id, now)).tables.spaces.every(s => !('qr_key' in s))); assert.ok(snapshot(cx(admin, now)).tables.spaces.some(s => s.qr_key));
  // Lista de eventos: los terminados siempre al final
  const ord = Q.sortEvents(db.all('events'), now).map(e => Q.eventState(e, now) === 'terminado'); assert.deepEqual(ord, [...ord].sort((a, b) => a - b));
}

// 2.7 · Eliminar mi cuenta, restablecerla con el mismo RUT, pedir eliminación de datos, periodo de certificaciones, permisos
{
  const mk = async (doc, email) => { const r = await call(ctx(null), 'auth.register', { name: 'Cuenta ' + doc, doc_number: doc, email, phone: '+56911112222', comuna: 'Ñuñoa', activity: 'Trabajo', occupation: 'Estudiante', gender: 'Mujer', birth_date: '1995-05-05', consent_data: true, consent_image: true, consent_belongings: true, consent_terms: true, password: 'clave-segura-1' });
    await call(ctx(null), 'auth.verify', { id: r.id, code: r.demo_code }); return db.get('users', r.id); };
  const doc = '17.777.777-' + R.dv('17777777'), u = await mk(doc, 'cierre@ejemplo.cl');
  const lab = db.find('spaces', s => s.kind === 'lab' && s.monthly_hours > 0);
  db.insert('user_certs', { user_id: u.id, certification_id: db.find('certifications', c => c.space_id === lab.id).id, granted_at: now.toISOString() });
  const fut = db.insert('reservations', { user_id: u.id, space_id: lab.id, start_at: R.atMin(R.addDays(now, 3), 600).toISOString(), end_at: R.atMin(R.addDays(now, 3), 660).toISOString(), status: 'confirmada', charged_min: 60, created_at: now.toISOString() });
  await rejects(call(ctx(u.id), 'me.closeAccount', { password: 'mala' }), /no es correcta/);
  await rejects(call(ctx(tomas), 'me.closeAccount', { password: 'demo1234' }), /credenciales/);
  assert.equal((await call(ctx(u.id), 'me.closeAccount', { password: 'clave-segura-1' })).cancelled, 1);
  assert.equal(db.get('reservations', fut.id).status, 'cancelada'); assert.ok(db.get('users', u.id).closed_at);
  assert.ok(db.find('outbox', o => o.to_email === 'cierre@ejemplo.cl' && /fue eliminada/.test(o.subject)));
  await rejects(call(ctx(null), 'auth.login', { ident: doc, password: 'clave-segura-1' }), /fue eliminada/);
  await rejects(call(ctx(u.id), 'me.update', { comuna: 'X' }), /Inicia sesión/);
  assert.equal((await call(ctx(marta), 'access.scan', { code: u.id })).action, 'cerrada');
  await rejects(call(ctx(admin), 'cert.grant', { certification_id: db.find('certifications', c => c.space_id === lab.id).id, user: u.id }), /No encontramos a esa persona/);
  // Alguien se registra con el mismo RUT: se ofrece restablecer con un código al correo anterior
  const again = { name: 'Cuenta Restablecida', doc_number: doc, email: 'nuevo-correo@ejemplo.cl', phone: '+56933334444', comuna: 'Providencia', activity: 'Vivo', occupation: 'Estudiante', gender: 'Mujer', birth_date: '1995-05-05', consent_data: true, consent_image: true, consent_belongings: true, consent_terms: true, password: 'otra-clave-22' };
  const off = await call(ctx(null), 'auth.register', again); assert.equal(off.closed, true); assert.equal(off.hint, 'c•••@ejemplo.cl'); assert.equal(off.id, undefined);
  const code = await call(ctx(null), 'auth.reopenCode', { doc_number: doc }); assert.ok(code.demo_code);
  await rejects(call(ctx(null), 'auth.reopen', { ...again, code: '000000' }), /no es correcto/);
  const back = await call(ctx(null), 'auth.reopen', { ...again, code: code.demo_code });
  assert.equal(back.id, u.id); assert.equal(back.status, 'pendiente_correo'); // correo nuevo: se confirma con otro código
  await call(ctx(null), 'auth.verify', { id: u.id, code: back.demo_code });
  const ru = db.get('users', u.id); assert.equal(ru.closed_at, null); assert.equal(ru.name, 'Cuenta Restablecida'); assert.equal(ru.email, 'nuevo-correo@ejemplo.cl'); assert.equal(ru.status, 'activo');
  assert.ok(db.find('user_certs', c => c.user_id === u.id), 'conserva sus certificaciones');
  assert.equal((await call(ctx(null), 'auth.login', { ident: doc, password: 'otra-clave-22' })).session, u.id);
  // Recepción restablece después de revisar el carnet
  await call(ctx(u.id), 'me.closeAccount', { password: 'otra-clave-22' });
  const asis = await call(ctx(marta), 'auth.register', { ...again, assisted: true }); assert.equal(asis.id, u.id); assert.equal(asis.closed, true);
  await rejects(call(ctx(cam), 'user.reopen', { id: u.id }), /credencial/);
  assert.equal((await call(ctx(marta), 'user.reopen', { id: u.id })).status, 'activo'); assert.equal(db.get('users', u.id).closed_at, null);

  // Pedir eliminación de mis datos: queda pendiente y administración la ejecuta
  db.insert('visits', { user_id: u.id, in_at: R.addDays(now, -2).toISOString(), out_at: R.addDays(now, -2).toISOString(), source: 'qr' });
  db.insert('hour_adjustments', { user_id: u.id, space_id: lab.id, period: R.period(now), minutes: -60, kind: 'penalizacion', created_at: now.toISOString() });
  const keepRes = db.insert('reservations', { user_id: u.id, space_id: lab.id, start_at: R.atMin(R.addDays(now, 4), 600).toISOString(), end_at: R.atMin(R.addDays(now, 4), 660).toISOString(), status: 'confirmada', charged_min: 60, created_at: now.toISOString() });
  assert.ok((await call(ctx(u.id), 'me.dataRequest', { kind: 'eliminación' })).pending);
  await rejects(call(ctx(u.id), 'me.dataRequest', { kind: 'eliminación' }), /Ya pediste/);
  assert.ok(db.find('notifications', n => n.user_id === admin && /eliminación de datos/.test(n.title)));
  await rejects(call(ctx(marta), 'user.erase', { id: u.id, scope: 'personal', password: 'demo1234' }), /credencial/);
  await call(ctx(admin), 'user.erase', { id: u.id, scope: 'personal', password: 'demo1234' });
  const pu2 = db.get('users', u.id);
  assert.ok(pu2 && !pu2.erase_req_at && !pu2.comuna && !pu2.phone && !pu2.occupation && pu2.name === 'Cuenta Restablecida' && pu2.doc_number === R.normDoc(doc));
  assert.ok(!db.find('visits', v => v.user_id === u.id && v.out_at), 'borra las visitas');
  assert.ok(db.find('user_certs', c => c.user_id === u.id) && db.get('reservations', keepRes.id) && db.find('hour_adjustments', a => a.user_id === u.id && a.kind === 'penalizacion'), 'conserva certificaciones, reservas y penalizaciones');
  assert.ok(db.find('outbox', o => o.to_email === 'nuevo-correo@ejemplo.cl' && /datos personales fueron eliminados/.test(o.subject)), 'correo automático');
  // Descartar una solicitud
  await call(ctx(u.id), 'me.dataRequest', { kind: 'eliminación' }); await call(ctx(admin), 'user.eraseDismiss', { id: u.id }); assert.equal(db.get('users', u.id).erase_req_at, null);

  // Penalizar horas y restringir: administración en cualquier lab; el encargado solo en el suyo y sin restringir
  const own = db.find('spaces', s => s.monthly_hours > 0 && db.find('space_managers', m => m.space_id === s.id && m.user_id === tomas));
  const other = db.find('spaces', s => s.monthly_hours > 0 && !db.find('space_managers', m => m.space_id === s.id && m.user_id === tomas));
  await call(ctx(tomas), 'hours.adjust', { user_id: u.id, space_id: own.id, hours: 1, kind: 'penalizacion' });
  await rejects(call(ctx(tomas), 'hours.adjust', { user_id: u.id, space_id: other.id, hours: 1, kind: 'penalizacion' }), /encargado de este espacio/);
  await call(ctx(admin), 'hours.adjust', { user_id: u.id, space_id: other.id, hours: 1, kind: 'penalizacion' });
  await rejects(call(ctx(tomas), 'ban.set', { user_id: u.id, amount: 1, unit: 'dias' }), /credencial/);

  // Certificación con periodo: solo crea sesiones entre las fechas y bloquea el lugar elegido
  const d0 = R.addDays(now, 7), d1 = R.addDays(now, 7 * 9), room = db.find('spaces', s => s.kind === 'sala' && s.active);
  const victim = db.insert('reservations', { user_id: cam, space_id: room.id, start_at: R.atMin(R.addDays(now, 14 + ((3 - R.addDays(now, 14).getDay() + 7) % 7)), 900).toISOString(), end_at: R.atMin(R.addDays(now, 14 + ((3 - R.addDays(now, 14).getDay() + 7) % 7)), 960).toISOString(), status: 'confirmada', charged_min: 0, created_at: now.toISOString() });
  await rejects(call(ctx(tomas), 'cert.save', { name: 'Periodo', space_id: own.id, weekday: 3, time_min: 900, duration_min: 60, seats: 2, place_id: room.id }), /encargado de este espacio/);
  await rejects(call(ctx(admin), 'cert.save', { name: 'Periodo', space_id: own.id, weekday: 3, time_min: 900, starts_on: R.dayKey(d1), ends_on: R.dayKey(d0) }), /posterior/);
  const cs = await call(ctx(admin), 'cert.save', { name: 'Periodo', space_id: own.id, weekday: 3, time_min: 900, duration_min: 60, seats: 2, starts_on: R.dayKey(d0), ends_on: R.dayKey(d1), place_id: room.id });
  const ses = db.where('cert_sessions', x => x.certification_id === cs.id);
  assert.ok(ses.length >= 8 && ses.length <= 9, 'una sesión por semana en el periodo: ' + ses.length);
  assert.ok(ses.every(x => R.dayKey(x.start_at) >= R.dayKey(d0) && R.dayKey(x.start_at) <= R.dayKey(d1) && new Date(x.start_at).getDay() === 3));
  assert.equal(cs.cancelled, 1); assert.equal(db.get('reservations', victim.id).status, 'cancelada');
  assert.ok(db.find('notifications', n => n.user_id === cam && /por una certificación/.test(n.title)));
  assert.match(Q.unavailable(db, room, null, new Date(ses[0].start_at), new Date(T(ses[0].start_at) + 30 * 60000)) || '', /certificación/);
  assert.equal(Q.unavailable(db, own, null, new Date(ses[0].start_at), new Date(T(ses[0].start_at) + 30 * 60000)), null, 'el laboratorio queda libre si las sesiones son en otro lugar');
  // Sin bloquear: el lugar queda libre. Al cambiar el día, las sesiones vacías se rehacen
  await call(ctx(admin), 'cert.save', { id: cs.id, name: 'Periodo', space_id: own.id, weekday: 4, time_min: 900, duration_min: 60, seats: 2, starts_on: R.dayKey(d0), ends_on: R.dayKey(d1), place_id: room.id, block_place: false });
  const ses2 = db.where('cert_sessions', x => x.certification_id === cs.id && T(x.start_at) > +now);
  assert.ok(ses2.length && ses2.every(x => new Date(x.start_at).getDay() === 4));
  assert.equal(Q.unavailable(db, room, null, new Date(ses2[0].start_at), new Date(T(ses2[0].start_at) + 30 * 60000)), null);
  // Cupos llenos: no se puede inscribir
  const s0 = ses2[0]; for (const x of [cam, tomas]) db.insert('cert_enrollments', { session_id: s0.id, user_id: x, status: 'inscrito' });
  await rejects(call(ctx(u.id), 'cert.enroll', { session_id: s0.id }), /No quedan cupos/);
  // Terminado el periodo no se crean más sesiones
  const n0 = db.where('cert_sessions', x => x.certification_id === cs.id).length; tick({ db, uid: null, now: R.addDays(now, 80), demo: true });
  assert.equal(db.where('cert_sessions', x => x.certification_id === cs.id).length, n0);
}

const st = Q.stats(db, R.addDays(now, -30), now, now), occ = Q.occupancy(db, now);
console.log('ocupación', occ.inside, occ.spaces.filter(s => s.n).map(s => s.name + ':' + s.n).join(', '));
console.log('estadísticas 30 días', { visitas: st.visits, edad: st.avgAge, usuarios: st.users, porEspacio: st.bySpace.slice(0, 4) });
console.log('OK: todas las pruebas del núcleo pasaron');

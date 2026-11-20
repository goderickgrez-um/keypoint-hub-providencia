// Pruebas de humo del núcleo: datos de ejemplo + reglas principales. Ejecutar con: npm test
import { ACTIVE } from '../src/core/catalog.js';
import { seed } from '../src/core/seed.js';
import { Store } from '../src/core/store.js';
import { call, snapshot } from '../src/core/services.js';
import * as Q from '../src/core/queries.js';
import * as R from '../src/core/rules.js';
import assert from 'node:assert/strict';

// Lunes 16-11-2026 a las 10:15 hora local: el Hub está abierto.
const now = new Date(2026, 10, 16, 10, 15);
const db = new Store(await seed(now));
const ctx = uid => ({ db, uid, now, demo: true });
const U = e => db.find('users', u => u.email === e).id;
const [cam, marta, tomas, admin, ign] = ['camila.rojas@ejemplo.cl', 'marta.pizarro@ejemplo.cl', 'tomas.fuentes@ejemplo.cl', 'roderick.grez@mayor.cl', 'ignacio.vera@ejemplo.cl'].map(U);
const rejects = async (p, re) => { try { await p; } catch (e) { assert.match(e.message, re); return; } assert.fail('debió fallar: ' + re); };
const sizes = Object.fromEntries(Object.entries(db.dump()).map(([k, v]) => [k, v.length]));
console.log(sizes);

assert.equal(R.rutOk('12.345.678-5'), true); assert.equal(R.rutOk('12.345.678-9'), false);
assert.equal(R.blocksDur(1), 50); assert.equal(R.blocksDur(2), 110); assert.equal(R.roundUpHours(75), 120);

// Ingreso
assert.equal((await call(ctx(null), 'auth.login', { ident: '12.345.678-5', password: 'demo1234' })).session, cam);
await rejects(call(ctx(null), 'auth.login', { ident: cam, password: 'mala' }), /incorrectos/);

// Registro con confirmación de correo
const reg = await call(ctx(null), 'auth.register', { name: 'Persona Nueva', doc_number: '15.555.555-6', email: 'nueva@ejemplo.cl', phone: '1', comuna: 'Providencia', activity: 'Vivo', occupation: 'Estudiante', gender: 'Mujer', birth_date: '1990-05-05', password: 'clave1234', consent_data: 1, consent_image: 1, consent_belongings: 1 });
assert.equal(reg.status, 'pendiente_correo');
assert.equal((await call(ctx(null), 'auth.verify', { id: reg.id, code: reg.demo_code })).session, reg.id);
assert.equal(db.get('users', reg.id).status, 'activo');

// Menor de edad: necesita la autorización de un adulto
const kid = await call(ctx(null), 'auth.register', { name: 'Menor Prueba', doc_number: '24.000.000-' + R.dv('24000000'), email: 'menor@ejemplo.cl', phone: '1', comuna: 'Providencia', activity: 'Estudio', occupation: 'Estudiante', gender: 'Hombre', birth_date: '2012-01-01', password: 'clave1234', consent_data: 1, consent_image: 1, consent_belongings: 1, guardian: cam });
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
const base = { name: 'Edad Fuera', email: 'edad@ejemplo.cl', phone: '1', comuna: 'Providencia', activity: 'Vivo', occupation: 'Estudiante', gender: 'Mujer', password: 'clave1234', consent_data: 1, consent_image: 1, consent_belongings: 1 };
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

const st = Q.stats(db, R.addDays(now, -30), now, now), occ = Q.occupancy(db, now);
console.log('ocupación', occ.inside, occ.spaces.filter(s => s.n).map(s => s.name + ':' + s.n).join(', '));
console.log('estadísticas 30 días', { visitas: st.visits, edad: st.avgAge, usuarios: st.users, porEspacio: st.bySpace.slice(0, 4) });
console.log('OK: todas las pruebas del núcleo pasaron');

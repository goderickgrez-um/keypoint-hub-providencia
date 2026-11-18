// Pruebas de humo del núcleo: datos de ejemplo + reglas principales. Ejecutar con: npm test
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
await call(ctx(db.get('spaces', laser.id).manager_id), 'file.review', { id: file.id, decision: 'aprobado' });
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

const st = Q.stats(db, R.addDays(now, -30), now, now), occ = Q.occupancy(db, now);
console.log('ocupación', occ.inside, occ.spaces.filter(s => s.n).map(s => s.name + ':' + s.n).join(', '));
console.log('estadísticas 30 días', { visitas: st.visits, edad: st.avgAge, usuarios: st.users, porEspacio: st.bySpace.slice(0, 4) });
console.log('OK: todas las pruebas del núcleo pasaron');

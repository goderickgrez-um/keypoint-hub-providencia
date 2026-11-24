// 2.7 contra el servidor real con PostgreSQL (solo base de prueba, recién creada con init-db.mjs --demo): eliminar y restablecer cuenta, eliminación de datos, periodo de certificaciones, permisos
import { execSync } from 'node:child_process';
const B = process.env.HUB_API || 'http://localhost:8080', ok = (c, m) => { console.log((c ? 'OK  ' : 'FALLA ') + m); if (!c) process.exitCode = 1; };
const rpc = async (name, args, tok) => { const r = await fetch(B + '/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify({ name, args }) }); return { s: r.status, j: await r.json() }; };
const snap = async tok => (await (await fetch(B + '/api/snapshot', { headers: tok ? { Authorization: 'Bearer ' + tok } : {} })).json());
// Lee la base de prueba con psql (DATABASE_URL del .env de pruebas): los códigos llegan por correo y aquí se leen de la tabla
const sql = q => execSync(`psql "${process.env.DATABASE_URL}" -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const codeOf = id => sql(`select code from auth_codes where user_id='${id}' and not used order by expires_at desc limit 1`);
const dv = n => { let s = 0, m = 2; for (const c of String(n).split('').reverse()) { s += +c * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); };
const rut = '18.123.456-' + dv('18123456');
const form = (name, email, password) => ({ name, doc_number: rut, email, phone: '+56977778888', comuna: 'Providencia', activity: 'Trabajo', occupation: 'Estudiante', gender: 'Mujer', birth_date: '1992-02-02', consent_data: true, consent_image: true, consent_belongings: true, consent_terms: true, password });

// Registro y confirmación de correo (el código llega por correo: se lee de la base)
const reg = await rpc('auth.register', form('Servidor Prueba', 'srv.prueba@ejemplo.cl', 'clave-srv-001'));
ok(reg.s === 200 && reg.j.result.status === 'pendiente_correo' && !reg.j.result.demo_code, 'registro en modo real: sin código a la vista');
const id = reg.j.result.id;
const ver = await rpc('auth.verify', { id, code: codeOf(id) }); const tok = ver.j.token; ok(!!tok, 'correo confirmado, sesión abierta');
ok(sql(`select email from users where id='${id}'`).startsWith('enc:v1:'), 'el correo queda cifrado en la base');

// Pedir eliminación de datos y eliminar la cuenta
ok((await rpc('me.dataRequest', { kind: 'eliminación' }, tok)).j.result?.pending, 'solicitud de eliminación de datos');
ok(sql(`select erase_req_at is not null from users where id='${id}'`) === 't', 'queda guardada la solicitud');
const bad = await rpc('me.closeAccount', { password: 'mala' }, tok); ok(bad.s === 400 && /no es correcta/.test(bad.j.error), 'eliminar cuenta: contraseña incorrecta rechazada');
const cl = await rpc('me.closeAccount', { password: 'clave-srv-001' }, tok); ok(cl.s === 200 && cl.j.result.closed, 'cuenta eliminada');
ok(!(await snap(tok)).uid, 'su sesión deja de valer');
const li = await rpc('auth.login', { ident: rut, password: 'clave-srv-001' }); ok(li.s === 400 && /fue eliminada/.test(li.j.error), 'no puede ingresar');
await rpc('auth.code', { ident: rut }); ok(sql(`select count(*) from auth_codes where user_id='${id}' and not used and expires_at > now()`) === '0', 'no se envían códigos de ingreso a una cuenta eliminada');
ok(+sql(`select count(*) from outbox where subject like 'Tu cuenta del Hub fue eliminada%'`) >= 1, 'correo de cuenta eliminada en la bandeja de salida');

// Restablecer con el mismo RUT y un código al correo anterior
const off = await rpc('auth.register', form('Servidor Restablecida', 'srv.nueva@ejemplo.cl', 'clave-srv-002'));
ok(off.j.result?.closed && off.j.result.hint === 's•••@ejemplo.cl' && !off.j.result.id, 'el registro ofrece restablecer sin mostrar el ID');
ok((await rpc('auth.reopenCode', { doc_number: rut })).j.result?.hint, 'código enviado al correo anterior');
const wrong = await rpc('auth.reopen', { ...form('X', 'srv.nueva@ejemplo.cl', 'clave-srv-002'), code: '000000' }); ok(wrong.s === 400, 'código incorrecto rechazado');
const re = await rpc('auth.reopen', { ...form('Servidor Restablecida', 'srv.nueva@ejemplo.cl', 'clave-srv-002'), code: codeOf(id) });
ok(re.s === 200 && re.j.result.id === id && re.j.result.status === 'pendiente_correo', 'restablecida con el mismo ID; pide confirmar el correo nuevo');
const tok2 = (await rpc('auth.verify', { id, code: codeOf(id) })).j.token; ok(!!tok2, 'correo nuevo confirmado');
const me2 = (await snap(tok2)).tables.users.find(u => u.id === id); ok(me2.name === 'Servidor Restablecida' && me2.email === 'srv.nueva@ejemplo.cl' && !me2.closed_at, 'datos nuevos y cuenta activa');

// Administración ejecuta la eliminación de datos; correo automático
const adm = (await rpc('auth.login', { ident: 'roderick.grez@mayor.cl', password: 'demo1234' })).j.token;
await rpc('me.dataRequest', { kind: 'eliminación' }, tok2);
const usr = (await rpc('auth.login', { ident: 'camila.rojas@ejemplo.cl', password: 'demo1234' })).j.token;
ok((await rpc('user.eraseDismiss', { id }, usr)).s === 400 && (await rpc('user.reopen', { id }, usr)).s === 400, 'una persona usuaria no puede descartar ni restablecer cuentas ajenas');
const er = await rpc('user.erase', { id, scope: 'personal', password: 'demo1234' }, adm); ok(er.s === 200, 'administración borra los datos personales');
ok(sql(`select coalesce(comuna,'') || coalesce(phone,'') || coalesce(occupation,'') from users where id='${id}'`) === '' && sql(`select erase_req_at is null from users where id='${id}'`) === 't', 'perfil opcional vacío y solicitud cerrada');
ok(+sql(`select count(*) from outbox where subject = 'Tus datos personales fueron eliminados'`) >= 1, 'correo automático de datos eliminados');
ok(!!(await snap(tok2)).uid, 'la cuenta sigue funcionando');

// Permisos de penalización y restricción
const tomas = (await rpc('auth.login', { ident: 'tomas.fuentes@ejemplo.cl', password: 'demo1234' })).j.token, ts = await snap(tomas);
const mine = ts.tables.space_managers.filter(m => m.user_id === ts.uid).map(m => m.space_id), labs = ts.tables.spaces.filter(s => s.monthly_hours > 0);
const own = labs.find(s => mine.includes(s.id)), other = labs.find(s => !mine.includes(s.id));
ok((await rpc('hours.adjust', { user_id: id, space_id: own.id, hours: 1, kind: 'penalizacion' }, tomas)).s === 200, 'encargado penaliza en su laboratorio');
ok((await rpc('hours.adjust', { user_id: id, space_id: other.id, hours: 1, kind: 'penalizacion' }, tomas)).s === 400, 'encargado no penaliza en otro laboratorio');
ok((await rpc('ban.set', { user_id: id, amount: 1, unit: 'dias' }, tomas)).s === 400, 'encargado no puede restringir el acceso');
ok((await rpc('hours.adjust', { user_id: id, space_id: other.id, hours: 1, kind: 'penalizacion' }, adm)).s === 200, 'administración penaliza en cualquier laboratorio');

// Certificación con periodo y lugar bloqueado
const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const room = (await snap(adm)).tables.spaces.find(s => s.kind === 'sala');
const cs = await rpc('cert.save', { name: 'Periodo servidor', space_id: own.id, weekday: 2, time_min: 960, duration_min: 60, seats: 3, starts_on: d(2), ends_on: d(40), place_id: room.id }, adm);
ok(cs.s === 200, 'certificación con periodo guardada');
const n = +sql(`select count(*) from cert_sessions where certification_id=${cs.j.result.id}`), out = +sql(`select count(*) from cert_sessions where certification_id=${cs.j.result.id} and (start_at::date < '${d(2)}' or start_at::date > '${d(40)}')`);
ok(n >= 5 && n <= 6 && out === 0, `sesiones solo dentro del periodo (${n})`);
ok(sql(`select starts_on || ' ' || ends_on || ' ' || place_id || ' ' || block_place from certifications where id=${cs.j.result.id}`) === `${d(2)} ${d(40)} ${room.id} true`, 'periodo y lugar guardados en la base');
const enc = await rpc('cert.save', { name: 'Sin permiso', space_id: own.id, weekday: 2, time_min: 960, place_id: room.id }, tomas); ok(enc.s === 400, 'encargado no bloquea un espacio que no administra');

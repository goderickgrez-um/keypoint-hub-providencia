// 2.8 contra el servidor real con PostgreSQL: formulario configurable (etapas 1 y 2), cifrado, permisos y persistencia.
// Solo contra una base de prueba creada con init-db.mjs --demo (de esta versión o de la anterior, para probar la migración).
// El script inicia y reinicia el servidor en el puerto 8080: detén antes cualquier servidor que use ese puerto. Requiere DATABASE_URL y DATA_KEY de la base de prueba.
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const DIR = process.env.HUB_DIR || fileURLToPath(new URL('../..', import.meta.url)), B = 'http://localhost:8080';
let okN = 0, failN = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FALLA ') + m); c ? okN++ : failN++; if (!c) process.exitCode = 1; };
const sql = q => execSync(`psql "${process.env.DATABASE_URL}" -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
let srv;
const start = async () => { srv = spawn('node', ['server/server.js'], { cwd: DIR, env: { ...process.env, PORT: '8080', UPLOADS_DIR: '/tmp/hubup' }, stdio: ['ignore', 'pipe', 'pipe'] }); let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
  for (let i = 0; i < 60; i++) { try { const h = await (await fetch(B + '/api/health')).json(); if (h.ok !== false) return h; } catch { /* aún no */ } await new Promise(r => setTimeout(r, 250)); } throw new Error('El servidor no inició: ' + log); };
const stop = () => new Promise(r => { srv.on('exit', r); srv.kill(); });
const rpc = async (name, args, tok) => { const r = await fetch(B + '/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify({ name, args }) }); return { s: r.status, j: await r.json() }; };
const snap = async tok => (await (await fetch(B + '/api/snapshot', { headers: { Authorization: 'Bearer ' + tok } })).json());
const login = async ident => (await rpc('auth.login', { ident, password: 'demo1234' })).j.token;
const dv = n => { let s = 0, m = 2; for (const c of String(n).split('').reverse()) { s += +c * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); };

const h = await start();
ok(h.version === '2.8.0', 'servidor 2.8.0 sobre la base anterior: ' + h.version);
ok(sql("select count(*) from information_schema.columns where table_name='users' and column_name='extra'") === '1', 'migración: columna users.extra agregada');
const adm = await login('roderick.grez@mayor.cl'), rec = await login('marta.pizarro@ejemplo.cl'), enc = await login('tomas.fuentes@ejemplo.cl'), ana = await login('ignacio.vera@ejemplo.cl'), cam = await login('camila.rojas@ejemplo.cl');
const s0 = await snap(adm), F0 = s0.tables.config.find(c => c.key === 'reg_form');
ok(!F0 || !(F0.value?.extra || []).length, 'una base anterior parte con el formulario por defecto (sin preguntas agregadas)');

// ---- Etapa 1
const base = (patch = {}) => { const d = { phone: { show: true, required: true }, comuna: { show: true, required: true }, activity: { show: true, required: true }, occupation: { show: true, required: true }, gender: { show: true, required: true }, reduced_mobility: { show: true } }; for (const k in patch) d[k] = { ...d[k], ...patch[k] }; return d; };
for (const [t, who] of [[rec, 'recepción'], [enc, 'encargado'], [ana, 'analista'], [cam, 'usuaria']]) ok((await rpc('form.base', { base: base() }, t)).s === 400, `${who} no puede cambiar el formulario`);
const n0 = +sql("select count(*) from users where activity='Estudio'");
const acts = ['Trabajo', 'Estudio', 'Vivo', 'Tengo mi emprendimiento patentado en la comuna', 'Realizo trámites o actividades puntuales en la comuna', 'Solo utilizo el espacio de cowork'].map(l => ({ label: l === 'Estudio' ? 'Estudio o capacitación' : l, was: l }));
const b1 = await rpc('form.base', { base: base({ comuna: { show: false }, gender: { required: false }, activity: { options: acts } }) }, adm);
ok(b1.s === 200 && b1.j.result.moved === n0 && n0 > 0, `renombrar una opción actualiza ${n0} perfiles en la base`);
ok(sql("select count(*) from users where activity='Estudio'") === '0' && +sql("select count(*) from users where activity='Estudio o capacitación'") === n0, 'PostgreSQL guarda el nombre nuevo');
ok(sql("select value->'base'->'comuna'->>'show' from config where key='reg_form'") === 'false', 'configuración guardada en la base');
const doc1 = '19.111.222-' + dv('19111222');
const r1 = await rpc('auth.register', { name: 'Servidor Etapa Uno', doc_number: doc1, email: 'srv.etapa1@ejemplo.cl', phone: '+56 9 1212 3434', activity: 'Estudio o capacitación', occupation: 'Estudiante', gender: '', birth_date: '1993-03-03', consent_data: true, consent_image: true, consent_belongings: true, consent_terms: true, password: 'clave-etapa-1' });
ok(r1.s === 200, 'registro sin comuna (oculta) ni género (opcional)');
const bad1 = await rpc('auth.register', { name: 'Servidor Malo', doc_number: '19.333.444-' + dv('19333444'), email: 'srv.malo@ejemplo.cl', phone: '+56 9 1212 3435', activity: 'Estudio', occupation: 'Estudiante', birth_date: '1993-03-03', consent_data: true, consent_image: true, consent_belongings: true, consent_terms: true, password: 'clave-etapa-1' });
ok(bad1.s === 400 && /opción válida/.test(bad1.j.error), 'el servidor rechaza una opción que ya no existe');

// ---- Etapa 2
ok((await rpc('form.field', { field: { type: 'text', label: 'X' } }, rec)).s === 400, 'recepción no puede agregar preguntas');
const fA = (await rpc('form.field', { field: { type: 'choice', label: 'Tamaño de tu equipo', required: true, options: [{ label: 'Solo yo' }, { label: 'Equipo' }] } }, adm)).j.result.id;
const fB = (await rpc('form.field', { field: { type: 'text', label: 'Comentarios' } }, adm)).j.result.id;
const fC = (await rpc('form.field', { field: { type: 'number', label: 'Personas en tu hogar', min: 1, max: 15 } }, adm)).j.result.id;
ok(fA && fB && fC, 'tres preguntas creadas');
const opt = (await snap(adm)).tables.config.find(c => c.key === 'reg_form').value.extra.find(f => f.id === fA).options[1].id;
const doc2 = '19.555.666-' + dv('19555666'), form2 = { name: 'Servidor Etapa Dos', doc_number: doc2, email: 'srv.etapa2@ejemplo.cl', phone: '+56 9 7878 9090', activity: 'Vivo', occupation: 'Estudiante', gender: 'Mujer', birth_date: '1990-09-09', consent_data: true, consent_image: true, consent_belongings: true, consent_terms: true, password: 'clave-etapa-2' };
ok((await rpc('auth.register', { ...form2, extra: { [fB]: 'Hola' } })).s === 400, 'falta la obligatoria: rechazado');
ok((await rpc('auth.register', { ...form2, extra: { [fA]: opt, [fC]: '99' } })).s === 400, 'número fuera de rango: rechazado');
const r2 = await rpc('auth.register', { ...form2, extra: { [fA]: opt, [fB]: 'Texto privado del servidor', [fC]: '4' } }); const id2 = r2.j.result?.id;
ok(r2.s === 200 && id2, 'registro con preguntas');
const raw = sql(`select extra from users where id='${id2}'`);
ok(raw.startsWith('enc:v1:') && !raw.includes('Texto privado'), 'las respuestas se guardan cifradas en PostgreSQL');
const tok2 = (await rpc('auth.verify', { id: id2, code: sql(`select code from auth_codes where user_id='${id2}' and not used order by expires_at desc limit 1`) })).j.token;
ok(!!tok2, 'correo confirmado');

// Camila ya estaba registrada: le falta la obligatoria
const camU = (await snap(cam)).tables.users.find(u => u.email === 'camila.rojas@ejemplo.cl');
const camErr = await rpc('me.update', { extra: { [fC]: '2' } }, cam); ok(camErr.s === 400 && /Falta «Tamaño de tu equipo»/.test(camErr.j.error), 'al editar su perfil se le exige la obligatoria nueva');
ok((await rpc('me.update', { extra: { [fA]: opt, [fC]: '2' } }, cam)).s === 200, 'Camila completa su perfil');

// Lo que ve cada credencial
const inAna = (await snap(ana)).tables.users.find(u => u.id === id2), inAdm = (await snap(adm)).tables.users.find(u => u.id === id2), inRec = (await snap(rec)).tables.users.find(u => u.id === id2);
ok(inAna.extra[fA] === opt && inAna.extra[fC] === 4 && !(fB in inAna.extra), 'la analista recibe las respuestas analizables, sin el texto libre');
ok(inAdm.extra[fB] === 'Texto privado del servidor' && inRec.extra[fB] === 'Texto privado del servidor', 'administración y recepción ven todas las respuestas');
const other = (await snap(tok2)).tables.users.find(u => u.id === camU.id); ok(!other || other.extra === undefined, 'una persona usuaria no recibe las respuestas de otras');

// Archivar y persistencia tras reiniciar
ok((await rpc('form.remove', { id: fC }, adm)).j.result.archived === true, 'pregunta con respuestas archivada');
await stop(); await start();
const after = (await snap(await login('roderick.grez@mayor.cl'))).tables, u2 = after.users.find(u => u.id === id2), F2 = after.config.find(c => c.key === 'reg_form').value;
ok(u2.extra[fB] === 'Texto privado del servidor' && u2.extra[fC] === 4, 'tras reiniciar, las respuestas se descifran bien (incluida la archivada)');
ok(F2.extra.find(f => f.id === fC).archived && F2.base.comuna.show === false, 'tras reiniciar, el formulario se conserva');
// Borrar datos personales también borra las respuestas
const admT = await login('roderick.grez@mayor.cl');
ok((await rpc('user.erase', { id: id2, scope: 'personal', password: 'demo1234' }, admT)).s === 200 && sql(`select extra is null from users where id='${id2}'`) === 't', 'borrar datos personales deja las respuestas vacías en la base');
await stop();
console.log(`Resultado: ${okN} correctas, ${failN} fallas`);

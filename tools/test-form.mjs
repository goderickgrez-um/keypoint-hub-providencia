// Pruebas del formulario de registro configurable. Etapa 1: campos del perfil. Etapa 2: preguntas agregadas y su análisis.
// Ejecutar con: node tools/test-form.mjs  (también corre con npm test)
import { seed } from '../src/core/seed.js';
import { Store } from '../src/core/store.js';
import { call, snapshot } from '../src/core/services.js';
import * as Q from '../src/core/queries.js';
import * as R from '../src/core/rules.js';
import * as FORM from '../src/core/form.js';
import assert from 'node:assert/strict';

const now = new Date(2026, 10, 16, 10, 15);
const db = new Store(await seed(now));
const ctx = uid => ({ db, uid, now, demo: true });
const U = e => db.find('users', u => u.email === e).id;
const [cam, marta, tomas, admin, ign] = ['camila.rojas@ejemplo.cl', 'marta.pizarro@ejemplo.cl', 'tomas.fuentes@ejemplo.cl', 'roderick.grez@mayor.cl', 'ignacio.vera@ejemplo.cl'].map(U);
let n = 0;
const rejects = async (p, re) => { try { await p; } catch (e) { assert.match(e.message, re); n++; return; } assert.fail('debió fallar: ' + re); }; const ok = (c, m) => { assert.ok(c, m); n++; };
const F = () => FORM.regForm(db);
let doc = 16000000;
const rut = () => { doc += 7919; return `${doc}-${R.dv(String(doc))}`; };
const person = (o = {}) => ({ name: 'Persona Formulario', doc_number: rut(), email: `f${doc}@ejemplo.cl`, phone: '+56 9 1111 2222', comuna: 'Providencia', activity: 'Vivo', occupation: 'Estudiante', gender: 'Mujer',
  birth_date: '1990-01-01', consent_data: true, consent_image: true, consent_belongings: true, password: 'clave-segura-1', ...o });
const reg = (o, uid = null) => call(ctx(uid), 'auth.register', person(o));
const baseCfg = patch => Object.fromEntries(Object.entries(F().base).map(([k, b]) => [k, { show: b.show, required: b.required, ...(b.options ? { options: b.options.map(o => ({ ...o, was: o.label })) } : {}), ...(patch[k] || {}) }]));

// ================= Etapa 1: campos del perfil
ok(F().base.activity.options.length === 6 && F().base.gender.options.length === 4, 'valores por defecto');
await rejects(reg({ comuna: '' }), /Falta la comuna/);
await rejects(reg({ activity: 'Algo inventado' }), /opción válida en «Actividad en Providencia»/);
await rejects(reg({ phone: '' }), /Falta el celular/);
ok((await reg({ phone: '', assisted: true }, marta)).id, 'registro asistido: el celular es opcional');

// Permisos: solo administración cambia el formulario
for (const who of [marta, tomas, ign, cam]) await rejects(call(ctx(who), 'form.base', { base: baseCfg({}) }), /credencial|Inicia sesión/);
await rejects(call(ctx(admin), 'config.set', { key: 'reg_form', value: {} }), /desconocida/);

// Ocultar comuna, género opcional, renombrar y agregar opciones
const withTrabajo = db.where('users', u => u.activity === 'Trabajo').length;
const acts = F().base.activity.options.map(o => ({ ...o, was: o.label })); acts[0].label = 'Trabajo en Providencia'; acts.push({ label: 'Voluntariado', en: 'Volunteering', pt: 'Voluntariado' });
const r1 = await call(ctx(admin), 'form.base', { base: baseCfg({ comuna: { show: false }, gender: { required: false }, activity: { options: acts } }) });
ok(r1.renamed === 1 && r1.moved === withTrabajo && withTrabajo > 0, `renombrar una opción actualiza los perfiles (${r1.moved})`);
ok(!db.find('users', u => u.activity === 'Trabajo') && db.where('users', u => u.activity === 'Trabajo en Providencia').length === withTrabajo, 'nadie queda con el nombre antiguo');
ok(F().base.comuna.show === false && F().base.comuna.required === false && F().base.gender.required === false, 'oculto no puede ser obligatorio');
const r2 = await reg({ comuna: 'No se guarda', gender: '', activity: 'Voluntariado' });
const u2 = db.get('users', r2.id); ok(u2.comuna === null && u2.gender === null && u2.activity === 'Voluntariado', 'campo oculto no se guarda; opcional vacío permitido; opción nueva aceptada');
await rejects(reg({ activity: 'Trabajo' }), /opción válida/);
// Los datos de un campo oculto se conservan
ok(db.get('users', cam).comuna === 'Providencia', 'ocultar no borra lo que ya estaba');
await call(ctx(cam), 'me.update', { comuna: 'Otra' }); ok(db.get('users', cam).comuna === 'Providencia', 'un campo oculto no se cambia desde el perfil');
// Validación de opciones en el perfil: la opción que ya tenía (y ya no se ofrece) se puede conservar
const occs = F().base.occupation.options.map(o => ({ ...o, was: o.label })).filter(o => o.label !== db.get('users', cam).occupation);
await call(ctx(admin), 'form.base', { base: baseCfg({ occupation: { options: occs } }) });
const camOcc = db.get('users', cam).occupation;
await call(ctx(cam), 'me.update', { occupation: camOcc, activity: 'Voluntariado' }); ok(db.get('users', cam).occupation === camOcc, 'conserva su opción aunque ya no se ofrezca');
await rejects(call(ctx(cam), 'me.update', { occupation: 'Inventada' }), /opción válida/);
await rejects(call(ctx(cam), 'me.update', { activity: '' }), /Falta tu actividad/);
await call(ctx(marta), 'user.update', { id: cam, patch: { phone: '' } }); ok(db.get('users', cam).phone === null, 'recepción puede dejar vacío un obligatorio');
ok(FORM.missingFor(F(), db.get('users', cam)).some(m => m.key === 'phone'), 'falta el celular: se le pedirá al entrar');
await call(ctx(cam), 'me.update', { phone: '+56 9 3333 4444' }); ok(!FORM.missingFor(F(), db.get('users', cam)).length, 'perfil completo de nuevo');
// Errores de configuración
await rejects(call(ctx(admin), 'form.base', { base: baseCfg({ gender: { options: [{ label: 'Solo una' }] } }) }), /al menos dos opciones/);
await rejects(call(ctx(admin), 'form.base', { base: baseCfg({ gender: { options: [{ label: 'A' }, { label: 'a' }] } }) }), /repetidas/);
await rejects(call(ctx(admin), 'form.base', { base: baseCfg({ gender: { options: [{ label: 'A' }, { label: '' }] } }) }), /sin nombre/);
// Hacer obligatorio un campo que estaba opcional: quienes no lo tienen deben completarlo
await call(ctx(admin), 'form.base', { base: baseCfg({ gender: { required: true } }) });
ok(FORM.missingFor(F(), db.get('users', r2.id)).some(m => m.key === 'gender'), 'género ahora obligatorio: se le pide a quien no lo tiene');
// Datos: los campos ocultos no se grafican
const st1 = Q.stats(db, R.addDays(now, -30), now, now);
ok(st1.shown.comuna === false && st1.shown.activity === true, 'Datos sabe qué campos están en uso');
// Mostrar de nuevo la comuna
await call(ctx(admin), 'form.base', { base: baseCfg({ comuna: { show: true, required: true } }) });
ok(F().base.comuna.show && db.get('users', cam).comuna === 'Providencia', 'al volver a mostrarla, los datos siguen ahí');
console.log(`Etapa 1: ${n} verificaciones correctas`);
const n1 = n;

// ================= Etapa 2: preguntas agregadas
const add = field => call(ctx(admin), 'form.field', { field });
await rejects(call(ctx(marta), 'form.field', { field: { type: 'text', label: 'X' } }), /credencial/);
await rejects(add({ type: 'choice', label: 'Una sola', options: [{ label: 'A' }] }), /al menos dos opciones/);
await rejects(add({ type: 'raro', label: 'Tipo raro' }), /tipo de campo/);
await rejects(add({ type: 'number', label: 'Rango malo', min: 10, max: 1 }), /mínimo no puede ser mayor/);
await rejects(add({ type: 'choice', label: 'Nivel educacional', options: [{ label: 'A' }, { label: 'B' }] }), /Ya hay un campo con ese nombre/);
const fTam = (await add({ type: 'choice', label: 'Tamaño de tu equipo', label_en: 'Team size', required: true, options: [{ label: 'Solo yo' }, { label: '2 a 5' }, { label: 'Más de 5' }] })).id;
const fInt = (await add({ type: 'multi', label: 'Intereses', options: [{ label: 'Robótica' }, { label: 'Diseño' }, { label: 'Videojuegos' }] })).id;
const fHij = (await add({ type: 'number', label: 'Personas en tu hogar', min: 1, max: 15 })).id;
const fFec = (await add({ type: 'date', label: 'Fecha de inicio de tu emprendimiento' })).id;
const fBec = (await add({ type: 'yesno', label: '¿Tienes beca?' })).id;
const fTxt = (await add({ type: 'text', label: 'Comentarios' })).id;
const fTel = (await add({ type: 'phone', label: 'Teléfono de emergencia', required: true })).id;
const fMai = (await add({ type: 'email', label: 'Correo de tu institución' })).id;
const tam = FORM.liveFields(F()).find(f => f.id === fTam), [oSolo, o25, oMas] = tam.options.map(o => o.id);
const [iRob, iDis, iVid] = FORM.liveFields(F()).find(f => f.id === fInt).options.map(o => o.id);
ok(FORM.liveFields(F()).length === 11 && tam.label_en === 'Team size', 'preguntas creadas con su traducción');
ok(FORM.isPrivate({ type: 'text' }) && FORM.isPrivate({ type: 'phone' }) && !FORM.isPrivate({ type: 'number' }), 'tipos privados');

// Registro con preguntas agregadas
const good = { [fTam]: o25, [fInt]: [iRob, iVid], [fHij]: '3', [fFec]: '2024-05-10', [fBec]: true, [fTxt]: 'Me gusta el Hub', [fTel]: '+56 9 8888 7777', [fMai]: 'Yo@Universidad.CL' };
await rejects(reg({ extra: { ...good, [fTam]: '' } }), /Falta «Tamaño de tu equipo»/);
await rejects(reg({ extra: { ...good, [fTam]: 'inventada' } }), /opción válida en «Tamaño/);
await rejects(reg({ extra: { ...good, [fHij]: '40' } }), /entre 1 y 15/);
await rejects(reg({ extra: { ...good, [fHij]: 'tres' } }), /debe ser un número/);
await rejects(reg({ extra: { ...good, [fFec]: '2024-02-31' } }), /Revisa la fecha/);
await rejects(reg({ extra: { ...good, [fTel]: 'abc' } }), /Revisa el teléfono/);
await rejects(reg({ extra: { ...good, [fMai]: 'sin-arroba' } }), /Revisa el correo/);
await rejects(reg({ extra: { ...good, [fInt]: [iRob, 'xx'] } }), /opciones válidas/);
await rejects(reg({ extra: { ...good, [fBec]: 'quizás' } }), /sí o no/);
const r3 = await reg({ extra: { ...good, otro: 'campo que no existe' } }); await call(ctx(null), 'auth.verify', { id: r3.id, code: r3.demo_code }); const u3 = db.get('users', r3.id);
ok(u3.extra[fHij] === 3 && u3.extra[fMai] === 'yo@universidad.cl' && u3.extra[fBec] === true && u3.extra[fInt].length === 2 && !('otro' in u3.extra), 'respuestas normalizadas; se ignora lo que no es del formulario');
const r4 = await reg({ extra: { [fTam]: oSolo }, assisted: true }, marta); ok(r4.id && !db.get('users', r4.id).extra[fTel], 'registro asistido: teléfono de emergencia (contacto) opcional');

// Quienes ya estaban registrados deben responder las obligatorias al entrar
const camMiss = FORM.missingFor(F(), db.get('users', cam)).map(m => m.key);
ok(camMiss.includes(fTam) && camMiss.includes(fTel) && !camMiss.includes(fInt), 'Camila debe responder las obligatorias nuevas');
await rejects(call(ctx(cam), 'me.update', { extra: { [fTam]: oMas } }), /Falta «Teléfono de emergencia»/);
await call(ctx(cam), 'me.update', { extra: { [fTam]: oMas, [fTel]: '+56 2 2222 3333' } });
ok(!FORM.missingFor(F(), db.get('users', cam)).length && db.get('users', cam).extra.cedu01, 'completó su perfil sin perder las respuestas anteriores');
await call(ctx(marta), 'user.update', { id: cam, patch: { extra: { [fHij]: '4' } } }); ok(db.get('users', cam).extra[fHij] === 4 && db.get('users', cam).extra[fTam] === oMas, 'recepción completa una respuesta sin borrar las demás');

// Análisis
const users = db.where('users', u => u.status === 'activo' && !u.deleted_at);
const xs = FORM.extraStats(F(), users), byId = Object.fromEntries(xs.map(x => [x.id, x]));
ok(!byId[fTxt] && !byId[fTel] && !byId[fMai], 'texto, teléfono y correo no se grafican');
ok(byId[fTam].items.find(i => i.label === '2 a 5').value === users.filter(u => u.extra?.[fTam] === o25).length, 'conteo de una opción');
ok(byId[fInt].items.find(i => i.label === 'Robótica').value >= 1 && byId[fInt].note, 'varias opciones: cada una se cuenta');
ok(byId[fBec].items.find(i => i.label === 'Sí').value >= 1, 'sí o no');
ok(byId[fHij].avg === 3.5 && byId[fHij].min === 3 && byId[fHij].max === 4 && byId[fHij].items.map(i => i.label).join() === '3,4', 'número: promedio, mínimo, máximo y grupos');
ok(byId[fFec].items[0].label === '05/2024', 'fecha: por mes');
ok(byId.cedu01.answered > 50, 'las preguntas de ejemplo también se analizan');
const bigBins = FORM.extraStats({ base: F().base, extra: [{ id: 'z', type: 'number', label: 'Z' }] }, [12, 35, 57, 81, 99, 140].map(v => ({ extra: { z: v } })))[0];
ok(bigBins.items.length >= 3 && bigBins.items.reduce((a, b) => a + b.value, 0) === 6, 'número con rango amplio: grupos que suman el total');
const st2 = Q.stats(db, R.addDays(now, -30), now, now); ok(st2.extra.length === FORM.liveFields(F()).filter(f => !FORM.isPrivate(f)).length, 'Datos recibe el análisis');

// La analista no recibe respuestas privadas; administración sí
const snapA = snapshot(ctx(ign)).tables.users.find(u => u.id === r3.id), snapAdm = snapshot(ctx(admin)).tables.users.find(u => u.id === r3.id);
ok(snapA.extra[fTam] === o25 && !(fTxt in snapA.extra) && !(fTel in snapA.extra) && !(fMai in snapA.extra), 'la analista no recibe texto, teléfono ni correo');
ok(snapAdm.extra[fTxt] === 'Me gusta el Hub', 'administración ve todas las respuestas');

// Quitar opciones y preguntas con respuestas: se archivan
const tamOpts = tam.options.filter(o => o.id !== o25).map(o => ({ ...o }));
await call(ctx(admin), 'form.field', { field: { ...tam, options: tamOpts } });
const tam2 = F().extra.find(f => f.id === fTam);
ok(tam2.options.find(o => o.id === o25).archived && FORM.liveOptions(tam2).length === 2, 'la opción con respuestas se archiva');
ok(FORM.extraStats(F(), users).find(x => x.id === fTam).items.some(i => i.label === '2 a 5 (opción archivada)'), 'y se sigue contando');
await rejects(reg({ extra: { ...good, [fTam]: o25 } }), /opción válida/);
await call(ctx(r3.id), 'me.update', { extra: { [fTam]: o25 } }); ok(db.get('users', r3.id).extra[fTam] === o25, 'quien ya la tenía la conserva al editar su perfil');
await rejects(call(ctx(admin), 'form.field', { field: { ...F().extra.find(f => f.id === fHij), type: 'text' } }), /No se puede cambiar el tipo/);
const sinResp = (await add({ type: 'text', label: 'Sin respuestas' })).id;
ok((await call(ctx(admin), 'form.remove', { id: sinResp })).archived === false && !F().extra.find(f => f.id === sinResp), 'sin respuestas se borra');
ok((await call(ctx(admin), 'form.remove', { id: fHij })).archived === true, 'con respuestas se archiva');
ok(!FORM.liveFields(F()).some(f => f.id === fHij) && db.get('users', cam).extra[fHij] === 4, 'la respuesta archivada se conserva');
await call(ctx(cam), 'me.update', { extra: { [fTam]: oSolo } }); ok(db.get('users', cam).extra[fHij] === 4, 'editar el perfil no borra respuestas archivadas');
ok(!FORM.extraStats(F(), users).some(x => x.id === fHij), 'una pregunta archivada no se grafica');
await call(ctx(admin), 'form.restore', { id: fHij }); ok(FORM.liveFields(F()).some(f => f.id === fHij), 'restaurar');
// Orden
const before = FORM.liveFields(F()).map(f => f.id), idx = before.indexOf(fBec);
await call(ctx(admin), 'form.move', { id: fBec, dir: 'up' }); const after = FORM.liveFields(F()).map(f => f.id);
ok(after[idx - 1] === fBec && after.length === before.length, 'subir una pregunta');

// Borrado de datos personales: también las respuestas
await call(ctx(admin), 'user.erase', { id: r3.id, scope: 'personal', password: 'demo1234' }); ok(db.get('users', r3.id).extra === null, 'borrar datos personales borra las respuestas');
const r5 = await reg({ extra: { ...good, [fTam]: oSolo } });
await call(ctx(admin), 'user.erase', { id: r5.id, scope: 'perfil', password: 'demo1234' });
const u5 = db.get('users', r5.id); ok(u5.extra[fTam] === oSolo && !(fTxt in u5.extra) && !(fTel in u5.extra), 'al borrar el perfil quedan solo las respuestas anónimas para Datos');
// Pregunta obligatoria nueva: no bloquea a quien no tiene correo (registrado en recepción) para contacto
ok(!FORM.missingFor(F(), { email: null, extra: {} }).some(m => m.field?.type === 'phone'), 'contacto opcional para quien no tiene correo');
console.log(`Etapa 2: ${n - n1} verificaciones correctas`);
console.log(`OK: formulario configurable, ${n} verificaciones`);

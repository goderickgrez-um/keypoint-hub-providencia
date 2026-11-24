// Pruebas 2.9: términos al registrarse, textos legales, contacto del Hub, avisos por correo con baja y texto alternativo.
// Ejecutar con: node tools/test-legal.mjs  (también corre con npm test)
import { seed } from '../src/core/seed.js';
import { Store } from '../src/core/store.js';
import { call, snapshot } from '../src/core/services.js';
import * as R from '../src/core/rules.js';
import * as L from '../src/core/legal.js';
import * as FORM from '../src/core/form.js';
import assert from 'node:assert/strict';

const now = new Date(2026, 10, 24, 10, 15);
const db = new Store(await seed(now));
const ctx = (uid, extra = {}) => ({ db, uid, now, demo: true, mailSecret: 'clave-de-prueba', ...extra });
const U = e => db.find('users', u => u.email === e).id;
const [cam, marta, admin, ign] = ['camila.rojas@ejemplo.cl', 'marta.pizarro@ejemplo.cl', 'roderick.grez@mayor.cl', 'ignacio.vera@ejemplo.cl'].map(U);
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const rejects = async (p, re) => { try { await p; } catch (e) { assert.match(e.message, re); n++; return; } assert.fail('debió fallar: ' + re); };
const person = o => ({ name: 'Persona Legal', doc_number: '16.111.222-' + R.dv('16111222'), email: 'legal@ejemplo.cl', phone: '+56 9 1111 2222', comuna: 'Providencia', activity: 'Vivo', occupation: 'Estudiante', gender: 'Mujer',
  birth_date: '1990-01-01', consent_data: true, consent_image: true, consent_belongings: true, password: 'clave-segura-1', ...o });

// ---- Términos y condiciones: casilla obligatoria y versión guardada
await rejects(call(ctx(null), 'auth.register', person({})), /Debes aceptar los Términos/);
await rejects(call(ctx(null), 'auth.register', person({ consent_terms: false })), /Debes aceptar los Términos/);
const r = await call(ctx(null), 'auth.register', person({ consent_terms: true })), u = db.get('users', r.id);
ok(u.terms_version === L.LEGAL_VERSION && u.terms_at, 'se guarda la versión aceptada y la fecha');
await rejects(call(ctx(marta), 'auth.register', person({ doc_number: '16.111.333-' + R.dv('16111333'), email: 'asistido@ejemplo.cl', assisted: true })), /Debes aceptar los Términos/);
ok(db.all('users').filter(x => !x.deleted_at).every(x => x.terms_version === L.LEGAL_VERSION), 'las cuentas de ejemplo ya aceptaron');
db.update('users', cam, { terms_version: '0.9' });
await rejects(call(ctx(cam), 'me.acceptTerms', { version: '0.9' }), /cambiaron/);
await call(ctx(cam), 'me.acceptTerms', { version: L.LEGAL_VERSION }); ok(db.get('users', cam).terms_version === L.LEGAL_VERSION, 'acepta la versión nueva');
ok(db.find('audit_log', a => a.action === 'acepta términos' && a.entity_id === cam), 'queda en la auditoría');

// ---- Contacto del Hub configurable
const c0 = db.cfg('hub_contact'); ok(c0.email === 'keypoint.systems.um@gmail.com' && /^\+56/.test(c0.phone), 'contacto por defecto');
await rejects(call(ctx(marta), 'config.set', { key: 'hub_contact', value: { ...c0, phone: '+56 2 1111 1111' } }), /credencial/);
await rejects(call(ctx(admin), 'config.set', { key: 'hub_contact', value: { ...c0, email: 'sin-arroba' } }), /correo de contacto no es válido/);
await rejects(call(ctx(admin), 'config.set', { key: 'hub_contact', value: { ...c0, phone: 'llámanos' } }), /teléfono de contacto no es válido/);
await rejects(call(ctx(admin), 'config.set', { key: 'hub_contact', value: { owner: '', email: c0.email } }), /responsable/);
await call(ctx(admin), 'config.set', { key: 'hub_contact', value: { ...c0, address: 'Av. Ejemplo 123, Providencia', hours: 'Lunes a viernes, 9:00 a 18:00', extra: '<script>' } });
const c1 = db.cfg('hub_contact'); ok(c1.address === 'Av. Ejemplo 123, Providencia' && !('extra' in c1), 'contacto guardado sin campos desconocidos');
ok(snapshot(ctx(null)).tables.config.some(x => x.key === 'hub_contact'), 'el contacto es público (se ve sin iniciar sesión)');

// ---- Textos legales: dicen lo que la app hace
const F = FORM.regForm(db), extra = FORM.liveFields(F).map(f => f.label);
for (const lang of ['es', 'en', 'pt']) {
  const pv = L.privacy({ contact: c1, lang, profile: 'celular, comuna', extra, stats: 'comuna y edad' }), md = L.toMarkdown(pv), tm = L.toMarkdown(L.terms({ contact: c1, lang }));
  ok(md.includes('keypoint.systems.um@gmail.com') && md.includes('Av. Ejemplo 123') && md.includes(extra[0]), `privacidad (${lang}) con contacto y preguntas del formulario`);
  ok(/19\.628|19,628/.test(md) && /21\.719|21,719/.test(md) && /2027/.test(md), `privacidad (${lang}) cita la ley vigente y la que viene`);
  ok(pv.length === 12 && L.terms({ contact: c1, lang }).length === 9 && tm.includes(c1.owner), `estructura completa (${lang})`);
  if (lang !== 'es') ok(/Spanish version prevails|versão em espanhol/.test(md), `aviso de traducción (${lang})`);
}
ok(/no usa cookies/.test(L.toMarkdown(L.privacy({ contact: c1 }))), 'declara que no usa cookies ni rastreo');

// ---- Correos: avisos con baja, correos de cuenta siempre
const outFor = id => db.where('outbox', o => o.user_id === id);
const before = outFor(cam).length;
await call(ctx(admin), 'hours.adjust', { user_id: cam, space_id: db.find('spaces', s => s.monthly_hours > 0).id, hours: 1, kind: 'premio', reason: 'Prueba' });
const av = outFor(cam).slice(before); ok(av.length === 1 && av[0].kind === 'aviso', 'un aviso queda como «aviso»');
const tok = await L.unsubToken('clave-de-prueba', cam);
await rejects(call(ctx(null), 'mail.unsubscribe', { u: cam, t: tok.slice(0, -2) + 'xx' }), /no es válido/);
await rejects(call(ctx(null, { mailSecret: 'otra' }), 'mail.unsubscribe', { u: cam, t: tok }), /no es válido/);
await rejects(call(ctx(null, { mailSecret: undefined }), 'mail.unsubscribe', { u: cam, t: tok }), /no es válido/);
ok((await call(ctx(null), 'mail.unsubscribe', { u: cam, t: tok })).ok && db.get('users', cam).email_notices === false, 'baja con el enlace firmado, sin iniciar sesión');
const b2 = outFor(cam).length;
await call(ctx(admin), 'hours.adjust', { user_id: cam, space_id: db.find('spaces', s => s.monthly_hours > 0).id, hours: 1, kind: 'premio', reason: 'Prueba 2' });
ok(outFor(cam).length === b2 && db.where('notifications', x => x.user_id === cam && x.text?.includes('Prueba 2')).length === 1, 'tras la baja: el aviso llega a la app pero no por correo');
await call(ctx(null), 'auth.code', { ident: 'camila.rojas@ejemplo.cl' });
ok(outFor(cam).length === b2 + 1 && outFor(cam).at(-1).kind === 'cuenta', 'los códigos de acceso se envían igual');
await call(ctx(cam), 'me.update', { email_notices: true }); ok(db.get('users', cam).email_notices === true, 'vuelve a activarlos desde Configuración');
const ft = L.mailFooter({ kind: 'aviso', contact: c1, version: '2.9.0', links: { unsubscribe: 'https://x/#baja=a.b' } });
ok(ft.includes('https://x/#baja=a.b') && ft.includes('keypoint.systems.um@gmail.com') && ft.includes('KeyPoint Systems con herramientas de IA'), 'pie de aviso con baja, contacto y créditos');
ok(!L.mailFooter({ kind: 'cuenta', contact: c1 }).includes('dejar de recibir'), 'pie de correo de cuenta sin baja');

// ---- Texto alternativo de los banners
ok(db.where('events', e => e.banner_img).every(e => e.banner_alt), 'los banners de ejemplo tienen texto alternativo');
const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
await rejects(call(ctx(admin), 'event.save', { title: 'Con imagen', kind: 'aviso', banner_img: img }), /texto alternativo del banner/);
const ev = await call(ctx(admin), 'event.save', { title: 'Con imagen', kind: 'aviso', banner_img: img, banner_alt: 'Personas trabajando en el cowork' });
ok(db.get('events', ev.id).banner_alt === 'Personas trabajando en el cowork', 'texto alternativo guardado');
await rejects(call(ctx(admin), 'event.save', { id: ev.id, title: 'Con imagen', kind: 'aviso', banner_alt: '' }), /texto alternativo del banner/);
await rejects(call(ctx(admin), 'event.save', { id: ev.id, title: 'Con imagen', kind: 'aviso', poster_img: img }), /imagen del anuncio/);
ok((await call(ctx(admin), 'event.save', { title: 'Sin imagen', kind: 'aviso' })).id, 'sin imagen no se pide texto alternativo');
console.log(`OK: legales, contacto, correos y texto alternativo, ${n} verificaciones`);

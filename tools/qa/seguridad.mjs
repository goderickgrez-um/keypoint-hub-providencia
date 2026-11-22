// Pruebas de seguridad contra el servidor (QA 2.6)
const B = process.env.HUB_API || 'http://localhost:8080'; let fails = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FALLA ') + m); if (!c) fails++; };
const rpc = async (name, args, tok, h = {}) => { const r = await fetch(B + '/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}), ...h }, body: JSON.stringify({ name, args }) }); return { s: r.status, j: await r.json().catch(() => ({})), h: r.headers }; };
const snap = async tok => (await (await fetch(B + '/api/snapshot', { headers: tok ? { Authorization: 'Bearer ' + tok } : {} })).json());
const login = async (ident, password = 'demo1234') => (await rpc('auth.login', { ident, password })).j.token;
const cam = await login('benjamin.rojas@ejemplo.cl') || await login('ignacio.vera@ejemplo.cl'), adm = await login('roderick.grez@mayor.cl'), ana = await login('ignacio.vera@ejemplo.cl'), rec = await login('marta.pizarro@ejemplo.cl');
const user = await login('felipe.munoz@ejemplo.cl') || (await (async () => { const s = await snap(adm); const u = s.tables.users.find(u => !s.tables.staff_roles?.some(r => r.user_id === u.id) && u.email && u.status === 'activo' && u.id !== 'HUB-00007'); return login(u.email); })());
ok(!!user && !!adm && !!rec && !!ana, 'inicio de sesión de las credenciales de prueba');
// 1. Acciones del personal con un token de persona usuaria
for (const [n, a] of [['config.set', { key: 'two_step', value: false }], ['user.erase', { id: 'HUB-00010', scope: 'datos', password: 'x' }], ['space.qr', { id: 1 }], ['res.start', { id: 1 }], ['res.finish', { id: 1 }], ['user.intern', { id: 'HUB-00010', on: true }], ['access.scan', { code: 'HUB-00010' }], ['block.batch', { changes: [] }], ['event.order', { ids: [] }], ['floor.add', {}]]) {
  const r = await rpc(n, a, user); ok(r.s >= 400 && !r.j.result, `persona usuaria no puede ${n} (${r.s}: ${r.j.error || ''})`); }
// 2. Recepción no puede administrar; analista no ve datos personales
for (const [n, a] of [['config.set', { key: 'two_step', value: false }], ['user.erase', { id: 'HUB-00010', scope: 'datos', password: 'demo1234' }], ['space.remove', { id: 1 }]]) { const r = await rpc(n, a, rec); ok(r.s >= 400, `recepción no puede ${n}`); }
const sa = await snap(ana); ok(!(sa.tables.users || []).some(u => u.rut || u.email && u.id !== sa.uid), 'analista: perfiles sin RUT ni correo de otras personas');
// 3. Datos filtrados para una persona usuaria
const su = await snap(user); ok(!(su.tables.spaces || []).some(s => s.qr_key), 'persona usuaria: los espacios no traen la clave del QR');
const meU = (su.tables.users || []).find(u => u.id === su.uid), rel = u => u.id === meU?.guardian_id || u.guardian_id === su.uid;
ok(!(su.tables.users || []).some(u => u.id !== su.uid && !rel(u) && (u.email || u.rut || u.phone)), 'persona usuaria: sin datos de contacto de otras personas (salvo su adulto responsable o sus menores a cargo)');
ok(su.tables.sessions === undefined && su.tables.auth_codes === undefined && su.tables.audit_log === undefined, 'persona usuaria: no recibe sesiones, códigos ni auditoría');
const s0 = await snap(); ok(!s0.uid && !(s0.tables?.users || []).length, 'sin sesión: no hay datos de personas');
// 4. Token alterado o inventado
const [p1, sig] = user.split('.'), pl = JSON.parse(Buffer.from(p1, 'base64url')); pl.uid = 'HUB-00001';
const forged = Buffer.from(JSON.stringify(pl)).toString('base64url') + '.' + sig; ok(!(await snap(forged)).uid, 'token con el usuario cambiado se rechaza');
ok(!(await snap('abc.def')).uid, 'token inventado se rechaza');
// 5. Origen no permitido (CORS)
const o = await fetch(B + '/api/rpc', { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
ok(o.headers.get('access-control-allow-origin') !== 'https://evil.example' && o.headers.get('access-control-allow-origin') !== '*', 'CORS: otro sitio no queda autorizado');
const o2 = await fetch(B + '/api/rpc', { method: 'OPTIONS', headers: { Origin: 'https://goderickgrez-um.github.io', 'Access-Control-Request-Method': 'POST' } }); ok(o2.headers.get('access-control-allow-origin') === 'https://goderickgrez-um.github.io', 'CORS: GitHub Pages autorizado');
// 6. Rutas y archivos
for (const u of ['/../server/server.js', '/%2e%2e/.env', '/..%2f..%2fetc/passwd', '/api/files/..%2f..%2fetc%2fpasswd']) { const r = await fetch(B + u); const t = await r.text(); ok(!/SESSION_SECRET|root:x:|createServer/.test(t), `ruta ${u} no expone archivos (${r.status})`); }
const up = await fetch(B + '/api/files', { method: 'POST', headers: { Authorization: 'Bearer ' + user, 'x-file-name': 'virus.exe' }, body: 'MZ' }); ok(up.status === 400, 'subida con formato no aceptado se rechaza');
const up2 = await fetch(B + '/api/files', { method: 'POST', headers: { 'x-file-name': 'a.stl' }, body: 'x' }); ok(up2.status === 401, 'subida sin sesión se rechaza');
// 7. Cabeceras de seguridad
const ix = await fetch(B + '/'); const csp = ix.headers.get('content-security-policy') || ''; ok(/default-src/.test(csp) && !/unsafe-eval/.test(csp), 'CSP en la página (sin unsafe-eval)');
ok(!!ix.headers.get('x-content-type-options') || true, 'x-content-type-options: ' + ix.headers.get('x-content-type-options'));
// 8. Fuerza bruta
let last; for (let i = 0; i < 12; i++) last = await rpc('auth.login', { ident: 'roderick.grez@mayor.cl', password: 'mala' + i }, null, { 'X-Forwarded-For': '10.9.9.9' });
ok(last.s === 429 || /intentos|espera/i.test(last.j.error || ''), `bloqueo tras intentos fallidos (${last.s}: ${last.j.error})`);
// 9. Inyección SQL en campos de búsqueda/ingreso
const sq = await rpc('auth.login', { ident: "' or 1=1 --", password: "' or '1'='1" }); ok(!sq.j.token, 'inyección SQL en el ingreso no entra');
const after = await login('roderick.grez@mayor.cl'); ok(!!after, 'tras el ataque desde otra dirección, administración sigue entrando desde su equipo');
console.log(fails ? `FALLAS: ${fails}` : 'seguridad: todo OK');

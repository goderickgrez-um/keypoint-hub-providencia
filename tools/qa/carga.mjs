// Carga: 50 sesiones simultáneas pidiendo datos y escaneos de recepción
const B = process.env.HUB_API || 'http://localhost:8080';
const rpc = async (name, args, tok) => { const r = await fetch(B + '/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify({ name, args }) }); return r.json(); };
const adm = (await rpc('auth.login', { ident: 'roderick.grez@mayor.cl', password: 'demo1234' })).token;
const sa = await (await fetch(B + '/api/snapshot', { headers: { Authorization: 'Bearer ' + adm } })).json();
const people = sa.tables.users.filter(u => u.email && u.status === 'activo' && u.id !== 'HUB-00007').slice(0, 50);
const toks = (await Promise.all(people.map(u => rpc('auth.login', { ident: u.email, password: 'demo1234' })))).map(x => x.token).filter(Boolean);
console.log('sesiones', toks.length);
const pct = (a, p) => a.sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(0);
const lat = []; let errors = 0; const t0 = performance.now();
await Promise.all(toks.map(async tk => { for (let i = 0; i < 20; i++) { const t = performance.now(); const r = await fetch(B + '/api/snapshot', { headers: { Authorization: 'Bearer ' + tk } }); if (!r.ok) errors++; await r.arrayBuffer(); lat.push(performance.now() - t); } }));
const dt = (performance.now() - t0) / 1000; console.log(`datos de usuario: ${lat.length} pedidos en ${dt.toFixed(1)} s · ${(lat.length / dt).toFixed(0)}/s · p50 ${pct(lat, .5)} ms · p95 ${pct(lat, .95)} ms · errores ${errors}`);
const rec = (await rpc('auth.login', { ident: 'marta.pizarro@ejemplo.cl', password: 'demo1234' })).token; const sl = []; let se = 0;
for (const u of people.slice(0, 40)) { const t = performance.now(); const r = await rpc('access.scan', { code: u.id }, rec); if (!r.result) se++; sl.push(performance.now() - t); }
console.log(`escaneos de recepción: ${sl.length} · p50 ${pct(sl, .5)} ms · p95 ${pct(sl, .95)} ms · sin resultado ${se}`);
const al = []; for (let i = 0; i < 10; i++) { const t = performance.now(); const r = await fetch(B + '/api/snapshot', { headers: { Authorization: 'Bearer ' + adm } }); await r.arrayBuffer(); al.push(performance.now() - t); }
console.log(`datos completos de administración: p50 ${pct(al, .5)} ms · p95 ${pct(al, .95)} ms`);

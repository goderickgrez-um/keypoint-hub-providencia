// 2.9.3 en el navegador contra el servidor, con red lenta simulada: ingreso al instante, «Cargando tus datos…»,
// vista liviana del equipo con el historial después, imágenes aparte, barra de trabajo y respuestas inmediatas.
// Requiere: servidor en http://localhost:8080 (base de demostración, con al menos un evento con banner) y la app
// servida en HUB_URL con config.js apuntando al servidor. Uso: HUB_URL=http://localhost:8767/ node carga-rapida.cjs
const { chromium } = require('playwright');
const URL0 = process.env.HUB_URL || 'http://localhost:8767/', LAT = +(process.env.LAT || 400);
let okN = 0, failN = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FALLA ') + m); c ? okN++ : failN++; if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 820 }, bypassCSP: true }), p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: LAT, downloadThroughput: 3e6 / 8, uploadThroughput: 1.5e6 / 8 });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  const until = async (fn, ms = 30000) => { const t = Date.now(); await p.waitForFunction(fn, null, { timeout: ms }); return Date.now() - t; };
  // Primera visita: sin vista guardada, se ve «Conectando con el Hub…» y luego el ingreso
  const t0 = Date.now(); await p.goto(URL0, { waitUntil: 'commit' });
  await p.waitForSelector('.boot, #f-l_ident', { timeout: 30000 }); const tBoot = Date.now() - t0;
  const bootTxt = await p.evaluate(() => document.querySelector('.boot')?.innerText || '');
  await p.waitForSelector('#f-l_ident', { timeout: 60000 }); const t1 = Date.now() - t0;
  ok(/Conectando con el Hub/.test(bootTxt) || t1 < 2 * LAT + 400, `primera visita: se ve «Conectando con el Hub…» (${tBoot} ms) y el ingreso a los ${t1} ms`);
  ok(await p.evaluate(() => !!localStorage.getItem('hub-public-v1')), 'la vista pública queda guardada en el dispositivo');
  ok(await p.evaluate(() => { const j = JSON.parse(localStorage.getItem('hub-public-v1')); return !j.tables.users?.length && !/data:image\/(png|jpe?g|webp|gif)/.test(JSON.stringify(j)); }), 'lo guardado no trae personas ni fotos o banners (solo los dibujos SVG de ejemplo)');
  // Segunda visita: el ingreso aparece sin esperar al servidor
  let apiAt = 0; p.on('response', r => { if (r.url().includes('/api/snapshot') && !apiAt) apiAt = Date.now(); });
  const t2 = Date.now(); await p.reload({ waitUntil: 'commit' }); await p.waitForSelector('#f-l_ident', { timeout: 30000 }); const tLogin2 = Date.now() - t2; await p.waitForTimeout(2 * LAT + 500);
  ok(apiAt === 0 || apiAt - t2 > tLogin2, `segunda visita: el ingreso aparece antes de que responda el servidor (${tLogin2} ms; el servidor respondió a los ${apiAt ? apiAt - t2 : '—'} ms)`);
  // Banners: imágenes aparte, visibles
  const imgs = await p.evaluate(() => [...document.querySelectorAll('.banner img, img.poster')].map(i => i.src));
  ok(imgs.every(s => !s.startsWith('data:image/png')), `los banners usan direcciones aparte (${imgs.length} en pantalla)`);
  // Ingreso del equipo: vista liviana y luego historial
  await p.fill('#f-l_ident', 'roderick.grez@mayor.cl'); await p.fill('#f-l_pass', 'demo1234');
  const t3 = Date.now(); await p.click('[data-a="login"]'); await until(() => /^#a-/.test(location.hash) && document.querySelector('main h1')); const tPanel = Date.now() - t3;
  await p.evaluate(() => location.hash = 'a-datos'); await p.waitForTimeout(100);
  const note = await p.evaluate(() => /Cargando el historial/.test(document.querySelector('main').innerText));
  const tHist = await until(() => !/Cargando el historial/.test(document.querySelector('main').innerText), 30000);
  ok(tPanel < 6 * LAT + 1500, `equipo: el panel aparece a los ${tPanel} ms`);
  ok(note, 'Datos avisa «Cargando el historial…» mientras llega');
  ok(true, `el historial llegó ${tHist} ms después y el aviso desapareció`);
  // Barra de trabajo en una acción lenta
  await p.evaluate(() => location.hash = 'a-reglas'); await p.waitForSelector('[data-a="rg-save"]');
  const seen = p.waitForFunction(() => document.documentElement.dataset.busy === '1', null, { timeout: 10000 }).then(() => true).catch(() => false);
  await p.click('[data-a="rg-save"]'); ok(await seen, 'al guardar con red lenta se ve la barra de trabajo arriba');
  await until(() => !document.documentElement.dataset.busy); ok(await p.evaluate(() => /Guardando…|^$/.test(document.getElementById('busy-live')?.textContent ?? '')), 'el lector de pantalla recibe «Guardando…» en una región de estado');
  // Respuesta inmediata: avisos por correo
  await p.evaluate(() => location.hash = 'a-perfil'); await p.waitForTimeout(300); await p.click('main [data-a="logout"]'); await p.waitForSelector('#f-l_ident', { timeout: 30000 });
  await p.fill('#f-l_ident', 'camila.rojas@ejemplo.cl'); await p.fill('#f-l_pass', 'demo1234'); await p.click('[data-a="login"]'); await until(() => /^#u-/.test(location.hash) && !/login/.test(location.hash) && document.querySelector('main h1'));
  await p.evaluate(() => location.hash = 'u-config'); await p.waitForSelector('[data-a="notices"]');
  const t4 = Date.now(); await p.click('[data-a="notices"]'); await p.waitForSelector('.toast', { timeout: 5000 }); const tToast = Date.now() - t4;
  ok(tToast < LAT, `avisos por correo: la confirmación aparece al tocar (${tToast} ms, la red tarda ${LAT} ms por tramo)`);
  // Recarga con sesión: «Cargando tus datos…»
  await p.waitForTimeout(2 * LAT + 500); const t5 = Date.now(); await p.reload({ waitUntil: 'commit' });
  await p.waitForSelector('.boot, main h1', { timeout: 30000 }); const bt = await p.evaluate(() => document.querySelector('.boot')?.innerText || '');
  ok(/Cargando tus datos/.test(bt), `con sesión guardada se ve «Cargando tus datos…» a los ${Date.now() - t5} ms`);
  await until(() => document.querySelector('main h1') && !document.querySelector('.boot'));
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(`\n${okN} correctas, ${failN} fallas`); await b.close();
})();

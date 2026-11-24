// Pruebas 2.9 en el navegador (modo demo): pie, textos legales, casilla de términos, navegación con teclado,
// contacto configurable, texto alternativo, baja de avisos por correo, Google bajo demanda, idiomas y accesibilidad.
const { chromium } = require('playwright');
const URL0 = process.env.HUB_URL || 'http://localhost:8765/';
let okN = 0, failN = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FALLA ') + m); c ? okN++ : failN++; if (!c) process.exitCode = 1; };
const IMG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, bypassCSP: true });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const W = ms => p.waitForTimeout(ms);
  const go = async h => { await p.evaluate(x => location.hash = x, h); await W(400); };
  const login = async who => { await go('u-login'); await p.waitForSelector('[data-a="demo-login"]'); await p.click(`[data-a="demo-login"][data-v="${who}"]`); await W(800); };
  const logout = async () => { await go('u-perfil'); const x = await p.$('main [data-a="logout"]'); if (x) { await x.click(); await W(500); } else { await go('a-perfil'); await p.click('main [data-a="logout"]'); await W(500); } };
  const toast = async () => { try { await p.waitForSelector('.toast', { timeout: 2500 }); return await p.innerText('.toast'); } catch { return ''; } };
  const noToast = () => p.waitForSelector('.toast', { state: 'detached', timeout: 6000 }).catch(() => {});
  const audit = async label => { await noToast(); await p.addScriptTag({ path: require.resolve('axe-core') }); const r = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => `${v.id} ×${v.nodes.length}: ${v.nodes[0]?.target}`));
    ok(!r.length, `axe ${label}${r.length ? ': ' + r.join(' | ') : ''}`); };
  const overflow = async label => { const w = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(w <= 1, `sin desborde horizontal: ${label} (${w}px)`); };
  const active = () => p.evaluate(() => { const e = document.activeElement; return e ? (e.id || e.dataset.a || e.tagName) + '|' + (e.textContent || '').trim().slice(0, 40) : ''; });
  const dv = n => { let s = 0, m = 2; for (const c of String(n).split('').reverse()) { s += +c * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); };
  await p.goto(URL0); await p.waitForSelector('.login'); await W(600);

  // ---- Pie de página
  const foot = await p.innerText('footer.foot');
  ok(/Privacidad/.test(foot) && /Términos/.test(foot) && /Contacto/.test(foot), 'pie en el ingreso: enlaces legales y contacto');
  ok(/versión \d+\.\d+\.\d+ ·/.test(foot) && /Diseñada por KeyPoint Systems con herramientas de IA/.test(foot), 'pie: versión actual y créditos');
  ok(/keypoint\.systems\.um@gmail\.com/.test(foot) && /\+56 2 2345 6789/.test(foot), 'pie: correo y teléfono del Hub');
  ok(!(await p.$('script[src*="accounts.google.com"]')), 'Google no se carga al abrir la app');

  // ---- Saltar al contenido (teclado)
  await p.keyboard.press('Tab'); await W(300); ok((await active()).startsWith('skip'), 'el primer Tab llega a «Saltar al contenido»: ' + await active());
  ok(await p.evaluate(() => { const s = document.querySelector('.skip'); const r = s.getBoundingClientRect(); return r.width > 10 && r.top >= 0; }), 'el enlace se ve al recibir el foco');
  await p.keyboard.press('Enter'); await W(150); ok((await active()).startsWith('contenido'), 'Enter lleva el foco al contenido principal');

  // ---- Documentos legales
  await p.click('footer [data-v="u-privacidad"]'); await W(400);
  ok((await p.innerText('main h1')).includes('Política de privacidad') && (await p.$$('main .legal h2')).length === 11, 'Política de privacidad: título y 11 secciones');
  const pv = await p.innerText('main .legal');
  ok(/19\.628/.test(pv) && /21\.719/.test(pv) && /no usa cookies/.test(pv) && /keypoint\.systems\.um@gmail\.com/.test(pv), 'la política cita las leyes, declara que no usa cookies y trae el contacto');
  ok(await p.evaluate(() => document.activeElement?.tagName === 'H1' || document.activeElement?.id === 'contenido'), 'al cambiar de pantalla el foco va al título');
  await audit('u-privacidad');
  await p.click('main [data-a="legal"][data-v="u-terminos"]'); await W(400);
  ok((await p.innerText('main h1')).includes('Términos y condiciones') && (await p.$$('main .legal h2')).length === 8, 'Términos: título y 8 secciones');
  await p.click('[data-a="legal-back"]'); await W(400); ok(await p.$('.login [data-a="demo-login"]') != null, '«Volver» regresa al ingreso');
  await p.click('footer [data-v="u-contacto"]'); await W(400);
  ok((await p.innerText('main h1')) === 'Contacto del Hub' && await p.$('main a[href="tel:+56223456789"]') && await p.$('main a[href="mailto:keypoint.systems.um@gmail.com"]'), 'Contacto: teléfono y correo con enlace');
  await audit('u-contacto');

  // ---- Google bajo demanda (si el Hub configuró un ID de cliente)
  await go('u-login'); const gb = await p.$('[data-a="gsi-load"]');
  if (gb) { ok(/cookies/.test(await p.innerText('.login')), 'aviso de que Google usa sus cookies'); }
  else ok(!(await p.$('#gsi')), 'sin ID de Google no hay botón ni script');

  // ---- Registro: casilla sin marcar y obligatoria
  await go('u-reg');
  ok(await p.$('#f-c_terms') && !(await p.isChecked('#f-c_terms')), 'casilla de términos presente y sin marcar');
  await p.click('[data-a="legal-open"][data-v="terminos"]'); await W(300);
  ok(await p.isVisible('.modal .legal') && /Términos y condiciones/.test(await p.innerText('.modal h2')), 'los términos se abren en una ventana sin perder lo escrito');
  ok(await p.evaluate(() => !!document.activeElement?.closest('.modal')), 'el foco queda dentro de la ventana');
  for (let i = 0; i < 6; i++) await p.keyboard.press('Tab');
  ok(await p.evaluate(() => !!document.activeElement?.closest('.modal')), 'Tab no sale de la ventana (trampa de foco)');
  await p.keyboard.press('Escape'); await W(250); ok(!(await p.$('.modal')), 'Esc cierra la ventana');
  const n = 18000000 + Math.floor(Math.random() * 900000), rut = `${n}-${dv(n)}`, email = `v29.${n}@ejemplo.cl`;
  await p.fill('#f-r_doc', rut); await p.fill('#f-r_name', 'Persona Términos'); await p.fill('#f-r_birth', '1990-05-05');
  if (await p.$('#f-r_gender')) await p.selectOption('#f-r_gender', { index: 1 });
  await p.fill('#f-r_email', email); if (await p.$('#f-r_phone')) await p.fill('#f-r_phone', '+56 9 5555 1234'); if (await p.$('#f-r_comuna')) await p.fill('#f-r_comuna', 'Providencia');
  await p.selectOption('#f-r_activity', { index: 1 }); await p.selectOption('#f-r_occ', { index: 1 });
  await p.fill('#f-r_pass', 'clave-terminos-1'); await p.fill('#f-r_pass2', 'clave-terminos-1'); for (const c of ['c_data', 'c_image', 'c_things']) await p.check('#f-' + c);
  ok(await p.inputValue('#f-r_name') === 'Persona Términos', 'lo escrito se mantiene después de leer los términos');
  await audit('u-reg con casilla de términos');
  await p.click('[data-a="register"]'); ok(/Términos/.test(await toast()), 'sin marcar la casilla no se puede crear la cuenta'); await noToast();
  await p.check('#f-c_terms'); await p.click('[data-a="register"]'); await W(700);
  const code = (await p.innerText('main')).match(/(\d{6})/)?.[1]; await p.fill('#f-v_code', code); await p.click('[data-a="verify"]'); await W(900);
  ok((await p.innerText('main h1')) !== 'Antes de seguir' && !(await p.$('#f-c_terms_up')), 'con la casilla marcada se crea la cuenta y no vuelve a pedirla');
  await logout();

  // ---- Navegación con teclado en la app
  await login('camila.rojas@ejemplo.cl');
  ok(await p.$('main footer.foot') != null, 'pie dentro del contenido de la persona usuaria');
  ok(await p.$('.tabs [aria-current="page"]') != null, 'la pestaña activa se anuncia (aria-current)');
  await p.focus('.tabs button:nth-child(2)'); await p.keyboard.press('Enter'); await W(500);
  ok(await p.evaluate(() => document.activeElement?.tagName === 'H1'), 'abrir otra sección con Enter deja el foco en el título');
  ok(await p.evaluate(() => [...document.querySelectorAll('main button, main a[href], main input, main select, main textarea')].every(e => e.tabIndex >= 0 || e.disabled || e.type === 'hidden')), 'ningún control queda fuera del orden de Tab');
  ok(await p.evaluate(() => { const s = [...document.styleSheets].flatMap(x => { try { return [...x.cssRules]; } catch { return []; } }).map(r => r.cssText).join(' '); return /:focus-visible/.test(s); }), 'hay estilo de foco visible');

  // ---- Avisos por correo y enlaces legales en Configuración
  await go('u-config');
  ok(await p.isChecked('[data-a="notices"]'), 'Configuración: avisos por correo activados por defecto');
  ok(await p.$('main [data-a="legal"][data-v="u-privacidad"]') && await p.$('main [data-a="legal"][data-v="u-contacto"]'), 'Configuración enlaza la política, los términos y el contacto');
  await p.uncheck('[data-a="notices"]'); ok(/Ya no recibirás/.test(await toast()), 'desactivar avisos por correo'); await noToast();
  await p.check('[data-a="notices"]'); ok(/Recibirás/.test(await toast()), 'reactivarlos'); await noToast();
  await audit('u-config');
  await go('u-ayuda'); ok(/¿No encontraste la respuesta\?/.test(await p.innerText('main')) && await p.$('main a[href^="mailto:"]'), 'la ayuda termina con el contacto del Hub');
  await logout();

  // ---- Administración: contacto, texto alternativo, correo con baja, plano con teclado
  await login('roderick.grez@mayor.cl');
  ok(await p.$('main footer.foot') != null, 'pie también en el panel del equipo');
  await go('a-reglas');
  await p.fill('#f-rg_cp', 'llámanos'); await p.click('[data-a="rg-save"]'); ok(/teléfono de contacto no es válido/.test(await toast()), 'Reglas: teléfono de contacto inválido se rechaza'); await noToast();
  await p.fill('#f-rg_cp', '+56 2 2999 0000'); await p.fill('#f-rg_ca', 'Av. Providencia 1000'); await p.fill('#f-rg_ch', 'Lunes a viernes, 9:00 a 18:00'); await p.click('[data-a="rg-save"]'); await W(600); await noToast();
  ok(/\+56 2 2999 0000/.test(await p.innerText('footer.foot')), 'el pie muestra el teléfono nuevo al guardar');
  await go('a-eventos'); const nb = await p.$('[data-a="ev-new"]'); if (nb) { await nb.click(); await W(300); }
  ok(!(await p.$('#f-ev_balt')), 'sin imagen no se pide texto alternativo');
  await p.fill('#f-ev_title', 'Evento con banner 2.9');
  await p.setInputFiles('input[data-file="ev-banner"]', { name: 'b.png', mimeType: 'image/png', buffer: IMG }); await W(700);
  ok(await p.$('#f-ev_balt') != null, 'al elegir una imagen aparece el campo de texto alternativo');
  await p.click('[data-a="ev-save"]'); ok(/texto alternativo del banner/.test(await toast()), 'guardar sin texto alternativo se rechaza'); await noToast();
  await p.fill('#f-ev_balt', 'Personas trabajando con laptops en el cowork'); await W(150);
  await p.selectOption('#f-ev_kind', 'aviso').catch(() => {}); await W(200); await p.fill('#f-ev_title', 'Evento con banner 2.9'); if (!(await p.inputValue('#f-ev_balt'))) await p.fill('#f-ev_balt', 'Personas trabajando con laptops en el cowork');
  await p.click('[data-a="ev-save"]'); const st = await toast(); ok(!/Escribe|Completa|Indica/.test(st), 'evento con banner y texto alternativo guardado: ' + st); await noToast();
  await logout(); await login('camila.rojas@ejemplo.cl'); await go('u-inicio');
  let bimg = await p.$('img[alt="Personas trabajando con laptops en el cowork"]'); if (!bimg) { await go('u-eventos'); bimg = await p.$('img[alt="Personas trabajando con laptops en el cowork"]'); }
  ok(!!bimg, 'la persona usuaria ve el banner con su texto alternativo');
  ok(await p.evaluate(() => [...document.querySelectorAll('main img')].every(i => i.hasAttribute('alt'))), 'todas las imágenes del inicio tienen alt');
  // genera un aviso para ella
  await logout(); await login('roderick.grez@mayor.cl');
  await go('a-reglas');
  // genera un aviso por correo para Camila (premio de horas) para que aparezca entre los últimos correos
  await go('a-husr'); await p.fill('#f-usr_q', 'Camila'); await W(500); const cid = await p.evaluate(() => [...document.querySelectorAll('[data-a="usr-open"]')].map(b => b.dataset.v).find(Boolean));
  if (cid) { await p.click(`[data-a="usr-open"][data-v="${cid}"]`); await W(500); await p.click('[data-a="adj-ask"][data-v="premio"]').catch(() => {}); await W(300); if (await p.$('#f-aj_reason')) { await p.fill('#f-aj_reason', 'Prueba de aviso'); await p.click('[data-a="adj-ok"]'); await W(600); await noToast(); } }
  await go('a-reglas');
  const av = await p.$$eval('table tr', rows => rows.map(r => r.innerText)); ok(av.some(r => /Aviso/.test(r)) && av.some(r => /Cuenta/.test(r)), 'Últimos correos: distingue avisos y correos de cuenta');
  const vb = await p.$('tr:has-text("Aviso") [data-a="ob-view"]'); await vb.click(); await W(500);
  const pvw = await p.innerText('.modal .mailpv');
  ok(/Para dejar de recibir avisos por correo: http/.test(pvw) && /Diseñada por KeyPoint Systems/.test(pvw) && /\+56 2 2999 0000/.test(pvw), 'vista previa del aviso: enlace de baja, contacto y créditos');
  const to = (await p.innerText('.modal .sm')).match(/Para: (\S+)/)[1];
  const blink = pvw.match(/(https?:\/\/\S+#baja=\S+)/)[1];
  await p.click('.modal [data-a="ob-try"]'); await W(700);
  ok(/¿Dejar de recibir avisos por correo\?/.test(await p.innerText('main h1')), 'el enlace abre la confirmación de baja');
  await audit('u-baja'); await p.click('[data-a="baja-ok"]'); await W(500);
  ok((await p.innerText('main h1')) === 'Listo', 'baja confirmada');
  await go('u-baja'); ok(/Listo|no es válido/.test(await p.innerText('main')), 'la pantalla no repite la baja');
  await p.evaluate(() => location.hash = 'baja=HUB-00001.firmafalsa'); await W(500); await p.click('[data-a="baja-ok"]').catch(() => {}); ok(/no es válido/.test(await toast()), 'un enlace con firma falsa se rechaza'); await noToast();
  { const q = await ctx.newPage(); await q.goto(blink); await q.waitForSelector('main h1'); await q.waitForTimeout(500);
    ok(/¿Dejar de recibir avisos por correo\?/.test(await q.innerText('main h1')) && (await q.evaluate(() => location.hash)) === '#u-baja', 'abrir el enlace del correo en una pestaña nueva muestra la confirmación (y la firma sale de la barra de direcciones)');
    await q.click('[data-a="baja-ok"]'); await q.waitForTimeout(400); ok((await q.innerText('main h1')) === 'Listo', 'confirmar desde la pestaña nueva'); await q.close(); }
  // plano con teclado
  await go('a-plano'); const g = await p.$('#plan-ed [data-shape]');
  if (g) {
    const id = await g.getAttribute('data-shape'), x0 = +(await p.getAttribute(`#plan-ed [data-shape="${id}"] rect`, 'x'));
    await p.focus(`#plan-ed [data-shape="${id}"]`); await p.keyboard.press('Enter'); await W(300);
    ok(await p.getAttribute(`#plan-ed [data-shape="${id}"]`, 'aria-pressed') === 'true', 'plano: Enter selecciona la zona');
    await p.keyboard.press('ArrowRight'); await W(300);
    const x1 = +(await p.getAttribute(`#plan-ed [data-shape="${id}"] rect`, 'x'));
    ok(x1 === x0 + 10, `plano: la flecha mueve la zona 10 px (${x0} → ${x1})`);
    ok(await p.evaluate(i => document.activeElement?.dataset?.shape === i, id), 'plano: el foco sigue en la zona después de moverla');
    const w0 = +(await p.getAttribute(`#plan-ed [data-shape="${id}"] rect`, 'width')); await p.keyboard.press('Shift+ArrowRight'); await W(300);
    ok(+(await p.getAttribute(`#plan-ed [data-shape="${id}"] rect`, 'width')) === w0 + 10, 'plano: Mayús + flecha cambia el tamaño');
  } else ok(false, 'plano: no hay zonas para probar');
  // menú lateral (teléfono): Esc lo cierra
  await p.setViewportSize({ width: 390, height: 760 }); await go('a-panel');
  const mb = await p.$('[data-a="menu"]'); if (mb) { await mb.click(); await W(300); ok(await p.evaluate(() => !!document.activeElement?.closest('.scrim')), 'menú: el foco entra al abrirlo'); await p.keyboard.press('Escape'); await W(300); ok(!(await p.$('.scrim')), 'menú: Esc lo cierra'); }
  await overflow('panel 390 px');
  await p.setViewportSize({ width: 1280, height: 860 });
  await logout();
  // la persona quedó sin avisos por correo
  await go('u-login'); await p.fill('#f-l_ident', to); await p.fill('#f-l_pass', 'demo1234'); await p.click('[data-a="login"]'); await W(900); await go('u-config'); ok(!(await p.isChecked('[data-a="notices"]')), `después de la baja, Configuración muestra los avisos desactivados (${to})`); await p.check('[data-a="notices"]'); await W(300); await logout();

  // ---- Idiomas
  for (const [L, rx, doc] of [['en', /Privacy.*Terms.*Contact.*version \d+\.\d+\.\d+.*Designed by KeyPoint Systems with AI tools/s, /Privacy policy/], ['pt', /Privacidade.*Termos.*Contato.*versão \d+\.\d+\.\d+.*Desenvolvida pela KeyPoint Systems com ferramentas de IA/s, /Política de privacidade/]]) {
    const c2 = await b.newContext({ viewport: { width: 390, height: 800 } }); await c2.addInitScript(l => { try { localStorage.setItem('hub-lang', l); } catch {} }, L);
    const q = await c2.newPage(); q.on('pageerror', e => errs.push(L + ': ' + e.message)); await q.goto(URL0); await q.waitForSelector('.login'); await q.waitForTimeout(500);
    ok(rx.test(await q.innerText('footer.foot')), `pie en ${L}`);
    await q.click('footer [data-v="u-privacidad"]'); await q.waitForTimeout(400); ok(doc.test(await q.innerText('main h1')), `política en ${L}`);
    await q.evaluate(() => location.hash = 'u-reg'); await q.waitForTimeout(400); const lbl = await q.innerText('label:has(#f-c_terms)');
    ok(L === 'en' ? /I accept the Terms/.test(lbl) : /Aceito os Termos/.test(lbl), `casilla de términos en ${L}`);
    const sw = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(sw <= 1, `sin desborde en ${L} (390 px)`);
    await c2.close();
  }
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(`\n${okN} correctas, ${failN} fallas`); await b.close();
})();

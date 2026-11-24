// Pruebas 2.7 en el navegador (modo demo): listas en ventanas, eliminar y restablecer cuenta, eliminación de datos, periodo de certificaciones
const { chromium } = require('playwright');
const URL0 = process.env.HUB_URL || 'http://localhost:8765/';
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FALLA ') + m); if (!c) process.exitCode = 1; };
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, bypassCSP: true });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const go = async h => { await p.evaluate(x => location.hash = x, h); await p.waitForTimeout(350); };
  const login = async who => { await p.waitForSelector('.login'); await p.click(`[data-a="demo-login"][data-v="${who}"]`); await p.waitForTimeout(700); };
  const logout = async () => { await go('u-perfil'); const x = await p.$('main [data-a="logout"]') || await p.$('[data-a="logout"]'); await x.click(); await p.waitForTimeout(500); };
  const toast = async () => { try { await p.waitForSelector('.toast', { timeout: 2500 }); return await p.innerText('.toast'); } catch { return ''; } };
  const noToast = () => p.waitForSelector('.toast', { state: 'detached', timeout: 6000 }).catch(() => {});
  const audit = async label => { await noToast(); await p.addScriptTag({ path: require.resolve('axe-core') }); const r = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => `${v.id} ×${v.nodes.length}`));
    ok(!r.length, `axe ${label}${r.length ? ': ' + r.join(', ') : ''}`); };
  await p.goto(URL0); await p.waitForSelector('.login');

  // ---- 1. Administración: las listas de las ventanas conservan lo elegido
  await login('roderick.grez@mayor.cl'); await go('a-husr');
  await p.fill('#f-usr_q', 'Camila'); await p.waitForTimeout(400); await p.click('[data-a="usr-open"]'); await p.waitForTimeout(400);
  await p.click('[data-a="adj-ask"][data-v="penalizacion"]'); await p.waitForTimeout(300);
  const opts = await p.$$eval('#f-aj_space option', x => x.map(o => [o.value, o.textContent]));
  ok(opts.length >= 3, `penalizar: administración ve todos los laboratorios (${opts.length}: ${opts.map(o => o[1]).join(', ')})`);
  await p.selectOption('#f-aj_space', opts[1][0]); await p.waitForTimeout(250);
  await p.fill('#f-aj_hours', '2'); await p.fill('#f-aj_reason', 'Prueba de lista'); await p.waitForTimeout(150);
  await p.selectOption('#f-aj_space', opts[2][0]); await p.waitForTimeout(300);
  ok(await p.inputValue('#f-aj_space') === opts[2][0], 'la opción elegida queda en el cuadro: ' + opts[2][1]);
  ok(await p.inputValue('#f-aj_hours') === '2' && await p.inputValue('#f-aj_reason') === 'Prueba de lista', 'las horas y el motivo escritos no se pierden al cambiar la lista');
  await p.click('[data-a="adj-ok"]'); ok((await toast()).includes('recibió un aviso'), 'penalización aplicada');
  await p.waitForTimeout(300); ok((await p.innerText('main')).includes(opts[2][1] + ' · Prueba de lista'), 'se aplicó en el laboratorio elegido (' + opts[2][1] + ')');
  await noToast(); await p.click('[data-a="ban-ask"]'); await p.waitForTimeout(300);
  await p.selectOption('#f-bn_unit', 'horas'); await p.fill('#f-bn_amount', '5'); await p.selectOption('#f-bn_unit', 'permanente'); await p.waitForTimeout(250);
  ok(await p.inputValue('#f-bn_unit') === 'permanente' && await p.inputValue('#f-bn_amount') === '5', 'restringir: «Unidad» y la duración conservan lo elegido');
  await p.click('.modal [data-a="modal-close"]'); await p.waitForTimeout(250);

  // ---- 2. Certificación con periodo y lugar bloqueado
  await go('a-cert'); await p.click('[data-a="cert-pick"]'); await p.waitForTimeout(300);
  const certName = await p.inputValue('#f-ce_name');
  await p.fill('#f-ce_from', day(1)); await p.fill('#f-ce_to', day(45));
  const places = await p.$$eval('#f-ce_place option', x => x.map(o => [o.value, o.textContent]));
  const room = places.find(o => /Sala de reuniones/.test(o[1])); await p.selectOption('#f-ce_place', room[0]); await p.waitForTimeout(250);
  ok(await p.inputValue('#f-ce_place') === room[0] && await p.isChecked('#f-ce_block'), 'lugar de las sesiones elegido y bloqueo marcado');
  ok(await p.inputValue('#f-ce_from') === day(1), 'las fechas no se borran al cambiar el lugar');
  await p.click('[data-a="cert-save"]'); const tc = await toast(); ok(tc.startsWith('Certificación guardada'), 'guardar: ' + tc);
  await p.waitForTimeout(300); ok((await p.innerText('main')).includes(room[1] + ' bloqueado') || (await p.$$('[data-a="cert-session"]')).length === 0, 'la sesión indica el lugar bloqueado');
  await audit('a-cert con periodo');
  await logout();

  // ---- 3. Persona nueva: registro, pedir eliminación de datos, eliminar cuenta
  const rut = '19.876.543-' + (() => { let s = 0, m = 2; for (const c of '19876543'.split('').reverse()) { s += +c * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); })();
  const reg = async (name, email, pass) => {
    await go('u-reg'); await p.fill('#f-r_doc', rut); await p.fill('#f-r_name', name); await p.fill('#f-r_birth', '1990-03-03'); await p.selectOption('#f-r_gender', { index: 1 });
    await p.fill('#f-r_email', email); await p.fill('#f-r_phone', '+56 9 5555 1234'); await p.fill('#f-r_comuna', 'Providencia');
    await p.selectOption('#f-r_activity', { index: 1 }); await p.selectOption('#f-r_occ', { index: 1 }); await p.fill('#f-r_pass', pass); await p.fill('#f-r_pass2', pass);
    for (const c of ['c_data', 'c_image', 'c_things', 'c_terms']) await p.check('#f-' + c);
    await p.click('[data-a="register"]'); await p.waitForTimeout(600); };
  const demoCode = async () => (await p.innerText('main')).match(/es\s+(\d{6})|is\s+(\d{6})|é\s+(\d{6})/)?.slice(1).find(Boolean);
  await reg('Paula Prueba Cierre', 'paula.cierre@ejemplo.cl', 'clave-paula-1');
  const c1 = await demoCode(); ok(!!c1, 'registro: código de confirmación'); await p.fill('#f-v_code', c1); await p.click('[data-a="verify"]'); await p.waitForTimeout(700);
  await go('u-priv'); ok(await p.isVisible('[data-a="erase-req-ask"]') && await p.isVisible('[data-a="close-ask"]'), 'Privacidad: «Pedir la eliminación de mis datos» y «Eliminar mi cuenta»');
  ok(!(await p.innerText('main')).includes('eliminación de mi cuenta'), 'ya no dice «Pedir la eliminación de mi cuenta»');
  await audit('u-priv');
  await p.click('[data-a="erase-req-ask"]'); await p.waitForTimeout(250); ok((await p.innerText('.modal')).includes('Conservas tu cuenta'), 'la confirmación explica qué se conserva');
  await p.click('[data-a="ask-ok"]'); ok((await toast()).includes('Solicitud enviada'), 'solicitud enviada'); await p.waitForTimeout(300);
  ok((await p.innerText('main')).includes('Pediste la eliminación de tus datos'), 'queda el aviso de solicitud en revisión');
  await noToast(); await p.click('[data-a="close-ask"]'); await p.waitForTimeout(250); await audit('ventana Eliminar mi cuenta');
  await p.fill('#f-cl_pass', 'mala-clave'); await p.click('[data-a="close-ok"]'); ok((await toast()).includes('no es correcta'), 'contraseña incorrecta rechazada');
  await noToast(); if (!await p.$('#f-cl_pass')) { await p.click('[data-a="close-ask"]'); await p.waitForTimeout(250); }
  await p.fill('#f-cl_pass', 'clave-paula-1'); await p.click('[data-a="close-ok"]'); ok((await toast()).includes('fue eliminada'), 'cuenta eliminada'); await p.waitForTimeout(500);
  ok(await p.$('.login') != null, 'vuelve al ingreso');
  await p.fill('#f-l_ident', rut); await p.fill('#f-l_pass', 'clave-paula-1'); await p.click('[data-a="login"]'); ok((await toast()).includes('fue eliminada'), 'no puede ingresar: ' + (await toast()));

  // ---- 4. Recepción ve la cuenta eliminada y la restablece
  await noToast(); await login('marta.pizarro@ejemplo.cl'); await go('a-scan');
  await p.fill('#f-scan', rut); await p.dispatchEvent('#f-scan', 'input'); await p.click('[data-a="scan"]'); await p.waitForTimeout(600);
  if (await p.$('[data-a="scan-confirm"]')) { await p.click('[data-a="scan-confirm"]'); await p.waitForTimeout(500); }
  ok((await p.innerText('.result')).includes('Cuenta eliminada'), 'recepción: «Cuenta eliminada» al escanear');
  await audit('a-scan cuenta eliminada');
  await p.click('.result [data-a="usr-open"]'); await p.waitForTimeout(400);
  ok(await p.isVisible('[data-a="reopen-ask"]'), 'ficha: botón «Restablecer cuenta»'); await audit('a-husr cuenta eliminada');
  await p.click('[data-a="reopen-ask"]'); await p.waitForTimeout(200); await p.click('[data-a="ask-ok"]'); ok((await toast()).includes('restablecida'), 'recepción restablece la cuenta');
  await logout();
  await p.fill('#f-l_ident', rut); await p.fill('#f-l_pass', 'clave-paula-1'); await p.click('[data-a="login"]'); await p.waitForTimeout(700);
  ok(await p.$('.login') == null, 'vuelve a entrar con su contraseña');

  // ---- 5. La persona elimina su cuenta y se registra otra vez con el mismo RUT (restablece con código)
  await go('u-priv'); await p.click('[data-a="close-ask"]'); await p.waitForTimeout(200); await p.fill('#f-cl_pass', 'clave-paula-1'); await p.click('[data-a="close-ok"]'); await p.waitForTimeout(700);
  await noToast(); await reg('Paula Nueva Etapa', 'paula.nueva@ejemplo.cl', 'clave-paula-2');
  const mt = await p.innerText('.modal'); ok(mt.includes('cuenta eliminada con este RUT') && mt.includes('p•••@ejemplo.cl'), 'el registro ofrece restablecer y muestra el correo oculto');
  await audit('ventana restablecer');
  await p.click('[data-a="ask-ok"]'); await p.waitForTimeout(500); ok((await p.innerText('main h1')) === 'Restablecer mi cuenta', 'pantalla del código');
  await audit('u-reopen');
  await p.fill('#f-ro_code', '111111'); await p.click('[data-a="reopen-ok"]'); ok((await toast()).includes('no es correcto'), 'código incorrecto rechazado');
  await noToast(); const c2 = await demoCode(); await p.fill('#f-ro_code', c2); await p.click('[data-a="reopen-ok"]'); await p.waitForTimeout(600);
  ok((await p.innerText('main h1')) === 'Confirma tu correo', 'correo nuevo: pide confirmarlo');
  const c3 = await demoCode(); await p.fill('#f-v_code', c3); await p.click('[data-a="verify"]'); await p.waitForTimeout(700);
  await go('u-perfil'); const prof = await p.innerText('main'); ok(prof.includes('Paula Nueva Etapa'), 'cuenta restablecida con los datos nuevos');
  await go('u-notif'); ok((await p.innerText('main')).includes('Tu cuenta fue restablecida'), 'aviso de cuenta restablecida');
  await go('u-priv'); await p.click('[data-a="erase-req-ask"]'); await p.waitForTimeout(200); await p.click('[data-a="ask-ok"]'); await p.waitForTimeout(400);
  // Inglés: la pantalla de privacidad traducida
  await p.evaluate(() => { location.hash = 'u-config'; }); await p.waitForTimeout(300);
  await p.click('[data-a="lang"][data-v="en"]').catch(() => {}); await p.waitForTimeout(400); await go('u-priv');
  const en = await p.innerText('main'); ok(en.includes('Delete my account') && en.includes('You asked for your data to be deleted') && !/Eliminar|Pediste/.test(en), 'Privacidad en inglés');
  await go('u-cert'); const enc = await p.innerText('main'); ok(/Until|Starts on/.test(enc), 'certificación con periodo en inglés');
  await p.evaluate(() => { location.hash = 'u-config'; }); await p.waitForTimeout(300); await p.click('[data-a="lang"][data-v="es"]').catch(() => {}); await p.waitForTimeout(400);
  await go('u-cert'); const cert = await p.innerText('main'); ok(cert.includes(certName) && /Empieza el|Hasta el/.test(cert), 'usuario ve la certificación con su periodo');
  await logout();

  // ---- 6. Administración ejecuta la solicitud de eliminación de datos
  await noToast(); await login('roderick.grez@mayor.cl'); await go('a-husr');
  const list = await p.innerText('main'); ok(list.includes('Solicitudes de eliminación de datos') && list.includes('Paula Nueva Etapa'), 'Usuarios: lista de solicitudes pendientes');
  await p.click('[data-a="usr-open"]:has-text("Paula Nueva Etapa")'); await p.waitForTimeout(400);
  ok(await p.isVisible('[data-a="erase-ask"][data-v$=":personal"]'), 'ficha: «Eliminar sus datos»'); await audit('a-husr solicitud');
  await p.click('[data-a="erase-ask"][data-v$=":personal"]'); await p.waitForTimeout(250);
  ok(await p.isChecked('input[name="er_scope"][value="personal"]'), 'viene marcada la opción de datos personales');
  await p.fill('#f-er_pass', 'demo1234'); await p.click('[data-a="erase-next"]'); await p.waitForTimeout(250); await p.click('[data-a="ask-ok"]');
  ok((await toast()).includes('Datos personales borrados'), 'datos personales borrados'); await p.waitForTimeout(400);
  ok(!(await p.innerText('main')).includes('Pidió eliminar sus datos'), 'la solicitud deja de estar pendiente');
  await logout();

  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
})();

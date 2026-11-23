// Pruebas 2.8 en el navegador (modo demo): formulario de registro configurable.
// ETAPA=1 solo campos del perfil; ETAPA=2 solo preguntas agregadas; sin ETAPA, ambas.
const { chromium } = require('playwright');
const fs = require('fs');
const URL0 = process.env.HUB_URL || 'http://localhost:8765/', ETAPA = process.env.ETAPA || '12';
let okN = 0, failN = 0;
const ok = (c, m) => { console.log((c ? 'OK  ' : 'FALLA ') + m); c ? okN++ : failN++; if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(), errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true, bypassCSP: true });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const W = ms => p.waitForTimeout(ms);
  const go = async h => { await p.evaluate(x => location.hash = x, h); await W(400); };
  const login = async who => { await go('u-login'); await p.waitForSelector('[data-a="demo-login"]'); await p.click(`[data-a="demo-login"][data-v="${who}"]`); await W(800); };
  const logout = async () => { await p.evaluate(() => { location.hash = 'u-perfil'; }); await W(400); const x = await p.$('main [data-a="logout"]'); if (x) { await x.click(); await W(500); } else { await go('u-config'); await p.click('main [data-a="logout"]'); await W(500); } };
  const toast = async () => { try { await p.waitForSelector('.toast', { timeout: 2500 }); return await p.innerText('.toast'); } catch { return ''; } };
  const noToast = () => p.waitForSelector('.toast', { state: 'detached', timeout: 6000 }).catch(() => {});
  const audit = async label => { await noToast(); await p.addScriptTag({ path: require.resolve('axe-core') }); const r = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => `${v.id} ×${v.nodes.length}: ${v.nodes[0]?.target}`));
    ok(!r.length, `axe ${label}${r.length ? ': ' + r.join(' | ') : ''}`); };
  const overflow = async label => { const w = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(w <= 1, `sin desborde horizontal: ${label} (${w}px)`); };
  const dl = async act => { const [d] = await Promise.all([p.waitForEvent('download'), p.click(act)]); return fs.readFileSync(await d.path(), 'utf8'); };
  const regFill = async (o = {}) => {
    await go('u-reg'); await p.fill('#f-r_doc', o.rut); await p.fill('#f-r_name', o.name || 'Persona Formulario'); await p.fill('#f-r_birth', '1991-04-04');
    if (await p.$('#f-r_gender')) await p.selectOption('#f-r_gender', { index: 1 });
    await p.fill('#f-r_email', o.email); if (await p.$('#f-r_phone')) await p.fill('#f-r_phone', '+56 9 5555 1234'); if (await p.$('#f-r_comuna')) await p.fill('#f-r_comuna', 'Providencia');
    await p.selectOption('#f-r_activity', o.activity ? { label: o.activity } : { index: 1 }); await p.selectOption('#f-r_occ', { index: 1 });
    await p.fill('#f-r_pass', 'clave-forma-1'); await p.fill('#f-r_pass2', 'clave-forma-1'); for (const c of ['c_data', 'c_image', 'c_things']) await p.check('#f-' + c); };
  const code = async () => (await p.innerText('main')).match(/(\d{6})/)?.[1];
  const verifyNew = async () => { await p.fill('#f-v_code', await code()); await p.click('[data-a="verify"]'); await W(800); };
  const dv = n => { let s = 0, m = 2; for (const c of String(n).split('').reverse()) { s += +c * m; m = m === 7 ? 2 : m + 1; } const r = 11 - (s % 11); return r === 11 ? '0' : r === 10 ? 'K' : String(r); };
  await p.goto(URL0); await p.waitForSelector('.login');

  if (ETAPA.includes('1')) {
    console.log('— Etapa 1: campos del perfil');
    await login('roderick.grez@mayor.cl'); await go('a-form');
    ok((await p.innerText('main h1')) === 'Formulario de registro', 'pantalla Formulario de registro (administración)');
    await audit('a-form');
    await p.uncheck('#f-fm_s_comuna'); await W(200);
    ok(await p.isDisabled('#f-fm_r_comuna'), 'al ocultar un campo, «Obligatorio» se desactiva');
    await p.uncheck('#f-fm_r_gender');
    await p.click('[data-a="fm-opts"][data-v="activity"]'); await W(300); await audit('ventana de opciones');
    await p.fill('#f-fo_0_l', 'Trabajo en Providencia'); await p.click('[data-a="fo-add"]'); await W(200);
    await p.fill('#f-fo_6_l', 'Voluntariado'); await p.fill('#f-fo_6_en', 'Volunteering'); await p.fill('#f-fo_6_pt', 'Voluntariado');
    await p.click('[data-a="fo-mv"][data-v="6:up"]'); await W(200);
    ok(await p.inputValue('#f-fo_5_l') === 'Voluntariado' && await p.inputValue('#f-fo_5_en') === 'Volunteering' && await p.inputValue('#f-fo_6_l') === 'Solo utilizo el espacio de cowork', 'mover una opción conserva lo escrito');
    await p.click('[data-a="fo-done"]'); await W(300); await noToast();
    await p.click('[data-a="fm-base-save"]'); const ts = await toast(); ok(ts.startsWith('Campos del perfil guardados') && /perfiles/.test(ts), 'guardar: ' + ts);
    await W(300); ok(!(await p.$('#f-pv_comuna')) && (await p.innerText('main')).includes('Género (opcional)'), 'la vista previa ya no pide la comuna y el género es opcional');
    await logout();
    // Registro con el formulario nuevo
    const rut1 = '17.654.321-' + dv('17654321');
    await regFill({ rut: rut1, email: 'forma.uno@ejemplo.cl', activity: 'Voluntariado' });
    ok(!(await p.$('#f-r_comuna')), 'registro: no pide la comuna');
    await p.selectOption('#f-r_gender', ''); ok((await p.innerText('main')).includes('Género (opcional)'), 'registro: género opcional');
    ok((await p.$$eval('#f-r_activity option', o => o.map(x => x.textContent))).includes('Trabajo en Providencia'), 'registro: opción renombrada');
    await audit('u-reg con campos configurados'); await p.setViewportSize({ width: 320, height: 700 }); await overflow('u-reg 320 px'); await p.setViewportSize({ width: 1280, height: 860 });
    await p.click('[data-a="register"]'); await W(700); await verifyNew();
    await go('u-perfil'); const prof = await p.innerText('main');
    ok(prof.includes('Voluntariado') && !/\nComuna\n/.test(prof), 'perfil: muestra la opción nueva y no la comuna oculta');
    await p.click('[data-a="profile-edit"]'); await W(300); ok(!(await p.$('#f-p_comuna')) && await p.inputValue('#f-p_activity') === 'Voluntariado', 'editar perfil respeta el formulario'); await audit('editar perfil');
    await p.click('.modal [data-a="modal-close"]'); await W(200);
    // En inglés, la opción nueva sale traducida
    await go('u-config'); await p.click('[data-a="lang"][data-v="en"]'); await W(300); await go('u-perfil');
    ok((await p.innerText('main')).includes('Volunteering'), 'en inglés se ve la traducción de la opción');
    await go('u-config'); await p.click('[data-a="lang"][data-v="es"]'); await W(300);
    await logout();
    // Datos (analista): sin la comuna, con la opción renombrada
    await login('ignacio.vera@ejemplo.cl'); await go('a-datos'); const d1 = await p.innerText('main');
    ok(!d1.includes('\nComuna\n') && d1.includes('Trabajo en Providencia') && !/comuna,/.test(d1.split('Para el análisis')[1].slice(0, 120)), 'Datos: sin la comuna y con la opción renombrada');
    await logout();
    // Volver a mostrar la comuna
    await login('roderick.grez@mayor.cl'); await go('a-form'); await p.check('#f-fm_s_comuna'); await W(150); await p.check('#f-fm_r_comuna'); await p.check('#f-fm_r_gender');
    await p.click('[data-a="fm-base-save"]'); ok((await toast()).startsWith('Campos del perfil guardados'), 'comuna visible de nuevo');
    await logout();
    // Quien se registró sin comuna ni género debe completarlos al entrar
    await noToast(); await go('u-login'); await p.fill('#f-l_ident', rut1); await p.fill('#f-l_pass', 'clave-forma-1'); await p.click('[data-a="login"]'); await W(800);
    ok((await p.innerText('main h1')) === 'Completa tu perfil' && !!(await p.$('#f-c_comuna')) && !!(await p.$('#f-c_gender')) && !(await p.$('#f-c_occ')), 'al entrar se le piden solo la comuna y el género');
    await p.fill('#f-c_comuna', 'Ñuñoa'); await p.selectOption('#f-c_gender', { index: 2 }); await p.click('[data-a="complete-save"]'); ok((await toast()).includes('Datos guardados'), 'perfil completado');
    await logout();
  }

  if (ETAPA.includes('2')) {
    console.log('— Etapa 2: preguntas agregadas');
    await noToast(); await login('roderick.grez@mayor.cl'); await go('a-form');
    // Una opción, obligatoria, con traducción
    await p.click('[data-a="fm-edit"][data-v=""]'); await W(300); await audit('ventana Agregar pregunta');
    await p.fill('#f-fe_label', 'Tamaño de tu equipo'); await p.check('#f-fe_req');
    await p.click('.modal summary'); await p.fill('#f-fe_label_en', 'Team size');
    await p.fill('#f-fe_0_l', 'Solo yo'); await p.fill('#f-fe_1_l', '2 a 5'); await p.click('[data-a="fe-add"]'); await W(200); await p.fill('#f-fe_2_l', 'Más de 5');
    ok(await p.inputValue('#f-fe_label') === 'Tamaño de tu equipo' && await p.inputValue('#f-fe_0_l') === 'Solo yo', 'agregar una opción no borra lo escrito');
    await p.click('[data-a="fe-save"]'); ok((await toast()).includes('agregada'), 'pregunta de una opción agregada'); await noToast();
    // Número con mínimo y máximo: la ventana cambia según el tipo
    await p.click('[data-a="fm-edit"][data-v=""]'); await W(300); await p.fill('#f-fe_label', 'Personas en tu hogar'); await p.selectOption('#f-fe_type', 'number'); await W(250);
    ok(await p.isVisible('#f-fe_min') && !(await p.$('#f-fe_0_l')) && await p.inputValue('#f-fe_label') === 'Personas en tu hogar', 'al elegir Número aparecen mínimo y máximo, sin opciones');
    await p.fill('#f-fe_min', '1'); await p.fill('#f-fe_max', '15'); await p.click('[data-a="fe-save"]'); await W(300); await noToast();
    // Varias opciones y texto libre
    await p.click('[data-a="fm-edit"][data-v=""]'); await W(300); await p.fill('#f-fe_label', 'Intereses'); await p.selectOption('#f-fe_type', 'multi'); await W(200);
    await p.fill('#f-fe_0_l', 'Robótica'); await p.fill('#f-fe_1_l', 'Diseño'); await p.click('[data-a="fe-save"]'); await W(300); await noToast();
    await p.click('[data-a="fm-edit"][data-v=""]'); await W(300); await p.fill('#f-fe_label', 'Comentarios para el equipo'); await p.selectOption('#f-fe_type', 'text'); await W(200);
    ok((await p.innerText('.modal')).includes('no se grafica'), 'el texto libre avisa que no se grafica');
    await p.click('[data-a="fe-save"]'); await W(300); await noToast();
    const list = await p.innerText('main'); ok(list.includes('Tamaño de tu equipo') && list.includes('Obligatoria') && list.includes('No se grafica'), 'lista de preguntas con sus etiquetas');
    await audit('a-form con preguntas');
    // Mover
    const order = async () => p.$$eval('.fx .li b', x => x.map(e => e.textContent));
    const o1 = await order(), i1 = o1.indexOf('Intereses'); await p.click(`[data-a="fm-move"][aria-label="Subir Intereses"]`); await W(300);
    ok((await order()).indexOf('Intereses') === i1 - 1, 'subir una pregunta');
    await p.setViewportSize({ width: 375, height: 800 }); await overflow('a-form 375 px'); await p.setViewportSize({ width: 1280, height: 860 });
    await logout();

    // Camila ya estaba registrada: al entrar se le pide la pregunta obligatoria
    await login('camila.rojas@ejemplo.cl'); await W(300);
    ok((await p.innerText('main h1')) === 'Completa tu perfil' && await p.isVisible('#f-c_x_' + (await p.getAttribute('select[id^="f-c_x_"]', 'id')).slice(6)), 'al entrar, se le pide completar el perfil');
    ok(!(await p.$('[id^="f-c_x_"][type="number"]')), 'solo se piden las obligatorias que faltan');
    await audit('u-completar'); await p.setViewportSize({ width: 320, height: 700 }); await overflow('u-completar 320 px'); await p.setViewportSize({ width: 1280, height: 860 });
    await p.click('[data-a="complete-save"]'); ok((await toast()).includes('Completa «Tamaño de tu equipo»'), 'no deja guardar sin responder'); await noToast();
    await p.click('[data-a="complete-later"]'); await W(300); ok((await p.innerText('main')).length && !(await p.$('[data-a="complete-save"]')), '«Ahora no» deja usar la app');
    await go('u-reservar'); ok(!(await p.$('[data-a="complete-save"]')), 'no vuelve a pedirlo en la misma sesión');
    await logout(); await login('camila.rojas@ejemplo.cl'); ok(!!(await p.$('[data-a="complete-save"]')), 'al entrar de nuevo se le vuelve a pedir');
    await p.selectOption('select[id^="f-c_x_"]', { label: 'Más de 5' }); await p.click('[data-a="complete-save"]'); ok((await toast()).includes('Datos guardados'), 'completa su perfil'); await W(300);
    ok(!(await p.$('[data-a="complete-save"]')), 'ya no se le pide');
    await go('u-perfil'); const cp = await p.innerText('main'); ok(cp.includes('Tamaño de tu equipo') && cp.includes('Más de 5'), 'el perfil muestra su respuesta' + (cp.includes('Nivel educacional') ? ' y las anteriores' : ''));
    // Editar el perfil: varias opciones y número
    await p.click('[data-a="profile-edit"]'); await W(300);
    await p.getByRole('checkbox', { name: 'Robótica' }).check(); await p.getByRole('checkbox', { name: 'Diseño' }).check(); await p.getByLabel('Personas en tu hogar (opcional)').fill('40');
    await p.click('[data-a="profile-save"]'); ok((await toast()).includes('entre 1 y 15'), 'número fuera del rango: ' + (await toast())); await noToast();
    await p.getByLabel('Personas en tu hogar (opcional)').fill('3'); await p.click('[data-a="profile-save"]'); ok((await toast()).includes('Datos guardados'), 'perfil guardado con varias opciones y número');
    await W(300); const cp2 = await p.innerText('main'); ok(cp2.includes('Robótica, Diseño') && /Personas en tu hogar\s+3/.test(cp2), 'respuestas guardadas');
    // Inglés: pregunta traducida; la que no tiene traducción sale en español
    await go('u-config'); await p.click('[data-a="lang"][data-v="en"]'); await W(300); await go('u-perfil'); const en = await p.innerText('main');
    ok(en.includes('Team size') && en.includes('Intereses'), 'en inglés: con traducción (Team size) y sin ella (Intereses)');
    await go('u-priv'); const priv = await p.innerText('main'); console.log('   ', priv.match(/Statistics[^\n]*|Para las estad[^\n]*/)?.[0]); ok(/Statistics use only .*and your answers to .*“Team size”.*“Intereses”/.test(priv) && !/comentarios/i.test(priv), 'Privacidad lista las variables usadas, sin el texto libre');
    await go('u-config'); await p.click('[data-a="lang"][data-v="es"]'); await W(300);
    await logout();

    // Registro nuevo con preguntas
    const rut2 = '18.765.432-' + dv('18765432');
    await regFill({ rut: rut2, email: 'forma.dos@ejemplo.cl' });
    ok((await p.innerText('main')).includes('Más información'), 'registro: sección «Más información»');
    await p.click('[data-a="register"]'); ok((await toast()).includes('Completa «Tamaño de tu equipo»'), 'registro: la pregunta obligatoria se revisa antes de enviar'); await noToast();
    await p.locator('label.f', { hasText: 'Tamaño de tu equipo' }).locator('select').selectOption({ label: '2 a 5' }); await p.locator('label.f', { hasText: 'Comentarios para el equipo' }).locator('input').fill('Ojalá más horarios');
    await audit('u-reg con preguntas'); await p.setViewportSize({ width: 320, height: 700 }); await overflow('u-reg con preguntas 320 px'); await p.setViewportSize({ width: 1280, height: 860 });
    await p.click('[data-a="register"]'); await W(700); await verifyNew(); ok(await p.$('[data-a="complete-save"]') == null && (await p.innerText('main h1')) !== 'Completa tu perfil', 'quien se registra con todo no debe completar nada');
    await logout();

    // Recepción: la ficha muestra las respuestas y «Actualizar datos» las incluye
    await login('marta.pizarro@ejemplo.cl'); await go('a-husr'); await p.fill('#f-usr_q', 'Camila'); await W(400); await p.click('[data-a="usr-open"]'); await W(400);
    await p.click('main details summary:has-text("Respuestas del formulario")'); const ficha = await p.innerText('main');
    ok(ficha.includes('Tamaño de tu equipo') && ficha.includes('Más de 5'), 'ficha: respuestas del formulario');
    await go('a-scan'); await p.fill('#f-scan', '12.345.678-5'); await p.click('[data-a="scan"]'); await W(500); await p.click('[data-a="usr-edit"]'); await W(300);
    ok(await p.locator('.modal label.f', { hasText: 'Tamaño de tu equipo' }).locator('select').inputValue() !== '' && (await p.innerText('.modal')).includes('Comentarios para el equipo'), '«Actualizar datos» incluye las preguntas'); await audit('Actualizar datos con preguntas');
    await p.click('.modal [data-a="modal-close"]'); await W(200); await logout();

    // Analista: Datos con las preguntas, sin el texto libre; su descarga no lo incluye
    await login('ignacio.vera@ejemplo.cl'); await go('a-datos'); const d2 = await p.innerText('main');
    ok(d2.includes('Preguntas agregadas al formulario') && d2.includes('Tamaño de tu equipo') && d2.includes('Intereses') && !d2.includes('Comentarios para el equipo'), 'Datos: preguntas analizadas, texto libre excluido');
    ok(/Promedio\s+3/.test(d2), 'Datos: número con promedio');
    await audit('a-datos con preguntas');
    const csvA = await dl('[data-a="data-export"]'); ok(csvA.includes('Tamaño de tu equipo') && !csvA.includes('Comentarios') && !csvA.includes('Ojalá'), 'la descarga de la analista no incluye texto libre');
    await logout();

    // Administración: descarga completa, quitar y restaurar
    await login('roderick.grez@mayor.cl'); await go('a-form');
    const csvF = await dl('[data-a="fm-export"]'); ok(csvF.includes('Comentarios para el equipo') && csvF.includes('Ojalá más horarios'), 'la descarga de administración incluye todas las respuestas');
    await p.click('[data-a="fm-del"]:right-of(:text("Intereses"))').catch(async () => { const rows = await p.$$('.fx .li'); for (const r of rows) if ((await r.innerText()).startsWith('Intereses')) { await (await r.$('[data-a="fm-del"]')).click(); break; } });
    await W(250); ok((await p.innerText('.modal')).includes('se archivará'), 'quitar una pregunta con respuestas avisa que se archiva');
    await p.click('[data-a="ask-ok"]'); ok((await toast()).includes('archivada'), 'pregunta archivada'); await W(300);
    ok((await p.innerText('main')).includes('Archivadas (1)'), 'aparece en Archivadas');
    await p.click('summary:has-text("Archivadas")'); await p.click('[data-a="fm-restore"]'); ok((await toast()).includes('restaurada'), 'pregunta restaurada');
    await logout();
  }
  ok(!errs.length, 'sin errores de JavaScript' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(`Resultado: ${okN} correctas, ${failN} fallas`);
  await b.close();
})();

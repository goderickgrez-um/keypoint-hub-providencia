// Recorre las pantallas de usuario en EN y PT y lista los textos que siguen en español.
const { chromium } = require('playwright');
const URL0 = process.env.HUB_URL || 'http://localhost:8765/';
const SCR = ['u-inicio','u-reservar','u-sala','u-gaming','u-lab','u-cert','u-eventos','u-activas','u-perfil','u-horas','u-notif','u-hist','u-config','u-priv','u-ayuda','u-entrar','u-privacidad','u-terminos','u-contacto','u-baja'];
const ES = process.env.STRICT ? /[ñ¿¡]|\b(tu|tus|del|los|las|el|y|puedes|tienes|aquí|también|ningún|ninguna|usuario|hora|horas|reservas?|desde|hasta|sesión|elige|toca|escribe)\b/i : /[áéíóúñ¿¡]|\b(tu|tus|de la|del|los|las|para|reserva|horas|sesión|está|con|sin|una|hoy|mañana|cerrar|ingresa|elige|desde)\b/i;
(async () => {
  const b = await chromium.launch(), out = {};
  for (const L of ['en', 'pt']) {
    const ctx = await b.newContext({ viewport: { width: 420, height: 900 } }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await ctx.addInitScript(l => { try { localStorage.setItem('hub-lang', l); } catch {} }, L);
    await p.goto(URL0); await p.waitForSelector('.login');
    const close = () => p.evaluate(() => { for (let i = 0; i < 3; i++) document.querySelector('.modal .mx')?.click(); document.querySelector('[data-a="tour-end"]')?.click(); });
    const grab = async (tag) => { const txt = await p.evaluate(() => { const r = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const s = n.textContent.trim(); if (s && n.parentElement.offsetParent !== null && !n.parentElement.closest('script,style,.mono,.notif-body,[data-raw]')) r.push(s); } document.querySelectorAll('[aria-label],[placeholder],[title]').forEach(e => ['aria-label','placeholder','title'].forEach(a => e.getAttribute(a) && r.push('@' + e.getAttribute(a)))); return r; });
      for (const s of txt) if (ES.test(s)) (out[L] ||= {})[s] = tag; };
    await grab('u-login'); await p.click('[data-a="help"]').catch(() => {}); await p.waitForTimeout(300); await grab('help u-login'); await p.click('.modal [data-a="modal-close"]', { timeout: 1000 }).catch(() => {});
    await p.click('[data-a="modal-close"]').catch(() => {}); await p.evaluate(() => location.hash = 'u-reg'); await p.waitForTimeout(400); await grab('u-reg');
    await p.evaluate(() => location.hash = 'u-login'); await p.waitForTimeout(300);
    await p.click('[data-a="demo-login"][data-v="camila.rojas@ejemplo.cl"]'); await p.waitForTimeout(800);
    await p.evaluate(() => location.hash = 'u-config'); await p.waitForTimeout(300); await p.click(`[data-a="lang"][data-v="${L}"]`); await p.waitForTimeout(500);
    for (const k of SCR) { await close(); await p.evaluate(x => location.hash = x, k); await p.waitForTimeout(400); await grab(k);
      const h = await p.$('main [data-a="help"], header [data-a="help"], [data-a="help"]'); if (h) { await close(); await h.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(250); await grab('help ' + k); const tb = await p.$('[data-a="tour-start"]'); if (tb) { await tb.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300); await grab('tour ' + k); await p.click('[data-a="tour-end"]').catch(() => {}); } else await p.click('.modal [data-a="modal-close"]', { timeout: 1000 }).catch(() => {}); await p.waitForTimeout(200); } }
    // detalles: abrir primer evento, cancelar reserva, terminar
    for (const [k, sel] of [['u-eventos', '.list [data-a]'], ['u-activas', '[data-a="res-cancel-ask"]'], ['u-perfil', '[data-a="profile-edit"]'], ['u-perfil', '[data-a="logout-all"]']]) { await p.evaluate(x => location.hash = x, k); await p.waitForTimeout(300); const e = await p.$(sel); await close(); if (e) { await e.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300); await grab(k + ' ' + sel); await p.click('.modal [data-a="modal-close"]', { timeout: 1000 }).catch(() => {}); await p.waitForTimeout(150); } }
    if (errs.length) console.log('ERRORES', L, errs);
    await ctx.close();
  }
  for (const L in out) { console.log(`\n== ${L}: ${Object.keys(out[L]).length}`); for (const [s, k] of Object.entries(out[L])) console.log(`[${k}] ${s.slice(0, 140)}`); }
  await b.close();
})();

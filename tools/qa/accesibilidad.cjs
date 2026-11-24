const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); let n = 0;
  for (const scheme of ['light', 'dark']) for (const [who, list, w] of [['roderick.grez@mayor.cl', ['a-esp','a-husr','a-reglas','a-plano','a-datos','a-scan','a-eventos','a-emp','a-apar','a-cert','a-rev','a-solic','a-fallas','a-prox','a-ahora','a-uso','a-audit','a-imp','a-panel','a-agenda','a-ayuda'], 1366], ['camila.rojas@ejemplo.cl', ['u-cert','u-reservar','u-perfil','u-inicio','u-lab','u-gaming','u-sala','u-eventos','u-hist','u-horas','u-config','u-notif','u-priv','u-activas','u-ayuda','u-entrar','u-privacidad','u-terminos','u-contacto'], 390], ['marta.pizarro@ejemplo.cl', ['a-scan','a-reg','a-prox','a-husr','a-ayuda'], 390], ['tomas.fuentes@ejemplo.cl', ['a-rev','a-cert','a-solic','a-fallas','a-panel'], 1280], ['ignacio.vera@ejemplo.cl', ['a-datos','a-imp'], 1280]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, bypassCSP: true, colorScheme: scheme }), p = await ctx.newPage(); if (process.env.LANGX) await ctx.addInitScript(l => localStorage.setItem('hub-lang', l), process.env.LANGX);
    await p.goto((process.env.HUB_URL || 'http://localhost:8765/')); await p.waitForSelector('.login'); await p.click(`[data-a="demo-login"][data-v="${who}"]`); await p.waitForTimeout(700);
    for (const s of list) { n++; await p.evaluate(x => location.hash = x, s); await p.waitForTimeout(300); await p.addScriptTag({ path: require.resolve('axe-core') });
      const r = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => `${v.id} ×${v.nodes.length}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`));
      if (r.length) console.log(scheme, s, '\n  ' + r.join('\n  ')); }
    await ctx.close(); }
  console.log('fin', n, 'pantallas revisadas'); await b.close(); })();

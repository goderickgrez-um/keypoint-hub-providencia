// Desborde horizontal por tamaño de pantalla y rol
const { chromium } = require('playwright');
const SETS = [['camila.rojas@ejemplo.cl', ['u-inicio','u-reservar','u-sala','u-gaming','u-lab','u-cert','u-eventos','u-activas','u-perfil','u-horas','u-notif','u-hist','u-config','u-priv','u-ayuda','u-entrar','u-privacidad','u-terminos','u-contacto','u-baja']],
  ['marta.pizarro@ejemplo.cl', ['a-scan','a-reg','a-prox','a-ahora','a-husr','a-agenda']], ['tomas.fuentes@ejemplo.cl', ['a-panel','a-rev','a-cert','a-solic','a-fallas']],
  ['roderick.grez@mayor.cl', ['a-panel','a-esp','a-plano','a-eventos','a-reglas','a-emp','a-apar','a-audit','a-ayuda']], ['ignacio.vera@ejemplo.cl', ['a-datos','a-uso','a-imp']]];
(async () => { const b = await chromium.launch(); let n = 0, bad = [], errs = [];
  const LX = process.env.LX; for (const w of LX ? [320, 375] : [320, 375, 768, 1024, 1920]) for (const [who, list] of LX ? SETS.slice(0, 1) : SETS) { const ctx = await b.newContext({ viewport: { width: w, height: 800 } }), p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto((process.env.HUB_URL || 'http://localhost:8765/')); await p.waitForSelector('.login'); await p.click(`[data-a="demo-login"][data-v="${who}"]`); await p.waitForTimeout(700); if (LX) { await p.evaluate(() => location.hash = 'u-config'); await p.waitForTimeout(300); await p.click(`[data-a="lang"][data-v="${LX}"]`); await p.waitForTimeout(300); }
    for (const s of list) { await p.evaluate(x => location.hash = x, s); await p.waitForTimeout(300); n++;
      const o = await p.evaluate(() => { const W = document.documentElement.clientWidth; if (document.documentElement.scrollWidth <= W + 1) return null; const e = [...document.querySelectorAll('body *')].find(e => e.getBoundingClientRect().right > W + 1 && !e.closest('.tbl')); return e ? e.tagName + '.' + e.className + ': ' + (e.textContent || '').trim().slice(0, 50) : 'scrollWidth ' + document.documentElement.scrollWidth; });
      if (o) bad.push(`${w}px ${s}: ${o}`); }
    await ctx.close(); }
  console.log(n, 'pantallas ×', 'tamaños'); console.log(bad.length ? bad.join('\n') : 'sin desbordes'); console.log('errores', errs); await b.close(); })();

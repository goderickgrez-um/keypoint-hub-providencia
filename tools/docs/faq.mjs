// Genera docs/preguntas-frecuentes.md, .html y .pdf con las preguntas frecuentes de la app (src/ui/faq-data.js).
// Uso: npm run docs:faq   (el PDF requiere Playwright; sin él se generan solo .md y .html)
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { FAQ_USER, FAQ_STAFF, fillRules } from '../../src/ui/faq-data.js';
import { DEFAULTS } from '../../src/core/catalog.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url)), OUT = join(ROOT, 'docs');
const fill = t => fillRules(t, k => DEFAULTS[k]);
const ROLE = { admin: 'Administración', encargado: 'Encargados', recepcion: 'Recepción', analista: 'Analistas' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const groups = list => [...new Set(list.map(x => x[0]))].map(t => [t, list.filter(x => x[0] === t)]);

// ---- Markdown
let md = `# Preguntas frecuentes · Keypoint Hub Providencia\n\nLos valores entre paréntesis siguen las reglas por defecto; administración puede cambiarlos en Reglas y la app siempre muestra los vigentes.\n\n## Para las personas usuarias\n`;
for (const [t, qs] of groups(FAQ_USER)) md += `\n### ${t}\n\n` + qs.map(([, q, a]) => `**${q}**  \n${fill(a)}\n`).join('\n');
md += `\n## Para el personal del Hub\n`;
for (const [t, qs] of groups(FAQ_STAFF)) md += `\n### ${t}\n\n` + qs.map(([, q, a, r]) => `**${q}** _(${r.map(x => ROLE[x]).join(', ')})_  \n${fill(a)}\n`).join('\n');
writeFileSync(join(OUT, 'preguntas-frecuentes.md'), md);

// ---- HTML imprimible (A4, dos columnas)
const sec = (title, list, staff) => `<section><h2>${title}</h2>${groups(list).map(([t, qs]) => `<h3>${esc(t)}</h3>${qs.map(([, q, a, r]) => `<div class="qa"><b>${esc(q)}</b>${staff ? `<span class="who">${r.map(x => ROLE[x]).join(' · ')}</span>` : ''}<p>${esc(fill(a))}</p></div>`).join('')}`).join('')}</section>`;
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Preguntas frecuentes · Keypoint Hub Providencia</title><style>
@page { size: A4; margin: 16mm 14mm; } * { box-sizing: border-box; }
body { font: 10pt/1.45 Inter, "Segoe UI", system-ui, sans-serif; color: #1D1D1F; margin: 0; }
header { border-bottom: 3px solid #0E7C86; padding-bottom: 8px; margin-bottom: 10px; } header h1 { margin: 0; font-size: 20pt; letter-spacing: -.01em; } header p { margin: 4px 0 0; color: #63636A; }
section { columns: 2; column-gap: 9mm; } section + section { break-before: page; }
h2 { column-span: all; color: #0E7C86; font-size: 14pt; margin: 6px 0 8px; } h3 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: .06em; color: #63636A; margin: 10px 0 4px; break-after: avoid; }
.qa { break-inside: avoid; margin: 0 0 8px; } .qa b { display: block; } .qa p { margin: 2px 0 0; } .who { display: block; font-size: 8pt; color: #0E7C86; }
</style></head><body><header><h1>Preguntas frecuentes</h1><p>Keypoint Hub Providencia · también disponibles en la app: botón de ayuda (?) en cada pantalla y sección «Ayuda y preguntas frecuentes». Los valores siguen las reglas por defecto.</p></header>
${sec('Para las personas usuarias', FAQ_USER)}${sec('Para el personal del Hub', FAQ_STAFF, true)}</body></html>`;
writeFileSync(join(OUT, 'preguntas-frecuentes.html'), html);

// ---- PDF
try {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const b = await chromium.launch(), p = await b.newPage(); await p.goto('file://' + join(OUT, 'preguntas-frecuentes.html'));
  await p.pdf({ path: join(OUT, 'preguntas-frecuentes.pdf'), preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font:8px Inter,sans-serif;color:#888;width:100%;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
  await b.close(); console.log('docs/preguntas-frecuentes.md, .html y .pdf listos');
} catch (e) { console.log('docs/preguntas-frecuentes.md y .html listos (PDF omitido: ' + e.message.split('\n')[0] + ')'); }

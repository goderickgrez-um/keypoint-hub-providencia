// Cobertura de traducción de los mensajes de error que ve la persona usuaria
import { readFileSync } from 'node:fs';
const root = process.argv[2] || new URL('../../', import.meta.url).pathname.replace(/\/$/, ''); const { EN, PT, PATTERNS } = await import(root + '/src/ui/lang.js');
const src = ['src/core/services.js', 'src/core/rules.js', 'server/server.js'].map(f => readFileSync(root + '/' + f, 'utf8')).join('\n');
const msgs = new Set(); for (const m of src.matchAll(/fail\(\s*(['`])((?:\\.|(?!\1).)*)\1/g)) msgs.add(m[2]);
let fixed = 0, tmpl = 0; const miss = [];
for (const m of msgs) { if (m.includes('${')) { tmpl++; const sample = m.replace(/\$\{[^}]+\}/g, 'X1'); if (!PATTERNS.some(([re]) => re.test(sample.replace(/X1/g, '12'))) && !PATTERNS.some(([re]) => re.test(sample))) miss.push('[variable] ' + m); continue; }
  fixed++; if (!(m in EN) || !(m in PT)) miss.push(m); }
console.log(`mensajes fijos: ${fixed} · con datos: ${tmpl} · sin traducción: ${miss.length}`); console.log(miss.join('\n'));

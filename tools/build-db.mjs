import { fileURLToPath } from 'node:url';
// Genera database/schema.sql y database/seed.sql (datos de ejemplo con fechas cercanas a hoy).
import { writeFile, mkdir } from 'node:fs/promises';
import { toSQL, TABLES, COLS } from '../src/core/schema.js';
import { seed } from '../src/core/seed.js';

const dir = fileURLToPath(new URL('../database/', import.meta.url)); await mkdir(dir, { recursive: true });
await writeFile(dir + 'schema.sql', toSQL());
const data = await seed(new Date()), q = v => v == null ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(typeof v === 'object' ? JSON.stringify(v) : v).replace(/'/g, "''")}'`;
const out = ['-- Keypoint Hub Providencia · datos de ejemplo (personas ficticias)', `-- Generado el ${new Date().toLocaleString('es-CL')} con: npm run db:build`, '-- Cargar después de schema.sql:  psql -d hub -f database/schema.sql -f database/seed.sql', 'begin;'];
for (const t of Object.keys(TABLES)) { const rows = data[t] || []; if (!rows.length) continue; const cols = COLS[t].map(c => c.name);
  for (let i = 0; i < rows.length; i += 200) out.push(`insert into ${t} (${cols.join(', ')}) values\n${rows.slice(i, i + 200).map(r => '(' + COLS[t].map(c => c.type === 'jsonb' && r[c.name] != null ? q(JSON.stringify(r[c.name])) : q(r[c.name] ?? null)).join(', ') + ')').join(',\n')};`); }
out.push('commit;');
await writeFile(dir + 'seed.sql', out.join('\n') + '\n');
console.log('database/schema.sql y database/seed.sql listos');

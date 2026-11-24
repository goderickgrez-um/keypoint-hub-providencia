// Genera docs/politica-privacidad.md y docs/terminos-condiciones.md (borradores para revisión de la Municipalidad)
// con los mismos textos que muestra la app, usando el contacto y el formulario de registro por defecto.
// Uso: npm run docs:legal   (luego: python3 tools/docs/bitacora.py politica-privacidad "Política de privacidad")
import { writeFileSync } from 'node:fs';
import { DEFAULTS } from '../../src/core/catalog.js';
import * as FORM from '../../src/core/form.js';
import * as L from '../../src/core/legal.js';

const root = new URL('../../', import.meta.url).pathname;
const F = FORM.regForm({ cfg: () => null });
const profile = Object.entries(FORM.BASE).filter(([k]) => F.base[k].show).map(([, d]) => d.name.toLowerCase()).join(', ');
const stats = [...Object.entries(FORM.BASE).filter(([k, d]) => d.stat && F.base[k].show).map(([, d]) => d.stat), 'edad'].join(', ');
const note = `> **Borrador ${L.LEGAL_VERSION} · ${L.LEGAL_DATE}.** Texto generado por la app con su configuración por defecto (contacto de ejemplo y formulario sin preguntas agregadas). En la app se completa con el contacto y las preguntas que configure el Hub. Debe revisarlo la Municipalidad de Providencia antes de publicarlo.\n\n`;
const args = { contact: DEFAULTS.hub_contact, lang: 'es', profile, extra: [], stats };
writeFileSync(root + 'docs/politica-privacidad.md', note + L.toMarkdown(L.privacy(args)));
writeFileSync(root + 'docs/terminos-condiciones.md', note + L.toMarkdown(L.terms(args)));
console.log('docs/politica-privacidad.md\ndocs/terminos-condiciones.md');

// Idiomas de la app de usuarios. Las claves son los textos en español; lo que no tenga traducción se muestra en español.
import { EN, PT } from './lang.js';

export const LANGS = { es: 'Español', en: 'English', pt: 'Português' };
const DICT = { en: EN, pt: PT };
let lang = 'es';
try { lang = localStorage.getItem('hub-lang') || 'es'; } catch { /* sin almacenamiento */ }
if (!LANGS[lang]) lang = 'es';

export const getLang = () => lang;
export const locale = () => ({ es: 'es-CL', en: 'en-GB', pt: 'pt-BR' }[lang]);
export function setLang(l) { lang = LANGS[l] ? l : 'es'; try { localStorage.setItem('hub-lang', lang); } catch { /* sin almacenamiento */ } document.documentElement.lang = lang; }
export function t(s, ...args) {
  const x = lang === 'es' ? s : DICT[lang][s] ?? s;
  return args.length ? String(x).replace(/\{(\d)\}/g, (_, i) => args[i]) : x;
}

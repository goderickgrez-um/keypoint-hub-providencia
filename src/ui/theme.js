// Aplica el tema (claro, oscuro o según el dispositivo) con los colores definidos en Apariencia.
import { THEME } from '../core/catalog.js';
import { App } from './kit.js';

const VARS = { bg: '--bg', bg2: '--bg2', surface: '--sf', text: '--tx', muted: '--mu', accent: '--ac', onAccent: '--on', bar: '--bar', barText: '--bartx' };
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
const host = document.documentElement.getAttribute('data-theme'); // tema que impone el visor, si lo hay

export const themePref = () => store('hub-theme') || 'auto';
export const themeMode = () => { const p = themePref(); return p !== 'auto' ? p : host || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); };
export const themeOf = mode => ({ ...THEME[mode], ...(App.db.cfg('theme')?.[mode] || {}) });
export function setThemePref(p) { store('hub-theme', p); applyTheme(); }
export const a11y = k => store('hub-' + k) === '1';
export function setA11y(k, on) { store('hub-' + k, on ? '1' : '0'); applyTheme(); }

export function applyTheme() {
  const root = document.documentElement, mode = themeMode(), th = themeOf(mode);
  root.setAttribute('data-theme', mode);
  for (const [k, v] of Object.entries(VARS)) root.style.setProperty(v, th[k]);
  root.toggleAttribute('data-big', a11y('big')); root.toggleAttribute('data-contrast', a11y('contrast'));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', th.bar);
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

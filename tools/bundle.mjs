import { fileURLToPath } from 'node:url';
// Construye el sitio estático en web/ (GitHub Pages o el servidor) y la demo de un solo archivo en dist/.
// Uso: npm run build
import { build, transform } from 'esbuild';
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';

const root = fileURLToPath(new URL('..', import.meta.url)), P = f => root + f;
const VERSION = new Date().toISOString().slice(0, 16).replace(/\D/g, ''); // sello de compilación (caché del navegador)
const APP_VERSION = JSON.parse(await readFile(P('package.json'), 'utf8')).version; // versión de la aplicación: una sola fuente, package.json
await rm(P('web'), { recursive: true, force: true });
await mkdir(P('web/assets'), { recursive: true }); await mkdir(P('dist'), { recursive: true });

const app = (await build({ entryPoints: [P('src/ui/app.js')], bundle: true, format: 'iife', minify: true, target: 'es2020', write: false, legalComments: 'none', define: { __APP_VERSION__: JSON.stringify(APP_VERSION) } })).outputFiles[0].text;
const vendor = (await transform((await readFile(P('vendor/qrcode.js'), 'utf8')) + '\n;' + (await readFile(P('vendor/jsQR.js'), 'utf8')), { minify: true, target: 'es2020' })).code;
const css = (await transform(await readFile(P('src/ui/styles.css'), 'utf8'), { loader: 'css', minify: true })).code;
await writeFile(P('web/app.js'), app); await writeFile(P('web/vendor.js'), vendor); await writeFile(P('web/styles.css'), css);
await cp(P('assets'), P('web/assets'), { recursive: true });

// Política de seguridad de contenido para GitHub Pages: permite conectarse solo al servidor indicado en config.web.js.
const cfgTxt = await readFile(P('config.web.js'), 'utf8'), apiOrigin = (() => { const m = /^\s*window\.HUB_CONFIG\s*=\s*(?:\{[^}]*api\s*:\s*)?["']([^"']+)["']/m.exec(cfgTxt); try { return m ? new URL(m[1]).origin : ''; } catch { return ''; } })();
const CSP = `default-src 'self'; script-src 'self' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://accounts.google.com; img-src 'self' data: blob: ${apiOrigin} https://*.googleusercontent.com; connect-src 'self' ${apiOrigin} https://accounts.google.com; frame-src https://accounts.google.com; worker-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'`.replace('  ', ' ');
const page = (title, manifest, start) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title><meta name="description" content="Registro de entradas y reservas del Hub Providencia">
<meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="theme-color" content="#FFFFFF"><link rel="manifest" href="${manifest}"><link rel="icon" href="assets/favicon.png"><link rel="apple-touch-icon" href="assets/icon-192.png">
<link rel="stylesheet" href="styles.css?v=${VERSION}"></head>
<body${start ? ` data-start="${start}"` : ''}><div id="app"></div>
<script src="config.js?v=${VERSION}"></script><script src="vendor.js?v=${VERSION}"></script><script src="app.js?v=${VERSION}"></script></body></html>`;
await writeFile(P('web/index.html'), page('Keypoint Hub Providencia', 'manifest.webmanifest'));
await writeFile(P('web/recepcion.html'), page('Recepción · Hub Providencia', 'recepcion.webmanifest', 'a-scan'));
await cp(P('config.web.js'), P('web/config.js')); // se edita en la raíz del repositorio (ver LEEME.txt)
const mf = (name, short, start) => JSON.stringify({ name, short_name: short, start_url: start, scope: './', display: 'standalone', background_color: '#F5F5F7', theme_color: '#0E7C86', lang: 'es-CL',
  icons: [{ src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }] }, null, 2);
await writeFile(P('web/manifest.webmanifest'), mf('Keypoint Hub Providencia', 'Hub Providencia', './'));
await writeFile(P('web/recepcion.webmanifest'), mf('Recepción Hub Providencia', 'Recepción Hub', './recepcion.html#a-scan'));
await writeFile(P('web/sw.js'), `// Guarda la app para que abra sin conexión (recepción sigue registrando entradas y las sincroniza después).
const CACHE = 'hub-${VERSION}', FILES = ['./', 'index.html', 'recepcion.html', 'app.js?v=${VERSION}', 'vendor.js?v=${VERSION}', 'styles.css?v=${VERSION}', 'config.js?v=${VERSION}', 'assets/logo.png', 'assets/favicon.png', 'assets/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', e => { const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/')) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match('index.html')))); });
`);
await writeFile(P('web/.nojekyll'), '');

// Demo en un solo archivo: se abre con doble clic, sin servidor ni internet.
const logo = 'data:image/png;base64,' + (await readFile(P('assets/logo.png'))).toString('base64');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
await writeFile(P('dist/keypoint-hub-demo.html'), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Keypoint Hub Providencia</title><meta name="theme-color" content="#FFFFFF"><link rel="icon" href="${logo}"><style>${css}</style></head>
<body><div id="app"></div><script>window.HUB_CONFIG=null;window.HUB_LOGO=${JSON.stringify(logo)};</script><script>${esc(vendor)}</script><script>${esc(app)}</script></body></html>`);
console.log('web/ y dist/keypoint-hub-demo.html listos', { app: app.length, vendor: vendor.length, css: css.length });

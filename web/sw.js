// Guarda la app para que abra sin conexión (recepción sigue registrando entradas y las sincroniza después).
const CACHE = 'hub-202611230127', FILES = ['./', 'index.html', 'recepcion.html', 'app.js?v=202611230127', 'vendor.js?v=202611230127', 'styles.css?v=202611230127', 'config.js?v=202611230127', 'assets/logo.png', 'assets/favicon.png', 'assets/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', e => { const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/')) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match('index.html')))); });

const VERSION = '2.1.0';
const CACHE = `racoon-wizard-${VERSION}`;
const ASSETS = ['/', '/index.html', '/styles.css', '/manifest.webmanifest', '/version.json', '/icons/racoon-wizard.svg', '/icons/racoon-wizard-192.png', '/icons/racoon-wizard-512.png', '/js/app.mjs', '/js/model.mjs', '/js/time.mjs', '/js/evidence.mjs', '/js/schedule.mjs', '/js/storage.mjs', '/js/backup.mjs', '/js/catalog.mjs', '/js/pwa.mjs', '/js/refresh.mjs', '/js/providers/anilist.mjs'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('racoon-wizard-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // network-first for navigation; cached shell is only the offline fallback.
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin) || new URL(request.url).pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put('/index.html', response.clone()));
      return response;
    }).catch(() => caches.match('/index.html')));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

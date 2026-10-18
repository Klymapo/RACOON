const VERSION = '3.0.0-alpha.19';
const CACHE = `racoon-wizard-${VERSION}`;
const ASSETS = ['/', '/index.html', '/styles.css', '/manifest.webmanifest', '/version.json', '/icons/racoon-wizard.svg', '/icons/racoon-mono.svg', '/icons/racoon-maskable-512.png', '/js/brand.mjs', '/icons/racoon-wizard-192.png', '/icons/racoon-wizard-512.png', '/js/app.mjs', '/js/table-reader.mjs', '/js/table-import.mjs', '/js/table-import-ui.mjs', '/js/model.mjs', '/js/media.mjs', '/js/season-ui.mjs', '/js/movie-ui.mjs', '/js/detail-ui.mjs', '/js/folders.mjs', '/js/folder-ui.mjs', '/js/time.mjs', '/js/evidence.mjs', '/js/schedule.mjs', '/js/storage.mjs', '/js/indexeddb.mjs', '/js/indexeddb-ui.mjs', '/js/backup.mjs', '/js/catalog.mjs', '/js/pwa.mjs', '/js/refresh.mjs', '/js/providers/anilist.mjs'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([...ASSETS, '/js/storage-runtime.mjs', '/js/storage-runtime-ui.mjs', '/js/smart-collections.mjs', '/js/smart-ui.mjs', '/js/regional.mjs', '/js/regional-ui.mjs', '/js/agenda.mjs', '/js/slice.mjs', '/js/slice-ui.mjs', '/js/recommendations.mjs', '/js/ratings.mjs', '/js/letterboxd.mjs', '/js/discovery-ui.mjs', '/js/share-cards.mjs', '/js/share-ui.mjs', '/js/wrap.mjs', '/js/wrap-ui.mjs', '/js/ocr.mjs', '/js/ocr-ui.mjs', '/js/ocr-engine.mjs'])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('racoon-wizard-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const ocrUrl = new URL(event.request.url);
  if (event.request.method === 'GET' && ocrUrl.origin === self.location.origin && ocrUrl.pathname.startsWith('/vendor/ocr/6.0.1/')) {
    event.respondWith(caches.open('racoon-ocr-6.0.1').then(async cache => (await cache.match(event.request)) || fetch(event.request)));
    return;
  }
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

// PWA: navegación siempre intenta la versión reciente; caché solo como rescate sin internet.
const CACHE='anime-radar-shell-v2';
const ASSETS=['/','/index.html','/manifest.webmanifest','/icons/radar-192.png','/icons/radar-512.png'];
self.addEventListener('install',evt=>{evt.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',evt=>{evt.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',evt=>{
 const req=evt.request;
 if(req.method!=='GET'||!req.url.startsWith(self.location.origin)||new URL(req.url).pathname.startsWith('/api/'))return;
 if(req.mode==='navigate'){
  evt.respondWith(fetch(req).then(res=>{if(res.ok){let copy=res.clone();caches.open(CACHE).then(c=>c.put('/index.html',copy));}return res;}).catch(()=>caches.match('/index.html')));
  return;
 }
 evt.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});

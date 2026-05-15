const STATIC_CACHE = 'hc-static-v0.5';
const PROFILES_CACHE = 'hc-profiles-v0.5';

const STATIC_ASSETS = [
  '/commons/index.html',
  '/commons/create.html',
  '/commons/revoke.html',
  '/commons/offline.html',
  '/commons/style.css',
  '/commons/app.js',
  '/commons/create.js',
  '/commons/revoke.js',
  '/commons/manifest.json',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.includes('/.well-known/hc/v0.5/profile/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(PROFILES_CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

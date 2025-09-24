const CACHE_NAME = 'reptile-shell-v1';
const ASSETS = [ '/', '/index.html', '/script.js', '/manifest.json', '/icons/icon-192.svg', '/icons/icon-512.svg' ];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); }))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Try cache first for app shell, fallback to network; network-first for others
  if (ASSETS.includes(new URL(e.request.url).pathname)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  } else {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  }
});

const CACHE = 'recipebox-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './recipes.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request;
  // Only handle same-origin requests; let Firebase/CDN/network calls pass through.
  if (new URL(req.url).origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate' ||
    (req.destination === 'document') ||
    req.url.endsWith('/') || req.url.endsWith('index.html') ||
    req.url.includes('recipes.json');

  if (isPage) {
    // Network-first: always try to get the latest page when online,
    // fall back to the cached copy when offline.
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for everything else (icons, manifest) — fast and offline-friendly.
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});

const CACHE = 'hoian-guide-v1';

// Core pages to pre-cache on install
const PRECACHE = [
  './insider.html',
  './insider-fr.html',
  './insider-ko.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Install: pre-cache core pages
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for pages & fonts, network-first for images
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and cross-origin map requests
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('google.com') && url.pathname.includes('maps')) return;
  if (url.hostname.includes('wa.me')) return;

  // Images: cache after first load (network-first, fallback cache)
  if (
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('pexels.com') ||
    url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)
  ) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        fetch(e.request)
          .then(resp => {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          })
          .catch(() => cache.match(e.request))
      )
    );
    return;
  }

  // Fonts: cache-first
  if (url.hostname.includes('fonts.')) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
        caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        return resp;
      }))
    );
    return;
  }

  // HTML & everything else: cache-first, update in background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(resp => {
        if (resp.ok) {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      });
      return cached || network;
    })
  );
});

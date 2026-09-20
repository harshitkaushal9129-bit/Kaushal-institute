const CACHE_NAME = 'kaushal-portal-v4';

// Index.html se saari local files, links, aur main assets ki list
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './resources.html',
  './courses.html',
  './media.html',
  './manifest.json',
  './kaushal-institute.png',
  './kaushalji.png',
  'https://cdn-icons-png.flaticon.com/512/149/149071.png'
];

// Service Worker Install & Caching Static Assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all essential app shell assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Service Worker Activation & Cleaning Old Caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy: Cache First, falling back to Network (with Dynamic Runtime Caching for CDNs/Audio)
self.addEventListener('fetch', (e) => {
  // Firebase Database ya external API requests ko bypass ya network-first rakhein
  if (e.request.url.includes('firebaseio.com') || e.request.url.includes('googleapis.com')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Valid response hone par dynamically cache mein bhi save karein (jaise audio files ya images)
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        let responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Agar offline hain aur koi page cache mein nahi mila toh fallback dikha sakte hain
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

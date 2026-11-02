const CACHE_NAME = 'zivah-tracking-v1';
const ASSETS_TO_CACHE = [
  './mobile-tracking.html',
  './assets/css/styles.css',
  './assets/images/logo.png',
  './assets/images/logo.svg',
  './manifest.json',
  './assets/js/jquery-3.3.1.min.js',
  './assets/js/main.js'
];

// Install Event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching App Shell...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - network first for HTML/navigation, cache first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // For document/page requests or tracking checks, use Network First, fallback to cache
  if (event.request.mode === 'navigate' || url.pathname.includes('mobile-tracking.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone and cache the fresh page
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // If offline, return from cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) return cachedResponse;
              // If not in cache, fallback to main mobile tracking file
              return caches.match('./mobile-tracking.html');
            });
        })
    );
  } else {
    // For static assets, use Cache First, fallback to network
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // Cache static assets dynamically
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            return response;
          });
        })
    );
  }
});

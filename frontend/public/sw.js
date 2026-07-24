// ============================================================
// TRAFFICROUTE SERVICE WORKER
// Progressive Web App (PWA) Offline Support
// ============================================================

const CACHE_NAME = 'trafficroute-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png'
];

// ============================================================
// INSTALL EVENT - Cache assets
// ============================================================
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// ============================================================
// ACTIVATE EVENT - Clean old caches
// ============================================================
self.addEventListener('activate', function(event) {
  var cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(function() {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// ============================================================
// FETCH EVENT - Serve from cache or network
// ============================================================
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        var fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(function(response) {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                try {
                  cache.put(event.request, responseToCache);
                } catch (error) {
                  console.log('Service Worker: Cache put error:', error);
                }
              });

            return response;
          })
          .catch(function(error) {
            console.log('Service Worker: Fetch failed:', error);
            // Return offline page if available
            return caches.match('/offline.html');
          });
      })
  );
});

// ============================================================
// MESSAGE EVENT - Handle messages from the app
// ============================================================
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker: TrafficRoute PWA loaded');
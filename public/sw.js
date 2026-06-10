const CACHE_NAME = 'moviemachi-offline-v1';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  OFFLINE_URL
];

// Service Worker Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Add key assets to custom store cache
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Service Worker Activation and cache purge
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interception Handler
self.addEventListener('fetch', (event) => {
  // Only process GET requests to allow backend uploads/posts normally
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle HTML Page navigation requests and inject custom offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Fallback to our compiled standalone premium page
          return caches.open(CACHE_NAME).then((cache) => {
            return cache.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Asset/Generic Cache matcher
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Execute network fetch and handle image assets fallback dynamically if needed
      return fetch(event.request).catch(() => {
        // Fallback for image requests when offline
        if (event.request.destination === 'image') {
          return new Response(
            `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="#0a0a0f"/><text x="50%" y="50%" font-size="10" font-family="sans-serif" fill="#666" text-anchor="middle" dominant-baseline="middle">MovieMachi</text></svg>`,
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      });
    })
  );
});

// Custom Listener for Notification Clicks (PWA and Browser)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const movieTitle = event.notification.data ? event.notification.data.movieTitle : null;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Find any active client and focus it
      for (const client of clientList) {
        if ('focus' in client) {
          if (movieTitle && 'postMessage' in client) {
            client.postMessage({ type: 'OPEN_MOVIE', movieTitle });
          }
          return client.focus();
        }
      }
      // Or launch a fresh instance of the cinema portal
      if (self.clients.openWindow) {
        const destUrl = movieTitle 
          ? `/?openMovie=${encodeURIComponent(movieTitle)}` 
          : '/';
        return self.clients.openWindow(destUrl);
      }
    })
  );
});


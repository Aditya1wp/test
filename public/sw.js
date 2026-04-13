// Minimal Service Worker to satisfy PWA criteria
const CACHE_NAME = 'nimcet-mock-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now
  event.respondWith(fetch(event.request).catch(() => {
    // Optional: Return a fallback offline page
  }));
});

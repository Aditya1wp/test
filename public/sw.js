// Minimal Service Worker to satisfy PWA criteria
const CACHE_NAME = 'nimcet-mock-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through. 
  // We avoid catching and returning nothing, which causes a Response type error.
  event.respondWith(fetch(event.request));
});

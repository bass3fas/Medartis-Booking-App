// Minimal service worker for basic PWA installation compliance
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let browser network request pass naturally for now
  event.respondWith(fetch(event.request));
});
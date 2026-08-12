const CACHE_NAME = 'jayblade-pwa-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './js/parts.js',
  './js/engine.js',
  './js/game.js',
  './JaybladeICON-192.png',
  './JaybladeICON-512.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

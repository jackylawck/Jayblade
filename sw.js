// 每次更新程式碼時，只要把版本號改成 v2、v3，手機就會自動清空舊快取並下載最新版！
const CACHE_NAME = 'jayblade-pwa-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './3d.html',
  './style.css',
  './css/3d.css',
  './js/security.js',
  './js/parts.js',
  './js/engine.js',
  './js/game.js',
  './js/config.js',
  './js/audio.js',
  './js/particles.js',
  './js/network.js',
  './js/ui.js',
  './js/physics.js',
  './js/app.js',
  './JaybladeICON-192.png',
  './JaybladeICON-512.png',
  './manifest.json'
];

// 1. 安裝階段：快取新資源並強制立即接管
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 跳過等待，立即啟用最新的 Service Worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// 2. 啟用階段：自動比對並清除舊版本的快取（如 v1）
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old PWA cache:', cache);
            return caches.delete(cache); // 強制刪除舊版快取
          }
        })
      );
    }).then(() => self.clients.claim()) // 立即接管所有開啟的頁面
  );
});

// 3. 請求階段：採用 Network-First（網路優先）策略
// 優先抓取伺服器最新檔案，如果沒網（離線）才讀取本地快取
self.addEventListener('fetch', (event) => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 如果網路成功抓到最新檔，順便更新快取
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 當離線或網路失敗時，才降級使用本地快取
        return caches.match(event.request);
      })
  );
});

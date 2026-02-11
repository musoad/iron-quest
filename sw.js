const SW_VERSION = "v4.0.1";
const CACHE_NAME = `ironquest-${SW_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./sw.js",

  "./js/db.js",
  "./js/exercises.js",
  "./js/xpSystem.js",
  "./js/progression.js",
  "./js/attributes.js",
  "./js/skilltree.js",
  "./js/analytics.js",
  "./js/health.js",
  "./js/boss.js",
  "./js/challenges.js",
  "./js/backup.js",
  "./js/app.js"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => {
      if (k !== CACHE_NAME) return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (!req.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(req).then(res => {
      return res || fetch(req);
    })
  );
});

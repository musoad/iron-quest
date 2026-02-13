/* sw.js ✅ iOS/GitHub Pages friendly */

const SW_VERSION = "v4.0.20";
const CACHE_NAME = `ironquest-${SW_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./sw.js",
  "./manifest.json",
  "./js/db.js",
  "./js/exercises.js",
  "./js/xpSystem.js",
  "./js/progression.js",
  "./js/attributes.js",
  "./js/analytics.js",
  "./js/health.js",
  "./js/boss.js",
  "./js/challenges.js",
  "./js/backup.js",
  "./js/utils.js",
  "./js/urls.js",
  "./js/app.js"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  // HTML network-first
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        return (await caches.match("./index.html")) || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // assets cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});

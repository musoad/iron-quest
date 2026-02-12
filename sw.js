/* =========================
   IRON QUEST – sw.js (FULL)
   ✅ Offline Cache
   ✅ Auto-Update (skipWaiting + clients.claim)
   ✅ Cache bust via SW_VERSION
========================= */

const SW_VERSION = "v4.0.9"; // <- bei JEDEM Release hochzählen
const CACHE_NAME = `ironquest-${SW_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./sw.js",

  // JS entry + modules (nur die, die wirklich existieren)
  "./js/app.js",
  "./js/utils.js",
  "./js/db.js",
  "./js/exercises.js",
  "./js/xpSystem.js",
  "./js/progression.js",
  "./js/skilltree.js",
  "./js/analytics.js",
  "./js/health.js",
  "./js/boss.js",
  "./js/challenges.js",
  "./js/backup.js"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  // HTML: network-first (damit Updates durchkommen)
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match("./index.html");
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // Assets: cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});

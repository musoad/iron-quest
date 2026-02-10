/* =========================
   IRON QUEST – sw.js (FULL)
   ✅ Offline Cache
   ✅ Auto-Update (skipWaiting + clients.claim)
   ✅ Cache bust via SW_VERSION
========================= */

const SW_VERSION = "v2.0.7"; // <-- bei JEDEM Update hochzählen
const CACHE_NAME = "ironquest-" + SW_VERSION;

// Passe die Liste an deine echten Dateien an
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./sw.js"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys.map(function (k) {
      if (k !== CACHE_NAME) return caches.delete(k);
      return Promise.resolve(true);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Network-first for HTML (so updates come through), cache-first for others
self.addEventListener("fetch", function (event) {
  const req = event.request;
  const url = new URL(req.url);

  // only handle same-origin
  if (url.origin !== self.location.origin) return;

  // HTML / navigation: network first
  if (req.mode === "navigate" || ((req.headers.get("accept") || "").indexOf("text/html") >= 0)) {
    event.respondWith((async function () {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        // immer index.html aktualisieren
        await cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match("./index.html");
        return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // Other assets: cache first
  event.respondWith((async function () {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(req, fresh.clone());
    return fresh;
  })());
});

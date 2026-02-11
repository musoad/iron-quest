/* IRON QUEST — sw.js (iOS/PWA stable)
   ✅ cache version bump
   ✅ skipWaiting + clients.claim
   ✅ navigation network-first (updates), fallback cache
   ✅ assets cache-first
*/
const SW_VERSION = "iq-v3.1.0";          // bei jedem Update erhöhen
const CACHE_NAME = `ironquest-${SW_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./utils.js",
  "./db.js",
  "./mutations.js",
  "./skilltree.js",
  "./prSystem.js",
  "./statusIcons.js",
  "./health.js",
  "./analyticsPro.js",
  "./cloud.js",
  "./challenge.js",
  "./streak.js",
  "./exercises.js",
  "./xpSystem.js",
  "./progression.js",
  "./manifest.json",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (k !== CACHE_NAME) return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  // HTML navigation: network-first
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match("./index.html");
        return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // assets: cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});

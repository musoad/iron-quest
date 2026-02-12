/* =========================
   IRON QUEST – sw.js (iOS SAFE)
   ✅ Offline Cache
   ✅ Auto-Update (skipWaiting + clients.claim)
   ✅ Network-first für HTML/JS/CSS (damit Home-Screen Updates wirklich kommen)
   ✅ Cache bust via SW_VERSION
========================= */

const SW_VERSION = "v4.0.14";               // <-- bei JEDEM Update hochzählen
const CACHE_NAME = `ironquest-${SW_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./sw.js",

  // JS Modules
  "./js/app.js",
  "./js/utils.js",
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
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(ASSETS);
    } catch (e) {
      // iOS/Safari kann bei addAll zicken → trotzdem installieren
      // (die wichtigsten Dateien kommen später über network-first)
    }
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isHTML(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}
function isAsset(url) {
  return url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".json");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  // ✅ Network-first für HTML + JS/CSS/JSON (Updates sollen IMMER durchkommen)
  if (isHTML(req) || isAsset(url)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;

        // Fallback: index.html offline
        if (isHTML(req)) {
          const cachedIndex = await caches.match("./index.html");
          return cachedIndex || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        }
        return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // Andere Requests: cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});

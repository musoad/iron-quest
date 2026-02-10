/* =========================
   IRON QUEST – sw.js (FULL)
   ✅ Offline Cache
   ✅ iOS PWA Auto-Update (skipWaiting + clients.claim)
   ✅ Cache bust via SW_VERSION
========================= */

const SW_VERSION = "v2.1.0-ios26"; // <-- bei JEDEM Update hochzählen
const CACHE_NAME = `ironquest-${SW_VERSION}`;

// Passe die Liste an deine echten Dateien an
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  // iOS: sofort aktiv werden
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // alte Caches löschen
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Strategy:
// - Navigations/HTML: Network-first (Updates kommen durch), fallback cache
// - Assets: Stale-while-revalidate (schnell + aktualisiert im Hintergrund)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Nur same-origin
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");

  if (isHTML) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          // Wichtig: index.html explizit aktualisieren
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match("./index.html");
          return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        }
      })()
    );
    return;
  }

  // Assets: stale-while-revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const fetchPromise = (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return cached;
        }
      })();

      return cached || fetchPromise;
    })()
  );
});

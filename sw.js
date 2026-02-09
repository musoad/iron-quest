/* =========================
   IRON QUEST – sw.js (AUTO UPDATE PWA)
   - iOS/HomeScreen friendly caching
   - skipWaiting + clients.claim
   - broadcasts SW_UPDATED to app.js
========================= */

const CACHE_VERSION = "v2.0.1"; // <-- bei JEDEM Update erhöhen!
const CACHE_NAME = `ironquest-cache-${CACHE_VERSION}`;

// Passe die Asset-Liste an, wenn du andere Dateinamen nutzt
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icon-192.png",
  "./icon-512.png"
].filter(Boolean);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();

    // Inform all clients about update
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of clients) c.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION });
  })());
});

/**
 * Strategy:
 * - Navigation (HTML): network-first (so updates arrive)
 * - Others: stale-while-revalidate (fast + updates)
 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  // Network-first for page navigations
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
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

  // Stale-while-revalidate for other requests
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const fetchPromise = fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      return res;
    }).catch(() => cached);

    return cached || fetchPromise;
  })());
});

/* =========================
   IRON QUEST – sw.js (AUTO UPDATE PWA)
   - Cache busting via CACHE_VERSION
   - skipWaiting + clients.claim
   - Broadcast "SW_UPDATED" to open clients
========================= */

const CACHE_VERSION = "v1.0.2"; // <-- bei JEDEM Update hochzählen!
const CACHE_NAME = `ironquest-cache-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
].filter(Boolean);

// INSTALL: precache + sofort warten überspringen
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: alte caches löschen + clients.claim
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();

    // Clients über Update informieren
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of clients) {
      c.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION });
    }
  })());
});

// FETCH STRATEGY
// - Navigations: network-first (HTML aktuell)
// - Assets: stale-while-revalidate (schnell + updatefähig)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Nur same-origin
  if (url.origin !== self.location.origin) return;

  // HTML Navigation: network-first
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

  // stale-while-revalidate für alles andere
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

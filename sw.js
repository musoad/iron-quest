/* IRON QUEST – sw.js (PWA cache fix) */
const CACHE_VERSION = "v32"; // <-- bei JEDEM Update erhöhen!
const CACHE_NAME = `ironquest-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Install: cache assets + sofort aktivieren
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: alte caches löschen + Kontrolle übernehmen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

// Fetch:
// - Navigation (index.html) immer “network first” (damit Updates ankommen)
// - Sonst “stale while revalidate”
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Nur gleicher Origin
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first (PWA bekommt neue Version)
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch("./index.html", { cache: "no-store" });
          const cache = await caches.open(CACHE_NAME);
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch (e) {
          const cached = await caches.match("./index.html");
          return cached || new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  // Stale-while-revalidate für statische Files
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const fetchPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })()
  );
});

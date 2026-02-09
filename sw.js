/* =========================
   IRON QUEST – Service Worker
   Version: v1.4.0
   ========================= */

const CACHE_VERSION = "ironquest-cache-v1.4.1"; // ⬅️ VERSION ERHÖHT
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

/* =========================
   INSTALL
========================= */
self.addEventListener("install", (event) => {
  console.log("[SW] Install", CACHE_VERSION);
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

/* =========================
   ACTIVATE
========================= */
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate", CACHE_VERSION);

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

/* =========================
   FETCH
========================= */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache only successful basic responses
        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

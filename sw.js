const CACHE = "ironquest-cache-v99"; // ✅ Version hochsetzen bei jedem Update
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting(); // ✅ sofort aktivieren
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)));
    await self.clients.claim(); // ✅ sofort für offene Tabs übernehmen
  })());
});

// ✅ Network-first für HTML/JS (damit du Updates bekommst)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  const isCritical =
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/style.css");

  if (isCritical) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match("./");
      }
    })());
    return;
  }

  // Standard: cache-first
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

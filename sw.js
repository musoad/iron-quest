/* IRON QUEST – sw.js (stable)
   - Cache bust via SW_VERSION
   - skipWaiting + clients.claim
   - network-first for HTML
*/

const SW_VERSION = "v4.0.22";
const CACHE_NAME = `ironquest-${SW_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./sw.js",
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
  "./js/app.js"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
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

  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");

  if (isHTML) {
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

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});

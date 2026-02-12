/* =========================
   IRON QUEST v4 PRO – sw.js
   ✅ Offline Cache
   ✅ Auto-Update (skipWaiting + clients.claim)
   ✅ Cache bust via SW_VERSION
   ✅ GitHub Pages / iOS friendly
========================= */

const SW_VERSION = "v4.0.12"; // <-- bei JEDEM Update hochzählen
const CACHE_NAME = `ironquest-${SW_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./sw.js",

  "./js/analytics.js",
  "./js/app.js",
  "./js/attributes.js",
  "./js/backup.js",
  "./js/boss.js",
  "./js/challenges.js",
  "./js/db.js",
  "./js/exercises.js",
  "./js/health.js",
  "./js/progression.js",
  "./js/skilltree.js",
  "./js/utils.js",
  "./js/xpSystem.js"
];

// Install: cache assets + activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: clean old caches + take control
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

// Allow page to trigger update
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Network-first for HTML (so updates come through), cache-first for others
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // only handle same-origin
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";

  // HTML / navigation: network first
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match("./index.html");
        return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" }});
      }
    })());
    return;
  }

  // Other assets: cache first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});

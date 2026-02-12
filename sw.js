/* =========================
   IRON QUEST – sw.js (FULL)
   ✅ Offline Cache
   ✅ Update stabil (skipWaiting + clients.claim)
   ✅ iOS-friendly: Network-first for HTML + JS + CSS
========================= */

const SW_VERSION = "v4.0.14"; // <-- bei jedem Update hochzählen
const CACHE_NAME = `ironquest-${SW_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./sw.js",

  // JS Modules (wenn vorhanden, sonst ignoriert fetch fallback)
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
  "./js/backup.js"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(ASSETS);
    } catch (e) {
      // Falls einzelne Dateien fehlen -> trotzdem installieren
      // (GitHub Pages/Paths können manchmal abweichen)
      for (const a of ASSETS) {
        try { await cache.add(a); } catch (_) {}
      }
    }
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function isHTML(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}
function isJS(req) {
  const url = new URL(req.url);
  return url.pathname.endsWith(".js");
}
function isCSS(req) {
  const url = new URL(req.url);
  return url.pathname.endsWith(".css");
}

// Network-first for HTML + JS + CSS (updates!), cache-first fallback for others
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  if (isHTML(req) || isJS(req) || isCSS(req)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;

        // Fallback auf index.html (für Navigation offline)
        if (isHTML(req)) {
          const idx = await caches.match("./index.html");
          return idx || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        }
        return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // Other assets: cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});

// v11: safer update strategy for GitHub Pages PWA
// - Network-first for navigations (so new index.html lands)
// - Stale-while-revalidate for JS/CSS
// - Cache-first for other GET assets
const CACHE = "ironquest-v11-2026-03-05";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./js/app.js",
  "./js/state.js",
  "./js/schema.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNav = req.mode === "navigate";
  const isJS = isSameOrigin && url.pathname.endsWith(".js");
  const isCSS = isSameOrigin && url.pathname.endsWith(".css");

  // Network-first for navigations
  if(isNav){
    event.respondWith((async()=>{
      try{
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("./index.html", fresh.clone()).catch(()=>{});
        return fresh;
      }catch(_){
        const cache = await caches.open(CACHE);
        const cached = await cache.match("./index.html");
        return cached || caches.match(req);
      }
    })());
    return;
  }

  // Stale-while-revalidate for JS/CSS
  if(isJS || isCSS){
    event.respondWith((async()=>{
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(res=>{
        cache.put(req, res.clone()).catch(()=>{});
        return res;
      }).catch(()=>cached);
      return cached || fetchPromise;
    })());
    return;
  }

  // Cache-first for everything else
  event.respondWith((async()=>{
    const cached = await caches.match(req);
    if(cached) return cached;
    try{
      const res = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone()).catch(()=>{});
      return res;
    }catch(_){
      return cached;
    }
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

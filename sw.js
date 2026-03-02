const SW_VERSION="v8.0.0-hunter-ascended";
const CACHE_NAME=`ironquest-${SW_VERSION}`;
const ASSETS=[
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./sw.js",
  "./js/utils.js",
  "./js/ui_effects.js",
  "./js/toast.js",
  "./js/db.js",
  "./js/exercises.js",
  "./js/progression.js",
  "./js/hunterRank.js",
  "./js/classes.js",
  "./js/skilltree_v2.js",
  "./js/xpSystem.js",
  "./js/loot.js",
  "./js/equipment.js",
  "./js/attributes.js",
  "./js/coach_engine.js",
  "./js/home.js",
  "./js/skills.js",
  "./js/logFeature.js",
  "./js/gates.js",
  "./js/bossArena.js",
  "./js/review.js",
  "./js/health.js",
  "./js/backup.js",
  "./js/app.js"
];

self.addEventListener("install",(e)=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
});
self.addEventListener("activate",(e)=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null));
    await self.clients.claim();
  })());
});
self.addEventListener("message",(e)=>{
  if(e.data && e.data.type==="SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch",(e)=>{
  const req=e.request;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  if(req.mode==="navigate"){
    e.respondWith((async()=>{
      try{
        const fresh=await fetch(req);
        const cache=await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      }catch{
        return (await caches.match("./index.html")) || new Response("Offline",{status:503});
      }
    })());
    return;
  }

  e.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached) return cached;
    const fresh=await fetch(req);
    const cache=await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});

const SW_VERSION="v9.0.1-unified";
const CACHE_NAME=`ironquest-${SW_VERSION}`;
const ASSETS=[
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./sw.js",
  "./js/analytics.js",
  "./js/app.js",
  "./js/attributes.js",
  "./js/backup.js",
  "./js/bossArena.js",
  "./js/challenges.js",
  "./js/classes.js",
  "./js/coach_engine.js",
  "./js/db.js",
  "./js/equipment.js",
  "./js/exercises.js",
  "./js/gates.js",
  "./js/health.js",
  "./js/home.js",
  "./js/hunterRank.js",
  "./js/jogging.js",
  "./js/levelup.js",
  "./js/logFeature.js",
  "./js/loot.js",
  "./js/progression.js",
  "./js/review.js",
  "./js/rpg.js",
  "./js/session.js",
  "./js/skills.js",
  "./js/skilltree_v2.js",
  "./js/toast.js",
  "./js/uiEffects.js",
  "./js/urls.js",
  "./js/utils.js",
  "./js/xpSystem.js"
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

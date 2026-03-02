const SW_VERSION = "v5.2.0-solo";
const CACHE_NAME = `ironquest-${SW_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./sw.js",

  "./js/utils.js",
  "./js/toast.js",
  "./js/urls.js",
  "./js/db.js",

  "./js/exercises.js",
  "./js/xpSystem.js",
  "./js/progression.js",
  "./js/skilltree.js",
  "./js/attributes.js",
  "./js/rpg.js",
  "./js/coach.js",
  "./js/loot.js",
  "./js/session.js",

  "./js/jogging.js",
  "./js/analytics.js",
  "./js/health.js",
  "./js/boss.js",
  "./js/challenges.js",
  "./js/backup.js",
  "./js/app.js",
];

self.addEventListener("install",(event)=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
});

self.addEventListener("activate",(event)=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null));
    await self.clients.claim();
  })());
});

self.addEventListener("message",(event)=>{
  if(event.data && event.data.type==="SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch",(event)=>{
  const req=event.request;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  if(req.mode==="navigate"){
    event.respondWith((async()=>{
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

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached) return cached;
    const fresh=await fetch(req);
    const cache=await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});

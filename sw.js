const SW_VERSION="v10.0.2-clean-master-hotfix";
const CACHE_NAME=`ironquest-${SW_VERSION}`;
const ASSETS=[
  "./",
  "./ChatGPT Image 3. Feb. 2026, 09_04_02.png",
  "./index.html",
  "./js/analytics.js",
  "./js/app.js",
  "./js/attributes.js",
  "./js/backup.js",
  "./js/bossArena.js",
  "./js/challenges.js",
  "./js/classes.js",
  "./js/coach_engine.js",
  "./js/collections.js",
  "./js/db.js",
  "./js/diagnostics.js",
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
  "./js/periodization.js",
  "./js/plans.js",
  "./js/profile.js",
  "./js/progression.js",
  "./js/review.js",
  "./js/rpg.js",
  "./js/session.js",
  "./js/share.js",
  "./js/skills.js",
  "./js/skilltree_v2.js",
  "./js/toast.js",
  "./js/uiEffects.js",
  "./js/urls.js",
  "./js/utils.js",
  "./js/xpSystem.js",
  "./manifest.json",
  "./style.css",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith("ironquest-") && k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle GET
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cache same-origin only
        try{
          const url = new URL(req.url);
          if (url.origin === self.location.origin){
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
        }catch{}
        return res;
      }).catch(() => cached);
    })
  );
});

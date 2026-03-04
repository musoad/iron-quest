const SW_VERSION = "v10-1-master-2026-03-04";
const CACHE_NAME = "ironquest-" + SW_VERSION;

const CORE = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if(event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);

  const accept = req.headers.get("accept") || "";
  const isNav = req.mode === "navigate" || accept.indexOf("text/html") !== -1 || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");

  if(isNav){
    event.respondWith((async () => {
      try{
        const net = await fetch(req, { cache: "no-store" });
        // update cached index for offline fallback
        try{
          const c = await caches.open(CACHE_NAME);
          c.put("./index.html", net.clone());
        }catch(_){}
        return net;
      }catch(e){
        const cached = await caches.match("./index.html");
        return cached || new Response("Offline", { status: 503, headers: { "Content-Type":"text/plain" }});
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      return hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(()=>{});
        return res;
      });
    })
  );
});

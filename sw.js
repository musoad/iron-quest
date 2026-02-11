const CACHE = "ironquest-v4-1.0.0";

self.addEventListener("install", e => {
self.skipWaiting();
e.waitUntil(
caches.open(CACHE).then(c => c.addAll([
"./",
"./index.html",
"./style.css",
"./js/app.js"
]))
);
});

self.addEventListener("activate", e => {
e.waitUntil(
caches.keys().then(keys =>
Promise.all(keys.map(k => {
if(k !== CACHE) return caches.delete(k);
}))
)
);
});

self.addEventListener("fetch", e => {
e.respondWith(
caches.match(e.request).then(res => res || fetch(e.request))
);
});

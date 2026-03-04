const SW_VERSION = "v10-html-hotfix-2";
const CACHE_NAME = `ironquest-${SW_VERSION}`;

const CORE = [
  "./index.html",
  "./style.css",
  "./manifest.json",
];

// install: cache core
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

// activate: delete old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// helper: ensure HTML content-type
async function ensureHtmlResponse(res) {
  try {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    // if already html, ok
    if (ct.includes("text/html")) return res;

    // If server sends text/plain but body is HTML, rewrap it:
    const text = await res.clone().text();
    const looksLikeHtml =
      text.trim().startsWith("<!doctype") ||
      text.trim().startsWith("<html") ||
      text.includes("<head") ||
      text.includes("<body");

    if (!looksLikeHtml) return res;

    return new Response(text, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return res;
  }
}

// fetch
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Treat navigations as HTML
  const isNav =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html") ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html");

  if (isNav) {
    event.respondWith((async () => {
      try {
        // NETWORK FIRST for HTML to avoid serving stale broken HTML
        const net = await fetch(req, { cache: "no-store" });
        const fixed = await ensureHtmlResponse(net);

        // update cache
        const c = await caches.open(CACHE_NAME);
        c.put("./index.html", fixed.clone()).catch(() => {});
        return fixed;
      } catch {
        // fallback to cached index
        const cached = await caches.match("./index.html");
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // For assets: cache-first then network
  event.respondWith(
    caches.match(req).then((hit) => {
      return (
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
      );
    })
  );
});

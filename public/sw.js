// [ezo-pwa] Service Worker — يدوي، لا يعتمد على workbox
// Strategy:
//   - Precache app shell (HTML/CSS/JS/icons)
//   - Network-first لـ Convex API
//   - Cache-first لـ Cloudinary media
//   - Stale-while-revalidate لـ Agora SDK

const SW_VERSION = "ezo-v1";
const SHELL_CACHE = `${SW_VERSION}-shell`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;

// App shell — يُجلب عند التثبيت
const SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon-32.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn("[SW] skip", url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(SW_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Helper: هل هذا Convex API؟
function isConvexApi(url) {
  return /\.convex\.(cloud|site)\//.test(url);
}
function isCloudinary(url) {
  return /res\.cloudinary\.com/.test(url);
}
function isAgora(url) {
  return /\.agora\.io\//.test(url);
}
function isNavigation(request) {
  return request.mode === "navigate";
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1) التنقل (HTML) — network-first مع fallback للـ shell
  if (isNavigation(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // 2) Convex API — network-first
  if (isConvexApi(url.href)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 3) Cloudinary — cache-first
  if (isCloudinary(url.href)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // 4) Agora SDK — stale-while-revalidate
  if (isAgora(url.href)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // 5) باقي الملفات — cache-first مع تحديث خلفي
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // تحديث خلفي بدون حجب
        fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(req).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});

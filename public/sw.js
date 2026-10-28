const CACHE = "croute-v2";
const SHELL = [
  "/", "/style.css", "/manifest.webmanifest", "/icons/icon-192.png",
  "/js/version.js", "/js/shared/store.js", "/js/shared/format.js",
  "/js/game/field.js", "/js/game/projectiles.js", "/js/game/attacks.js", "/js/game/solver.js", "/js/game/sim.js",
  "/js/app/api.js", "/js/app/audio.js", "/js/app/sfx.js", "/js/app/input.js", "/js/app/sprites.js", "/js/app/scene.js", "/js/app/screens.js", "/js/app/main.js"
];
const FONTS = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (FONTS.includes(url.origin)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/music/") || url.pathname.startsWith("/admin")) return;

  event.respondWith(
    fetch(req, { cache: "no-store" })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("/")))
  );
});

const CACHE = "croute-" + (new URL(self.location.href).searchParams.get("v") || "v19");
const SHELL = [
  "/", "/style.css", "/catalog.css", "/manifest.webmanifest", "/icons/icon-192.png", "/qr.svg",
  "/js/version.js", "/js/errors.js", "/js/boot.js", "/js/shared/store.js", "/js/shared/format.js", "/js/shared/palette.js", "/js/shared/local.js", "/js/shared/timeout.js",
  "/js/game/field.js", "/js/game/projectiles.js", "/js/game/attacks.js", "/js/game/solver.js", "/js/game/sim.js",
  "/js/app/api.js", "/js/app/audio.js", "/js/app/catalog.js", "/js/app/input.js", "/js/app/sprites.js", "/js/app/scene.js", "/js/app/planets.js", "/js/app/screens.js", "/js/app/install.js", "/js/app/settings.js", "/js/app/party.js", "/js/app/achievements.js", "/js/app/toppings.js", "/js/app/gear.js", "/js/app/profile.js", "/js/app/account.js", "/js/app/guide.js", "/js/app/diag.js", "/js/app/loader.js", "/js/app/main.js"
];
const FONTS = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];
const NET_MS = 3000;

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
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/music/") || url.pathname.startsWith("/admin")) return;

  let settled = false;
  const net = fetch(req, { cache: "no-cache" }).then((res) => {
    settled = true;
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(req, copy));
    }
    return res;
  });
  const saved = () => caches.match(req, { ignoreSearch: true });
  const slow = new Promise((resolve) => setTimeout(resolve, NET_MS)).then(() => (settled ? net : saved().then((hit) => hit || net)));
  event.waitUntil(net.catch(() => {}));
  event.respondWith(Promise.race([net, slow]).catch(() => saved().then((hit) => hit || (req.mode === "navigate" ? caches.match("/") : Response.error()))));
});

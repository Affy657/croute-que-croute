let restarting = false;

async function freshStart() {
  const files = [...document.querySelectorAll('link[rel="modulepreload"]')].map((link) => link.href);
  const clean = Promise.all([
    self.caches ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))) : null,
    navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then((list) => Promise.all(list.map((sw) => sw.unregister()))) : null
  ]).catch(() => {}).then(() => Promise.all(files.map((file) => fetch(file, { cache: "reload" }).catch(() => null))));
  await Promise.race([clean, new Promise((done) => setTimeout(done, 6000))]);
  location.reload();
}

addEventListener("error", (e) => {
  if (restarting || document.documentElement.dataset.ready) return;
  if (!(e.target instanceof HTMLScriptElement) && !(e instanceof ErrorEvent)) return;
  let tries = 0;
  try {
    const now = Date.now();
    if (now - (Number(sessionStorage.getItem("cv-boot-reload")) || 0) < 60000) tries = Number(sessionStorage.getItem("cv-boot-tries")) || 0;
    if (tries >= 2 || (tries === 1 && !navigator.onLine)) return;
    sessionStorage.setItem("cv-boot-reload", String(now));
    sessionStorage.setItem("cv-boot-tries", String(tries + 1));
  } catch (err) {
    return;
  }
  restarting = true;
  if (tries) freshStart();
  else location.reload();
}, true);

{
  const loader = document.getElementById("loader");
  const STUCK_MS = 10000, FILES = /\.(js|css|woff2?)(\?|$)/;
  let files = 0;
  try {
    new PerformanceObserver((list) => {
      files += list.getEntries().filter((e) => FILES.test(e.name)).length;
      if (!loader.classList.contains("done")) loader.style.setProperty("--load", String(0.9 - 0.8 / (1 + files / 6)));
    }).observe({ type: "resource", buffered: true });
  } catch (err) {}
  setTimeout(() => loader.classList.add("done"), STUCK_MS);
}

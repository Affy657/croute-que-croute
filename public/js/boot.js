addEventListener("error", (e) => {
  if (document.documentElement.dataset.ready) return;
  if (!(e instanceof ErrorEvent) && !(e.target && e.target.tagName === "SCRIPT")) return;
  try {
    if (Date.now() - (Number(sessionStorage.getItem("cv-boot-reload")) || 0) < 15000) return;
    sessionStorage.setItem("cv-boot-reload", String(Date.now()));
  } catch (err) {
    return;
  }
  location.reload();
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

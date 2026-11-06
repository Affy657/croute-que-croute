(() => {
  const OLD = "https://croute-que-croute.tartine-sauvage.workers.dev", HOST = "croute-que-croute.tartinesauvage.fr";
  const REACH_MS = 2500, TRIPS = 3, TRIPS_KEY = "cv-sonde-essais";
  const found = location.hash.match(/^#demenage=(.+)$/);
  /** @param {string} id */
  const field = (id) => document.getElementById(id);
  const installed = () => navigator.standalone === true || (!!window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);

  function busy() {
    const focused = document.activeElement;
    return !!localStorage.getItem("cv-token") || field("menu").hidden || (!!focused && focused.tagName === "INPUT") || !!field("pseudo").value || !!field("linkInput").value;
  }

  function probe() {
    const trips = Number(localStorage.getItem(TRIPS_KEY)) || 0;
    if (location.hostname !== HOST || location.hash || trips >= TRIPS || installed() || localStorage.getItem("cv-token") || localStorage.getItem("cv-sonde")) return;
    const stop = new AbortController();
    setTimeout(() => stop.abort(), REACH_MS);
    fetch(OLD + "/manifest.webmanifest", { mode: "no-cors", cache: "no-store", signal: stop.signal }).then(() => {
      if (busy()) return;
      localStorage.setItem("cv-sonde", "1");
      localStorage.setItem(TRIPS_KEY, String(trips + 1));
      location.replace(OLD + "/depart");
    }).catch(() => {});
  }

  try {
    if (!found) {
      probe();
      return;
    }
    history.replaceState(null, "", location.pathname + location.search);
    localStorage.setItem("cv-sonde", "1");
    const { code, data, retry } = JSON.parse(decodeURIComponent(found[1]));
    if (retry) localStorage.removeItem("cv-sonde");
    if (/^[A-Za-z0-9-]{1,12}$/.test(code || "")) sessionStorage.setItem("cv-arrivee", code);
    if (localStorage.getItem("cv-token")) return;
    for (const key of Object.keys(data || {})) {
      if (/^cv-[a-z-]+$/.test(key) && key !== "cv-token" && key !== "cv-client") localStorage.setItem(key, String(data[key]));
    }
  } catch (e) {}
})();

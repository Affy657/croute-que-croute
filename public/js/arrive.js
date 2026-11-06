(() => {
  const OLD = "https://croute-que-croute.tartine-sauvage.workers.dev", HOST = "croute-que-croute.tartinesauvage.fr";
  const found = location.hash.match(/^#demenage=(.+)$/);
  try {
    if (!found) {
      if (location.hostname !== HOST || location.hash || localStorage.getItem("cv-token") || localStorage.getItem("cv-sonde")) return;
      localStorage.setItem("cv-sonde", "1");
      location.replace(OLD + "/depart");
      return;
    }
    history.replaceState(null, "", location.pathname + location.search);
    localStorage.setItem("cv-sonde", "1");
    const { code, data } = JSON.parse(decodeURIComponent(found[1]));
    if (/^[A-Za-z0-9-]{1,12}$/.test(code || "")) sessionStorage.setItem("cv-arrivee", code);
    if (localStorage.getItem("cv-token")) return;
    for (const key of Object.keys(data || {})) {
      if (/^cv-[a-z-]+$/.test(key) && key !== "cv-token" && key !== "cv-client") localStorage.setItem(key, String(data[key]));
    }
  } catch (e) {}
})();

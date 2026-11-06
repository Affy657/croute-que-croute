(() => {
  const found = location.hash.match(/^#demenage=(.+)$/);
  if (!found) return;
  history.replaceState(null, "", location.pathname + location.search);
  try {
    if (localStorage.getItem("cv-token")) return;
    const { code, data } = JSON.parse(decodeURIComponent(found[1]));
    for (const key of Object.keys(data || {})) {
      if (/^cv-[a-z-]+$/.test(key) && key !== "cv-token" && key !== "cv-client") localStorage.setItem(key, String(data[key]));
    }
    if (/^[A-Za-z0-9-]{1,12}$/.test(code || "")) sessionStorage.setItem("cv-arrivee", code);
  } catch (e) {}
})();

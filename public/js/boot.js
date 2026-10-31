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

export const KEYS = {
  playerToken: "cv-token",
  clientId: "cv-client",
  localBest: "cv-best-cs",
  musicOff: "cv-muted",
  sfxOff: "cv-sfx-off",
  adminToken: "cqc-admin-token",
  installAsked: "cv-install-asked",
  lastReload: "cv-reload"
};

function safe(storage) {
  return {
    get(k) { try { return storage().getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v === null || v === undefined) storage().removeItem(k); else storage().setItem(k, String(v)); } catch (e) {} }
  };
}

export const store = safe(() => localStorage);
export const session = safe(() => sessionStorage);

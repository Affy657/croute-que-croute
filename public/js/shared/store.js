export const KEYS = {
  playerToken: "cv-token",
  clientId: "cv-client",
  localBest: "cv-best-cs",
  myBests: "cv-records",
  musicOff: "cv-muted",
  sfxOff: "cv-sfx-off",
  musicVolume: "cv-music-vol",
  sfxVolume: "cv-sfx-vol",
  adminToken: "cqc-admin-token",
  installAsked: "cv-install-asked",
  achievements: "cv-succes",
  toppings: "cv-garnitures",
  topping: "cv-garniture",
  outfitSeen: "cv-tenue-vue",
  outfitAt: "cv-tenue-at",
  gear: "cv-accessoire",
  side: "cv-cotes",
  bread: "cv-pain",
  aura: "cv-aura",
  pendingScores: "cv-score-attente",
  lastReload: "cv-reload",
  quality: "cv-qualite",
  sensitivity: "cv-sensibilite",
  mouseAim: "cv-souris",
  invincible: "cv-invincible",
  diag: "cv-diag"
};

/** @param {() => Storage} storage @returns {Store} */
function safe(storage) {
  return {
    get(k) { try { return storage().getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v === null || v === undefined) storage().removeItem(k); else storage().setItem(k, String(v)); } catch (e) {} }
  };
}

export const store = safe(() => localStorage);
export const session = safe(() => sessionStorage);

/** @param {number} cs */
export const fmtCs = (cs) => (cs / 100).toFixed(2).replace(".", ",");

/** @param {number} n */
export const ord = (n) => (n === 1 ? "1er" : n + "e");

/** @param {number} ms */
export function clock(ms) {
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? h + ":" + String(m).padStart(2, "0") + ":" + ss : m + ":" + ss;
}

/** @param {number} ms */
export const hourOf = (ms) => new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");

/** @param {number} ms */
export function when(ms) {
  return new Date(ms).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" }) + " à " + hourOf(ms);
}

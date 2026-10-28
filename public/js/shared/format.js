export const fmtCs = (cs) => (cs / 100).toFixed(2).replace(".", ",");

export const ord = (n) => (n === 1 ? "1er" : n + "e");

export function clock(ms) {
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? h + ":" + String(m).padStart(2, "0") + ":" + ss : m + ":" + ss;
}

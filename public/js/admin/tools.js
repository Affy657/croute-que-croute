export const LIMIT = 20;

/** @param {string} text */
export const fold = (text) => String(text || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

/**
 * @param {AdminPlayer[]} players
 * @param {string} query
 * @param {boolean} all
 * @param {number} [limit]
 */
export function visiblePlayers(players, query, all, limit = LIMIT) {
  let rank = 0;
  const ranked = players.map((player) => ({ player, rank: !player.banned && !player.removed && player.best > 0 ? ++rank : 0 }));
  const wanted = fold(query);
  const found = wanted ? ranked.filter((r) => fold(r.player.pseudo).includes(wanted)) : ranked;
  const rows = wanted || all ? found : found.slice(0, limit);
  return { rows, rest: found.length - rows.length };
}

/** @param {{ opensAt: number, closesAt: number }} ev @param {number} now */
export const phase = (ev, now) => (now < ev.opensAt ? "upcoming" : now < ev.closesAt ? "open" : "closed");

/** @param {string} name */
export function nextName(name) {
  const m = /^(.*#\s*)(\d+)\s*$/.exec(name || "");
  return m ? m[1] + (Number(m[2]) + 1) : "";
}

/** @param {number} start @param {{ opensAt: number, closesAt: number } | null} last */
export const endAfter = (start, last) => (Number.isFinite(start) && last && last.closesAt > last.opensAt ? start + last.closesAt - last.opensAt : NaN);

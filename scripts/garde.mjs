export const URGENT = "--pendant-soiree";

export function blocked(board, args = []) {
  const ev = board.event;
  if (!ev || board.now >= ev.finalAt || args.includes(URGENT)) return null;
  const why = ev.status === "open" ? "est ouverte" : "compte encore ses dernières parties (5 min après la fin)";
  return `la soirée « ${ev.name} » ${why}. En cas d'urgence seulement : npm run deploy -- ${URGENT}`;
}

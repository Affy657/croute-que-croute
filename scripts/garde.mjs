export const URGENT = "--pendant-soiree";
export const NO_GITHUB = "--sans-github";
export const CHECKS = [["tests.yml", "Tests"], ["safari.yml", "Safari"]];
export const OFF_GIT = ["public/music/theme.m4a", ...["death", "first", "near", "record", "start"].map((name) => `public/sfx/${name}.mp3`)];

export function blocked(board, args = []) {
  const ev = board.event;
  if (!ev || board.now >= ev.finalAt || args.includes(URGENT)) return null;
  const why = ev.status === "open" ? "est ouverte" : "compte encore ses dernières parties (15 s après la fin)";
  return `la soirée « ${ev.name} » ${why}. En cas d'urgence seulement : npm run deploy -- ${URGENT}`;
}

export function ignoredPaths(workflow) {
  const line = workflow.match(/paths-ignore:\s*\[([^\]]*)\]/);
  return line ? [...line[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
}

export const ignored = (file, patterns) => patterns.some((p) => (p.endsWith("/**") ? file.startsWith(p.slice(0, -2)) : file === p));

export function checkFailed(name, file, runs, fits) {
  const last = runs.find((r) => fits(r.headSha));
  const again = `gh workflow run ${file} --ref master`;
  if (!last) return `${name} n'a pas tourné sur ce commit. Lancer : ${again}, puis relancer la mise en ligne quand il est vert.`;
  if (last.status !== "completed") return `${name} tourne encore sur ce commit : relancer la mise en ligne quand il est fini.`;
  if (last.conclusion !== "success") return `${name} n'est pas vert sur ce commit (${last.conclusion}). Corriger, ou relancer : ${again}.`;
  return null;
}

export function drift(lock, installed) {
  const root = lock.packages[""];
  return Object.keys({ ...root.dependencies, ...root.devDependencies })
    .map((name) => [name, lock.packages["node_modules/" + name]?.version, installed(name)])
    .filter(([, want, have]) => want !== have)
    .map(([name, want, have]) => `${name} ${have || "absent"} au lieu de ${want}`);
}

export function offGitProblem(listing) {
  const found = listing.split(/\r?\n/).filter(Boolean);
  const missing = OFF_GIT.filter((f) => !found.includes(f));
  const extra = found.filter((f) => !OFF_GIT.includes(f));
  const why = [];
  if (missing.length) why.push(`fichiers hors git absents, le jeu partirait sans son : ${missing.join(", ")}`);
  if (extra.length) why.push(`fichiers ignorés par git qui seraient servis en ligne : ${extra.join(", ")}`);
  return why.length ? why.join(". ") + "." : null;
}

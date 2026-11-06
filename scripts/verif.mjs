const PROD = "https://croute-que-croute.tartinesauvage.fr";
const FULL = /^\d+\.\d+\.\d+\+[0-9a-f]+$/;
const PAGES = ["/", "/ecran", "/admin", "/js/ecran/ecran.js", "/js/admin/admin.js", "/admin.css", "/ecran.css"];
const TRIES = 10, GAP_MS = 3000;

const wanted = process.argv[2] || null;
if (wanted && !FULL.test(wanted)) {
  console.error(`Version attendue illisible : ${wanted} (exemple : 0.46.1+373facb).`);
  process.exit(1);
}

const results = [];
const check = (name, ok, detail = "") => results.push(`${ok ? "OK  " : "FAIL"} ${name}${ok || !detail ? "" : " -> " + detail}`);
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const get = (path) => fetch(`${PROD}${path}${path.includes("?") ? "&" : "?"}verif=${Date.now()}`, { cache: "no-store", redirect: "manual" });

async function versions() {
  const [file, board] = await Promise.all([
    get("/js/version.js").then((r) => (r.ok ? r.text() : "")).catch(() => ""),
    get("/api/board").then((r) => (r.ok ? r.json() : null)).catch(() => null)
  ]);
  return { file: (file.match(/VERSION = "([^"]+)"/) || [])[1] || null, board };
}

let v = await versions();
for (let i = 1; i < TRIES && wanted && (v.file !== wanted || v.board?.version !== wanted); i++) {
  await wait(GAP_MS);
  v = await versions();
}
check("classement en ligne (/api/board)", !!v.board && Array.isArray(v.board.top), "pas de réponse");
check("version du jeu lisible", FULL.test(v.file || ""), String(v.file));
check("le jeu et le serveur ont la même version", !!v.board && v.file === v.board.version, `${v.file} / ${v.board?.version}`);
if (wanted) check(`version ${wanted} en ligne`, v.file === wanted && v.board?.version === wanted, `${v.file} / ${v.board?.version}`);

const home = await get("/").catch(() => null);
check("en-tête de sécurité (CSP) sur la page du jeu", !!home && (home.headers.get("content-security-policy") || "").includes("script-src 'self'"));

const sw = await get("/sw.js").then((r) => (r.ok ? r.text() : "")).catch(() => "");
const shell = JSON.parse((sw.match(/const SHELL = (\[[\s\S]*?\]);/) || [])[1] || "[]");
check("cache hors ligne (sw.js) lisible", shell.length > 30, `${shell.length} fichiers`);

const pages = [...new Set([...shell, ...PAGES, "/api/feed", "/api/ecran"])];
const answers = await Promise.all(pages.map((p) => get(p).then((r) => r.status, () => 0)));
const broken = pages.flatMap((p, i) => (answers[i] === 200 ? [] : [`${p} (${answers[i]})`]));
check(`les ${pages.length} pages et fichiers répondent`, !broken.length, broken.join(", "));

console.log(results.join("\n"));
const failed = results.filter((l) => l.startsWith("FAIL")).length;
console.log(`${failed} échec(s) sur ${results.length}`);
process.exit(failed ? 1 : 0);

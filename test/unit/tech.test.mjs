import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";

const page = readFileSync("public/tech.html", "utf8").replaceAll(String.fromCharCode(160), " ");
const code = (file) => readFileSync(file, "utf8");
const constant = (file, name) => Number(code(file).match(new RegExp(`\\b${name} = ([\\d.]+)[,;]`))[1]);
const fr = (n) => String(Math.round(n * 100) / 100).replace(".", ",");
const thousands = (n) => String(n).replace(/\B(?=(\d{3})+$)/g, " ");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const missing = (said) => said.filter((s) => !page.includes(s));

test("page technique : les chiffres du solveur sont ceux du code", () => {
  const solver = "public/js/game/solver.js", sim = "public/js/game/sim.js";
  const cell = constant(solver, "CELL"), steps = Number(code(solver).match(/\bSDT = 1 \/ (\d+)[,;]/)[1]);
  assert.deepEqual(missing([
    `les ${fr(constant(solver, "HORIZON"))} s suivantes`,
    `Cases balayées en ${fr(constant(solver, "HORIZON"))} s`,
    `${fr(constant(solver, "HORIZON_LONG"))} s pour une attaque longue`,
    `Cases de ${cell} px`,
    `doigt à ${cell * steps} px/s`,
    `${constant(solver, "MARGIN")} px de marge`,
    `sur 1/${steps} s`,
    `en lui laissant ${fr(constant(sim, "REACT"))} s pour réagir`,
  ]), []);
});

test("page technique : rien qui aide un tricheur ni ne désigne un point faible", () => {
  const said = [...page.matchAll(/\d+ essais|essais au plus|serrée contre|adresse IP|quota|limite|seuil|requêtes par jour|par minute/gi)].map((m) => m[0]);
  assert.deepEqual(said, []);
});

test("page technique : le robot parfait joue les parties annoncées", () => {
  const [games, seconds] = JSON.parse(code("package.json")).scripts.equite.match(/fairness\.mjs (\d+) (\d+)/).slice(1);
  assert.equal(page.split(`${games} parties de ${seconds} s`).length - 1, 2);
});

test("page technique : le robot humain et sa population sont ceux de l'équilibrage", () => {
  const jeu = "test/equilibrage/jeu.mjs", comparer = "test/equilibrage/comparer.mjs";
  const [rt, rtGain, speed, speedGain, lapse, lapseGain] = code(jeu).match(/rt: ([\d.]+) - ([\d.]+) \* skill, spd: (\d+) \+ (\d+) \* skill, lapse: (\d+) \+ (\d+) \* skill/).slice(1).map(Number);
  const seen = page.replace(/<span class="sr-only">[^<]*<\/span>/g, "");
  assert.deepEqual([
    `<span class="level-from">${fr(rt)} s</span><span class="level-to">${fr(rt - rtGain)} s</span>`,
    `<span class="level-from">${speed} px/s</span><span class="level-to">${speed + speedGain} px/s</span>`,
    `<span class="level-from">toutes les ${lapse} s</span><span class="level-to">toutes les ${lapse + lapseGain} s</span>`,
    `Une inattention de ${fr(constant(jeu, "LAPSE_S"))} s`,
    `${constant(comparer, "PLAYERS")} joueurs de ${constant(comparer, "GAMES")} parties`,
  ].filter((s) => !seen.includes(s)), []);
});

test("page technique : un lecteur d'écran entend « débutant » et « fort » devant chaque valeur des niveaux", () => {
  const said = [...page.matchAll(/<span class="level-(from|to)">(?:<span class="sr-only">([^<]*)<\/span>)?/g)].map((m) => `${m[1]} ${m[2] ?? ""}`);
  assert.deepEqual(said, Array(3).fill(["from Débutant : ", "to fort : "]).flat());
  assert.match(page, /<div class="levels-ends" aria-hidden="true">/);
  assert.match(code("public/tech.css"), /\.sr-only \{[^}]*position: absolute;[^}]*clip: rect\(0, 0, 0, 0\);/);
});

test("page technique : la frise de fin de soirée suit les marges du serveur et de l'écran géant", () => {
  const banner = "public/js/shared/banner.js";
  const late = Number(code("src/db.ts").match(/LATE_MS = (\d+) \* 1000;/)[1]);
  const settle = constant(banner, "SETTLE_MS") / 1000;
  const final = Number(code(banner).match(/FINAL_MS = (\d+) \* 60 \* 1000;/)[1]);
  assert.deepEqual(missing([
    `<span class="time">−${final} min</span>`,
    `<span class="time">+${late} s</span>`,
    `avec ${late} s de marge pour le réseau`,
    `<span class="time">+${late + settle} s</span>`,
    `au moins ${settle} s après la marge`,
  ]), []);
});

test("page technique : classement en mémoire et score gardé comme dans le code", () => {
  const list = constant("src/db.ts", "LIST_LIMIT");
  const keep = Number(code("public/js/app/api.js").match(/KEEP_MS = (\d+) \* 3600 \* 1000/)[1]);
  assert.deepEqual(missing([`Les ${thousands(list)} premiers`, `le score attend ${keep} h`]), []);
});

test("page technique : aucune dépendance dans le JavaScript du site, et pas plus lourd que annoncé une fois compressé", () => {
  const files = readdirSync("public/js", { recursive: true }).filter((f) => f.endsWith(".js"));
  assert.ok(files.length > 50);
  const bare = files.flatMap((f) => [...code("public/js/" + f).matchAll(/\bfrom\s*"([^"]+)"|\bimport\s*\(?\s*"([^"]+)"/g)].map((m) => m[1] ?? m[2]).filter((s) => !/^[./]/.test(s)).map((s) => `${f} : ${s}`));
  assert.deepEqual(bare, []);
  const ko = Number(page.match(/<span class="stat">(\d+) Ko<\/span>/)[1]);
  const size = files.reduce((n, f) => n + gzipSync(readFileSync("public/js/" + f), { level: 9 }).length, 0);
  assert.ok(size <= ko * 1000, `${size} octets compressés pour ${ko} Ko annoncés`);
});

test("page technique : le code montré est une fonction entière, copiée ligne pour ligne du fichier annoncé", () => {
  const lines = (s) => s.replaceAll("\r\n", "\n");
  const [, file, body] = page.match(/<figcaption><code>([^<]+)<\/code><\/figcaption>\s*<pre class="code" tabindex="0"><code>([\s\S]*?)<\/code><\/pre>/);
  const shown = lines(body.replace(/<[^>]+>/g, "").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&"));
  assert.ok(shown.split("\n").length >= 5, shown);
  assert.match(shown, /^\/\*\*[^\n]*\*\/\nfunction \w+\([^\n]*\{\n[\s\S]*\n\}$/);
  assert.equal(shown.split("{").length, shown.split("}").length);
  assert.ok(lines(code(file)).includes(shown), shown);
});

test("page technique : tests et garde-fous annoncés comme ils sont", () => {
  const checks = ["test/player.mjs", "test/admin.mjs"].reduce((n, f) => n + (code(f).match(/\bcheck\(/g) ?? []).length, 0);
  assert.ok(Number(page.match(/<span class="stat">(\d+)<\/span><span class="stat-label">vérifications de l'API/)[1]) <= checks);
  const soon = Number(code("scripts/garde.mjs").match(/SOON_MS = (\d+) \* 3600 \* 1000/)[1]);
  assert.deepEqual(missing([`Aucune soirée dans les ${soon} h`]), []);
  assert.match(code("test/navigateur.mjs"), /devices\["iPhone 13"\]/);
  assert.match(page, /WebKit en iPhone 13/);
});

const shallow = git("rev-parse", "--is-shallow-repository") === "true";

test("page technique : jamais plus de commits annoncés qu'il n'y en a", { skip: shallow && "historique tronqué" }, () => {
  const said = Number(page.match(/id="commits">(\d+)</)[1]);
  assert.ok(said <= Number(git("rev-list", "--count", "HEAD")), `${said} commits annoncés`);
  const first = git("log", "--max-parents=0", "--format=%as").split(/\s+/).pop();
  assert.match(page, new RegExp(`depuis le ${Number(first.slice(8))} octobre ${first.slice(0, 4)}`));
});

const tags = git("tag", "-l", "v*").split(/\s+/).filter(Boolean).length;

test("page technique : jamais plus de mises en ligne annoncées que de tags", { skip: !tags && "tags absents" }, () => {
  const said = Number(page.match(/id="mises-en-ligne">(\d+)</)[1]);
  assert.ok(said <= tags, `${said} mises en ligne annoncées pour ${tags} tags`);
});

test("page technique : rien que la politique de sécurité refuse, et chaque fichier du site existe", () => {
  assert.doesNotMatch(page, /\sstyle=|\son[a-z]+=|<style|<script/i);
  const local = [...page.matchAll(/(?:href|src)="(\/[^"#]*)"/g)].map((m) => m[1]).filter((p) => p !== "/");
  assert.ok(local.includes("/tech.css"));
  assert.deepEqual(local.filter((p) => !existsSync("public" + p)), []);
  const anchors = [...page.matchAll(/href="#([\w-]+)"/g)].map((m) => m[1]);
  assert.equal(anchors.length, 7);
  assert.deepEqual(anchors.filter((id) => !page.includes(`id="${id}"`)), []);
});

test("page technique : les crédits du jeu y mènent", () => {
  assert.match(code("public/js/app/catalog.js"), /credit\("[^"]+", "[^"]+", "\/tech", "[^"]+"\)/);
});

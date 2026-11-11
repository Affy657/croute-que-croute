import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const page = readFileSync("public/tech.html", "utf8").replace(/ /g, " ");
const code = (file) => readFileSync(file, "utf8");
const constant = (file, name) => Number(code(file).match(new RegExp(`\\b${name} = ([\\d.]+)[,;]`))[1]);
const fr = (n) => String(n).replace(".", ",");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

test("page technique : les chiffres du solveur sont ceux du code", () => {
  const solver = "public/js/game/solver.js", sim = "public/js/game/sim.js";
  const cell = constant(solver, "CELL"), steps = Number(code(solver).match(/\bSDT = 1 \/ (\d+)[,;]/)[1]);
  const said = [
    `les ${fr(constant(solver, "HORIZON"))} s suivantes`,
    `Cases balayées en ${fr(constant(solver, "HORIZON"))} s`,
    `${fr(constant(solver, "HORIZON_LONG"))} s pour une attaque longue`,
    `Cases de ${cell} px`,
    `doigt à ${cell * steps} px/s`,
    `${constant(solver, "MARGIN")} px de marge`,
    `sur 1/${steps} s`,
    `en lui laissant ${fr(constant(sim, "REACT"))} s pour réagir`,
    `${constant(sim, "TRIES")} essais au plus`,
  ];
  assert.deepEqual(said.filter((s) => !page.includes(s)), []);
});

test("page technique : le robot parfait joue les parties annoncées", () => {
  const [games, seconds] = JSON.parse(code("package.json")).scripts.equite.match(/fairness\.mjs (\d+) (\d+)/).slice(1);
  assert.equal(page.split(`${games} parties de ${seconds} s`).length - 1, 2);
});

test("page technique : jamais plus de commits annoncés qu'il n'y en a", { skip: git("rev-parse", "--is-shallow-repository") === "true" && "historique tronqué" }, () => {
  const said = Number(page.match(/id="commits">(\d+)</)[1]);
  assert.ok(said <= Number(git("rev-list", "--count", "HEAD")), `${said} commits annoncés`);
  const first = git("log", "--max-parents=0", "--format=%as").split(/\s+/).pop();
  assert.match(page, new RegExp(`depuis le ${Number(first.slice(8))} octobre ${first.slice(0, 4)}`));
});

test("page technique : rien que la politique de sécurité refuse, et chaque fichier du site existe", () => {
  assert.doesNotMatch(page, /\sstyle=|\son[a-z]+=|<style|<script/i);
  const local = [...page.matchAll(/(?:href|src)="(\/[^"#]*)"/g)].map((m) => m[1]).filter((p) => p !== "/");
  assert.ok(local.includes("/tech.css"));
  assert.deepEqual(local.filter((p) => !existsSync("public" + p)), []);
});

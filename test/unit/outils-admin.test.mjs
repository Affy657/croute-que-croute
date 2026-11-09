import { test } from "node:test";
import assert from "node:assert/strict";
import { visiblePlayers, phase, nextName, endAfter, LIMIT } from "../../public/js/admin/tools.js";

const player = (pseudo, extra = {}) => ({ id: pseudo, pseudo, best: 1000, banned: 0, removed: 0, runs: 1, suspect: null, active: false, ...extra });
const many = (n) => Array.from({ length: n }, (_, i) => player("Joueur" + i, { best: 10000 - i }));

test("admin, liste : les 20 premiers, le reste derrière « Voir les autres »", () => {
  const { rows, rest } = visiblePlayers(many(25), "", false);
  assert.equal(LIMIT, 20);
  assert.equal(rows.length, 20);
  assert.equal(rest, 5);
  assert.equal(rows[19].player.pseudo, "Joueur19");
  assert.deepEqual(visiblePlayers(many(25), "", true).rest, 0);
  assert.equal(visiblePlayers(many(25), "", true).rows.length, 25);
  assert.deepEqual(visiblePlayers(many(3), "", false), { rows: visiblePlayers(many(3), "", true).rows, rest: 0 });
});

test("admin, liste : rang compté sur tout le classement, sans les retirés ni les pseudos sans score", () => {
  const list = [player("A"), player("B", { banned: 1 }), player("C", { removed: 1 }), player("D", { best: 0 }), player("E")];
  assert.deepEqual(visiblePlayers(list, "", false).rows.map((r) => r.rank), [1, 0, 0, 0, 2]);
});

test("admin, recherche : sans accents ni majuscules, toutes les lignes trouvées, avec leur vrai rang", () => {
  const list = many(30).concat(player("Élodie", { best: 1 }));
  const found = visiblePlayers(list, "  ELO ", false);
  assert.deepEqual(found.rows.map((r) => [r.player.pseudo, r.rank]), [["Élodie", 31]]);
  assert.equal(found.rest, 0);
  const all = visiblePlayers(many(30), "joueur", false);
  assert.equal(all.rows.length, 30);
  assert.equal(all.rest, 0);
  assert.deepEqual(visiblePlayers(list, "zz", false), { rows: [], rest: 0 });
});

test("admin, état de la soirée : suit l'heure, pas la dernière relecture", () => {
  const ev = { opensAt: 1000, closesAt: 2000 };
  assert.equal(phase(ev, 999), "upcoming");
  assert.equal(phase(ev, 1000), "open");
  assert.equal(phase(ev, 1999), "open");
  assert.equal(phase(ev, 2000), "closed");
});

test("admin, nouvelle soirée : nom avec le numéro suivant, rien d'inventé sans numéro", () => {
  assert.equal(nextName("Space Tartinade #3"), "Space Tartinade #4");
  assert.equal(nextName("Soirée # 9 "), "Soirée # 10");
  assert.equal(nextName("Space Tartinade test"), "");
  assert.equal(nextName(""), "");
});

test("admin, nouvelle soirée : fin pré-remplie avec la durée de la dernière", () => {
  const HOUR = 3600000, last = { opensAt: 19 * HOUR, closesAt: 23.5 * HOUR };
  assert.equal(endAfter(100 * HOUR, last), 104.5 * HOUR);
  assert.ok(Number.isNaN(endAfter(100 * HOUR, null)));
  assert.ok(Number.isNaN(endAfter(NaN, last)));
  assert.ok(Number.isNaN(endAfter(100 * HOUR, { opensAt: 5, closesAt: 5 })));
});

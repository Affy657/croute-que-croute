import { test } from "node:test";
import assert from "node:assert/strict";
import { blocked, URGENT } from "../../scripts/garde.mjs";

const MIN = 60000, END = Date.UTC(2026, 10, 7, 22, 30), FINAL = END + 5 * MIN;
const board = (now, status) => ({ now, event: status ? { name: "Space Tartinade #3", status, closesAt: END, finalAt: FINAL } : null });

test("mise en ligne refusée pendant la soirée", () => {
  assert.match(blocked(board(END - MIN, "open")), /Space Tartinade #3 » est ouverte/);
});

test("mise en ligne refusée pendant les 5 min où les dernières parties comptent", () => {
  assert.match(blocked(board(END + MIN, "closed")), /5 min après la fin/);
  assert.match(blocked(board(FINAL - 1, "closed")), /5 min après la fin/);
});

test("mise en ligne permise après les 5 min, ou sans soirée", () => {
  assert.equal(blocked(board(FINAL, "closed")), null);
  assert.equal(blocked(board(END, null)), null);
});

test("en urgence, permise même pendant la soirée", () => {
  assert.equal(blocked(board(END - MIN, "open"), [URGENT]), null);
  assert.equal(blocked(board(END + MIN, "closed"), ["deploy", URGENT]), null);
});

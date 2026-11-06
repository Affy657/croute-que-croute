import "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";

class Element {
  constructor(found) {
    this.found = found;
  }
  closest(selector) {
    return this.found && selector.split(", ").includes(this.found.css) ? this.found : null;
  }
}
globalThis.Element = Element;
let moved = null;
document.addEventListener = (type, fn) => {
  if (type === "touchmove") moved = fn;
};

const { createInput } = await import("../../public/js/app/input.js");
createInput({ addEventListener() {} }, { active: () => false, scale: () => 1, view: () => ({ ox: 0, oy: 0 }), toast: () => ({ x: 0, y: 0 }) });

function blocked(target) {
  let stopped = false;
  moved({ target, preventDefault: () => { stopped = true; } });
  return stopped;
}

test("glissé sur le jeu : bloqué, la page ne défile pas", () => {
  assert.equal(blocked(new Element(null)), true);
  assert.equal(blocked({}), true);
});

test("glissé sur l'accueil qui dépasse : il défile", () => {
  assert.equal(blocked(new Element({ css: "#menu", id: "menu", scrollHeight: 680, clientHeight: 553 })), false);
});

test("glissé sur l'accueil qui tient dans l'écran : bloqué, sinon la page rebondit sur iPhone", () => {
  assert.equal(blocked(new Element({ css: "#menu", id: "menu", scrollHeight: 844, clientHeight: 844 })), true);
});

test("classement et pages d'infos : ils défilent comme avant", () => {
  assert.equal(blocked(new Element({ css: ".board-list", id: "boardList", scrollHeight: 10, clientHeight: 10 })), false);
  assert.equal(blocked(new Element({ css: ".info-screen", id: "info", scrollHeight: 10, clientHeight: 10 })), false);
});

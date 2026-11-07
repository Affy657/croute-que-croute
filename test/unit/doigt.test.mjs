import "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";

const on = {};
window.addEventListener = (type, fn) => { on[type] = fn; };
document.addEventListener = () => {};

const { createInput, controls, setHold } = await import("../../public/js/app/input.js");

function play() {
  const canvas = { listeners: {}, style: {}, addEventListener(type, fn) { this.listeners[type] = fn; } };
  const input = createInput(canvas, { active: () => true, scale: () => 2, view: () => ({ ox: 10, oy: 20 }), toast: () => ({ x: 100, y: 100 }) });
  const ev = (x, y, id, pointerType) => ({ pointerId: id, pointerType, clientX: x, clientY: y, preventDefault() {} });
  return {
    input,
    down: (x, y, id = 1, kind = "touch") => canvas.listeners.pointerdown(ev(x, y, id, kind)),
    move: (x, y, id = 1, kind = "touch") => on.pointermove(ev(x, y, id, kind)),
    up: (id = 1) => on.pointerup(ev(0, 0, id, "touch")),
  };
}

test("doigt, Tenir : la tartine va sous le doigt, dès qu'il se pose puis en glissant", () => {
  setHold(true);
  const g = play();
  g.down(210, 420);
  assert.equal(g.input.finger.aim, true);
  assert.deepEqual(g.input.take(), { x: 0, y: 100 });
  g.move(250, 420);
  assert.deepEqual(g.input.take(), { x: 20, y: 100 });
});

test("doigt, Joystick : la tartine suit le mouvement du doigt, pas sa position", () => {
  setHold(false);
  const g = play();
  g.down(210, 420);
  assert.equal(g.input.finger.aim, false);
  assert.deepEqual(g.input.take(), { x: 0, y: 0 });
  g.move(220, 420);
  assert.deepEqual(g.input.take(), { x: 10 * controls.sens / 2, y: 0 });
});

test("doigt, Tenir à deux doigts : le second prend le relais là où il est", () => {
  setHold(true);
  const g = play();
  g.down(210, 420, 1);
  g.down(410, 420, 2);
  g.input.take();
  g.up(1);
  assert.deepEqual(g.input.take(), { x: 100, y: 100 });
});

test("souris, même après un doigt : « Tenir » ne change rien, elle garde son réglage", () => {
  setHold(true);
  const g = play();
  g.down(210, 420, 2);
  g.up(2);
  g.input.reset();
  g.down(210, 420, 1, "mouse");
  g.move(220, 420, 1, "mouse");
  assert.equal(g.input.finger.aim, false);
  assert.deepEqual(g.input.take(), { x: 10 * controls.sens / 2, y: 0 });
});

test("doigt : le choix est gardé sur l'appareil", () => {
  setHold(true);
  assert.equal(localStorage.getItem("cv-doigt"), "1");
  setHold(false);
  assert.equal(localStorage.getItem("cv-doigt"), null);
});

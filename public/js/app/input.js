import { X_MIN, X_MAX, Y_MIN, Y_MAX, clamp } from "../game/field.js";
import { store, KEYS } from "../shared/store.js";

export const SENS_MIN = 0.8, SENS_MAX = 2.8, SENS_DEFAULT = 1.8;

function savedSens() {
  const v = Number(store.get(KEYS.sensitivity));
  return v ? clamp(v / 10, SENS_MIN, SENS_MAX) : SENS_DEFAULT;
}

export const controls = { sens: savedSens(), aim: store.get(KEYS.mouseAim) === "1" };
export const hasMouse = () => window.matchMedia("(any-pointer: fine)").matches;

export function setSens(v) {
  controls.sens = clamp(v, SENS_MIN, SENS_MAX);
  store.set(KEYS.sensitivity, Math.round(controls.sens * 10));
}

export function setAim(on) {
  controls.aim = on;
  store.set(KEYS.mouseAim, on ? "1" : null);
}

export const guessDevice = () => (window.matchMedia("(pointer: coarse)").matches ? "mobile" : "pc");

export function createInput(canvas, { active, scale, view, toast }) {
  const pend = { x: 0, y: 0 };
  let aim = null;
  const finger = { held: false, touch: false, x: 0, y: 0, at: 0 };
  const spare = new Map();
  let drag = null, mouse = null, poked = false, used = null;

  const begin = (e) => {
    drag = { id: e.pointerId, lx: e.clientX, ly: e.clientY };
    if (e.pointerType !== "mouse") Object.assign(finger, { held: true, touch: true, x: e.clientX, y: e.clientY, at: performance.now() });
  };

  const end = (e) => {
    spare.delete(e.pointerId);
    if (!drag || e.pointerId !== drag.id) return;
    const next = spare.entries().next().value;
    if (next) {
      const [id, p] = next;
      spare.delete(id);
      drag = { id, lx: p.x, ly: p.y };
      Object.assign(finger, { x: p.x, y: p.y });
    } else {
      drag = null;
      finger.held = false;
    }
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (!active()) return;
    poked = true;
    if (!drag) begin(e);
    else if (e.pointerType !== "mouse") spare.set(e.pointerId, { x: e.clientX, y: e.clientY });
    else return;
    e.preventDefault();
  });

  window.addEventListener("pointermove", (e) => {
    const s = spare.get(e.pointerId);
    if (s) {
      s.x = e.clientX;
      s.y = e.clientY;
      return;
    }
    const k = controls.sens / scale();
    if (e.pointerType === "mouse" && controls.aim) {
      canvas.style.cursor = active() ? "none" : "";
      mouse = { x: e.clientX, y: e.clientY };
      if (!active()) return;
      used = "pc";
      const { ox, oy } = view(), s = scale();
      aim = { x: clamp((e.clientX - ox) / s, X_MIN, X_MAX), y: clamp((e.clientY - oy) / s, Y_MIN, Y_MAX) };
      return;
    }
    if (e.pointerType === "mouse" && !drag) {
      if (active() && mouse) {
        used = "pc";
        pend.x += (e.clientX - mouse.x) * k;
        pend.y += (e.clientY - mouse.y) * k;
      }
      mouse = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!drag || e.pointerId !== drag.id || !active()) return;
    if (used !== "pc") used = e.pointerType === "mouse" ? "pc" : "mobile";
    pend.x += (e.clientX - drag.lx) * k;
    pend.y += (e.clientY - drag.ly) * k;
    drag.lx = finger.x = e.clientX;
    drag.ly = finger.y = e.clientY;
    if (e.pointerType === "mouse") mouse = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  document.addEventListener("touchmove", (e) => {
    if (!(e.target instanceof Element && e.target.closest(".board-list, .info-screen"))) e.preventDefault();
  }, { passive: false });

  const offAim = () => {
    const t = toast();
    return aim && (Math.abs(aim.x - t.x) > 0.01 || Math.abs(aim.y - t.y) > 0.01) ? { x: aim.x - t.x, y: aim.y - t.y } : null;
  };

  return {
    begin,
    finger,
    device: () => used || guessDevice(),
    reset() {
      drag = null;
      aim = null;
      poked = false;
      spare.clear();
      pend.x = 0;
      pend.y = 0;
      finger.held = false;
    },
    pending: () => pend.x !== 0 || pend.y !== 0 || !!offAim(),
    poked: () => poked,
    fresh() {
      used = null;
    },
    take() {
      const d = aim ? offAim() || { x: 0, y: 0 } : { x: pend.x, y: pend.y };
      poked = false;
      pend.x = 0;
      pend.y = 0;
      return d;
    }
  };
}

import { store, KEYS } from "../shared/store.js";

const SENS = 1.15, PAD_SENS = 1.8;
const STICK_DEAD = 0.1, STICK_V = 400, STICK_CURVE = 1.5;
export const STICK_R = 52;
export const CONTROLS = ["drag", "stick", "pad"];

export function controlsMode() {
  const m = store.get(KEYS.controls);
  return CONTROLS.includes(m) ? m : "drag";
}

export function createInput(canvas, { active, scale }) {
  const pend = { x: 0, y: 0 };
  const ctl = { mode: controlsMode(), held: false, bx: 0, by: 0, kx: 0, ky: 0 };
  let drag = null, mouse = null;

  const begin = (e) => {
    drag = { id: e.pointerId, lx: e.clientX, ly: e.clientY };
    Object.assign(ctl, { held: true, bx: e.clientX, by: e.clientY, kx: e.clientX, ky: e.clientY });
  };

  const end = (e) => {
    if (drag && e.pointerId === drag.id) {
      drag = null;
      ctl.held = false;
    }
  };

  function aim(x, y) {
    const dx = x - ctl.bx, dy = y - ctl.by, len = Math.hypot(dx, dy);
    if (len > STICK_R) {
      ctl.bx = x - (dx / len) * STICK_R;
      ctl.by = y - (dy / len) * STICK_R;
    }
    ctl.kx = x;
    ctl.ky = y;
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (active() && !drag) {
      begin(e);
      e.preventDefault();
    }
  });

  window.addEventListener("pointermove", (e) => {
    if (ctl.mode === "stick") {
      if (drag && e.pointerId === drag.id && active()) aim(e.clientX, e.clientY);
      return;
    }
    const k = (ctl.mode === "pad" ? PAD_SENS : SENS) / scale();
    if (e.pointerType === "mouse" && !drag) {
      if (active() && mouse) {
        pend.x += (e.clientX - mouse.x) * k;
        pend.y += (e.clientY - mouse.y) * k;
      }
      mouse = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!drag || e.pointerId !== drag.id || !active()) return;
    pend.x += (e.clientX - drag.lx) * k;
    pend.y += (e.clientY - drag.ly) * k;
    drag.lx = ctl.kx = e.clientX;
    drag.ly = ctl.ky = e.clientY;
    if (e.pointerType === "mouse") mouse = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  document.addEventListener("touchmove", (e) => {
    if (!(e.target instanceof Element && e.target.closest(".board-list, .info-screen"))) e.preventDefault();
  }, { passive: false });

  function stick(dt) {
    const dx = ctl.kx - ctl.bx, dy = ctl.ky - ctl.by, len = Math.hypot(dx, dy);
    const m = Math.min(1, Math.max(0, (len / STICK_R - STICK_DEAD) / (1 - STICK_DEAD)));
    if (!drag || !m) return { x: 0, y: 0 };
    const k = (STICK_V * Math.pow(m, STICK_CURVE) * dt) / len;
    return { x: dx * k, y: dy * k };
  }

  return {
    begin,
    controls: ctl,
    reset() {
      drag = null;
      pend.x = 0;
      pend.y = 0;
      ctl.held = false;
      ctl.mode = controlsMode();
    },
    take(dt) {
      if (ctl.mode === "stick") return stick(dt);
      const d = { x: pend.x, y: pend.y };
      pend.x = 0;
      pend.y = 0;
      return d;
    }
  };
}

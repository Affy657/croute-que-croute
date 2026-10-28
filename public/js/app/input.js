const SENS = 1.8;

export function createInput(canvas, { active, scale }) {
  const pend = { x: 0, y: 0 };
  const finger = { held: false, touch: false, x: 0, y: 0, at: 0 };
  let drag = null, mouse = null;

  const begin = (e) => {
    drag = { id: e.pointerId, lx: e.clientX, ly: e.clientY };
    if (e.pointerType !== "mouse") Object.assign(finger, { held: true, touch: true, x: e.clientX, y: e.clientY, at: performance.now() });
  };

  const end = (e) => {
    if (drag && e.pointerId === drag.id) {
      drag = null;
      finger.held = false;
    }
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (active() && !drag) {
      begin(e);
      e.preventDefault();
    }
  });

  window.addEventListener("pointermove", (e) => {
    const k = SENS / scale();
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
    drag.lx = finger.x = e.clientX;
    drag.ly = finger.y = e.clientY;
    if (e.pointerType === "mouse") mouse = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  document.addEventListener("touchmove", (e) => {
    if (!(e.target instanceof Element && e.target.closest(".board-list, .info-screen"))) e.preventDefault();
  }, { passive: false });

  return {
    begin,
    finger,
    reset() {
      drag = null;
      pend.x = 0;
      pend.y = 0;
      finger.held = false;
    },
    take() {
      const d = { x: pend.x, y: pend.y };
      pend.x = 0;
      pend.y = 0;
      return d;
    }
  };
}

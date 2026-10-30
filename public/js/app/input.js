const SENS = 1.8;

export function createInput(canvas, { active, scale }) {
  const pend = { x: 0, y: 0 };
  const finger = { held: false, touch: false, x: 0, y: 0, at: 0 };
  const spare = new Map();
  let drag = null, mouse = null, poked = false;

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
      poked = false;
      spare.clear();
      pend.x = 0;
      pend.y = 0;
      finger.held = false;
    },
    pending: () => pend.x !== 0 || pend.y !== 0,
    poked: () => poked,
    take() {
      const d = { x: pend.x, y: pend.y };
      poked = false;
      pend.x = 0;
      pend.y = 0;
      return d;
    }
  };
}

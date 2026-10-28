const SENS = 1.15;

export function createInput(canvas, { active, scale }) {
  const pend = { x: 0, y: 0 };
  let drag = null, mouse = null;

  const begin = (e) => {
    drag = { id: e.pointerId, lx: e.clientX, ly: e.clientY };
  };

  const end = (e) => {
    if (drag && e.pointerId === drag.id) drag = null;
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
    drag.lx = e.clientX;
    drag.ly = e.clientY;
    if (e.pointerType === "mouse") mouse = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  document.addEventListener("touchmove", (e) => {
    if (!(e.target instanceof Element && e.target.closest(".board-list, .info-scroll"))) e.preventDefault();
  }, { passive: false });

  return {
    begin,
    reset() {
      drag = null;
      pend.x = 0;
      pend.y = 0;
    },
    take() {
      const d = { x: pend.x, y: pend.y };
      pend.x = 0;
      pend.y = 0;
      return d;
    }
  };
}

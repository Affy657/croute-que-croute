import { rr } from "../art/kit.js";
import { GOLD, TAU } from "./kit.js";

const SANS = "Arial, Helvetica, sans-serif", SERIF = "Georgia, 'Times New Roman', serif";

export const CANS = {
  "86": { name: "8.6 Original", edge: "#031722", mid: "#1f4458", lid: "#d8c48a", decor: eightSix },
  maxi: { name: "Maximator", edge: "#012b17", mid: "#0c7d52", lid: "#d3d7de", decor: maximator }
};

function label(ctx, text, y, size, color, max, font = "bold " + size + "px " + SANS) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(text, 0, y, max);
}

function arcText(ctx, text, y, r, font, max) {
  ctx.font = font;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0), squeeze = Math.min(1, max / total);
  let a = -(total * squeeze) / (2 * r);
  [...text].forEach((ch, i) => {
    const mid = a + (widths[i] * squeeze) / (2 * r);
    ctx.save();
    ctx.translate(Math.sin(mid) * r, y + r - Math.cos(mid) * r);
    ctx.rotate(mid);
    ctx.scale(squeeze, 1);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    a += (widths[i] * squeeze) / r;
  });
}

function wolf(ctx, w, cy) {
  ctx.save();
  ctx.translate(0, cy);
  ctx.scale(w, w);
  const g = ctx.createLinearGradient(0, -0.3, 0, 0.3);
  g.addColorStop(0, "#05b8d6");
  g.addColorStop(1, "#0a5c9c");
  ctx.fillStyle = g;
  ctx.beginPath();
  for (const [x, y] of [[-0.3, -0.3], [-0.15, -0.1], [0, -0.13], [0.15, -0.1], [0.3, -0.3], [0.32, -0.02], [0.24, 0.12], [0.1, 0.2], [0, 0.31], [-0.1, 0.2], [-0.24, 0.12], [-0.32, -0.02]]) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(1, 25, 50, 0.55)";
  ctx.lineWidth = 0.022;
  ctx.lineCap = "round";
  for (const pts of [[[0, -0.1], [0, 0.26]], [[-0.12, 0.03], [-0.05, 0.2]], [[0.12, 0.03], [0.05, 0.2]], [[-0.25, -0.2], [-0.2, -0.05]], [[0.25, -0.2], [0.2, -0.05]]]) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.stroke();
  }
  ctx.fillStyle = "#eafcff";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 0.11, 0.02, 0.045, 0.016, s * 0.35, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#021a2c";
  ctx.beginPath();
  ctx.moveTo(-0.04, 0.24);
  ctx.lineTo(0.04, 0.24);
  ctx.lineTo(0, 0.29);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function cracks(ctx, w, h) {
  ctx.strokeStyle = "rgba(0, 8, 14, 0.55)";
  ctx.lineWidth = Math.max(0.6, w * 0.012);
  for (const pts of [[[-0.5, 0.28], [-0.32, 0.3], [-0.25, 0.36], [-0.1, 0.35]], [[0.5, 0.22], [0.36, 0.26], [0.3, 0.33]], [[-0.5, -0.05], [-0.38, -0.02], [-0.42, 0.06]], [[0.5, -0.25], [0.4, -0.22], [0.43, -0.14]], [[0.05, 0.42], [0.16, 0.37], [0.28, 0.4]]]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
    ctx.stroke();
  }
}

function eightSix(ctx, w, h) {
  cracks(ctx, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  label(ctx, "IMPORTED FROM HOLLAND", -h * 0.345, h * 0.024, "#ffffff", w * 0.66);
  wolf(ctx, w, -h * 0.18);
  ctx.font = h * 0.22 + "px " + SERIF;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("8", -w * 0.17, h * 0.07, w * 0.32);
  ctx.fillText("6", w * 0.17, h * 0.07, w * 0.32);
  ctx.fillStyle = "#d0202d";
  ctx.beginPath();
  ctx.arc(0, h * 0.02, w * 0.045, 0, TAU);
  ctx.fill();
  label(ctx, "ORIGINAL", h * 0.15, h * 0.07, "#ffffff", w * 0.7);
  label(ctx, "INTENSE BLOND BEER", h * 0.19, h * 0.032, "#ffffff", w * 0.7);
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fillRect(-w * 0.3, h * 0.2, w * 0.6, Math.max(0.6, h * 0.003));
  label(ctx, "ALC. 8,6% VOL.", h * 0.232, h * 0.024, "#ffffff", w * 0.5);
  label(ctx, "500 mL", h * 0.38, h * 0.022, "#ffffff", w * 0.3);
}

function sail(ctx, x, y0, y1, half) {
  const b = (y1 - y0) * 0.25;
  ctx.beginPath();
  ctx.moveTo(x - half, y0);
  ctx.lineTo(x + half, y0);
  ctx.quadraticCurveTo(x + half + b, (y0 + y1) / 2, x + half, y1);
  ctx.lineTo(x - half, y1);
  ctx.quadraticCurveTo(x - half + b, (y0 + y1) / 2, x - half, y0);
  ctx.closePath();
  ctx.fill();
}

function ship(ctx, w, cy) {
  ctx.save();
  ctx.translate(0, cy);
  ctx.scale(w, w);
  ctx.strokeStyle = "#0a4a31";
  ctx.lineWidth = 0.025;
  for (const [x, top] of [[-0.18, -0.5], [0.02, -0.6], [0.2, -0.42]]) {
    ctx.beginPath();
    ctx.moveTo(x, 0.1);
    ctx.lineTo(x, top);
    ctx.stroke();
  }
  /** @type {[number, number, [number, number][]][]} */
  const MASTS = [[-0.18, 0.09, [[-0.44, -0.31], [-0.26, -0.11], [-0.06, 0.05]]], [0.02, 0.11, [[-0.54, -0.39], [-0.34, -0.15], [-0.1, 0.05]]], [0.2, 0.08, [[-0.36, -0.23], [-0.18, -0.03]]]];
  ctx.fillStyle = "#c9cccb";
  for (const [x, half, rows] of MASTS) for (const [y0, y1] of rows) sail(ctx, x, y0, y1, half);
  ctx.fillStyle = "#ffffff";
  for (const [x, half, rows] of MASTS) for (const [y0, y1] of rows) sail(ctx, x + half * 0.25, y0, y1, half * 0.75);
  ctx.beginPath();
  ctx.moveTo(0.31, 0.02);
  ctx.lineTo(0.47, -0.12);
  ctx.lineTo(0.31, -0.28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#dcb163";
  ctx.beginPath();
  ctx.moveTo(-0.32, 0.07);
  ctx.lineTo(0.34, 0.03);
  ctx.quadraticCurveTo(0.27, 0.2, 0.16, 0.24);
  ctx.lineTo(-0.2, 0.24);
  ctx.quadraticCurveTo(-0.3, 0.19, -0.32, 0.07);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#a9813b";
  ctx.fillRect(-0.27, 0.12, 0.56, 0.025);
  ctx.restore();
}

function maximator(ctx, w, h) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fillRect(-w / 2, h * 0.08, w, h * 0.5);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  label(ctx, "BRASSÉE EN HOLLANDE", -h * 0.345, h * 0.022, "#ffffff", w * 0.62);
  ctx.fillStyle = "#dcb163";
  ctx.beginPath();
  ctx.moveTo(-w * 0.05, -h * 0.318);
  ctx.lineTo(-w * 0.03, -h * 0.33);
  ctx.lineTo(0, -h * 0.322);
  ctx.lineTo(w * 0.03, -h * 0.33);
  ctx.lineTo(w * 0.05, -h * 0.318);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c8202c";
  ctx.beginPath();
  rr(ctx, -w * 0.05, -h * 0.316, w * 0.1, h * 0.045, w * 0.03);
  ctx.fill();
  ctx.strokeStyle = "#dcb163";
  ctx.lineWidth = Math.max(0.8, w * 0.015);
  for (const [y, r] of [[-h * 0.27, w * 1.1], [-h * 0.18, w * 1.1]]) {
    ctx.beginPath();
    ctx.arc(0, y + r, r, -Math.PI / 2 - 0.36, -Math.PI / 2 + 0.36);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffffff";
  arcText(ctx, "AMSTERDAM", -h * 0.2, w * 1.1, "bold " + h * 0.08 + "px " + SERIF, w * 0.88);
  ship(ctx, w * 0.75, -h * 0.03);
  label(ctx, "MAXIMATOR", h * 0.14, h * 0.058, "#ffffff", w * 0.72);
  label(ctx, "MAXI INTENSE", h * 0.18, h * 0.034, "#dcb163", w * 0.6);
  label(ctx, "11.6%", h * 0.23, h * 0.045, "#ffffff", w * 0.4);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = Math.max(0.6, w * 0.012);
  ctx.beginPath();
  ctx.arc(-w * 0.42, h * 0.26, w * 0.13, 0, TAU);
  ctx.stroke();
  label(ctx, "BIÈRE BLONDE", h * 0.31, h * 0.02, "#ffffff", w * 0.5);
  label(ctx, "AU GOÛT PUISSANT", h * 0.335, h * 0.02, "#ffffff", w * 0.56);
}

export function drawCan(ctx, kind, s) {
  const K = CANS[kind], h = s, w = s * 0.4, e = w * 0.14, neck = w * 0.08, top = -h / 2 + e + neck;
  ctx.save();
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, K.edge);
  g.addColorStop(0.38, K.mid);
  g.addColorStop(0.55, K.mid);
  g.addColorStop(1, K.edge);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w / 2, top);
  ctx.lineTo(-w / 2, h / 2 - e);
  ctx.ellipse(0, h / 2 - e, w / 2, e, 0, Math.PI, 0, true);
  ctx.lineTo(w / 2, top);
  ctx.lineTo(w * 0.42, -h / 2 + e);
  ctx.lineTo(-w * 0.42, -h / 2 + e);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  K.decor(ctx, w, h);
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillRect(-w * 0.3, top, w * 0.08, h - e * 2 - neck);
  ctx.restore();
  ctx.fillStyle = "#b9bec8";
  ctx.beginPath();
  ctx.ellipse(0, h / 2 - e, w * 0.46, e * 0.8, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = K.lid;
  ctx.beginPath();
  ctx.ellipse(0, -h / 2 + e, w * 0.42, e, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.beginPath();
  ctx.ellipse(0, -h / 2 + e, w * 0.32, e * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#e6e9ee";
  ctx.beginPath();
  ctx.ellipse(w * 0.08, -h / 2 + e * 0.92, w * 0.1, e * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

const SPRITES = new Map(), SPRITE_KEEP = 8;

export function cachedCan(ctx, kind, s) {
  const m = typeof document !== "undefined" && document.createElement && ctx.getTransform ? ctx.getTransform() : null;
  if (!m) return drawCan(ctx, kind, s);
  const px = Math.hypot(m.a, m.b), key = kind + ":" + Math.round(s * px);
  let cv = SPRITES.get(key);
  if (!cv) {
    cv = document.createElement("canvas");
    cv.width = Math.ceil(s * 0.4 * px) + 4;
    cv.height = Math.ceil(s * px) + 4;
    const g = cv.getContext("2d");
    g.setTransform(px, 0, 0, px, cv.width / 2, cv.height / 2);
    drawCan(g, kind, s);
    if (SPRITES.size >= SPRITE_KEEP) SPRITES.clear();
    SPRITES.set(key, cv);
  }
  ctx.drawImage(cv, -cv.width / (2 * px), -cv.height / (2 * px), cv.width / px, cv.height / px);
}

export function streak(ctx, len, s) {
  ctx.lineCap = "round";
  for (const [w, a] of [[0.25, 0.35], [0.09, 0.8]]) {
    const g = ctx.createLinearGradient(0, 0, -len, 0);
    g.addColorStop(0, "rgba(" + GOLD + ", " + a + ")");
    g.addColorStop(1, "rgba(" + GOLD + ", 0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = s * w;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-len, 0);
    ctx.stroke();
  }
}

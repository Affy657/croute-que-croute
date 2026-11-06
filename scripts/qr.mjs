import { readFileSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";
import alignment from "qrcode/lib/core/alignment-pattern.js";
import { Resvg } from "@resvg/resvg-js";

const URL = process.argv[2] || "https://croute-que-croute.tartinesauvage.fr";
const C = { void: "#0d0b24", jam: "#e0244a", ink: "#fff6e0" };
const U = 10, M = 3, DOT = 0.45, PNG_WIDTH = 1200;

const qr = QRCode.create(URL, { errorCorrectionLevel: "H" });
const N = qr.modules.size;
const ALIGN = alignment.getPositions(qr.version);
const LOGO = Math.round(N * 0.26) | 1;
const L0 = (N - LOGO) / 2;

const dark = (x, y) => qr.modules.get(y, x);
const inEye = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
const inLogo = (x, y) => x >= L0 - 0.5 && x < L0 + LOGO + 0.5 && y >= L0 - 0.5 && y < L0 + LOGO + 0.5;
const solid = (x, y) => x === 6 || y === 6 || ALIGN.some(([ay, ax]) => Math.abs(x - ax) <= 2 && Math.abs(y - ay) <= 2);

function modules() {
  let s = "";
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!dark(x, y) || inEye(x, y) || inLogo(x, y)) continue;
      const cx = (M + x + 0.5) * U, cy = (M + y + 0.5) * U;
      s += solid(x, y)
        ? `<rect x="${cx - U / 2}" y="${cy - U / 2}" width="${U}" height="${U}" rx="${U * 0.2}"/>`
        : `<circle cx="${cx}" cy="${cy}" r="${DOT * U}"/>`;
    }
  }
  return `<g fill="${C.void}">${s}</g>`;
}

function roundSquare(x, y, size, r) {
  const e = size - 2 * r;
  return `M${x + r} ${y}h${e}a${r} ${r} 0 0 1 ${r} ${r}v${e}a${r} ${r} 0 0 1 -${r} ${r}h-${e}a${r} ${r} 0 0 1 -${r} -${r}v-${e}a${r} ${r} 0 0 1 ${r} -${r}z`;
}

function eyes() {
  let s = "";
  for (const [ex, ey] of [[0, 0], [N - 7, 0], [0, N - 7]]) {
    const x = (M + ex) * U, y = (M + ey) * U;
    s += `<path fill="${C.void}" fill-rule="evenodd" d="${roundSquare(x, y, 7 * U, 2 * U)} ${roundSquare(x + U, y + U, 5 * U, 1.2 * U)}"/>`;
    s += `<rect fill="${C.jam}" x="${x + 2 * U}" y="${y + 2 * U}" width="${3 * U}" height="${3 * U}" rx="${0.9 * U}"/>`;
  }
  return s;
}

function logo() {
  const icon = readFileSync("public/icons/icon.svg", "utf8");
  const viewBox = icon.match(/viewBox="([^"]+)"/)[1];
  const body = icon.slice(icon.indexOf(">", icon.indexOf("<svg")) + 1, icon.lastIndexOf("</svg>"));
  const x = (M + L0) * U, w = LOGO * U;
  return `<clipPath id="logo"><rect x="${x}" y="${x}" width="${w}" height="${w}" rx="${w * 0.22}"/></clipPath>
  <g clip-path="url(#logo)"><svg x="${x}" y="${x}" width="${w}" height="${w}" viewBox="${viewBox}">${body}</svg></g>`;
}

const S = (N + 2 * M) * U;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
<rect width="${S}" height="${S}" rx="${3 * U}" fill="${C.ink}"/>
${modules()}
${eyes()}
${logo()}
</svg>
`;

writeFileSync("qr/croute-que-croute.svg", svg);
writeFileSync("public/qr.svg", svg);
writeFileSync("qr/croute-que-croute.png", new Resvg(svg, { fitTo: { mode: "width", value: PNG_WIDTH } }).render().asPng());
writeFileSync("qr/croute-que-croute-simple.svg", await QRCode.toString(URL, { type: "svg", margin: 2 }));
await QRCode.toFile("qr/croute-que-croute-simple.png", URL, { margin: 2, width: PNG_WIDTH });

console.log("QR codes générés pour " + URL);

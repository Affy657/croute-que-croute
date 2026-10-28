import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const toast = "M-14 21 Q-20 21 -20 15 L-20 -5.04 C-26.4 -26.04 -2.4 -29.4 0 -19.32 C2.4 -29.4 26.4 -26.04 20 -5.04 L20 15 Q20 21 14 21 Z";
const GAME = { bg: "#0d0b24", star: "#fff6e0" };
const ADMIN = { bg: "#ffcf33", star: "#0d0b24" };

function svg(pad, theme) {
  const size = 80 + pad * 2;
  const booster = (bx) => `
    <polygon points="${bx - 4.5},26 ${bx + 4.5},26 ${bx},45" fill="url(#flame)"/>
    <rect x="${bx - 5}" y="13" width="10" height="14" rx="3" fill="#d5dbe8" stroke="#0d0b24" stroke-width="1.8"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-40 - pad} ${-32 - pad} ${size} ${size}">
  <defs>
    <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme === ADMIN ? "#e0244a" : "#ffcf33"}"/>
      <stop offset="1" stop-color="#ff7a1a"/>
    </linearGradient>
  </defs>
  <rect x="${-40 - pad}" y="${-32 - pad}" width="${size}" height="${size}" fill="${theme.bg}"/>
  <circle cx="${-24 - pad / 3}" cy="${-20 - pad / 3}" r="1.2" fill="${theme.star}" opacity="0.8"/>
  <circle cx="${27 + pad / 3}" cy="${-12 - pad / 4}" r="0.9" fill="${theme.star}" opacity="0.7"/>
  <circle cx="${-29 - pad / 4}" cy="${30 + pad / 3}" r="0.8" fill="${theme.star}" opacity="0.6"/>
  ${booster(-12)}
  ${booster(12)}
  <path d="${toast}" fill="#c0712f" stroke="#0d0b24" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="${toast}" transform="translate(0 2) scale(0.78)" fill="#f6c983"/>
  <rect x="-7" y="-5.5" width="14" height="11" rx="3" fill="#fff1a8" transform="translate(-1 3) rotate(10.3)"/>
</svg>`;
}

const render = (file, width, pad, theme) => {
  const png = new Resvg(svg(pad, theme), { fitTo: { mode: "width", value: width } }).render().asPng();
  writeFileSync(file, png);
};

render("public/icons/icon-192.png", 192, 4, GAME);
render("public/icons/icon-512.png", 512, 4, GAME);
render("public/icons/icon-maskable-512.png", 512, 22, GAME);
render("public/icons/apple-touch-icon.png", 180, 10, GAME);
writeFileSync("public/icons/icon.svg", svg(4, GAME));

render("public/icons/admin-192.png", 192, 4, ADMIN);
render("public/icons/admin-512.png", 512, 4, ADMIN);
render("public/icons/admin-maskable-512.png", 512, 22, ADMIN);
render("public/icons/admin-apple-touch-icon.png", 180, 10, ADMIN);
console.log("icônes générées");
